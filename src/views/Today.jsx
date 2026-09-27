import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/appctx.js';
import { useData, useRun } from '../lib/data.jsx';
import { addDays, dayOf, fmtAgo, fmtClock, fmtDayCompact, fmtDuration, fmtTime, minutesOf } from '../lib/dates.js';
import { fmtInt, fmtKg, plural } from '../lib/format.js';
import {
  dogStatus,
  foodBag,
  habitDayState,
  habitsOf,
  habitStreaks,
  lowMoodStreak,
  moodSlotOfNow,
  personDaily,
  slotOfNow,
  SLOT_LABEL,
  visibleEvents,
} from '../lib/metrics.js';
import { Avatar, Card, Chip, Dialog, Segmented, WhoPicker } from '../components/ui.jsx';
import { Meter } from '../components/charts/Figures.jsx';
import { FootIcon, NoTraces, PawIcon } from '../components/prints.jsx';
import { FEATURES } from '../config.js';
import { AlertList, buildAlerts, EventRow, FEELINGS, greeting, INFLUENCES } from './common.jsx';

export default function Today() {
  const { person } = useApp();
  return person === 'casa' ? <HouseToday /> : <PersonToday />;
}

// ───────────────────────── vista personal ─────────────────────────

function PersonToday() {
  const { model } = useData();
  const { person, today, now } = useApp();
  const me = model.peopleById.get(person);
  const minutes = minutesOf(now);
  const health = model.healthByPerson.get(person);
  const lastNight = health?.get(today);
  const yesterday = health?.get(addDays(today, -1));
  const alerts = buildAlerts(model, { today, now, person });
  const recent = useMemo(() => personDaily(model, person, [...Array(10)].map((_, i) => addDays(today, i - 9)), today), [model, person, today]);
  const low = lowMoodStreak(recent);

  return (
    <div className="stack">
      <section className="hello">
        <div className="hello-main">
          <Avatar person={me} size="lg" />
          <div>
            <h2>
              {greeting(minutes)}, {me?.short_name}
            </h2>
            <p className="hello-sub">
              {lastNight?.sleep_min != null ? (
                <>
                  Dormiste <strong>{fmtDuration(lastNight.sleep_min)}</strong>
                  {lastNight.bedtime ? <> · te acostaste {fmtClock(lastNight.bedtime)}</> : null}
                </>
              ) : (
                'Todavía no llegó el sueño de anoche.'
              )}
              {yesterday?.steps != null ? (
                <>
                  {' · '}Ayer {fmtInt(yesterday.steps)} pasos {yesterday.steps >= me.steps_goal ? '✓' : `(meta ${fmtInt(me.steps_goal)})`}
                </>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      {low >= 3 ? (
        <div className="care" role="note">
          <span aria-hidden="true">🌧️</span>
          <p>
            Venís con el ánimo bajo hace unos días. Si te sirve, hablalo con alguien de confianza. Esto no es un diagnóstico, solo un aviso.
          </p>
        </div>
      ) : null}

      <AlertList alerts={alerts} />

      <div className="grid today-grid">
        <CheckinsCard className="span-2" personId={person} />
        {FEATURES.mood ? <MoodCard /> : null}
        <DogsCard />
        <AgendaCard />
      </div>
    </div>
  );
}

// ───────────────────────── check-ins ─────────────────────────

const SLOTS = ['manana', 'mediodia', 'tarde', 'noche'];
const ORDINAL = ['', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta'];

export function CheckinsCard({ className, personId, shared = false }) {
  const { model } = useData();
  const { today, now } = useApp();
  const [snoozed, setSnoozed] = useState({});
  const who = model.peopleById.get(personId);
  const habits = habitsOf(model, personId);
  const current = slotOfNow(minutesOf(now));
  const ci = SLOTS.indexOf(current);
  const placed = habits
    .map((h) => {
      const st = habitDayState(model, h, today, today);
      const row = model.checkinsByHabit.get(h.id)?.get(today) ?? null;
      // Si quedó a medias y ya llegó la franja del recordatorio, la pregunta pasa a esa franja.
      let slot = h.slot;
      if (st === 'parcial' && h.reminder_slot && ci >= SLOTS.indexOf(h.reminder_slot)) slot = h.reminder_slot;
      return { h, st, row, slot };
    })
    .filter((p) => !['off', 'before'].includes(p.st));
  const manual = placed.filter((p) => p.h.source === 'manual');
  const done = manual.filter((p) => p.st === 'si' || p.st === 'na').length;
  // La rutina para dormir aparece desde las 18 h (o si ya se marcó algo hoy).
  const nowMin = minutesOf(now);
  const routineAll = model.routineItems.filter((r) => r.person_id === personId);
  const routineStarted = routineAll.some((r) => model.routineLogs.has(`${r.id}|${today}`));
  const routine = nowMin >= 18 * 60 || nowMin < 6 * 60 || routineStarted ? routineAll : [];
  const slotsUsed = SLOTS.filter((s) => placed.some((p) => p.slot === s) || (s === 'noche' && routine.length));

  return (
    <Card
      className={`checkins-card ${className ?? ''}`}
      title={
        shared ? (
          <span className="who-title">
            <Avatar person={who} size="sm" /> {who?.short_name}
          </span>
        ) : (
          'Check-ins de hoy'
        )
      }
      subtitle={manual.length ? `${done} de ${manual.length} ${manual.length === 1 ? 'listo' : 'listos'}` : null}
      actions={manual.length ? <Meter value={done / manual.length} label="Check-ins listos" /> : null}
    >
      {!habits.length && !routineAll.length ? <NoTraces>Todavía no hay hábitos cargados para {who?.short_name ?? 'esta persona'}.</NoTraces> : null}
      {slotsUsed.map((slot) => (
        <div key={slot} className={`slot ${slot === current ? 'now' : ''}`}>
          <h4 className="slot-title">
            {SLOT_LABEL[slot]} {slot === current ? <Chip tone="accent">Ahora</Chip> : null}
          </h4>
          {placed.some((p) => p.slot === slot) ? (
            <ul className="checkins">
              {placed
                .filter((p) => p.slot === slot)
                .sort((a, b) => (snoozed[a.h.id] ? 1 : 0) - (snoozed[b.h.id] ? 1 : 0))
                .map((p) => (
                  <HabitRow
                    key={p.h.id}
                    {...p}
                    shared={shared}
                    snoozed={Boolean(snoozed[p.h.id])}
                    onSnooze={() => setSnoozed((s) => ({ ...s, [p.h.id]: Date.now() }))}
                  />
                ))}
            </ul>
          ) : null}
          {slot === 'noche' && routine.length ? <RoutineBlock items={routine} /> : null}
        </div>
      ))}
    </Card>
  );
}

function HabitRow({ h, st, row, shared, snoozed, onSnooze }) {
  const { model, actions } = useData();
  const { today } = useApp();
  const run = useRun();
  const doses = h.doses ?? 1;
  const amount = row?.amount ?? (st === 'si' ? doses : 0);
  const streak = st === 'si' ? habitStreaks(model, h, today).current : 0;
  const answer = (status, amt = null) => run(() => actions.answerHabit(h, today, status, amt));
  const addOne = () => {
    const next = Math.min(doses, amount + 1);
    return answer(next >= doses ? 'si' : 'parcial', next);
  };

  let question = h.source === 'auto' ? h.name : h.question;
  if (st === 'parcial') question = doses === 2 ? '¿Tomaste la segunda?' : `¿Tomaste la ${ORDINAL[amount + 1] ?? 'siguiente'}?`;

  let meta = null;
  if (h.source === 'auto') meta = <span className="muted">{h.question} · se completa cuando llegan los pasos.</span>;
  else if (st === 'si')
    meta = (
      <span className="ok">
        ✓ {doses > 1 ? `Las ${doses}` : 'Hecho'} · {fmtTime(row.answered_at)}
        {streak >= 2 ? <span className="streak"> · van {streak} días seguidos</span> : null}
      </span>
    );
  else if (st === 'parcial')
    meta = (
      <span className="partial">
        ✓ {amount} de {doses} · {fmtTime(row.answered_at)}
        {h.reminder_slot ? ` · falta ${doses - amount === 1 ? 'una' : doses - amount}` : ''}
      </span>
    );
  else if (st === 'na') meta = <span className="muted">Hoy no aplica</span>;
  else if (snoozed)
    meta = (
      <span className="muted">
        ⏰ {shared ? 'Queda para más tarde' : 'Te lo vuelvo a preguntar más tarde'}
        {doses > 1 ? '. Si te sirve, podés tomar una ahora y la otra más tarde.' : ''}
      </span>
    );

  return (
    <li className={`checkin ${st}`}>
      <span className="checkin-emoji" aria-hidden="true">
        {h.emoji}
      </span>
      <div className="checkin-text">
        <div className="checkin-q">{question}</div>
        {meta ? <div className="checkin-meta">{meta}</div> : null}
      </div>
      {h.source === 'auto' ? null : st === 'pending' ? (
        <div className="answer">
          {doses > 1 ? (
            <>
              <button type="button" className="btn yes" onClick={() => answer('si', doses)}>
                {doses === 2 ? 'Las dos' : `Las ${doses}`}
              </button>
              <button type="button" className="btn yes soft" onClick={addOne}>
                Una
              </button>
            </>
          ) : (
            <button type="button" className="btn yes" onClick={() => answer('si', 1)}>
              Sí
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onSnooze} disabled={snoozed}>
            Todavía no
          </button>
          {doses === 1 ? (
            <button type="button" className="btn ghost" onClick={() => answer('na')}>
              No aplica
            </button>
          ) : null}
        </div>
      ) : st === 'parcial' ? (
        <div className="answer">
          <button type="button" className="btn yes" onClick={addOne}>
            Sí, la tomé
          </button>
          <button type="button" className="btn ghost xs" onClick={() => run(() => actions.clearHabit(h, today))}>
            Deshacer
          </button>
        </div>
      ) : (
        <button type="button" className="btn ghost xs" onClick={() => run(() => actions.clearHabit(h, today))}>
          Deshacer
        </button>
      )}
    </li>
  );
}

/** Rutina opcional (higiene del sueño): se marca lo que se hizo; lo que no, no cuenta en contra. */
function RoutineBlock({ items }) {
  const { model, actions } = useData();
  const { today } = useApp();
  const run = useRun();
  const count = items.filter((it) => model.routineLogs.has(`${it.id}|${today}`)).length;
  return (
    <div className="routine">
      <div className="routine-head">
        <strong>Rutina para dormir</strong>
        <span className="muted small">Opcional · marcá lo que hiciste hoy</span>
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
      {count ? (
        <p className="routine-foot">
          <FootIcon size={14} /> {count} de {items.length} esta noche
        </p>
      ) : null}
    </div>
  );
}

const FACES = ['😞', '🙁', '😐', '🙂', '😄'];

function Scale({ label, value, onChange, faces, low, high }) {
  return (
    <fieldset className="scale">
      <legend>{label}</legend>
      <div className="scale-row">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            className={value === v ? 'on' : ''}
            aria-pressed={value === v}
            aria-label={`${label}: ${v} de 5`}
            onClick={() => onChange(value === v ? null : v)}
          >
            {faces ? <span aria-hidden="true">{faces[v - 1]}</span> : null}
            <span className="scale-n">{v}</span>
          </button>
        ))}
      </div>
      {low ? (
        <div className="scale-ends">
          <span>{low}</span>
          <span>{high}</span>
        </div>
      ) : null}
    </fieldset>
  );
}

const MOOD_Q = {
  manana: { mood: '¿Cómo arrancás el día?', extra: 'energy', extraQ: '¿Con cuánta energía?', low: 'Poca', high: 'Mucha' },
  tarde: { mood: '¿Cómo viene el día?', extra: 'stress', extraQ: '¿Nivel de estrés?', low: 'Nada', high: 'Mucho' },
  noche: { mood: '¿Cómo estuvo el día en general?' },
};

function MoodCard() {
  const { model, actions } = useData();
  const { person, today, now } = useApp();
  const run = useRun();
  const [slot, setSlot] = useState(() => moodSlotOfNow(minutesOf(now)));
  const saved = model.moodByPerson.get(person)?.get(today)?.[slot];
  const [draft, setDraft] = useState({});
  const val = (k, fallback = null) => (k in draft ? draft[k] : saved?.[k] ?? fallback);
  const q = MOOD_Q[slot];
  const sleep = model.healthByPerson.get(person)?.get(today)?.sleep_min;
  const dirty = Object.keys(draft).length > 0;

  const toggle = (field, tag) => {
    const cur = val(field, []);
    setDraft((d) => ({ ...d, [field]: cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag] }));
  };

  const save = () =>
    run(async () => {
      const fields = { mood: val('mood') };
      if (q.extra) fields[q.extra] = val(q.extra);
      fields.feelings = val('feelings', []);
      fields.influences = val('influences', []);
      if (slot === 'noche') fields.best_of_day = val('best_of_day') || null;
      await actions.saveMood(person, today, slot, fields);
      setDraft({});
    }, 'Ánimo guardado');

  return (
    <Card
      title="¿Cómo estás?"
      subtitle="Privado: solo lo ves vos."
      actions={
        <Segmented
          size="sm"
          label="Momento del día"
          value={slot}
          onChange={(s) => {
            setSlot(s);
            setDraft({});
          }}
          options={[
            { value: 'manana', label: 'Mañana' },
            { value: 'tarde', label: 'Tarde' },
            { value: 'noche', label: 'Noche' },
          ]}
        />
      }
    >
      {slot === 'manana' && sleep != null ? <p className="context">Dormiste {fmtDuration(sleep)}.</p> : null}
      <Scale label={q.mood} faces={FACES} value={val('mood')} onChange={(v) => setDraft((d) => ({ ...d, mood: v }))} />
      {q.extra ? (
        <Scale label={q.extraQ} value={val(q.extra)} low={q.low} high={q.high} onChange={(v) => setDraft((d) => ({ ...d, [q.extra]: v }))} />
      ) : null}
      <div className="tags">
        <span className="tags-label">Cómo me siento</span>
        {FEELINGS.map((t) => (
          <button key={t} type="button" className={`tag ${val('feelings', []).includes(t) ? 'on' : ''}`} aria-pressed={val('feelings', []).includes(t)} onClick={() => toggle('feelings', t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="tags">
        <span className="tags-label">Qué influyó</span>
        {INFLUENCES.map((t) => (
          <button key={t} type="button" className={`tag ${val('influences', []).includes(t) ? 'on' : ''}`} aria-pressed={val('influences', []).includes(t)} onClick={() => toggle('influences', t)}>
            {t}
          </button>
        ))}
      </div>
      {slot === 'noche' ? (
        <label className="field">
          <span>¿Qué fue lo mejor de hoy?</span>
          <input
            type="text"
            maxLength={120}
            placeholder="Una línea, opcional"
            value={val('best_of_day') ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, best_of_day: e.target.value }))}
          />
        </label>
      ) : null}
      <div className="row-end">
        {saved && !dirty ? <span className="muted small">Guardado {fmtTime(saved.created_at)}</span> : null}
        <button type="button" className="btn primary" disabled={!dirty || val('mood') == null} onClick={save}>
          Guardar
        </button>
      </div>
    </Card>
  );
}



// ───────────────────────── perros (compartido) ─────────────────────────

const TREATS = [
  { value: 'pollito', label: 'Pollito', icon: '🍗' },
  { value: 'dentastix', label: 'Dentastix', icon: '🦷' },
  { value: 'golosina', label: 'Golosina', icon: '🍪' },
  { value: 'otro', label: 'Otro', icon: '🎁' },
];
export const TREAT_LABEL = Object.fromEntries(TREATS.map((t) => [t.value, t.label]));

export function DogsCard({ big = false, showFood = true, who: whoProp, onWho }) {
  const { model, actions } = useData();
  const { person, today, now } = useApp();
  const run = useRun();
  const [walkOpen, setWalkOpen] = useState(false);
  const [treatOpen, setTreatOpen] = useState(false);
  const [foodOpen, setFoodOpen] = useState(false);
  const [whoLocal, setWhoLocal] = useState(person === 'casa' ? null : person);
  const who = onWho ? whoProp : whoLocal;
  const setWho = onWho ?? setWhoLocal;
  const needWho = !who;
  const whoTitle = needWho ? 'Elegí quién sos' : undefined;

  const goal = model.settings?.walks_goal ?? null;
  const longGoal = model.settings?.long_walks_goal ?? null;
  const walksToday = model.walks.filter((w) => w.day === today);
  const longToday = walksToday.filter((w) => w.kind === 'larga').length;
  const refillsToday = model.refills.filter((r) => r.day === today);
  const treatsToday = model.treats.filter((t) => t.day === today);
  const lastRefill = refillsToday[refillsToday.length - 1];
  const lastTreat = treatsToday[treatsToday.length - 1];
  const name = (id) => model.peopleById.get(id)?.short_name ?? '';

  return (
    <Card
      className={`dogs-card ${big ? 'big' : ''}`}
      title="Mocka y Honey"
      subtitle="Compartido con la casa"
      actions={
        person === 'casa' && !onWho ? (
          <div className="who-inline">
            <span className="muted small">¿Quién sos?</span>
            <WhoPicker people={model.people} value={who} onChange={setWho} />
          </div>
        ) : null
      }
    >
      <div className="walk-progress">
        <div>
          <span className="wp-label">Salidas hoy</span>
          <span className="wp-value">
            {walksToday.length}
            {goal ? <span className="muted"> de {goal}</span> : null}
          </span>
          {goal ? <Meter value={walksToday.length / goal} label="Salidas de hoy" /> : null}
        </div>
        <div>
          <span className="wp-label">Paseos largos</span>
          <span className="wp-value">
            {longToday}
            {longGoal ? <span className="muted"> de {longGoal}</span> : null}
          </span>
          {longGoal ? <Meter value={longToday / longGoal} label="Paseos largos de hoy" /> : null}
        </div>
      </div>

      <ul className="dogs">
        {model.dogs.map((d) => {
          const st = dogStatus(model, d.id, now);
          const walker = st.last ? model.peopleById.get(st.last.walker_id) : null;
          const poopedToday = st.lastPoopAt && dayOf(st.lastPoopAt) === today;
          return (
            <li key={d.id} className="dog" data-dog={d.id}>
              <span className="dog-mark" aria-hidden="true">
                <PawIcon size={26} />
              </span>
              <div className="dog-body">
                <div className="dog-name">{d.name}</div>
                <div className="dog-line">
                  {st.last ? (
                    <>
                      {st.last.kind === 'larga' ? 'Último paseo' : 'Última salida'}{' '}
                      {dayOf(st.lastAt) === today ? fmtTime(st.last.started_at) : `${dayOf(st.lastAt) === addDays(today, -1) ? 'ayer ' : ''}${fmtTime(st.last.started_at)}`}
                      {walker ? ` con ${walker.short_name}` : ''} · <strong>{fmtAgo(st.lastAt, now)}</strong>
                    </>
                  ) : (
                    'Todavía sin salidas registradas'
                  )}
                </div>
                <div className="dog-flags">
                  <Chip tone={poopedToday ? 'good' : 'quiet'} icon="💩">
                    {poopedToday ? 'Caca hoy ✓' : st.lastPoopAt ? `Última caca ${fmtAgo(st.lastPoopAt, now)}` : 'Sin registro de caca'}
                  </Chip>
                  {st.rareTwice ? (
                    <Chip tone="critical" icon="⚠️">
                      Algo raro 2 veces
                    </Chip>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="actions-row">
        <button type="button" className="btn primary" onClick={() => setWalkOpen(true)}>
          <PawIcon size={18} /> Registrar salida
        </button>
        <button
          type="button"
          className="btn"
          disabled={needWho}
          title={whoTitle}
          onClick={() => run(() => actions.refill(who), 'Tarritos cargados')}
        >
          🥣 +1 tarritos
        </button>
        <button type="button" className="btn" disabled={needWho} title={whoTitle} onClick={() => setTreatOpen(true)}>
          🦴 +1 premio
        </button>
      </div>

      <div className="feed-today">
        <div>
          <strong>Tarritos hoy:</strong>{' '}
          {refillsToday.length ? refillsToday.map((r) => `${fmtTime(r.at)} ${name(r.by_id)}`).join(' · ') : <span className="muted">ninguna carga todavía</span>}
          {lastRefill && Date.now() - new Date(lastRefill.at).getTime() < 10 * 60000 ? (
            <button type="button" className="link-btn" onClick={() => run(() => actions.undoRefill(lastRefill.id), 'Carga borrada')}>
              deshacer
            </button>
          ) : null}
        </div>
        <div>
          <strong>Premios hoy:</strong>{' '}
          {treatsToday.length ? treatsToday.map((t) => `${TREAT_LABEL[t.kind]} (${name(t.given_by)})`).join(' · ') : <span className="muted">ninguno</span>}
          {lastTreat && Date.now() - new Date(lastTreat.given_at).getTime() < 10 * 60000 ? (
            <button type="button" className="link-btn" onClick={() => run(() => actions.undoTreat(lastTreat.id), 'Premio borrado')}>
              deshacer
            </button>
          ) : null}
        </div>
      </div>

      {showFood ? <FoodBlock onNewBag={() => setFoodOpen(true)} needWho={needWho} /> : null}

      <WalkDialog key={`w-${who ?? 'nadie'}-${walkOpen}`} open={walkOpen} onClose={() => setWalkOpen(false)} defaultWho={who} />
      <TreatDialog key={`t-${treatOpen}`} open={treatOpen} onClose={() => setTreatOpen(false)} who={who} />
      <FoodDialog key={`f-${foodOpen}`} open={foodOpen} onClose={() => setFoodOpen(false)} who={who} />
    </Card>
  );
}

export function FoodBlock({ onNewBag, needWho, big = false }) {
  const { model } = useData();
  const { today } = useApp();
  const bag = foodBag(model, today);
  return (
    <div className={`food ${big ? 'big' : ''}`}>
      <div className="food-head">
        <span>Alimento</span>
        {bag?.daysLeft != null ? <strong>~{Math.max(0, Math.round(bag.daysLeft))} días</strong> : null}
      </div>
      {bag ? (
        <>
          {bag.last.product ? <p className="food-product">{bag.last.product}</p> : null}
          <p className="muted small">
            Bolsa de {fmtKg(bag.last.kg)} kg desde el {fmtDayCompact(bag.last.bought_on)} · {bag.daysOpen === 0 ? 'desde hoy' : `hace ${bag.daysOpen} ${bag.daysOpen === 1 ? 'día' : 'días'}`} ·{' '}
            {bag.refills} {bag.refills === 1 ? 'carga' : 'cargas'} de tarritos
          </p>
          <p className="muted small">
            {bag.expectedDays != null
              ? `Por las bolsas anteriores, una así dura ~${Math.round(bag.expectedDays)} días.`
              : 'Cuando se termine, tocá "Compré una bolsa nueva": Vestigia aprende cuánto dura cada bolsa.'}
          </p>
        </>
      ) : (
        <p className="muted small">Todavía no se cargó la bolsa de alimento.</p>
      )}
      {onNewBag ? (
        <button type="button" className="btn ghost xs" disabled={needWho} title={needWho ? 'Elegí quién sos' : undefined} onClick={onNewBag}>
          {bag ? 'Compré una bolsa nueva' : 'Cargar la bolsa'}
        </button>
      ) : null}
    </div>
  );
}

function FoodDialog({ open, onClose, who }) {
  const { model, actions } = useData();
  const { today } = useApp();
  const run = useRun();
  const lastProduct = model.purchases[model.purchases.length - 1]?.product ?? '';
  const [kg, setKg] = useState('');
  const [day, setDay] = useState(today);
  const [product, setProduct] = useState(lastProduct);
  const value = Number(String(kg).replace(',', '.'));
  const ok = value > 0 && value < 100 && day && who;
  const save = () =>
    run(async () => {
      await actions.buyFood(value, who, day, product.trim() || null);
      onClose();
    }, 'Bolsa nueva cargada');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Bolsa nueva de alimento"
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={!ok} onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <div className="field-row">
        <label className="field">
          <span>Kilos</span>
          <input type="text" inputMode="decimal" placeholder="Ej.: 7,5" value={kg} onChange={(e) => setKg(e.target.value)} />
        </label>
        <label className="field">
          <span>La abrieron el</span>
          <input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Alimento</span>
        <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} />
      </label>
      <p className="muted small">La bolsa anterior queda cerrada ese día: así se aprende cuánto duró.</p>
    </Dialog>
  );
}

function TreatDialog({ open, onClose, who }) {
  const { model, actions } = useData();
  const run = useRun();
  const [kind, setKind] = useState(null);
  const [dogs, setDogs] = useState(() => Object.fromEntries(model.dogs.map((d) => [d.id, true])));
  const chosen = model.dogs.filter((d) => dogs[d.id]).map((d) => d.id);
  const save = () =>
    run(async () => {
      await actions.logTreat(kind, who, chosen);
      onClose();
    }, 'Premio anotado');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="+1 premio"
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={!kind || !chosen.length || !who} onClick={save}>
            Anotar
          </button>
        </>
      }
    >
      <div className="form-row">
        <span className="form-label">¿Qué les dieron?</span>
        <div className="choice-grid">
          {TREATS.map((t) => (
            <button key={t.value} type="button" className={`choice ${kind === t.value ? 'on' : ''}`} aria-pressed={kind === t.value} onClick={() => setKind(t.value)}>
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <span className="form-label">¿A quién?</span>
        <div className="chips-row">
          {model.dogs.map((d) => (
            <label key={d.id} className="check">
              <input type="checkbox" checked={Boolean(dogs[d.id])} onChange={(e) => setDogs((s) => ({ ...s, [d.id]: e.target.checked }))} />
              <span>{d.name}</span>
            </label>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

const DETAILS = ['blanda', 'con sangre', 'con moco', 'esfuerzo', 'otra'];

function WalkDialog({ open, onClose, defaultWho }) {
  const { model, actions } = useData();
  const run = useRun();
  const [who, setWho] = useState(defaultWho);
  const [kind, setKind] = useState('corta');
  const [minutes, setMinutes] = useState(15);
  const [stairs, setStairs] = useState(true);
  const [ago, setAgo] = useState(0);
  const [dogs, setDogs] = useState(() => Object.fromEntries(model.dogs.map((d) => [d.id, { on: true, poop: null, detail: 'blanda' }])));
  const set = (id, patch) => setDogs((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const chosen = model.dogs.filter((d) => dogs[d.id]?.on);
  const ready = who && chosen.length && chosen.every((d) => dogs[d.id].poop);

  const pickKind = (k) => {
    setKind(k);
    setMinutes(k === 'larga' ? 45 : 15);
  };

  const save = () =>
    run(async () => {
      await actions.logWalk({
        walkerId: who,
        minutes,
        kind,
        stairs: kind === 'larga' ? stairs : null,
        endedAt: new Date(Date.now() - ago * 60000),
        dogs: chosen.map((d) => ({ dog_id: d.id, poop: dogs[d.id].poop, poop_detail: dogs[d.id].poop === 'raro' ? dogs[d.id].detail : null })),
      });
      onClose();
    }, kind === 'larga' ? 'Paseo largo registrado' : 'Salida registrada');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Registrar salida"
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={!ready} onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <div className="form-row">
        <span className="form-label">¿Quién las sacó?</span>
        <WhoPicker people={model.people} value={who} onChange={setWho} />
      </div>
      <div className="form-row">
        <span className="form-label">¿Qué fue?</span>
        <Segmented
          size="sm"
          label="Tipo de salida"
          value={kind}
          onChange={pickKind}
          options={[
            { value: 'corta', label: 'Salida corta (pis/caca)' },
            { value: 'larga', label: 'Paseo largo' },
          ]}
        />
      </div>
      <div className="form-row">
        <span className="form-label">¿Cuánto duró?</span>
        <Segmented
          size="sm"
          label="Duración"
          value={minutes}
          onChange={setMinutes}
          options={(kind === 'larga' ? [30, 45, 60, 90] : [5, 10, 15, 20]).map((v) => ({ value: v, label: `${v} min` }))}
        />
      </div>
      {kind === 'larga' ? (
        <label className="check form-row">
          <input type="checkbox" checked={stairs} onChange={(e) => setStairs(e.target.checked)} />
          <span>Subieron los 2 pisos por escalera</span>
        </label>
      ) : null}
      <div className="form-row">
        <span className="form-label">¿Cuándo volvieron?</span>
        <Segmented
          size="sm"
          label="Cuándo volvieron"
          value={ago}
          onChange={setAgo}
          options={[
            { value: 0, label: 'Recién' },
            { value: 30, label: 'Hace 30 min' },
            { value: 60, label: 'Hace 1 h' },
            { value: 120, label: 'Hace 2 h' },
          ]}
        />
      </div>
      {model.dogs.map((d) => (
        <div key={d.id} className="form-dog" data-dog={d.id}>
          <label className="check">
            <input type="checkbox" checked={dogs[d.id]?.on ?? false} onChange={(e) => set(d.id, { on: e.target.checked })} />
            <span>{d.name}</span>
          </label>
          {dogs[d.id]?.on ? (
            <div className="form-dog-poop">
              <span className="form-label">¿Hizo caca?</span>
              <Segmented
                size="sm"
                label={`¿${d.name} hizo caca?`}
                value={dogs[d.id].poop}
                onChange={(v) => set(d.id, { poop: v })}
                options={[
                  { value: 'si', label: 'Sí' },
                  { value: 'no', label: 'No' },
                  { value: 'raro', label: 'Algo raro' },
                ]}
              />
              {dogs[d.id].poop === 'raro' ? (
                <select value={dogs[d.id].detail} onChange={(e) => set(d.id, { detail: e.target.value })} aria-label="Qué pasó">
                  {DETAILS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </Dialog>
  );
}

// ───────────────────────── agenda ─────────────────────────

function AgendaCard({ days = 7, title = 'Agenda', subtitle }) {
  const { model } = useData();
  const { person, today, go } = useApp();
  const until = addDays(today, days);
  const list = visibleEvents(model, person).filter((e) => {
    const d = dayOf(e.starts_at);
    return d >= today && d <= until;
  });
  return (
    <Card
      title={title}
      subtitle={subtitle ?? `Hoy y los próximos ${days} días`}
      actions={
        <button type="button" className="btn ghost xs" onClick={() => go('casa')}>
          {person === 'casa' ? '+ Evento' : 'Ver todo'}
        </button>
      }
    >
      {list.length ? (
        <ul className="events">
          {list.map((e) => (
            <EventRow key={e.id} ev={e} today={today} people={model.peopleById} />
          ))}
        </ul>
      ) : (
        <p className="empty">Nada agendado.</p>
      )}
    </Card>
  );
}

// ───────────────────────── tablero de la casa (iPad) ─────────────────────────

const WHO_RESET_MS = 5 * 60 * 1000;

function HouseToday() {
  const { model } = useData();
  const { today, now } = useApp();
  const [who, setWhoRaw] = useState(null);
  const [whoAt, setWhoAt] = useState(0);
  const setWho = (v) => {
    setWhoRaw(v);
    setWhoAt(Date.now());
  };
  // En el iPad compartido, "quién soy" se borra solo a los 5 minutos para no anotar a nombre del otro.
  useEffect(() => {
    if (!who) return undefined;
    const t = setTimeout(() => setWhoRaw(null), WHO_RESET_MS);
    return () => clearTimeout(t);
  }, [who, whoAt]);

  const alerts = buildAlerts(model, { today, now, person: 'casa' });
  const minutes = minutesOf(now);
  const walksToday = model.walks.filter((w) => w.day === today);
  const tomorrow = visibleEvents(model, 'casa').filter((e) => dayOf(e.starts_at) === addDays(today, 1));

  return (
    <div className="stack">
      <section className="house-head">
        <div>
          <div className="clock">{fmtTime(now)}</div>
          <p className="clock-sub">{greeting(minutes)}</p>
        </div>
        <AlertList alerts={alerts} />
        <div className="who-box">
          <span className="form-label">¿Quién está usando el iPad?</span>
          <WhoPicker people={model.people} value={who} onChange={setWho} />
          <span className="muted small">{who ? 'Se borra solo a los 5 minutos.' : 'Para anotar salidas, tarritos y premios.'}</span>
        </div>
      </section>

      <div className="kiosk-grid">
        {model.people.map((p) => (
          <CheckinsCard key={p.id} personId={p.id} shared />
        ))}
        <div className="stack kiosk-side">
          <DogsCard big who={who} onWho={setWho} />
          <AgendaCard days={3} title="Agenda compartida" />
        </div>
      </div>

      {minutes >= 21 * 60 ? (
        <Card title="Cierre del día">
          <p>
            Hoy: {plural(walksToday.length, 'salida', 'salidas')} ({plural(walksToday.filter((w) => w.kind === 'larga').length, 'larga', 'largas')}),{' '}
            {plural(model.refills.filter((r) => r.day === today).length, 'carga de tarritos', 'cargas de tarritos')}.
            {tomorrow.length ? ` Mañana: ${tomorrow.map((e) => e.title).join(', ')}.` : ''}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
