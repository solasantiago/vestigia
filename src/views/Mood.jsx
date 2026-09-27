import { useState } from 'react';
import { useApp } from '../lib/appctx.js';
import { useData, useRun } from '../lib/data.jsx';
import { fmtDuration, fmtTime, minutesOf } from '../lib/dates.js';
import { moodSlotOfNow } from '../lib/metrics.js';
import { Card, Segmented } from '../components/ui.jsx';
import { FEELINGS, INFLUENCES } from './common.jsx';

// Ánimo privado: se enciende en la v0.2, cuando cada uno tenga su cuenta en el celular.

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

export default function MoodCard() {
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
