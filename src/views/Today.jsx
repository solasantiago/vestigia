import { useMemo, useState } from 'react';
import { useApp } from '../lib/appctx.js';
import { useData, useRun } from '../lib/data.jsx';
import { useKiosk } from '../lib/kiosk.jsx';
import { addDays, calDayOf, calTodayISO, dayMinutesOf } from '../lib/dates.js';
import { visibleEvents } from '../lib/metrics.js';
import { computeDay } from '../lib/status.js';
import { Avatar } from '../components/ui.jsx';
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
        {st.pills.map((p) => (
          <PillsBlock key={p.id} block={p} calm={calm} />
        ))}
        {!st.pills.length ? <NoTraces>Todavía no hay pastillas ni hábitos cargados.</NoTraces> : null}
      </section>
      <section className="kcol kcol-dogs" aria-label="Mocka y Honey">
        <DogsPanel st={st} who={kiosk.who} calm={calm} />
      </section>
      <section className="kcol kcol-agenda" aria-label="Agenda">
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
    <li className={`prow lv-${r.level} ${r.done || r.level === 'closed' ? 'done' : ''}`}>
      <div className="prow-text">
        <span className="prow-label">
          <span aria-hidden="true">{h.emoji}</span> {r.label}
        </span>
        <span className="prow-state">
          <Dot level={r.level} /> {r.text}
        </span>
        {suggestOne ? <span className="prow-hint">Si te sirve, una ahora y la otra a la noche.</span> : null}
      </div>
      <div className="prow-actions">{actionsEl}</div>
    </li>
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
