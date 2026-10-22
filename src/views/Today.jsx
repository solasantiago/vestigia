import { useMemo, useState } from 'react';
import { useApp } from '../lib/appctx.js';
import { useData, useRun } from '../lib/data.jsx';
import { useKiosk } from '../lib/kiosk.jsx';
import { addDays, calDayOf, calTodayISO, dayMinutesOf, dow, fmtDayShort, fmtDuration, fmtTime } from '../lib/dates.js';
import { fmt1, fmt2, fmtSigned } from '../lib/format.js';
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
        <WeightCards />
        <WorkoutCards />
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

/** Una tarjeta por cada persona con al menos una pesada. Se oculta con visitas. */
function WeightCards() {
  const { model } = useData();
  const kiosk = useKiosk();
  if (kiosk.visitas || !model.weights?.length) return null;
  const ids = [...new Set(model.weights.map((w) => w.person_id))];
  return ids
    .map((id) => model.peopleById.get(id))
    .filter(Boolean)
    .map((p) => <WeightCard key={p.id} person={p} />);
}

function WeightCard({ person }) {
  const { model, actions } = useData();
  const { now } = useApp();
  const run = useRun();
  const [open, setOpen] = useState(false);
  const cal = calTodayISO(new Date(now));
  const list = model.weights.filter((w) => w.person_id === person.id);
  const last = list[list.length - 1];
  const prev = list[list.length - 2];
  const recent = last && Date.now() - new Date(last.created_at ?? 0).getTime() < 10 * 60 * 1000;
  const diff = prev ? Math.round((last.kg - prev.kg) * 10) / 10 : null;
  return (
    <div className="kblock weight-card">
      <header className="kblock-head">
        <span className="kblock-title">
          <Avatar person={person} size="sm" /> ⚖️ Peso
        </span>
        <button type="button" className="btn ghost xs" onClick={() => setOpen(true)}>
          + Pesada
        </button>
      </header>
      <div className="weight">
        <span className="weight-val">
          <strong>{fmt1(last.kg)}</strong> kg
        </span>
        <span className="weight-sub">
          {whenLabel(last.measured_at, cal)}
          {diff != null ? ` · ${fmtSigned(diff)} kg vs ${whenLabel(prev.measured_at, cal)}` : ''}
        </span>
        {recent ? (
          <button type="button" className="link-btn" onClick={() => run(() => actions.undoWeight(last.id), 'Borrado')}>
            deshacer
          </button>
        ) : null}
      </div>
      {open ? <WeightDialog person={person} list={list} cal={cal} onClose={() => setOpen(false)} /> : null}
    </div>
  );
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

/** Solo lectura: los entrenamientos se cargan desde el chat con las capturas del Watch. Se oculta con visitas. */
function WorkoutCards() {
  const { model } = useData();
  const kiosk = useKiosk();
  if (kiosk.visitas || !model.workouts?.length) return null;
  const ids = [...new Set(model.workouts.map((w) => w.person_id))];
  return ids
    .map((id) => model.peopleById.get(id))
    .filter(Boolean)
    .map((p) => <WorkoutCard key={p.id} person={p} />);
}

function WorkoutCard({ person }) {
  const { model } = useData();
  const { now } = useApp();
  const cal = calTodayISO(new Date(now));
  const monday = addDays(cal, -((dow(cal) + 6) % 7));
  const list = model.workouts.filter((w) => w.person_id === person.id);
  const last = list[list.length - 1];
  const week = list.filter((w) => calDayOf(w.started_at) >= monday).length;
  const min = Math.round((new Date(last.ended_at) - new Date(last.started_at)) / 60000);
  const km = last.distance_km == null ? null : last.distance_km.toFixed(2).endsWith('0') ? fmt1(last.distance_km) : fmt2(last.distance_km);
  const sub = [whenLabel(last.started_at, cal), last.hr_avg ? `${last.hr_avg} lpm` : null, last.effort ? `esfuerzo ${last.effort}/10` : null].filter(Boolean).join(' · ');
  return (
    <div className="kblock workout-card">
      <header className="kblock-head">
        <span className="kblock-title">
          <Avatar person={person} size="sm" /> 🏃 Ejercicio
        </span>
        <span className="workout-week">{week === 0 ? 'Nada esta semana' : week === 1 ? '1 esta semana' : `${week} esta semana`}</span>
      </header>
      <div className="weight">
        <span className="weight-val">
          <strong>{fmtDuration(min)}</strong>
          {km ? ` · ${km} km` : ''}
        </span>
        <span className="weight-sub">{sub}</span>
      </div>
    </div>
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
