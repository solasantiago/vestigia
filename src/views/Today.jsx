import { useMemo, useState } from 'react';
import { useApp } from '../lib/appctx.js';
import { useData, useRun } from '../lib/data.jsx';
import { useKiosk } from '../lib/kiosk.jsx';
import { addDays, calDayOf, calTodayISO, dayMinutesOf, dow, fmtDayLong, fmtDayShort, fmtDuration, fmtTime, fmtWeekday } from '../lib/dates.js';
import { fmt1, fmt2, fmtInt, fmtSigned } from '../lib/format.js';
import { visibleEvents } from '../lib/metrics.js';
import { computeDay, cycleState, CYCLE_PHASE, rulesOf } from '../lib/status.js';
import { Avatar, Dialog } from '../components/ui.jsx';
import { FootIcon, NoTraces } from '../components/prints.jsx';
import { Dot, lv, StatusChip } from '../components/Semaforo.jsx';
import { DogsPanel } from '../components/DogsPanel.jsx';
import { FEATURES } from '../config.js';
import { EventRow } from './common.jsx';
import MoodCard from './Mood.jsx';

export default function Today() {
  const { person } = useApp();
  return person === 'casa' ? <KioskToday /> : <PersonToday />;
}

/** Kiosco del iPad: tres columnas sin scroll (Mica y Santi · Mocka y Honey · Agenda). */
function KioskToday() {
  const { model } = useData();
  const { today, now } = useApp();
  const kiosk = useKiosk();
  const st = useMemo(() => computeDay(model, { day: today, now }), [model, today, now]);
  const calm = model.acks.has(today);
  return (
    <div className="kiosk-today">
      <section className="kcol kcol-pills" aria-label="Pastillas">
        {(kiosk.phone && kiosk.who ? [...st.pills].sort((a, b) => (b.person.id === kiosk.who) - (a.person.id === kiosk.who)) : st.pills).map((p) => (
          <PillsBlock key={p.id} block={p} calm={calm} />
        ))}
        {!st.pills.length ? <NoTraces>Todavía no hay pastillas ni hábitos cargados.</NoTraces> : null}
      </section>
      <section className="kcol kcol-dogs" aria-label="Mocka y Honey">
        <DogsPanel st={st} who={kiosk.who} calm={calm} />
      </section>
      <section className="kcol kcol-agenda" aria-label="Agenda">
        <CycleCard />
        <HealthCards />
        <AgendaPanel />
      </section>
    </div>
  );
}

/** Vista personal (cuentas de Mica y Santi, desde la v0.2). */
function PersonToday() {
  const { model } = useData();
  const { person, today, now } = useApp();
  const st = useMemo(() => computeDay(model, { day: today, now }), [model, today, now]);
  const mine = st.pills.filter((p) => p.person.id === person);
  return (
    <div className="grid today-grid">
      <div className="stack">
        {mine.map((p) => (
          <PillsBlock key={p.id} block={p} />
        ))}
        {FEATURES.mood ? <MoodCard /> : null}
      </div>
      <DogsPanel st={st} who={person} />
      <AgendaPanel />
    </div>
  );
}

// ───────────── pastillas ─────────────

function PillsBlock({ block, calm }) {
  const { model } = useData();
  const { today, now } = useApp();
  const routine = model.routineItems.filter((r) => r.person_id === block.person.id);
  // La rutina para dormir aparece desde las 18 h (o si ya se marcó algo hoy).
  const started = routine.some((r) => model.routineLogs.has(`${r.id}|${today}`));
  const showRoutine = routine.length > 0 && (dayMinutesOf(now) >= 18 * 60 || started);
  return (
    <div className={`kblock pills-block ${lv(block.level, { blink: false, calm })}`}>
      <header className="kblock-head">
        <span className="kblock-title">
          <Avatar person={block.person} size="sm" /> {block.person.short_name}
        </span>
        <StatusChip level={block.level} size="sm" />
      </header>
      <ul className="prows">
        {block.rows.map((r) => (
          <PillRow key={r.id} r={r} />
        ))}
      </ul>
      {showRoutine ? <RoutineBlock items={routine} collapsible={calm !== undefined} /> : null}
    </div>
  );
}

function PillRow({ r }) {
  const { actions } = useData();
  const { today } = useApp();
  const run = useRun();
  const h = r.habit;
  const { doses, amount } = r;
  const set = (status, amt, closed = false) => run(() => actions.setDose(h, today, { status, amount: amt, closed }));
  const clear = () => run(() => actions.clearHabit(h, today));
  // Deshacer vuelve un paso atrás: reabre un "Hoy no" o saca la última toma.
  const undo = () => {
    if (r.level === 'closed' && r.checkin?.status !== 'na') return amount ? set('parcial', amount) : clear();
    if (r.done && doses > 1) return set('parcial', amount - 1);
    return clear();
  };

  let actionsEl;
  if (r.done || r.level === 'closed') {
    actionsEl = (
      <button type="button" className="btn ghost xs" onClick={undo}>
        Deshacer
      </button>
    );
  } else if (r.optional) {
    // Opcional: un solo botón chico, sin "Hoy no".
    actionsEl = (
      <button type="button" className="btn yes xs" onClick={() => set('si', doses)}>
        La tomé ✓
      </button>
    );
  } else if (amount > 0) {
    actionsEl = (
      <>
        <button type="button" className="btn yes" onClick={() => set(amount + 1 >= doses ? 'si' : 'parcial', amount + 1)}>
          {doses - amount === 1 ? (doses === 2 ? 'La segunda ✓' : 'La última ✓') : '+1'}
        </button>
        <button type="button" className="btn ghost" onClick={() => set('parcial', amount, true)}>
          Hoy no
        </button>
        <button type="button" className="btn ghost xs" onClick={undo}>
          Deshacer
        </button>
      </>
    );
  } else if (doses > 1) {
    actionsEl = (
      <>
        <button type="button" className="btn yes" onClick={() => set('si', doses)}>
          {doses === 2 ? 'Las dos' : `Las ${doses}`}
        </button>
        <button type="button" className="btn yes soft" onClick={() => set('parcial', 1)}>
          Una
        </button>
        <button type="button" className="btn ghost" onClick={() => set('no', 0, true)}>
          Hoy no
        </button>
      </>
    );
  } else {
    actionsEl = (
      <>
        <button type="button" className="btn yes" onClick={() => set('si', 1)}>
          Sí, la tomé
        </button>
        <button type="button" className="btn ghost" onClick={() => set('no', 0, true)}>
          Hoy no
        </button>
      </>
    );
  }

  const suggestOne = doses > 1 && amount === 0 && !r.done && ['due', 'warn', 'alert'].includes(r.level);
  return (
    <li className={`prow lv-${r.level} ${r.done || r.level === 'closed' || r.optional ? 'done' : ''}`}>
      <div className="prow-text">
        <span className="prow-label">
          <span aria-hidden="true">{h.emoji}</span> {r.label}
        </span>
        {r.range || r.detail ? <span className="prow-range">{[r.detail, r.range].filter(Boolean).join(' · ')}</span> : null}
        <span className="prow-state">
          <Dot level={r.level} /> {r.text}
        </span>
        {suggestOne ? <span className="prow-hint">Si te sirve, una ahora y la otra a la noche.</span> : null}
      </div>
      <div className="prow-actions">{actionsEl}</div>
    </li>
  );
}

/** Ciclo: fase y día, y "¿Te vino?" solo cuando corresponde. Sin semáforo. Va arriba de la agenda. */
function CycleCard() {
  const { model, actions } = useData();
  const { now } = useApp();
  const run = useRun();
  const cal = calTodayISO(new Date(now));
  const personId = rulesOf(model).cycle?.person_id;
  const person = personId ? model.peopleById.get(personId) : null;
  const c = person ? cycleState(model, rulesOf(model), cal, personId) : null;
  if (!c) return null;
  const recent = c.lastRow && Date.now() - new Date(c.lastRow.created_at ?? 0).getTime() < 10 * 60 * 1000;
  const mark = (d) => run(() => actions.markCycle(personId, d), 'Anotado');
  return (
    <div className="kblock cycle-card">
      <header className="kblock-head">
        <span className="kblock-title">
          <Avatar person={person} size="sm" /> 🌸 Ciclo
        </span>
      </header>
      <div className="cycle">
      <span className="cycle-text">
        {c.phase ? <strong>{`${CYCLE_PHASE[c.phase]} · día ${c.day}`}</strong> : null}
        <span className="cycle-sub">{c.text}</span>
      </span>
      {c.canMark ? (
        <span className="cycle-actions">
          <span className="cycle-q">¿Te vino?</span>
          <button type="button" className="btn yes xs" onClick={() => mark(cal)}>
            Hoy
          </button>
          <button type="button" className="btn ghost xs" onClick={() => mark(addDays(cal, -1))}>
            Ayer
          </button>
        </span>
      ) : recent ? (
        <button type="button" className="link-btn" onClick={() => run(() => actions.undoCycle(c.lastRow.id), 'Borrado')}>
          deshacer
        </button>
      ) : null}
      </div>
    </div>
  );
}

// ───────────── peso ─────────────

/** "hoy 17:30" · "ayer 08:10" · "18 oct" */
function whenLabel(ts, cal) {
  const d = calDayOf(ts);
  if (d === cal) return `hoy ${fmtTime(ts)}`;
  if (d === addDays(cal, -1)) return `ayer ${fmtTime(ts)}`;
  return fmtDayShort(d);
}

function WeightDialog({ person, list, cal, onClose }) {
  const { actions } = useData();
  const run = useRun();
  const last = list[list.length - 1];
  const [text, setText] = useState(last ? fmt1(last.kg) : '');
  const parsed = Number(String(text).replace(',', '.').trim());
  const kg = Number.isFinite(parsed) ? Math.round(parsed * 10) / 10 : NaN;
  const valid = text !== '' && kg >= 20 && kg <= 300;
  const step = (d) => setText(fmt1(Math.round(((valid ? kg : last?.kg ?? 70) + d) * 10) / 10));
  const save = () =>
    run(async () => {
      await actions.logWeight(person.id, kg);
      onClose();
    }, 'Peso anotado');
  return (
    <Dialog
      open
      onClose={onClose}
      title={`⚖️ Peso de ${person.short_name}`}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={!valid} onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <div className="weight-input">
        <button type="button" className="btn ghost" aria-label="Restar 100 gramos" onClick={() => step(-0.1)}>
          −
        </button>
        <label>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={text}
            aria-label="Peso en kilos, con un decimal"
            onChange={(e) => setText(e.target.value.replace(/[^0-9.,]/g, ''))}
            onFocus={(e) => e.target.select()}
          />
          <span>kg</span>
        </label>
        <button type="button" className="btn ghost" aria-label="Sumar 100 gramos" onClick={() => step(0.1)}>
          +
        </button>
      </div>
      <p className="weight-help">{valid ? `Se guarda ${fmt1(kg)} kg, con la hora de ahora.` : 'Escribí el peso en kilos, con un decimal (por ejemplo 94,4).'}</p>
      {list.length ? (
        <ul className="weight-hist">
          {list
            .slice(-5)
            .reverse()
            .map((w) => (
              <li key={w.id}>
                <span>{whenLabel(w.measured_at, cal)}</span>
                <strong>{fmt1(w.kg)} kg</strong>
              </li>
            ))}
        </ul>
      ) : null}
    </Dialog>
  );
}

// ───────────── ejercicio ─────────────

const ZONES = ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5'];
const pad2 = (n) => String(n).padStart(2, '0');
/** 3487 → "58:07"; 3725 → "1:02:05" */
function fmtClockSec(sec) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${m}:${pad2(s % 60)}`;
}
/** segundos por km → 12'46" */
function fmtPace(secPerKm) {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '—';
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}'${pad2(s % 60)}"`;
}
const fmtKm = (km) => (km == null ? '—' : Number.isInteger(km * 10) ? fmt1(km) : fmt2(km));
const durSec = (w) => (new Date(w.ended_at) - new Date(w.started_at)) / 1000;

function ZoneBar({ zones, size = 'sm' }) {
  const z = (zones ?? []).map((v) => Number(v) || 0);
  const total = z.reduce((a, b) => a + b, 0);
  if (!total) return null;
  return (
    <div className={`zone-bar ${size}`} role="img" aria-label={z.map((v, i) => `${ZONES[i]}: ${fmtClockSec(v)}`).join(', ')}>
      {z.map((v, i) => (v ? <span key={i} className={`z${i + 1}`} style={{ flexGrow: v }} /> : null))}
    </div>
  );
}

function weekOf(list, cal) {
  const monday = addDays(cal, -((dow(cal) + 6) % 7));
  const ws = list.filter((w) => calDayOf(w.started_at) >= monday);
  return {
    n: ws.length,
    sec: ws.reduce((a, w) => a + durSec(w), 0),
    km: ws.reduce((a, w) => a + (w.distance_km ?? 0), 0),
  };
}

function WorkoutDialog({ person, list, cal, onClose }) {
  const [selId, setSelId] = useState(list[list.length - 1].id);
  const w = list.find((x) => x.id === selId) ?? list[list.length - 1];
  const sec = durSec(w);
  const day = calDayOf(w.started_at);
  const zones = (w.zones_sec ?? []).map((v) => Number(v) || 0);
  const zTotal = zones.reduce((a, b) => a + b, 0);
  const splits = Array.isArray(w.splits) ? w.splits : [];
  const ctx = [`${fmtWeekday(day, 'short')} ${Number(day.slice(8))}/${Number(day.slice(5, 7))}`, `${fmtTime(w.started_at)}–${fmtTime(w.ended_at)}`, w.temp_c != null ? `${w.temp_c}°` : null, w.humidity != null ? `${w.humidity} % humedad` : null]
    .filter(Boolean)
    .join(' · ');
  const stats = [
    ['Duración', fmtClockSec(sec)],
    ['Distancia', w.distance_km != null ? `${fmtKm(w.distance_km)} km` : '—'],
    ['Ritmo prom.', w.distance_km ? `${fmtPace(sec / w.distance_km)} /km` : '—'],
    ['Pulso', w.hr_avg ? `${w.hr_avg} prom.${w.hr_max ? ` · ${w.hr_max} máx.` : ''}` : '—'],
    ['Calorías', w.kcal_active ? `${w.kcal_active} activas${w.kcal_total ? ` · ${w.kcal_total} total` : ''}` : '—'],
    ['Esfuerzo', w.effort ? `${w.effort} / 10` : '—'],
  ];
  const wk = weekOf(list, cal);
  return (
    <Dialog
      open
      onClose={onClose}
      title={`🏃 Ejercicio de ${person.short_name}`}
      footer={
        <button type="button" className="btn primary" onClick={onClose}>
          Listo
        </button>
      }
    >
      <div className="wo">
        <div className="wo-head">
          <strong>
            {w.kind}
            {w.plan ? ` · ${w.plan}` : ''}
          </strong>
          <span>{ctx}</span>
        </div>

        <dl className="wo-stats">
          {stats.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        {zTotal ? (
          <section className="wo-sec">
            <h4>Pulso por zona</h4>
            <ZoneBar zones={zones} size="lg" />
            <ul className="wo-zones">
              {zones.map((v, i) => (
                <li key={i}>
                  <span className={`zone-dot z${i + 1}`} aria-hidden="true" />
                  <span>{ZONES[i]}</span>
                  <span className="num">{fmtClockSec(v)}</span>
                  <span className="num muted">{Math.round((v / zTotal) * 100)} %</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {splits.length ? (
          <section className="wo-sec">
            <h4>Tramos</h4>
            <table className="wo-table">
              <thead>
                <tr>
                  <th>Km</th>
                  <th>Tiempo</th>
                  <th>Ritmo</th>
                  <th>Pulso</th>
                </tr>
              </thead>
              <tbody>
                {splits.map((t, i) => {
                  const upTo = splits.slice(0, i + 1).reduce((a, x) => a + (Number(x.km) || 0), 0);
                  return (
                    <tr key={i}>
                      <td>{fmtKm(Math.round(upTo * 100) / 100)}</td>
                      <td>{fmtClockSec(t.sec)}</td>
                      <td>{fmtPace(t.sec / (Number(t.km) || 1))}</td>
                      <td>{t.hr ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ) : null}

        {w.hr_end != null && w.hr_1min != null ? (
          <section className="wo-sec">
            <h4>Recuperación</h4>
            <p>
              Al terminar {w.hr_end} lpm · al minuto {w.hr_1min} lpm ({fmtSigned(w.hr_1min - w.hr_end, 0)})
            </p>
          </section>
        ) : null}

        {w.note ? (
          <section className="wo-sec">
            <h4>Nota</h4>
            <p>{w.note}</p>
          </section>
        ) : null}

        <section className="wo-sec">
          <h4>Historial</h4>
          <p className="muted small">
            Esta semana: {wk.n === 1 ? '1 sesión' : `${wk.n} sesiones`} · {fmtDuration(wk.sec / 60)}
            {wk.km ? ` · ${fmtKm(Math.round(wk.km * 100) / 100)} km` : ''}
          </p>
          <table className="wo-table wo-hist">
            <thead>
              <tr>
                <th>Día</th>
                <th>Tiempo</th>
                <th>Km</th>
                <th>Pulso</th>
                <th>Esf.</th>
              </tr>
            </thead>
            <tbody>
              {[...list]
                .reverse()
                .slice(0, 12)
                .map((x) => (
                  <tr key={x.id} className={x.id === w.id ? 'sel' : ''} onClick={() => setSelId(x.id)}>
                    <td>
                      <button type="button" className="link-btn" aria-pressed={x.id === w.id} onClick={() => setSelId(x.id)}>
                        {whenLabel(x.started_at, cal)}
                      </button>
                    </td>
                    <td>{fmtClockSec(durSec(x))}</td>
                    <td>{fmtKm(x.distance_km)}</td>
                    <td>{x.hr_avg ?? '—'}</td>
                    <td>{x.effort ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </div>
    </Dialog>
  );
}

// ───────────── comidas ─────────────

const MEAL_SLOT = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', merienda: 'Merienda', cena: 'Cena', colacion: 'Colación' };
// Referencia general ("5 al día"): 3 de verdura y 2 de fruta. Sin meta de calorías.
const VEG_GOAL = 3;
const FRUIT_GOAL = 2;

function dayTotals(meals) {
  const sum = (k) => meals.reduce((a, m) => a + (Number(m[k]) || 0), 0);
  const has = (k) => meals.some((m) => m[k] != null);
  return {
    n: meals.length,
    kcal: has('kcal') ? sum('kcal') : null,
    protein: has('protein_g') ? sum('protein_g') : null,
    carbs: has('carbs_g') ? sum('carbs_g') : null,
    fat: has('fat_g') ? sum('fat_g') : null,
    veg: sum('veg_servings'),
    fruit: sum('fruit_servings'),
    ultra: meals.filter((m) => m.ultra).length,
  };
}
const fmtServ = (v) => (Number.isInteger(v) ? String(v) : fmt1(v));

function MealDialog({ person, list, onClose }) {
  const { today } = useApp();
  const days = [...new Set(list.map((m) => m.day))].sort().reverse();
  const [day, setDay] = useState(days.includes(today) ? today : days[0]);
  const meals = list.filter((m) => m.day === day);
  const t = dayTotals(meals);
  const label = (d) => (d === today ? 'Hoy' : d === addDays(today, -1) ? 'Ayer' : `${fmtWeekday(d, 'short')} ${Number(d.slice(8))}/${Number(d.slice(5, 7))}`);
  const stats = [
    ['Calorías', t.kcal != null ? `≈ ${fmtInt(t.kcal)}` : '—'],
    ['Proteína', t.protein != null ? `${fmtInt(t.protein)} g` : '—'],
    ['Carbohidratos', t.carbs != null ? `${fmtInt(t.carbs)} g` : '—'],
    ['Grasas', t.fat != null ? `${fmtInt(t.fat)} g` : '—'],
    ['Verdura', `${fmtServ(t.veg)} de ${VEG_GOAL}`],
    ['Fruta', `${fmtServ(t.fruit)} de ${FRUIT_GOAL}`],
  ];
  return (
    <Dialog
      open
      onClose={onClose}
      title={`🍽️ Comidas de ${person.short_name}`}
      footer={
        <button type="button" className="btn primary" onClick={onClose}>
          Listo
        </button>
      }
    >
      <div className="wo">
        <div className="wo-head">
          <strong>{day === today ? 'Hoy' : day === addDays(today, -1) ? 'Ayer' : fmtDayLongCap(day)}</strong>
          <span>
            {t.n === 1 ? '1 comida' : `${t.n} comidas`}
            {t.ultra ? ` · ${t.ultra} con ultraprocesados` : ''}
          </span>
        </div>
        <dl className="wo-stats">
          {stats.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <section className="wo-sec">
          <h4>Lo que comiste</h4>
          {meals.length ? (
            <ul className="meal-list">
              {meals.map((m) => (
                <li key={m.id}>
                  <div className="meal-row">
                    <span className="meal-when">
                      {MEAL_SLOT[m.slot]} · {fmtTime(m.eaten_at)}
                    </span>
                    <span className="meal-kcal">{m.kcal != null ? `≈ ${fmtInt(m.kcal)} kcal` : ''}</span>
                  </div>
                  <strong className="meal-desc">
                    {m.description}
                    {m.ultra ? <span className="meal-chip warn sm">ultraprocesado</span> : null}
                  </strong>
                  {Array.isArray(m.items) && m.items.length ? (
                    <ul className="meal-items">
                      {m.items.map((it, i) => (
                        <li key={i}>
                          <span>
                            {it.name}
                            {it.portion ? <span className="muted"> · {it.portion}</span> : null}
                          </span>
                          <span className="num">
                            {it.kcal != null ? `${fmtInt(it.kcal)} kcal` : ''}
                            {it.protein_g != null ? ` · ${fmtInt(it.protein_g)} g prot.` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {m.note ? <p className="muted small">{m.note}</p> : null}
                  {m.tip ? <p className="meal-tip">💡 {m.tip}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nada cargado este día.</p>
          )}
        </section>

        <section className="wo-sec">
          <h4>Historial</h4>
          <table className="wo-table wo-hist">
            <thead>
              <tr>
                <th>Día</th>
                <th>Comidas</th>
                <th>kcal</th>
                <th>Prot.</th>
                <th>Verd.</th>
                <th>Fruta</th>
              </tr>
            </thead>
            <tbody>
              {days.slice(0, 14).map((d) => {
                const x = dayTotals(list.filter((m) => m.day === d));
                return (
                  <tr key={d} className={d === day ? 'sel' : ''} onClick={() => setDay(d)}>
                    <td>
                      <button type="button" className="link-btn" aria-pressed={d === day} onClick={() => setDay(d)}>
                        {label(d)}
                      </button>
                    </td>
                    <td>{x.n}</td>
                    <td>{x.kcal != null ? fmtInt(x.kcal) : '—'}</td>
                    <td>{x.protein != null ? `${fmtInt(x.protein)} g` : '—'}</td>
                    <td>{fmtServ(x.veg)}</td>
                    <td>{fmtServ(x.fruit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted small">Estimado por foto: puede errar un 20–30 %. Sirve para ver el equilibrio y la tendencia, no el número exacto.</p>
        </section>
      </div>
    </Dialog>
  );
}

const fmtDayLongCap = (d) => {
  const s = fmtDayLong(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// ───────────── salud: peso, ejercicio y comidas en una tarjeta ─────────────

/** Una tarjeta por persona con peso, ejercicio o comidas cargados. Se oculta con visitas. */
function HealthCards() {
  const { model } = useData();
  const kiosk = useKiosk();
  if (kiosk.visitas) return null;
  const ids = [...new Set([...(model.weights ?? []), ...(model.workouts ?? []), ...(model.meals ?? [])].map((x) => x.person_id))];
  return model.people.filter((p) => ids.includes(p.id)).map((p) => <HealthCard key={p.id} person={p} />);
}

function HealthCard({ person }) {
  const { model } = useData();
  const { now, today } = useApp();
  const [dlg, setDlg] = useState(null);
  const cal = calTodayISO(new Date(now));
  const weights = model.weights.filter((w) => w.person_id === person.id);
  const workouts = model.workouts.filter((w) => w.person_id === person.id);
  const meals = model.meals.filter((m) => m.person_id === person.id);
  return (
    <div className="kblock health-card">
      <header className="kblock-head">
        <span className="kblock-title">
          <Avatar person={person} size="sm" /> Salud de {person.short_name}
        </span>
      </header>
      {weights.length ? <WeightRow list={weights} cal={cal} onOpen={() => setDlg('peso')} /> : null}
      {workouts.length ? <WorkoutRow list={workouts} cal={cal} onOpen={() => setDlg('ejercicio')} /> : null}
      {meals.length ? <MealRow list={meals} today={today} onOpen={() => setDlg('comidas')} /> : null}
      {dlg === 'peso' ? <WeightDialog person={person} list={weights} cal={cal} onClose={() => setDlg(null)} /> : null}
      {dlg === 'ejercicio' ? <WorkoutDialog person={person} list={workouts} cal={cal} onClose={() => setDlg(null)} /> : null}
      {dlg === 'comidas' ? <MealDialog person={person} list={meals} onClose={() => setDlg(null)} /> : null}
    </div>
  );
}

function HRow({ icon, main, sub, extra, action }) {
  return (
    <div className="hrow">
      <span className="hrow-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="hrow-text">
        <div className="hrow-top">
          <span className="hrow-main">{main}</span>
          {action}
        </div>
        {sub ? <span className="hrow-sub">{sub}</span> : null}
        {extra}
      </div>
    </div>
  );
}

function WeightRow({ list, cal, onOpen }) {
  const { actions } = useData();
  const run = useRun();
  const last = list[list.length - 1];
  const prev = list[list.length - 2];
  const recent = Date.now() - new Date(last.created_at ?? 0).getTime() < 10 * 60 * 1000;
  const diff = prev ? Math.round((last.kg - prev.kg) * 10) / 10 : null;
  return (
    <HRow
      icon="⚖️"
      main={
        <>
          <strong>{fmt1(last.kg)}</strong> kg
        </>
      }
      sub={
        <>
          {whenLabel(last.measured_at, cal)}
          {diff != null ? ` · ${fmtSigned(diff)} kg vs ${whenLabel(prev.measured_at, cal)}` : ''}
          {recent ? (
            <>
              {' · '}
              <button type="button" className="link-btn" onClick={() => run(() => actions.undoWeight(last.id), 'Borrado')}>
                deshacer
              </button>
            </>
          ) : null}
        </>
      }
      action={
        <button type="button" className="btn ghost xs" onClick={onOpen}>
          + Pesada
        </button>
      }
    />
  );
}

function WorkoutRow({ list, cal, onOpen }) {
  const last = list[list.length - 1];
  const wk = weekOf(list, cal);
  const sub = [whenLabel(last.started_at, cal), last.hr_avg ? `${last.hr_avg} lpm` : null, last.effort ? `esf. ${last.effort}/10` : null, `semana: ${wk.n}`].filter(Boolean).join(' · ');
  return (
    <HRow
      icon="🏃"
      main={
        <>
          <strong>{fmtDuration(durSec(last) / 60)}</strong>
          {last.distance_km != null ? ` · ${fmtKm(last.distance_km)} km` : ''}
        </>
      }
      sub={sub}
      extra={<ZoneBar zones={last.zones_sec} />}
      action={
        <button type="button" className="btn ghost xs" onClick={onOpen}>
          Ver
        </button>
      }
    />
  );
}

function MealRow({ list, today, onOpen }) {
  const mine = list.filter((m) => m.day === today);
  const t = dayTotals(mine);
  const last = mine[mine.length - 1];
  const prevDay = [...new Set(list.map((m) => m.day))].filter((d) => d < today).pop();
  const prevT = prevDay ? dayTotals(list.filter((m) => m.day === prevDay)) : null;
  const bal = (
    <span className="hrow-sub">
      <span className={t.veg >= VEG_GOAL ? 'ok' : ''}>
        verdura {fmtServ(t.veg)}/{VEG_GOAL}
      </span>
      {' · '}
      <span className={t.fruit >= FRUIT_GOAL ? 'ok' : ''}>
        fruta {fmtServ(t.fruit)}/{FRUIT_GOAL}
      </span>
      {t.protein != null ? ` · prot.\u00a0${fmtInt(t.protein)}\u00a0g` : ''}
      {t.ultra ? <span className="warn"> · ultraproc. {t.ultra}</span> : null}
    </span>
  );
  return (
    <HRow
      icon="🍽️"
      main={
        mine.length ? (
          <>
            {t.kcal != null ? (
              <>
                <strong>≈ {fmtInt(t.kcal)}</strong> kcal ·{' '}
              </>
            ) : null}
            {t.n === 1 ? '1 comida' : `${t.n} comidas`}
          </>
        ) : (
          <span className="muted">Nada cargado hoy</span>
        )
      }
      sub={mine.length ? null : prevT?.kcal != null ? `${prevDay === addDays(today, -1) ? 'ayer' : fmtDayShort(prevDay)} ≈ ${fmtInt(prevT.kcal)} kcal` : null}
      extra={
        mine.length ? (
          <>
            {bal}
            {last.tip ? <span className="hrow-tip">💡 {last.tip}</span> : null}
          </>
        ) : null
      }
      action={
        <button type="button" className="btn ghost xs" onClick={onOpen}>
          Ver
        </button>
      }
    />
  );
}

/** Rutina opcional (higiene del sueño): se marca lo que se hizo; lo que no, no cuenta en contra. */
function RoutineBlock({ items, collapsible = false }) {
  const { model, actions } = useData();
  const { today } = useApp();
  const run = useRun();
  const [open, setOpen] = useState(!collapsible);
  const count = items.filter((it) => model.routineLogs.has(`${it.id}|${today}`)).length;
  if (!open) {
    return (
      <button type="button" className="routine routine-closed" onClick={() => setOpen(true)}>
        <strong>🌙 Rutina para dormir</strong>
        <span className="muted small">
          Opcional{count ? ` · ${count} de ${items.length}` : ''} · tocá para anotar
        </span>
      </button>
    );
  }
  return (
    <div className="routine">
      <div className="routine-head">
        <strong>Rutina para dormir</strong>
        <span className="muted small">
          Opcional
          {count ? (
            <>
              {' · '}
              <FootIcon size={12} /> {count} de {items.length}
            </>
          ) : null}
        </span>
      </div>
      <div className="routine-items">
        {items.map((it) => {
          const on = model.routineLogs.has(`${it.id}|${today}`);
          return (
            <button key={it.id} type="button" className={`tag ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => run(() => actions.toggleRoutine(it, today, !on))}>
              <span aria-hidden="true">{it.emoji}</span> {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────── agenda ─────────────

function AgendaPanel() {
  const { model } = useData();
  const { now, go, person } = useApp();
  const cal = calTodayISO(new Date(now));
  const until = addDays(cal, 3);
  const events = visibleEvents(model, person).filter((e) => {
    const d = calDayOf(e.starts_at);
    return d >= cal && d <= until;
  });
  return (
    <div className="kblock agenda-panel">
      <header className="kblock-head">
        <span className="kblock-title">📅 Agenda</span>
        <button type="button" className="btn ghost xs" onClick={() => go('casa')}>
          + Evento
        </button>
      </header>
      <p className="kblock-sub">Hoy y los próximos 3 días</p>
      {events.length ? (
        <ul className="events compact">
          {events.map((e) => (
            <EventRow key={e.id} ev={e} today={cal} people={model.peopleById} />
          ))}
        </ul>
      ) : (
        <NoTraces>Nada agendado para estos días.</NoTraces>
      )}
    </div>
  );
}
