import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/appctx.js';
import { useData, useRun } from '../lib/data.jsx';
import { addDays, dayOf, fmtAgo, fmtClock, fmtDuration, fmtTime, minutesOf } from '../lib/dates.js';
import { fmtInt, fmtKg } from '../lib/format.js';
import {
  choreStatus,
  dogStatus,
  foodStock,
  habitDayState,
  habitsOf,
  lowMoodStreak,
  moodSlotOfNow,
  personDaily,
  slotOfNow,
  SLOT_LABEL,
  visibleEvents,
} from '../lib/metrics.js';
import { Avatar, Card, Chip, Dialog, Segmented, WhoPicker } from '../components/ui.jsx';
import { Meter } from '../components/charts/Figures.jsx';
import { NoTraces, PawIcon } from '../components/prints.jsx';
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
        <ChoresCard />
      </div>
    </div>
  );
}

function CheckinsCard({ className, personId, shared = false }) {
  const { model, actions } = useData();
  const { today, now } = useApp();
  const run = useRun();
  const [snoozed, setSnoozed] = useState({});
  const who = model.peopleById.get(personId);
  const habits = habitsOf(model, personId);
  const current = slotOfNow(minutesOf(now));
  const todays = habits.filter((h) => !['off', 'before'].includes(habitDayState(model, h, today, today)));
  const manual = todays.filter((h) => h.source === 'manual');
  const answered = manual.filter((h) => habitDayState(model, h, today, today) !== 'pending').length;
  const slots = ['manana', 'mediodia', 'tarde', 'noche'].filter((s) => todays.some((h) => h.slot === s));

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
      subtitle={manual.length ? `${answered} de ${manual.length} respondidos` : null}
      actions={manual.length ? <Meter value={answered / manual.length} label="Check-ins respondidos" /> : null}
    >
      {!habits.length ? <NoTraces>Todavía no hay hábitos cargados para {who?.short_name ?? 'esta persona'}.</NoTraces> : null}
      {habits.length && !todays.length ? <NoTraces>Hoy no hay preguntas para {who?.short_name}.</NoTraces> : null}
      {slots.map((slot) => (
        <div key={slot} className={`slot ${slot === current ? 'now' : ''}`}>
          <h4 className="slot-title">
            {SLOT_LABEL[slot]} {slot === current ? <Chip tone="accent">Ahora</Chip> : null}
          </h4>
          <ul className="checkins">
            {todays
              .filter((h) => h.slot === slot)
              .sort((a, b) => (snoozed[a.id] ? 1 : 0) - (snoozed[b.id] ? 1 : 0))
              .map((h) => {
                const state = habitDayState(model, h, today, today);
                const row = model.checkinsByHabit.get(h.id)?.get(today);
                return (
                  <li key={h.id} className={`checkin ${state}`}>
                    <span className="checkin-emoji" aria-hidden="true">
                      {h.emoji}
                    </span>
                    <div className="checkin-text">
                      <div className="checkin-q">{h.source === 'auto' ? h.name : h.question}</div>
                      <div className="checkin-meta">
                        {h.source === 'auto' ? (
                          <span className="muted">{h.question} · se completa cuando llegan los pasos.</span>
                        ) : state === 'si' ? (
                          <span className="ok">✓ Hecho · {fmtTime(row.answered_at)}</span>
                        ) : state === 'na' ? (
                          <span className="muted">Hoy no aplica</span>
                        ) : snoozed[h.id] ? (
                          <span className="muted">⏰ {shared ? 'Queda para más tarde' : 'Te lo vuelvo a preguntar más tarde'}</span>
                        ) : null}
                      </div>
                    </div>
                    {h.source === 'auto' ? null : state === 'pending' ? (
                      <div className="answer">
                        <button type="button" className="btn yes" onClick={() => run(() => actions.answerHabit(h, today, 'si'))}>
                          Sí
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setSnoozed((s) => ({ ...s, [h.id]: Date.now() }))}
                          disabled={Boolean(snoozed[h.id])}
                        >
                          Todavía no
                        </button>
                        <button type="button" className="btn ghost" onClick={() => run(() => actions.answerHabit(h, today, 'na'))}>
                          No aplica
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="btn ghost xs" onClick={() => run(() => actions.clearHabit(h, today))}>
                        Deshacer
                      </button>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </Card>
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

export function DogsCard({ big = false, showFood = true, who: whoProp, onWho }) {
  const { model, actions } = useData();
  const { person, today, now } = useApp();
  const run = useRun();
  const [walkOpen, setWalkOpen] = useState(false);
  const [foodOpen, setFoodOpen] = useState(false);
  const [whoLocal, setWhoLocal] = useState(person === 'casa' ? null : person);
  const who = onWho ? whoProp : whoLocal;
  const setWho = onWho ?? setWhoLocal;
  const meals = model.mealsByDay.get(today) ?? {};
  const meal = minutesOf(now) < mealSwitchMinutes(model.settings) ? 'desayuno' : 'cena';
  const foodWarn = model.settings?.food_alert_days;
  const given = meals[meal];
  const food = foodStock(model, today);
  const people = model.people;

  const needWho = person === 'casa' && !who;

  return (
    <Card
      className={big ? 'span-2 dogs-card big' : 'dogs-card'}
      title="Mocka y Honey"
      subtitle="Compartido con la casa"
      actions={
        person === 'casa' && !onWho ? (
          <div className="who-inline">
            <span className="muted small">¿Quién sos?</span>
            <WhoPicker people={people} value={who} onChange={setWho} />
          </div>
        ) : null
      }
    >
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
                      Último paseo {dayOf(st.lastAt) === today ? fmtTime(st.last.started_at) : `${dayOf(st.lastAt) === addDays(today, -1) ? 'ayer' : ''} ${fmtTime(st.last.started_at)}`}
                      {walker ? ` con ${walker.short_name}` : ''} · <strong>{fmtAgo(st.lastAt, now)}</strong>
                    </>
                  ) : (
                    'Sin paseos registrados'
                  )}
                </div>
                <div className="dog-flags">
                  <Chip tone={poopedToday ? 'good' : 'quiet'} icon="💩">
                    {poopedToday ? 'Hizo caca hoy' : st.lastPoopAt ? `Última caca ${fmtAgo(st.lastPoopAt, now)}` : 'Sin registro'}
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

      <div className="meals">
        {['desayuno', 'cena'].map((m) => {
          const row = meals[m];
          const by = row ? model.peopleById.get(row.given_by) : null;
          return (
            <div key={m} className={`meal ${row ? 'done' : ''}`}>
              <span aria-hidden="true">{m === 'desayuno' ? '🥣' : '🍲'}</span>
              <span>
                {m === 'desayuno' ? 'Desayuno' : 'Cena'}: {row ? <strong>{`${by?.short_name ?? ''} a las ${fmtTime(row.given_at)}`}</strong> : <span className="muted">pendiente</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="actions-row">
        <button type="button" className="btn primary" onClick={() => setWalkOpen(true)}>
          <PawIcon size={18} /> Registrar paseo
        </button>
        {given ? (
          <span className="muted small">
            Ya les dio {model.peopleById.get(given.given_by)?.short_name} a las {fmtTime(given.given_at)}
          </span>
        ) : (
          <button
            type="button"
            className="btn"
            disabled={needWho}
            title={needWho ? 'Elegí quién sos' : undefined}
            onClick={() =>
              run(async () => {
                const r = await actions.logMeal(meal, who);
                if (r?.already) throw new Error('alguien ya la cargó recién');
              }, `Listo: ${meal} registrado`)
            }
          >
            {meal === 'desayuno' ? '🥣 Les di el desayuno' : '🍲 Les di la cena'}
          </button>
        )}
        <button type="button" className="btn ghost" disabled={needWho} onClick={() => run(() => actions.refill(who), 'Refill registrado')}>
          Refill del tarro
        </button>
      </div>

      {showFood ? (
        <div className="food">
          <div className="food-head">
            <span>Alimento</span>
            {food?.daysLeft != null ? <strong>~{Math.max(0, Math.round(food.daysLeft))} días</strong> : null}
          </div>
          {food?.daysLeft != null ? (
            <Meter
              value={food.pct}
              label="Alimento restante"
              tone={food.daysLeft <= 2 ? 'critical' : foodWarn && food.daysLeft <= foodWarn ? 'warning' : 'accent'}
            />
          ) : null}
          <p className="muted small">
            {!food
              ? 'Todavía no se cargó la bolsa de alimento.'
              : food.dailyG
                ? `Bolsa de ${fmtKg(food.last.kg)} kg del ${Number(food.last.bought_on.slice(8, 10))}/${Number(food.last.bought_on.slice(5, 7))} · ${fmtInt(food.dailyG)} g por día entre los dos`
                : `Bolsa de ${fmtKg(food.last.kg)} kg del ${Number(food.last.bought_on.slice(8, 10))}/${Number(food.last.bought_on.slice(5, 7))} · falta la ración diaria para calcular cuánto queda`}
          </p>
          <button type="button" className="btn ghost xs" disabled={needWho} title={needWho ? 'Elegí quién sos' : undefined} onClick={() => setFoodOpen(true)}>
            {food ? 'Compré una bolsa nueva' : 'Cargar la bolsa'}
          </button>
        </div>
      ) : null}

      <WalkDialog key={who ?? 'nadie'} open={walkOpen} onClose={() => setWalkOpen(false)} defaultWho={who} />
      <FoodDialog open={foodOpen} onClose={() => setFoodOpen(false)} who={who} />
    </Card>
  );
}

/** Hora (en minutos) a la que el botón pasa de "desayuno" a "cena": a mitad de camino entre las dos comidas. */
function mealSwitchMinutes(settings) {
  const toMin = (t) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null);
  const b = toMin(settings?.breakfast_time);
  const d = toMin(settings?.dinner_time);
  if (b != null && d != null && d > b) return Math.round((b + d) / 2);
  return 15 * 60;
}

function FoodDialog({ open, onClose, who }) {
  const { actions } = useData();
  const { today } = useApp();
  const run = useRun();
  const [kg, setKg] = useState('');
  const [day, setDay] = useState(today);
  const value = Number(String(kg).replace(',', '.'));
  const ok = value > 0 && value < 100 && day && who;
  const save = () =>
    run(async () => {
      await actions.buyFood(value, who, day);
      setKg('');
      onClose();
    }, 'Bolsa de alimento cargada');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Bolsa de alimento"
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
          <input type="text" inputMode="decimal" placeholder="Ej.: 15" value={kg} onChange={(e) => setKg(e.target.value)} />
        </label>
        <label className="field">
          <span>La abrieron el</span>
          <input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} />
        </label>
      </div>
      <p className="muted small">Desde ese día se descuenta la ración diaria de los dos para estimar cuánto queda.</p>
    </Dialog>
  );
}

const DETAILS = ['blanda', 'con sangre', 'con moco', 'esfuerzo', 'otra'];

function WalkDialog({ open, onClose, defaultWho }) {
  const { model, actions } = useData();
  const run = useRun();
  const [who, setWho] = useState(defaultWho);
  const [minutes, setMinutes] = useState(30);
  const [ago, setAgo] = useState(0);
  const [dogs, setDogs] = useState(() => Object.fromEntries(model.dogs.map((d) => [d.id, { on: true, poop: null, detail: 'blanda' }])));
  const set = (id, patch) => setDogs((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const chosen = model.dogs.filter((d) => dogs[d.id]?.on);
  const ready = who && chosen.length && chosen.every((d) => dogs[d.id].poop);

  const save = () =>
    run(async () => {
      await actions.logWalk({
        walkerId: who,
        minutes,
        endedAt: new Date(Date.now() - ago * 60000),
        dogs: chosen.map((d) => ({ dog_id: d.id, poop: dogs[d.id].poop, poop_detail: dogs[d.id].poop === 'raro' ? dogs[d.id].detail : null })),
      });
      onClose();
      setDogs(Object.fromEntries(model.dogs.map((d) => [d.id, { on: true, poop: null, detail: 'blanda' }])));
    }, 'Paseo registrado');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Registrar paseo"
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={!ready} onClick={save}>
            Guardar paseo
          </button>
        </>
      }
    >
      <div className="form-row">
        <span className="form-label">¿Quién los sacó?</span>
        <WhoPicker people={model.people} value={who} onChange={setWho} />
      </div>
      <div className="form-row">
        <span className="form-label">¿Cuánto duró?</span>
        <Segmented
          size="sm"
          label="Duración"
          value={minutes}
          onChange={setMinutes}
          options={[15, 30, 45, 60].map((v) => ({ value: v, label: `${v} min` }))}
        />
      </div>
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

// ───────────────────────── agenda y tareas ─────────────────────────

function AgendaCard() {
  const { model } = useData();
  const { person, today, go } = useApp();
  const until = addDays(today, 7);
  const list = visibleEvents(model, person).filter((e) => {
    const d = dayOf(e.starts_at);
    return d >= today && d <= until;
  });
  return (
    <Card
      title="Agenda"
      subtitle="Hoy y los próximos 7 días"
      actions={
        <button type="button" className="btn ghost xs" onClick={() => go('casa')}>
          Ver todo
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
        <p className="empty">Nada agendado esta semana.</p>
      )}
    </Card>
  );
}

export function ChoresCard({ who: whoProp, onWho }) {
  const { model, actions } = useData();
  const { person, today } = useApp();
  const run = useRun();
  const [whoLocal, setWhoLocal] = useState(person === 'casa' ? null : person);
  const who = onWho ? whoProp : whoLocal;
  const setWho = onWho ?? setWhoLocal;
  const chores = choreStatus(model, today);
  if (!chores.length) return null;
  const due = chores.filter((c) => c.overdueBy != null && c.overdueBy >= 0).sort((a, b) => b.overdueBy - a.overdueBy);
  const fresh = chores.filter((c) => c.overdueBy == null);
  const ok = chores.filter((c) => c.overdueBy != null && c.overdueBy < 0).sort((a, b) => b.overdueBy - a.overdueBy);
  const done = (c) => run(() => actions.choreDone(c.id, who), `${c.name}: hecho`);
  const whoTitle = !who ? 'Elegí quién sos' : undefined;
  return (
    <Card
      title="Tareas de la casa"
      subtitle={due.length ? `${due.length} para hoy` : fresh.length === chores.length ? 'Marcá la primera vez que las hacen' : 'Todo al día'}
      actions={person === 'casa' && !onWho ? <WhoPicker people={model.people} value={who} onChange={setWho} /> : null}
    >
      <ul className="chores">
        {due.map((c) => (
          <li key={c.id} className="chore due">
            <span aria-hidden="true">{c.emoji}</span>
            <div className="chore-body">
              <div>{c.name}</div>
              <div className="muted small">
                {`Última vez ${agoDays(c.overdueBy + c.every_days)} · ${model.peopleById.get(c.last.done_by)?.short_name}`}
                {c.overdueBy > 0 ? ` · ${c.overdueBy} ${c.overdueBy === 1 ? 'día' : 'días'} de atraso` : ''}
              </div>
            </div>
            <button type="button" className="btn xs" disabled={!who} title={whoTitle} onClick={() => done(c)}>
              Hecho
            </button>
          </li>
        ))}
        {fresh.map((c) => (
          <li key={c.id} className="chore">
            <span aria-hidden="true">{c.emoji}</span>
            <div className="chore-body">
              <div>{c.name}</div>
              <div className="muted small">Cada {c.every_days === 1 ? 'día' : `${c.every_days} días`} · todavía sin registro</div>
            </div>
            <button type="button" className="btn ghost xs" disabled={!who} title={whoTitle} onClick={() => done(c)}>
              Hecho
            </button>
          </li>
        ))}
        {ok.map((c) => (
          <li key={c.id} className="chore">
            <span aria-hidden="true">{c.emoji}</span>
            <div className="chore-body">
              <div>{c.name}</div>
              <div className="muted small">
                Toca en {-c.overdueBy} {-c.overdueBy === 1 ? 'día' : 'días'}
                {c.last ? ` · la última la hizo ${model.peopleById.get(c.last.done_by)?.short_name}` : ''}
              </div>
            </div>
            <button type="button" className="btn ghost xs" disabled={!who} title={whoTitle} onClick={() => done(c)}>
              Hecho
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function agoDays(n) {
  if (n <= 0) return 'hoy';
  if (n === 1) return 'ayer';
  return `hace ${n} días`;
}

// ───────────────────────── tablero de la casa (iPad) ─────────────────────────

const WHO_RESET_MS = 5 * 60 * 1000;

function HouseToday() {
  const { model } = useData();
  const { today, now, go } = useApp();
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
  const until = addDays(today, 3);
  const shared = visibleEvents(model, 'casa').filter((e) => {
    const d = dayOf(e.starts_at);
    return d >= today && d <= until;
  });
  const walksToday = model.walks.filter((w) => w.day === today);
  const perDog = model.dogs.map((d) => `${d.name} ${walksToday.filter((w) => w.dogs.some((x) => x.dog_id === d.id)).length}`);
  const tomorrow = shared.filter((e) => dayOf(e.starts_at) === addDays(today, 1));

  return (
    <div className="stack">
      <section className="house-head">
        <div>
          <div className="clock">{fmtTime(now)}</div>
          <p className="clock-sub">{greeting(minutes)}</p>
        </div>
        <div className="who-box">
          <span className="form-label">¿Quién está usando el iPad?</span>
          <WhoPicker people={model.people} value={who} onChange={setWho} />
          <span className="muted small">{who ? 'Se borra solo a los 5 minutos.' : 'Para anotar paseos, comidas y tareas.'}</span>
        </div>
      </section>

      <AlertList alerts={alerts} />

      <div className="grid two">
        {model.people.map((p) => (
          <CheckinsCard key={p.id} personId={p.id} shared />
        ))}
      </div>

      <div className="grid today-grid">
        <DogsCard big who={who} onWho={setWho} />
        <div className="stack">
          <Card
            title="Agenda compartida"
            subtitle="Hoy y los próximos 3 días"
            actions={
              <button type="button" className="btn ghost xs" onClick={() => go('casa')}>
                + Evento
              </button>
            }
          >
            {shared.length ? (
              <ul className="events">
                {shared.map((e) => (
                  <EventRow key={e.id} ev={e} today={today} people={model.peopleById} />
                ))}
              </ul>
            ) : (
              <p className="empty">Sin eventos en los próximos días.</p>
            )}
          </Card>
          <ChoresCard who={who} onWho={setWho} />
        </div>
      </div>

      {minutes >= 21 * 60 ? (
        <Card title="Cierre del día">
          <p>
            Hoy: {perDog.join(', ')} {walksToday.length === 1 ? 'paseo' : 'paseos'}.
            {tomorrow.length ? ` Mañana: ${tomorrow.map((e) => e.title).join(', ')}.` : ''}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
