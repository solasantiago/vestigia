import { useState } from 'react';
import { useApp } from '../lib/appctx.js';
import { useData, useRun } from '../lib/data.jsx';
import { fmtDayCompact, fmtSpan, fmtTime } from '../lib/dates.js';
import { fmtKg } from '../lib/format.js';
import { foodBag } from '../lib/metrics.js';
import { worst } from '../lib/status.js';
import { Dialog, Segmented, WhoPicker } from './ui.jsx';
import { PawIcon } from './prints.jsx';
import { lv, StatusChip } from './Semaforo.jsx';

// Mocka y Honey: estado del día y botones grandes para anotar.
// Salen siempre las dos juntas; por cada una se marca pis, caca y, si hace falta, "algo raro".

export const TREATS = [
  { value: 'pollito', label: 'Pollito', icon: '🍗' },
  { value: 'dentastix', label: 'Dentastix', icon: '🦷' },
  { value: 'golosina', label: 'Golosina', icon: '🍪' },
  { value: 'otro', label: 'Otro', icon: '🎁' },
];
export const TREAT_LABEL = Object.fromEntries(TREATS.map((t) => [t.value, t.label]));

const RECENT_MS = 10 * 60 * 1000;

export function DogsPanel({ st, who, calm = false }) {
  const { model, actions } = useData();
  const run = useRun();
  const [walk, setWalk] = useState(null);
  const [treatOpen, setTreatOpen] = useState(false);
  const w = st.walks;
  const long = st.long;
  const name = (id) => model.peopleById.get(id)?.short_name ?? '';
  const level = worst([w.level, long.level, ...st.dogs.map((d) => d.level)]);
  const refills = model.refills.filter((r) => r.day === st.day);
  const treats = model.treats.filter((t) => t.day === st.day);
  const lastRefill = refills[refills.length - 1];
  const lastTreat = treats[treats.length - 1];
  const needWho = !who;
  const whyDisabled = needWho ? 'Elegí quién sos para anotar' : undefined;

  return (
    <div className={`kblock dogs-panel ${lv(level, { blink: false, calm })}`}>
      <header className="kblock-head">
        <span className="kblock-title">
          <PawIcon size={22} /> Mocka y Honey
        </span>
        <StatusChip level={level} size="sm" />
      </header>

      <div className="dp-stats">
        <div className={`dp-stat lv-${w.level}`}>
          <span className="dp-label">Salidas</span>
          <span className="dp-value">
            {w.count}
            <small> de {w.goal}</small>
          </span>
          <span className="dp-note">{w.text}</span>
        </div>
        <div className={`dp-stat lv-${long.level}`}>
          <span className="dp-label">{long.goal === 1 ? 'Paseo largo' : 'Paseos largos'}</span>
          <span className="dp-value">
            {long.count}
            <small> de {long.goal}</small>
          </span>
          <span className="dp-note">{long.text}</span>
        </div>
      </div>

      <p className="dp-last">
        {w.last ? `Última: ${fmtTime(w.last.started_at)} con ${name(w.last.walker_id)} · hace ${fmtSpan(w.sinceMin)}` : 'Todavía no salieron hoy'}
      </p>

      <ul className="dp-dogs">
        {st.dogs.map((d) => (
          <li key={d.id} className={`dp-dog lv-${d.level}`} data-dog={d.dog.id}>
            <span className="dp-dog-name">
              <PawIcon size={20} /> {d.dog.name}
            </span>
            <span className={`dp-mark lv-${d.lastPee || d.peeLevel !== 'ok' ? d.peeLevel : 'off'}`}>💧 {d.lastPee ? `hace ${fmtSpan(d.peeAgoMin)}` : 'sin registro'}</span>
            <span className={`dp-mark lv-${d.lastPoop || d.poopLevel !== 'ok' ? d.poopLevel : 'off'}`}>💩 {d.lastPoop ? `hace ${fmtSpan(d.poopMin)}` : 'sin registro'}</span>
            {d.rareTwice ? <span className="dp-rare">⚠️ algo raro 2 veces</span> : null}
          </li>
        ))}
      </ul>

      <div className="dp-actions">
        <button type="button" className="btn big primary" disabled={needWho} title={whyDisabled} onClick={() => setWalk('corta')}>
          <PawIcon size={20} /> Salida corta
        </button>
        <button type="button" className="btn big primary alt" disabled={needWho} title={whyDisabled} onClick={() => setWalk('larga')}>
          🌳 Paseo largo
        </button>
        <button type="button" className="btn big" disabled={needWho} title={whyDisabled} onClick={() => run(() => actions.refill(who), 'Tarritos cargados')}>
          🥣 +1 tarritos
        </button>
        <button type="button" className="btn big" disabled={needWho} title={whyDisabled} onClick={() => setTreatOpen(true)}>
          🦴 +1 premio
        </button>
      </div>
      {needWho ? (
        <p className="dp-hint">
          Para anotar, tocá <strong>👀 Solo miro</strong> arriba y elegí quién sos.
        </p>
      ) : null}

      <div className="dp-log">
        {w.list.length ? (
          <ul className="dp-walks">
            {w.list
              .slice()
              .reverse()
              .map((x, i) => (
                <li key={x.id}>
                  <span className="dp-walk-time">{fmtTime(x.started_at)}</span>
                  <span className="dp-walk-kind">{x.kind === 'larga' ? '🌳 Largo' : '🐾 Corta'}</span>
                  <span className="dp-walk-who">{name(x.walker_id)}</span>
                  <span className="dp-walk-dogs">
                    {model.dogs.map((d) => {
                      const r = x.dogs.find((dd) => dd.dog_id === d.id);
                      if (!r) return null;
                      const marks = `${r.pee ? '💧' : ''}${r.poop === 'si' ? '💩' : r.poop === 'raro' ? '⚠️' : ''}`;
                      return (
                        <span key={d.id} data-dog={d.id}>
                          {d.name.slice(0, 1)} {marks || '–'}
                        </span>
                      );
                    })}
                  </span>
                  {i === 0 && Date.now() - new Date(x.created_at ?? x.ended_at ?? x.started_at).getTime() < RECENT_MS ? (
                    <button type="button" className="link-btn" onClick={() => run(() => actions.undoWalk(x.id), 'Salida borrada')}>
                      deshacer
                    </button>
                  ) : null}
                </li>
              ))}
          </ul>
        ) : null}
        <div>
          <strong>Tarritos:</strong> {refills.length ? refills.map((r) => `${fmtTime(r.at)} ${name(r.by_id)}`).join(' · ') : <span className="muted">ninguna carga todavía</span>}
          {lastRefill && Date.now() - new Date(lastRefill.at).getTime() < RECENT_MS ? (
            <button type="button" className="link-btn" onClick={() => run(() => actions.undoRefill(lastRefill.id), 'Carga borrada')}>
              deshacer
            </button>
          ) : null}
        </div>
        <div>
          <strong>Premios:</strong> {treats.length ? treats.map((t) => `${TREAT_LABEL[t.kind] ?? t.kind} (${name(t.given_by)})`).join(' · ') : <span className="muted">ninguno</span>}
          {lastTreat && Date.now() - new Date(lastTreat.given_at).getTime() < RECENT_MS ? (
            <button type="button" className="link-btn" onClick={() => run(() => actions.undoTreat(lastTreat.id), 'Premio borrado')}>
              deshacer
            </button>
          ) : null}
        </div>
      </div>

      {walk ? <WalkDialog kind={walk} who={who} onClose={() => setWalk(null)} /> : null}
      {treatOpen ? <TreatDialog who={who} onClose={() => setTreatOpen(false)} /> : null}
    </div>
  );
}

// ───────────── registrar una salida ─────────────

const DETAILS = ['blanda', 'líquida', 'con sangre', 'con moco', 'le costó', 'otra cosa'];

export function WalkDialog({ kind: initialKind, who: initialWho, onClose }) {
  const { model, actions } = useData();
  const run = useRun();
  const [who, setWho] = useState(initialWho);
  const [kind, setKind] = useState(initialKind);
  const [minutes, setMinutes] = useState(initialKind === 'larga' ? 45 : 10);
  const [ago, setAgo] = useState(0);
  const [stairs, setStairs] = useState(false);
  const [dogs, setDogs] = useState(() => Object.fromEntries(model.dogs.map((d) => [d.id, { pee: false, poop: false, rare: false, detail: 'blanda', note: '' }])));
  const set = (id, patch) => setDogs((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const pickKind = (k) => {
    setKind(k);
    setMinutes(k === 'larga' ? 45 : 10);
  };

  const save = () =>
    run(
      async () => {
        await actions.logWalk({
          walkerId: who,
          minutes,
          kind,
          stairs: kind === 'larga' ? stairs : null,
          endedAt: new Date(Date.now() - ago * 60000),
          dogs: model.dogs.map((d) => {
            const x = dogs[d.id];
            return {
              dog_id: d.id,
              pee: x.pee,
              poop: x.rare ? 'raro' : x.poop ? 'si' : 'no',
              poop_detail: x.rare ? x.detail : null,
              note: x.rare && x.note.trim() ? x.note.trim() : null,
            };
          }),
        });
        onClose();
      },
      kind === 'larga' ? 'Paseo largo anotado' : 'Salida anotada',
    );

  return (
    <Dialog
      open
      onClose={onClose}
      title={kind === 'larga' ? '🌳 Paseo largo' : '🐾 Salida corta'}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={!who} onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <p className="wd-intro">Salen las dos juntas. Marcá lo que hizo cada una; lo que no se toca queda como "no".</p>
      {model.dogs.map((d) => {
        const x = dogs[d.id];
        return (
          <div key={d.id} className="wd-dog" data-dog={d.id}>
            <span className="wd-name">
              <PawIcon size={22} /> {d.name}
            </span>
            <div className="wd-toggles">
              <button type="button" className={`toggle ${x.pee ? 'on' : ''}`} aria-pressed={x.pee} onClick={() => set(d.id, { pee: !x.pee })}>
                💧 Pis
              </button>
              <button
                type="button"
                className={`toggle ${x.poop || x.rare ? 'on' : ''}`}
                aria-pressed={x.poop || x.rare}
                onClick={() => set(d.id, x.poop || x.rare ? { poop: false, rare: false } : { poop: true })}
              >
                💩 Caca
              </button>
              <button type="button" className={`toggle warn ${x.rare ? 'on' : ''}`} aria-pressed={x.rare} onClick={() => set(d.id, { rare: !x.rare, poop: true })}>
                ⚠️ Algo raro
              </button>
            </div>
            {x.rare ? (
              <div className="wd-rare">
                <select value={x.detail} onChange={(e) => set(d.id, { detail: e.target.value })} aria-label={`Qué tuvo de raro la caca de ${d.name}`}>
                  {DETAILS.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <input type="text" value={x.note} maxLength={140} placeholder="Nota (opcional)" onChange={(e) => set(d.id, { note: e.target.value })} />
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="wd-grid">
        <div className="form-row">
          <span className="form-label">¿Qué fue?</span>
          <Segmented
            size="sm"
            label="Tipo de salida"
            value={kind}
            onChange={pickKind}
            options={[
              { value: 'corta', label: 'Salida corta' },
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
        <div className="form-row">
          <span className="form-label">¿Cuándo volvieron?</span>
          <Segmented
            size="sm"
            label="Cuándo volvieron"
            value={ago}
            onChange={setAgo}
            options={[
              { value: 0, label: 'Recién' },
              { value: 15, label: 'Hace 15 min' },
              { value: 30, label: 'Hace 30 min' },
              { value: 60, label: 'Hace 1 h' },
            ]}
          />
        </div>
        <div className="form-row">
          <span className="form-label">¿Quién las sacó?</span>
          <WhoPicker people={model.people} value={who} onChange={setWho} />
        </div>
      </div>
      {kind === 'larga' ? (
        <label className="check wd-stairs">
          <input type="checkbox" checked={stairs} onChange={(e) => setStairs(e.target.checked)} />
          <span>Subieron los 2 pisos por escalera</span>
        </label>
      ) : null}
    </Dialog>
  );
}

// ───────────── premio ─────────────

export function TreatDialog({ who, onClose }) {
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
      open
      onClose={onClose}
      title="🦴 +1 premio"
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

// ───────────── alimento ─────────────

export function FoodBlock({ who }) {
  const { model } = useData();
  const { today } = useApp();
  const [open, setOpen] = useState(false);
  const bag = foodBag(model, today);
  return (
    <div className="food big">
      <div className="food-head">
        <span>Alimento</span>
        {bag?.daysLeft != null ? <strong>~{Math.max(0, Math.round(bag.daysLeft))} días</strong> : null}
      </div>
      {bag ? (
        <>
          {bag.last.product ? <p className="food-product">{bag.last.product}</p> : null}
          <p className="muted small">
            Bolsa de {fmtKg(bag.last.kg)} kg · {bag.knownStart ? `abierta el ${fmtDayCompact(bag.last.bought_on)}` : 'ya estaba empezada al arrancar el registro'} ·{' '}
            {bag.refills} {bag.refills === 1 ? 'carga' : 'cargas'} de tarritos desde entonces
          </p>
          <p className="muted small">
            {bag.expectedDays != null
              ? `Por las bolsas anteriores, una así dura ~${Math.round(bag.expectedDays)} días.`
              : bag.knownStart
                ? 'Cuando se termine y carguen la próxima, Vestigia va a saber cuánto dura una bolsa.'
                : 'Esta bolsa no sirve para calcular: Vestigia aprende el consumo desde la primera bolsa nueva.'}
          </p>
        </>
      ) : (
        <p className="muted small">Todavía no se cargó la bolsa de alimento.</p>
      )}
      <button type="button" className="btn ghost xs" disabled={!who} title={who ? undefined : 'Elegí quién sos para anotar'} onClick={() => setOpen(true)}>
        {bag ? 'Compré una bolsa nueva' : 'Cargar la bolsa'}
      </button>
      {open ? <FoodDialog who={who} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function FoodDialog({ who, onClose }) {
  const { model, actions } = useData();
  const { today } = useApp();
  const run = useRun();
  const [kg, setKg] = useState('');
  const [day, setDay] = useState(today);
  const [product, setProduct] = useState(model.purchases[model.purchases.length - 1]?.product ?? '');
  const value = Number(String(kg).replace(',', '.'));
  const ok = value > 0 && value < 100 && day && who;
  const save = () =>
    run(async () => {
      await actions.buyFood(value, who, day, product.trim() || null);
      onClose();
    }, 'Bolsa nueva cargada');
  return (
    <Dialog
      open
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
      <p className="muted small">La bolsa anterior se cierra ese día: así se aprende cuánto duró.</p>
    </Dialog>
  );
}
