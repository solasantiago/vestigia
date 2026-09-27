// Semáforo del día de la casa.
// Todo se calcula con los datos y la hora: no se guarda nada.
//
// Niveles, de menor a mayor:
//   off    ⚪ todavía no toca
//   quiet  ⚪ dejó de insistir (p. ej. la pastilla de la noche pasadas las 2)
//   closed ⚪ se cerró sin hacerse ("Hoy no")
//   ok     🟢 al día
//   due    ⚪ toca ahora (recordatorio, sin titilar)
//   warn   🟠 atención (titila)
//   alert  🔴 urgente (titila)
import { DAY_START_HOUR } from '../config.js';
import {
  addDays,
  atHour,
  beforeHour,
  DAY_END_MIN,
  dayMinToTs,
  dayMinutesOf,
  dayOf,
  fmtHour,
  fmtSpan,
  fmtTime,
  fromHour,
  hhmmToDayMin,
  minutesOf,
  range,
  tsToDayMin,
} from './dates.js';
import { isScheduled } from './metrics.js';

const RANK = { off: 0, quiet: 1, closed: 1, ok: 2, due: 3, warn: 4, alert: 5 };

export const LEVEL_LABEL = {
  off: 'Todavía no toca',
  quiet: 'Sin registrar',
  closed: 'Cerrado',
  ok: 'Al día',
  due: 'Toca ahora',
  warn: 'Atención',
  alert: 'Urgente',
};

/** Lo que pide atención: recordatorios, naranja y rojo. */
export const ATTENTION = new Set(['due', 'warn', 'alert']);
/** Lo que titila. */
export const BLINKS = new Set(['warn', 'alert']);

export function worst(levels) {
  let w = 'off';
  for (const l of levels) if (l && RANK[l] > RANK[w]) w = l;
  return w;
}

// ───────────── reglas ─────────────

export const DEFAULT_RULES = {
  walk_window: { from: '08:00', to: '02:00' },
  first_walk: { target: '10:00', warn: '09:00', alert: '11:00' },
  walk_pace: { alert_after_min: 90, min_gap_min: 90, after_goal_warn_min: 300 },
  long_walks: { warn: '19:00', alert: '23:00' },
  poop_hours: { warn: 18, alert: 24 },
  pee_hours: { warn: 6 },
  ipad: { slide_sec: 12, idle_sec: 300, after_save_sec: 60, night: { from: '01:00', to: '07:00' } },
};

function merge(base, over) {
  if (!over || typeof over !== 'object' || Array.isArray(over)) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' ? merge(base[k], v) : v;
  }
  return out;
}

export function rulesOf(model) {
  return merge(DEFAULT_RULES, model?.settings?.rules ?? {});
}

function goals(model) {
  return { walks: model?.settings?.walks_goal ?? 4, long: model?.settings?.long_walks_goal ?? 2 };
}

const tsOf = (w) => new Date(w.ended_at ?? w.started_at).getTime();

/** Minutos "activos" (dentro del horario de salidas de cada día) entre dos momentos. */
export function activeMinutes(fromTs, toTs, windowFrom, windowTo) {
  if (toTs <= fromTs) return 0;
  let total = 0;
  const last = dayOf(toTs);
  for (let d = addDays(dayOf(fromTs), -1); d <= last; d = addDays(d, 1)) {
    const a = Math.max(fromTs, dayMinToTs(d, windowFrom));
    const b = Math.min(toTs, dayMinToTs(d, windowTo));
    if (b > a) total += (b - a) / 60000;
  }
  return total;
}

// ───────────── pastillas ─────────────

/** "Pastilla de la mañana" → "Mañana"; "Pastillas" → "Pastillas". */
export function pillLabel(h) {
  const m = /^pastilla de la (.+)$/i.exec(h.name ?? '');
  return m ? m[1][0].toUpperCase() + m[1].slice(1) : h.name;
}

function pillNoun(h, doses) {
  const m = /^pastilla de la (.+)$/i.exec(h.name ?? '');
  if (m) return `la pastilla de la ${m[1].toLowerCase()}`;
  return doses > 1 ? 'las pastillas' : 'la pastilla';
}

export function pillState(model, h, day, dm) {
  const doses = h.doses ?? 1;
  const c = model.checkinsByHabit.get(h.id)?.get(day) ?? null;
  const amount = c ? c.amount ?? (c.status === 'si' ? doses : 0) : 0;
  const base = { id: `pill-${h.id}`, habit: h, checkin: c, doses, amount, label: pillLabel(h), noun: pillNoun(h, doses) };
  if (h.from && day < h.from) return { ...base, level: 'off', text: 'Todavía no' };
  if (!isScheduled(h, day)) return { ...base, level: 'off', text: 'Hoy no toca' };
  if (c?.status === 'na') return { ...base, level: 'closed', text: 'Hoy no aplica' };
  if (amount >= doses) {
    return { ...base, level: 'ok', done: true, text: doses > 1 ? `Las ${doses} ✓ · ${fmtTime(c.answered_at)}` : `✓ ${fmtTime(c.answered_at)}` };
  }
  if (c?.closed || c?.status === 'no') {
    return { ...base, level: 'closed', text: amount ? `${amount} de ${doses} · el resto hoy no` : 'Hoy no' };
  }
  const s = (amount === 0 ? h.schedule : h.schedule?.next) ?? {};
  const t = { from: hhmmToDayMin(s.from), warn: hhmmToDayMin(s.warn), alert: hhmmToDayMin(s.alert), quiet: hhmmToDayMin(s.quiet) };
  let level = t.from != null && dm < t.from ? (amount > 0 ? 'ok' : 'off') : 'due';
  if (t.warn != null && dm >= t.warn) level = 'warn';
  if (t.alert != null && dm >= t.alert) level = 'alert';
  if (t.quiet != null && dm >= t.quiet) level = 'quiet';

  const left = doses - amount;
  const which = amount > 0 ? (left === 1 ? (doses === 2 ? 'la segunda' : 'la última') : `${left} más`) : null;
  let text;
  if (level === 'off') text = t.from != null ? atHour(t.from).replace(/^a/, 'A') : 'Más tarde';
  else if (level === 'ok') text = `${amount} de ${doses} ✓ · ${which} ${t.from != null ? fromHour(t.from) : 'más tarde'}`;
  else if (level === 'due') text = amount > 0 ? `Toca ${which}` : t.warn != null ? `Pendiente · ${beforeHour(t.warn)}` : 'Pendiente';
  else if (level === 'warn') text = amount > 0 ? `Falta ${which}` : 'Todavía no';
  else if (level === 'alert') text = amount > 0 ? `Falta ${which}` : doses > 1 ? `Faltan las ${doses}` : 'Falta';
  else text = 'Sin registrar';
  return { ...base, level, text, t, partial: amount > 0 };
}

function pillShort(person, r) {
  const who = person.short_name;
  if (r.partial) return `${who}: ${r.level === 'due' ? 'toca' : 'falta'} ${r.doses - r.amount === 1 ? 'la segunda pastilla' : 'terminar las pastillas'}`;
  const verb = r.level === 'due' ? 'toca' : r.doses > 1 && !/de la/.test(r.noun) ? 'faltan' : 'falta';
  return `${who}: ${verb} ${r.noun}`;
}

// ───────────── salidas ─────────────

export function walksState(model, rules, day, dm) {
  const { walks: goal } = goals(model);
  const ws = hhmmToDayMin(rules.walk_window.from);
  const we = hhmmToDayMin(rules.walk_window.to);
  const list = model.walks.filter((w) => w.day === day);
  const count = list.length;
  const last = list[list.length - 1] ?? null;
  const lastEnd = last ? tsToDayMin(last.ended_at ?? last.started_at, day) : null;
  const pace = rules.walk_pace;
  let level;
  let text;
  let nextDm = null;

  if (!count) {
    const target = hhmmToDayMin(rules.first_walk.target);
    const warn = hhmmToDayMin(rules.first_walk.warn);
    const alert = hhmmToDayMin(rules.first_walk.alert);
    nextDm = target;
    if (dm >= we) [level, text, nextDm] = ['alert', 'No salieron en todo el día', null];
    else if (dm < ws) [level, text] = ['off', `La primera, ${beforeHour(target)}`];
    else if (dm < warn) [level, text] = ['due', `La primera, ${beforeHour(target)}`];
    else if (dm < alert) [level, text] = ['warn', dm < target ? `Todavía no salieron · ${beforeHour(target)}` : 'Todavía no salieron'];
    else [level, text] = ['alert', 'Todavía no salieron'];
  } else if (count < goal) {
    const left = goal - count;
    nextDm = Math.min(we, Math.round(lastEnd + Math.max(pace.min_gap_min, (we - lastEnd) / (left + 0.5))));
    if (dm >= we) [level, text, nextDm] = ['alert', `Faltó ${left === 1 ? 'una salida' : `${left} salidas`}`, null];
    else if (dm >= nextDm + pace.alert_after_min) [level, text] = ['alert', `Se pasó la hora de salir (${fmtHour(nextDm)})`];
    else if (dm >= nextDm) [level, text] = ['warn', `Ya toca salir (${fmtHour(nextDm)})`];
    else [level, text] = ['ok', `Próxima ${atHour(nextDm)}`];
  } else {
    const soft = lastEnd + pace.after_goal_warn_min;
    if (soft < we && dm >= soft && dm < we) [level, text, nextDm] = ['warn', `Hace ${fmtSpan(dm - lastEnd)} que no salen`, soft];
    else [level, text, nextDm] = ['ok', 'Meta cumplida', soft < we && dm < we ? soft : null];
  }
  return {
    id: 'walks',
    level,
    text,
    count,
    goal,
    list,
    last,
    lastEnd,
    sinceMin: last ? Math.max(0, dm - lastEnd) : null,
    nextDm,
    window: { from: ws, to: we },
  };
}

export function longState(model, rules, day, dm, walks) {
  const { long: goal } = goals(model);
  const n = walks.list.filter((w) => w.kind === 'larga').length;
  const warn = hhmmToDayMin(rules.long_walks.warn);
  const alert = hhmmToDayMin(rules.long_walks.alert);
  let level;
  let text;
  if (n >= goal) [level, text] = ['ok', 'Cumplidos'];
  else if (dm >= alert) [level, text] = ['alert', `Falta ${goal - n === 1 ? 'uno' : goal - n}`];
  else if (n === 0 && dm >= warn) [level, text] = ['warn', `Todavía ninguno · ${beforeHour(alert)}`];
  else [level, text] = [n ? 'ok' : 'off', `${n ? 'El otro' : goal === 2 ? 'Los dos' : `Los ${goal}`}, ${beforeHour(alert)}`];
  return { id: 'long', level, text, count: n, goal };
}

// ───────────── perras ─────────────

export function dogState(model, rules, dog, day, dm, nowTs) {
  const ws = hhmmToDayMin(rules.walk_window.from);
  const we = hhmmToDayMin(rules.walk_window.to);
  const rows = [];
  for (const w of model.walks) {
    if (new Date(w.started_at).getTime() > nowTs) continue;
    const d = w.dogs.find((x) => x.dog_id === dog.id);
    if (d) rows.push({ w, d, at: Math.min(tsOf(w), nowTs) });
  }
  let lastPoop = null;
  let lastPee = null;
  const poops = [];
  for (const r of rows) {
    if (r.d.poop === 'si' || r.d.poop === 'raro') {
      lastPoop = r.at;
      poops.push(r.d.poop);
    }
    if (r.d.pee) lastPee = r.at;
  }
  const trackStart = dayMinToTs(model.startDate ?? day, DAY_START_HOUR * 60);
  const poopMin = (nowTs - (lastPoop ?? trackStart)) / 60000;
  const peeActive = activeMinutes(lastPee ?? trackStart, nowTs, ws, we);
  const poopLevel = poopMin >= rules.poop_hours.alert * 60 ? 'alert' : poopMin >= rules.poop_hours.warn * 60 ? 'warn' : 'ok';
  const peeLevel = rules.pee_hours?.warn && peeActive >= rules.pee_hours.warn * 60 ? 'warn' : 'ok';
  const lastTwo = poops.slice(-2);
  const rareTwice = lastTwo.length === 2 && lastTwo.every((p) => p === 'raro');
  const todays = rows.filter((r) => r.w.day === day);
  return {
    id: `dog-${dog.id}`,
    dog,
    level: worst([poopLevel, peeLevel, rareTwice ? 'alert' : 'ok']),
    poopLevel,
    peeLevel,
    rareTwice,
    lastPoop,
    lastPee,
    poopMin,
    peeAgoMin: lastPee ? (nowTs - lastPee) / 60000 : null,
    peeActive,
    pees: todays.filter((r) => r.d.pee).length,
    poopsToday: todays.filter((r) => r.d.poop === 'si' || r.d.poop === 'raro').length,
    todays,
  };
}

// ───────────── el día ─────────────

/**
 * Estado del día `day` a la hora `now`. Si el día ya terminó, se evalúa al cierre (5:00).
 * Con visitas, lo privado (pastillas) queda fuera de `visible`, de la franja roja y de lo que titila.
 */
export function computeDay(model, { day, now = Date.now(), visitas = false } = {}) {
  const rules = rulesOf(model);
  const today = dayOf(now);
  const ended = day < today;
  const dm = ended ? DAY_END_MIN : dayMinutesOf(now);
  const nowTs = ended ? dayMinToTs(day, DAY_END_MIN) : new Date(now).getTime();

  const pills = model.people
    .map((p) => {
      const rows = model.habits.filter((h) => h.person_id === p.id && h.source === 'manual').map((h) => pillState(model, h, day, dm));
      return { id: `pills-${p.id}`, person: p, rows, level: worst(rows.map((r) => r.level)) };
    })
    .filter((p) => p.rows.length);
  const walks = walksState(model, rules, day, dm);
  const long = longState(model, rules, day, dm, walks);
  const dogs = model.dogs.map((d) => dogState(model, rules, d, day, dm, nowTs));

  const items = [];
  for (const p of pills) {
    for (const r of p.rows) items.push({ id: r.id, kind: 'pill', level: r.level, private: true, short: pillShort(p.person, r) });
  }
  items.push({ id: 'walks', kind: 'walks', level: walks.level, short: walks.count ? walks.text : walks.level === 'due' ? 'Toca la primera salida' : walks.text });
  items.push({ id: 'long', kind: 'long', level: long.level, short: long.level === 'alert' ? `Falta ${long.goal - long.count === 1 ? 'un paseo largo' : `${long.goal - long.count} paseos largos`}` : 'Todavía ningún paseo largo' });
  for (const d of dogs) {
    const name = d.dog.name;
    if (d.rareTwice) items.push({ id: `${d.id}-raro`, kind: 'dog', level: 'alert', short: `${name}: algo raro dos veces seguidas` });
    items.push({ id: `${d.id}-caca`, kind: 'dog', level: d.poopLevel, short: `${name} sin caca hace ${fmtSpan(d.poopMin)}` });
    items.push({ id: `${d.id}-pis`, kind: 'dog', level: d.peeLevel, short: `${name} sin pis hace ${fmtSpan(d.peeAgoMin ?? d.peeActive)}` });
  }
  const visible = visitas ? items.filter((i) => !i.private) : items;
  return {
    day,
    dm,
    ended,
    nowTs,
    rules,
    pills,
    walks,
    long,
    dogs,
    items,
    visible,
    alerts: visible.filter((i) => i.level === 'alert'),
    attention: visible.filter((i) => ATTENTION.has(i.level)),
    worst: worst(visible.map((i) => i.level)),
  };
}

// ───────────── modo noche ─────────────

const clockMin = (s) => {
  const [h, m] = String(s).split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * De 1 a 7: pantalla tenue. Muestra el día que termina (o que terminó a las 5).
 * `calm`: todo cumplido o alguien tocó "Entendido".
 */
export function nightInfo(model, now, { visitas = false } = {}) {
  const rules = rulesOf(model);
  const from = clockMin(rules.ipad.night.from);
  const to = clockMin(rules.ipad.night.to);
  const cm = minutesOf(now);
  const isNight = from <= to ? cm >= from && cm < to : cm >= from || cm < to;
  if (!isNight) return null;
  const offset = Math.max(0, to - DAY_START_HOUR * 60);
  const day = dayOf(new Date(now).getTime() - offset * 60000);
  const status = computeDay(model, { day, now, visitas });
  const acked = model.acks?.has(day) ?? false;
  const missing = status.attention;
  return { day, status, acked, missing, calm: acked || missing.length === 0 };
}

// ───────────── la semana ─────────────

/** Últimos 7 días (desde el inicio del registro), en tono positivo. */
export function weekInfo(model, now) {
  const today = dayOf(now);
  const start = model.startDate && model.startDate > addDays(today, -6) ? model.startDate : addDays(today, -6);
  const days = start <= today ? range(start, today) : [];
  const rows = days.map((day) => {
    const st = computeDay(model, { day, now });
    const walksOk = st.walks.count >= st.walks.goal && st.long.count >= st.long.goal;
    const pills = st.pills.map((p) => ({ person: p.person, ok: p.rows.every((r) => r.level === 'ok') }));
    return {
      day,
      today: day === today,
      walks: st.walks.count,
      longs: st.long.count,
      walksOk,
      pills,
      complete: walksOk && pills.every((p) => p.ok),
    };
  });
  const streak = (test) => {
    let n = 0;
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (test(rows[i])) n += 1;
      else if (rows[i].today) continue; // hoy todavía puede completarse
      else break;
    }
    return n;
  };
  const inRange = (d) => d >= (days[0] ?? today) && d <= today;
  return {
    days: rows,
    salidas: rows.reduce((s, r) => s + r.walks, 0),
    largos: rows.reduce((s, r) => s + r.longs, 0),
    tarritos: model.refills.filter((r) => inRange(r.day)).length,
    premios: model.treats.filter((t) => inRange(t.day)).length,
    walkStreak: streak((r) => r.walksOk),
    pillStreaks: model.people
      .map((p) => ({ person: p, n: streak((r) => r.pills.find((x) => x.person.id === p.id)?.ok) }))
      .filter((x) => rows.some((r) => r.pills.some((y) => y.person.id === x.person.id))),
    completeDays: rows.filter((r) => r.complete).length,
    walkDays: rows.filter((r) => r.walksOk).length,
  };
}
