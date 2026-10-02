// Cálculos puros sobre los datos crudos de Supabase. Sin React: se pueden probar con node.
import { addDays, dayOf, diffDays, dow, hoursSince, minutesOf, range, clockToMinutes } from './dates.js';

// ───────────── utilidades numéricas ─────────────

export function mean(values) {
  let s = 0;
  let n = 0;
  for (const v of values) {
    if (v != null && !Number.isNaN(v)) {
      s += v;
      n += 1;
    }
  }
  return n ? s / n : null;
}

export function sum(values) {
  let s = 0;
  for (const v of values) if (v != null && !Number.isNaN(v)) s += v;
  return s;
}

/** Correlación de Pearson + recta de regresión. Ignora pares incompletos. */
export function pearson(xs, ys) {
  const pts = [];
  for (let i = 0; i < xs.length; i += 1) {
    if (xs[i] != null && ys[i] != null && !Number.isNaN(xs[i]) && !Number.isNaN(ys[i])) pts.push([xs[i], ys[i]]);
  }
  const n = pts.length;
  if (n < 5) return { r: null, n, slope: null, intercept: null };
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pts) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  if (!sxx || !syy) return { r: null, n, slope: null, intercept: null };
  const slope = sxy / sxx;
  return { r: sxy / Math.sqrt(sxx * syy), n, slope, intercept: my - slope * mx };
}

export function corrStrength(r) {
  if (r == null) return 'sin datos suficientes';
  const a = Math.abs(r);
  if (a < 0.1) return 'sin relación';
  if (a < 0.3) return 'relación débil';
  if (a < 0.5) return 'relación moderada';
  return 'relación fuerte';
}

/** Promedio móvil de `win` días; necesita al menos `min` valores en la ventana. */
export function rolling(values, win = 7, min = 3) {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - win + 1), i + 1).filter((v) => v != null);
    return slice.length >= min ? slice.reduce((s, v) => s + v, 0) / slice.length : null;
  });
}

// ───────────── modelo indexado ─────────────

const SLOT_ORDER = { manana: 0, mediodia: 1, tarde: 2, noche: 3 };

export function buildModel(db) {
  const settings = db.household_settings?.[0] ?? null;
  const startDate = settings?.start_date ?? null;
  const habits = [...db.habits]
    .filter((h) => h.active)
    .sort((a, b) => a.sort - b.sort || a.id - b.id)
    .map((h) => {
      // Un hábito cuenta desde el inicio del registro o desde que se creó, lo que sea más tarde.
      const created = h.created_at ? dayOf(h.created_at) : null;
      const from = [startDate, created].filter(Boolean).sort().pop() ?? null;
      return { ...h, from };
    });

  const checkinsByHabit = new Map();
  for (const c of db.habit_checkins) {
    if (!checkinsByHabit.has(c.habit_id)) checkinsByHabit.set(c.habit_id, new Map());
    checkinsByHabit.get(c.habit_id).set(c.day, c);
  }

  const moodByPerson = new Map();
  for (const m of db.mood_entries) {
    if (!moodByPerson.has(m.person_id)) moodByPerson.set(m.person_id, new Map());
    const byDay = moodByPerson.get(m.person_id);
    if (!byDay.has(m.day)) byDay.set(m.day, {});
    byDay.get(m.day)[m.slot] = m;
  }

  const healthByPerson = new Map();
  for (const h of db.health_daily) {
    if (!healthByPerson.has(h.person_id)) healthByPerson.set(h.person_id, new Map());
    healthByPerson.get(h.person_id).set(h.day, h);
  }

  const screenByPerson = new Map();
  for (const s of db.screen_time) {
    if (!screenByPerson.has(s.person_id)) screenByPerson.set(s.person_id, new Map());
    const byDay = screenByPerson.get(s.person_id);
    if (!byDay.has(s.day)) byDay.set(s.day, { total: 0, byCat: {}, byApp: {} });
    const d = byDay.get(s.day);
    d.total += s.minutes;
    d.byCat[s.category] = (d.byCat[s.category] ?? 0) + s.minutes;
    d.byApp[s.app] = { minutes: s.minutes, category: s.category };
  }

  const dogsByWalk = new Map();
  for (const wd of db.walk_dogs) {
    if (!dogsByWalk.has(wd.walk_id)) dogsByWalk.set(wd.walk_id, []);
    dogsByWalk.get(wd.walk_id).push(wd);
  }
  const walks = db.walks
    .map((w) => ({
      ...w,
      day: dayOf(w.started_at),
      minutes: w.ended_at ? Math.round((new Date(w.ended_at) - new Date(w.started_at)) / 60000) : null,
      dogs: dogsByWalk.get(w.id) ?? [],
    }))
    .sort((a, b) => new Date(a.started_at) - new Date(b.started_at));

  const mealsByDay = new Map();
  for (const m of db.dog_meals) {
    if (!mealsByDay.has(m.day)) mealsByDay.set(m.day, {});
    mealsByDay.get(m.day)[m.meal] = m;
  }

  const logsByChore = new Map();
  for (const l of [...db.chore_logs].sort((a, b) => new Date(a.done_at) - new Date(b.done_at))) {
    if (!logsByChore.has(l.chore_id)) logsByChore.set(l.chore_id, []);
    logsByChore.get(l.chore_id).push(l);
  }

  const routineItems = [...(db.routine_items ?? [])].filter((r) => r.active).sort((a, b) => a.sort - b.sort);
  const routineLogs = new Map();
  for (const l of db.routine_logs ?? []) routineLogs.set(`${l.item_id}|${l.day}`, l);
  const treats = [...(db.dog_treats ?? [])]
    .map((t) => ({ ...t, day: dayOf(t.given_at) }))
    .sort((a, b) => new Date(a.given_at) - new Date(b.given_at));

  const people = [...db.people].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));
  const firstDay = startDate ?? [...db.health_daily.map((h) => h.day), ...db.habit_checkins.map((c) => c.day)].sort()[0] ?? null;

  return {
    people,
    peopleById: new Map(people.map((p) => [p.id, p])),
    dogs: [...db.dogs].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name)),
    habits,
    chores: [...db.chores].filter((c) => c.active !== false).sort((a, b) => a.sort - b.sort),
    settings,
    startDate,
    checkinsByHabit,
    moodByPerson,
    healthByPerson,
    screenByPerson,
    walks,
    mealsByDay,
    purchases: [...db.food_purchases].sort((a, b) => a.bought_on.localeCompare(b.bought_on)),
    refills: [...db.food_refills].map((r) => ({ ...r, day: dayOf(r.at) })).sort((a, b) => new Date(a.at) - new Date(b.at)),
    routineItems,
    routineLogs,
    treats,
    // Aplicaciones programadas de tratamientos de las perras (colirio, etc.).
    meds: [...(db.dog_meds ?? [])].sort((a, b) => new Date(a.due_at) - new Date(b.due_at) || a.id - b.id),
    events: [...db.events].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)),
    logsByChore,
    firstDay,
    // Días reconocidos con "Entendido" en el modo noche.
    acks: new Map((db.day_acks ?? []).map((a) => [a.day, a])),
  };
}

// ───────────── hábitos ─────────────

export function habitsOf(model, personId) {
  return model.habits.filter((h) => h.person_id === personId);
}

export function isScheduled(habit, day) {
  return habit.days.includes(dow(day));
}

/** before (antes del inicio) · off (no toca) · si · no · na (no aplica) · miss (sin responder) · pending (hoy) · future */
export function habitDayState(model, habit, day, today) {
  if (habit.from && day < habit.from) return 'before';
  if (!isScheduled(habit, day)) return 'off';
  const c = model.checkinsByHabit.get(habit.id)?.get(day);
  if (c) return c.status;
  if (day < today) return 'miss';
  if (day === today) return 'pending';
  return 'future';
}

const COUNTS = new Set(['si', 'no', 'miss', 'parcial']);

export function habitStreaks(model, habit, today) {
  const first = model.firstDay ?? addDays(today, -90);
  let current = 0;
  for (let d = today; d >= first; d = addDays(d, -1)) {
    const s = habitDayState(model, habit, d, today);
    if (!COUNTS.has(s)) continue;
    if (s === 'si') current += 1;
    else break;
  }
  let max = 0;
  let run = 0;
  for (const d of range(first, today)) {
    const s = habitDayState(model, habit, d, today);
    if (!COUNTS.has(s)) continue;
    if (s === 'si') {
      run += 1;
      max = Math.max(max, run);
    } else run = 0;
  }
  return { current, max };
}

export function habitCompliance(model, habit, days, today) {
  const c = { si: 0, no: 0, miss: 0, na: 0, parcial: 0, scheduled: 0 };
  for (const d of days) {
    const s = habitDayState(model, habit, d, today);
    if (s === 'off' || s === 'future' || s === 'before') continue;
    // Hoy sin terminar no cuenta; hoy "a medias" tampoco todavía (puede completarse a la noche).
    if (s === 'pending' || (s === 'parcial' && d === today)) continue;
    c.scheduled += 1;
    c[s] += 1;
  }
  const base = c.si + c.no + c.miss + c.parcial;
  return { ...c, pct: base ? c.si / base : null };
}

/** Cumplimiento conjunto de varios hábitos en un conjunto de días. */
export function groupCompliance(model, habits, days, today) {
  let si = 0;
  let base = 0;
  let miss = 0;
  for (const h of habits) {
    const c = habitCompliance(model, h, days, today);
    si += c.si;
    base += c.si + c.no + c.miss + c.parcial;
    miss += c.miss;
  }
  return { si, base, miss, pct: base ? si / base : null };
}

/** % por día de la semana (lunes primero). */
export function complianceByWeekday(model, habits, days, today) {
  const names = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return names.map((label, i) => {
    const ds = days.filter((d) => (dow(d) + 6) % 7 === i);
    const c = groupCompliance(model, habits, ds, today);
    return { key: label, label, pct: c.pct, n: c.base };
  });
}

/** % por semana (lunes a domingo). */
export function complianceByWeek(model, habits, days, today) {
  const weeks = new Map();
  for (const d of days) {
    const monday = addDays(d, -((dow(d) + 6) % 7));
    if (!weeks.has(monday)) weeks.set(monday, []);
    weeks.get(monday).push(d);
  }
  return [...weeks.entries()].map(([monday, ds]) => {
    const c = groupCompliance(model, habits, ds, today);
    return { key: monday, day: monday, pct: c.pct, n: c.base };
  });
}

// ───────────── día a día de una persona ─────────────

/** Una fila por día con todo lo medido: la base de las métricas y correlaciones. */
export function personDaily(model, personId, days, today) {
  const habits = habitsOf(model, personId).filter((h) => h.source === 'manual');
  const moods = model.moodByPerson.get(personId) ?? new Map();
  const health = model.healthByPerson.get(personId) ?? new Map();
  const screen = model.screenByPerson.get(personId) ?? new Map();
  const walksByDay = new Map();
  for (const w of model.walks) {
    if (w.walker_id !== personId) continue;
    walksByDay.set(w.day, (walksByDay.get(w.day) ?? 0) + 1);
  }
  return days.map((day) => {
    const m = moods.get(day) ?? {};
    const slots = ['manana', 'tarde', 'noche'].map((s) => m[s]).filter(Boolean);
    const h = health.get(day);
    const sc = screen.get(day);
    const c = groupCompliance(model, habits, [day], today);
    return {
      day,
      mood: mean(slots.map((e) => e.mood)),
      energy: m.manana?.energy ?? null,
      stress: m.tarde?.stress ?? null,
      feelings: [...new Set(slots.flatMap((e) => e.feelings ?? []))],
      influences: [...new Set(slots.flatMap((e) => e.influences ?? []))],
      best: m.noche?.best_of_day ?? null,
      sleepMin: h?.sleep_min ?? null,
      bedtime: h?.bedtime ?? null,
      wake: h?.wake_time ?? null,
      steps: h?.steps ?? null,
      screen: sc ? sc.total : null,
      social: sc ? sc.byCat.Redes ?? 0 : null,
      byCat: sc?.byCat ?? null,
      walks: day < today ? walksByDay.get(day) ?? 0 : walksByDay.get(day) ?? null,
      habitPct: c.pct,
      habitBase: c.base,
    };
  });
}

export function avgClock(values, { lateNight = false } = {}) {
  return mean(values.map((v) => clockToMinutes(v, { lateNight })));
}

// ───────────── pantalla ─────────────

export const SCREEN_CATEGORIES = ['Redes', 'Mensajería', 'Video', 'Navegación', 'Productividad', 'Música'];

export function screenApps(model, personId, days, prevDays) {
  const byDay = model.screenByPerson.get(personId) ?? new Map();
  const acc = new Map();
  const collect = (ds, key) => {
    let n = 0;
    for (const d of ds) {
      const row = byDay.get(d);
      if (!row) continue;
      n += 1;
      for (const [app, v] of Object.entries(row.byApp)) {
        if (!acc.has(app)) acc.set(app, { app, category: v.category, cur: 0, prev: 0 });
        acc.get(app)[key] += v.minutes;
      }
    }
    return n;
  };
  const nCur = collect(days, 'cur');
  const nPrev = collect(prevDays, 'prev');
  return [...acc.values()]
    .map((a) => ({
      ...a,
      avg: nCur ? a.cur / nCur : null,
      prevAvg: nPrev ? a.prev / nPrev : null,
    }))
    .filter((a) => a.avg)
    .sort((a, b) => b.avg - a.avg);
}

// ───────────── ánimo: etiquetas ─────────────

export function tagStats(rows, field) {
  const counts = new Map();
  for (const r of rows) {
    for (const t of r[field]) {
      if (!counts.has(t)) counts.set(t, { tag: t, n: 0, moods: [] });
      const c = counts.get(t);
      c.n += 1;
      if (r.mood != null) c.moods.push(r.mood);
    }
  }
  return [...counts.values()].map((c) => ({ ...c, mood: mean(c.moods) })).sort((a, b) => b.n - a.n);
}

// ───────────── correlaciones e insights ─────────────

export const VARIABLES = [
  { key: 'mood', label: 'Ánimo', unit: '1–5' },
  { key: 'energy', label: 'Energía', unit: '1–5' },
  { key: 'stress', label: 'Estrés', unit: '1–5' },
  { key: 'sleepH', label: 'Sueño', unit: 'h' },
  { key: 'steps', label: 'Pasos', unit: '' },
  { key: 'socialH', label: 'Redes', unit: 'h' },
  { key: 'screenH', label: 'Pantalla', unit: 'h' },
  { key: 'walks', label: 'Paseos', unit: '' },
  { key: 'habitPct', label: 'Hábitos', unit: '%' },
];

export function withDerived(rows) {
  return rows.map((r) => ({
    ...r,
    sleepH: r.sleepMin != null ? r.sleepMin / 60 : null,
    socialH: r.social != null ? r.social / 60 : null,
    screenH: r.screen != null ? r.screen / 60 : null,
  }));
}

export function corrMatrix(rows, vars = VARIABLES) {
  return vars.map((a) =>
    vars.map((b) => {
      if (a.key === b.key) return { r: 1, n: rows.filter((r) => r[a.key] != null).length };
      return pearson(
        rows.map((r) => r[a.key]),
        rows.map((r) => r[b.key]),
      );
    }),
  );
}

function split(rows, target, test) {
  const a = rows.filter((r) => r[target] != null && test(r) === true);
  const b = rows.filter((r) => r[target] != null && test(r) === false);
  return { a, b, ma: mean(a.map((r) => r[target])), mb: mean(b.map((r) => r[target])) };
}

/**
 * Frases simples del estilo del documento funcional:
 * "Los días con menos de 6 h de sueño tu ánimo baja en promedio 1 punto."
 */
export function buildInsights(rows, { stepsGoal = 8000 } = {}) {
  const out = [];
  const add = (id, target, test, { yes, no, metric, better = 'higher', unit = 'puntos', digits = 1, min = 4 }) => {
    const s = split(rows, target, (r) => {
      const v = test(r);
      return v == null ? null : v;
    });
    if (s.a.length < min || s.b.length < min || s.ma == null || s.mb == null) return;
    const diff = s.ma - s.mb;
    out.push({ id, target, metric, yes, no, ma: s.ma, mb: s.mb, na: s.a.length, nb: s.b.length, diff, better, unit, digits });
  };

  const sleepCut = rows.some((r) => r.sleepH != null && r.sleepH < 6) ? 6 : 7;
  add('sueño', 'mood', (r) => (r.sleepH == null ? null : r.sleepH < sleepCut), {
    yes: `menos de ${sleepCut} h de sueño`,
    no: `${sleepCut} h o más`,
    metric: 'ánimo',
  });
  add('energía', 'energy', (r) => (r.sleepH == null ? null : r.sleepH >= 7.5), {
    yes: 'dormís 7 h 30 min o más',
    no: 'menos',
    metric: 'energía a la mañana',
  });
  const walkCut = rows.filter((r) => r.walks >= 2).length >= 4 ? 2 : 1;
  add('paseos', 'stress', (r) => (r.walks == null ? null : r.walks >= walkCut), {
    yes: walkCut === 2 ? 'sacás a los perros 2 veces o más' : 'sacás a los perros al menos una vez',
    no: 'menos',
    metric: 'estrés',
    better: 'lower',
  });
  add('redes', 'mood', (r) => (r.socialH == null ? null : r.socialH > 2), {
    yes: 'más de 2 h en redes',
    no: '2 h o menos',
    metric: 'ánimo',
  });
  add('pasos', 'mood', (r) => (r.steps == null ? null : r.steps >= stepsGoal), {
    yes: `llegás a ${new Intl.NumberFormat('es-AR').format(stepsGoal)} pasos`,
    no: 'no llegás',
    metric: 'ánimo',
  });
  add('hábitos', 'mood', (r) => (r.habitPct == null ? null : r.habitPct >= 0.8), {
    yes: 'cumplís el 80% de los hábitos o más',
    no: 'menos',
    metric: 'ánimo',
  });
  return out.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
}

export function lowMoodStreak(rows, threshold = 2.5) {
  let n = 0;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const m = rows[i].mood;
    if (m == null) {
      if (i === rows.length - 1) continue; // hoy todavía sin cargar
      break;
    }
    if (m <= threshold) n += 1;
    else break;
  }
  return n;
}

// ───────────── perros ─────────────

export function dogStatus(model, dogId, now = Date.now()) {
  const own = model.walks.filter((w) => w.dogs.some((d) => d.dog_id === dogId));
  const last = own[own.length - 1] ?? null;
  const poops = own.filter((w) => w.dogs.some((d) => d.dog_id === dogId && d.poop !== 'no' && d.poop));
  const lastPoopWalk = poops[poops.length - 1] ?? null;
  const lastPoopAt = lastPoopWalk ? lastPoopWalk.ended_at ?? lastPoopWalk.started_at : null;
  const recent = own.slice(-6).flatMap((w) => w.dogs.filter((d) => d.dog_id === dogId).map((d) => ({ ...d, at: w.started_at })));
  const lastTwo = recent.filter((d) => d.poop && d.poop !== 'no').slice(-2);
  return {
    last,
    lastAt: last ? last.ended_at ?? last.started_at : null,
    hoursSinceWalk: last ? hoursSince(last.ended_at ?? last.started_at, now) : null,
    lastPoopAt,
    hoursSincePoop: lastPoopAt ? hoursSince(lastPoopAt, now) : null,
    rareTwice: lastTwo.length === 2 && lastTwo.every((d) => d.poop === 'raro'),
  };
}

export function walksPerDay(model, days) {
  const idx = new Map(days.map((d) => [d, { day: d, total: 0, corta: 0, larga: 0, mocka: 0, honey: 0, minutes: 0 }]));
  for (const w of model.walks) {
    const row = idx.get(w.day);
    if (!row) continue;
    row.total += 1;
    row[w.kind === 'larga' ? 'larga' : 'corta'] += 1;
    row.minutes += w.minutes ?? 0;
    for (const d of w.dogs) row[d.dog_id] = (row[d.dog_id] ?? 0) + 1;
  }
  return [...idx.values()];
}

export function poopPerDay(model, dogId, days) {
  const idx = new Map(days.map((d) => [d, { day: d, si: 0, raro: 0, details: [] }]));
  for (const w of model.walks) {
    const row = idx.get(w.day);
    if (!row) continue;
    for (const d of w.dogs) {
      if (d.dog_id !== dogId) continue;
      if (d.poop === 'si') row.si += 1;
      if (d.poop === 'raro') {
        row.raro += 1;
        if (d.poop_detail) row.details.push(d.poop_detail);
      }
    }
  }
  return [...idx.values()];
}

export function walkHourHistogram(model, days) {
  const set = new Set(days);
  const hist = Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: `${h} h`, hour: h, n: 0 }));
  for (const w of model.walks) if (set.has(w.day)) hist[Math.floor(minutesOf(w.started_at) / 60)].n += 1;
  return hist;
}

/** Cargas de tarritos y premios por día. */
export function feedingPerDay(model, days) {
  const idx = new Map(days.map((d) => [d, { day: d, refills: 0, treats: 0 }]));
  for (const r of model.refills) if (idx.has(r.day)) idx.get(r.day).refills += 1;
  for (const t of model.treats) if (idx.has(t.day)) idx.get(t.day).treats += 1;
  return [...idx.values()];
}

/**
 * Bolsa de alimento sin ración medida: cuánto lleva abierta, cuántas cargas de tarritos,
 * y, cuando ya se terminó al menos una bolsa, cuánto suele durar.
 */
export function foodBag(model, today) {
  const bags = model.purchases;
  const last = bags[bags.length - 1];
  if (!last) return null;
  const daysOpen = Math.max(0, diffDays(today, last.bought_on));
  const refills = model.refills.filter((r) => r.day >= last.bought_on).length;
  // Una bolsa que ya estaba empezada al arrancar el registro no sirve para aprender cuánto dura.
  const finished = bags
    .slice(0, -1)
    .map((b, i) => ({ bag: b, days: diffDays(bags[i + 1].bought_on, b.bought_on) }))
    .filter((f) => f.bag.known_start !== false && f.days > 0);
  const perKg = finished.length ? mean(finished.map((f) => f.days / Number(f.bag.kg))) : null;
  const expected = perKg != null ? perKg * Number(last.kg) : null;
  return {
    last,
    knownStart: last.known_start !== false,
    daysOpen,
    refills,
    finishedBags: finished.length,
    expectedDays: expected,
    daysLeft: expected != null ? expected - daysOpen : null,
  };
}

export function foodStock(model, today) {
  const dailyG = model.dogs.reduce((s, d) => s + (Number(d.daily_ration_g) || 0), 0);
  const last = model.purchases[model.purchases.length - 1];
  if (!last) return null;
  if (!dailyG) {
    return { last, dailyG: 0, totalG: Number(last.kg) * 1000, leftG: null, daysLeft: null, pct: null, refillsSince: 0, refillEvery: null, lastRefill: model.refills[model.refills.length - 1] ?? null };
  }
  const used = Math.max(0, diffDays(today, last.bought_on)) * dailyG;
  const total = Number(last.kg) * 1000;
  const left = Math.max(0, total - used);
  const refills = model.refills.filter((r) => dayOf(r.at) >= last.bought_on);
  const all = model.refills.map((r) => new Date(r.at).getTime());
  const gaps = all.slice(1).map((t, i) => (t - all[i]) / 86400000);
  return {
    last,
    dailyG,
    totalG: total,
    leftG: left,
    daysLeft: left / dailyG,
    pct: total ? left / total : 0,
    refillsSince: refills.length,
    refillEvery: mean(gaps),
    lastRefill: model.refills[model.refills.length - 1] ?? null,
  };
}

export function mealsCompliance(model, days) {
  let both = 0;
  let n = 0;
  for (const d of days) {
    n += 1;
    const m = model.mealsByDay.get(d);
    if (m?.desayuno && m?.cena) both += 1;
  }
  return n ? both / n : null;
}

// ───────────── casa ─────────────

export function choreStatus(model, today) {
  return model.chores.map((c) => {
    const logs = model.logsByChore.get(c.id) ?? [];
    const last = logs[logs.length - 1] ?? null;
    const lastDay = last ? dayOf(last.done_at) : null;
    // Sin registro todavía: no se marca como atrasada, espera a la primera vez.
    const due = lastDay ? addDays(lastDay, c.every_days) : null;
    const overdueBy = due ? diffDays(today, due) : null;
    return { ...c, last, lastDay, due, overdueBy, count: logs.length };
  });
}

export function visibleEvents(model, personId) {
  return model.events.filter((e) => e.visibility === 'compartido' || (personId !== 'casa' && e.owner_id === personId));
}

export function slotOfNow(minutes) {
  if (minutes < 12 * 60) return 'manana';
  if (minutes < 14 * 60 + 30) return 'mediodia';
  if (minutes < 20 * 60) return 'tarde';
  return 'noche';
}

export function moodSlotOfNow(minutes) {
  if (minutes < 13 * 60) return 'manana';
  if (minutes < 20 * 60) return 'tarde';
  return 'noche';
}

export const SLOT_LABEL = { manana: 'Mañana', mediodia: 'Mediodía', tarde: 'Tarde', noche: 'Noche' };
export { SLOT_ORDER };
