import { useEffect, useMemo, useState } from 'react';
import { useData, useRun } from '../lib/data.jsx';
import { useKiosk } from '../lib/kiosk.jsx';
import {
  addDays,
  atHour,
  calDayOf,
  calTodayISO,
  dayOf,
  fmtDayLong,
  fmtHour,
  fmtSpan,
  fmtTime,
  fmtWeekday,
  hhmmToDayMin,
  isLateNight,
  tsToDayMin,
} from '../lib/dates.js';
import { visibleEvents } from '../lib/metrics.js';
import { computeDay, goalsText, nightInfo, rulesOf, weekInfo, worst } from '../lib/status.js';
import { CATEGORY } from '../views/common.jsx';
import { Avatar } from './ui.jsx';
import { FootIcon, FootShape, HouseTrail, Mark, PawIcon, PawShape } from './prints.jsx';
import { Dot, lv, RedStrip, StatusChip } from './Semaforo.jsx';

// Resumen a pantalla completa para el iPad: letra grande, sin botones, rota sola.
// Tocar en cualquier lado → "¿Quién está usando el iPad?".

const SLIDES = [
  { id: 'estado', label: 'Estado del día' },
  { id: 'perras', label: 'Mocka y Honey' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'semana', label: 'La semana' },
];

export const DOG_TONE = { mocka: 'var(--c-mocka)', honey: 'var(--c-honey)' };

function useClock(ms = 10000) {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setN(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return n;
}

function sentence(st) {
  const n = (lvl) => st.visible.filter((i) => i.level === lvl).length;
  const a = n('alert');
  const w = n('warn');
  const d = n('due');
  if (a) return { level: 'alert', text: a === 1 ? 'Hay algo urgente' : `${a} cosas urgentes` };
  if (w) return { level: 'warn', text: w === 1 ? 'Hay algo para atender' : `${w} cosas para atender` };
  if (d) return { level: 'due', text: d === 1 ? 'Todo en orden · algo toca ahora' : `Todo en orden · ${d} cosas tocan ahora` };
  return { level: 'ok', text: 'Todo al día' };
}

/** "Todavía cuenta como el domingo 27 · el día cierra a las 5" (entre las 0 y las 5). */
export function lateNightNote(day) {
  return `Todavía cuenta como el ${fmtWeekday(day)} ${Number(day.slice(8, 10))} · el día cierra a las 5`;
}

export default function Summary() {
  const { model, actions } = useData();
  const kiosk = useKiosk();
  const run = useRun();
  const now = useClock();
  const rules = rulesOf(model);
  const today = dayOf(now);
  const night = nightInfo(model, now, { visitas: kiosk.visitas });
  const st = useMemo(() => computeDay(model, { day: today, now, visitas: kiosk.visitas }), [model, today, now, kiosk.visitas]);
  const acked = model.acks.has(today);
  const reds = acked ? [] : st.alerts;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (night) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), (rules.ipad.slide_sec ?? 12) * 1000);
    return () => clearInterval(t);
  }, [night, rules.ipad.slide_sec]);

  // Con algo en rojo, se queda en el estado del día hasta que se resuelva.
  const slide = reds.length ? SLIDES[0] : SLIDES[i];

  if (night) {
    return (
      <div className="summary night-mode" onClick={kiosk.ask}>
        <NightView
          night={night}
          now={now}
          onAck={() => run(() => actions.ackDay(night.day, night.missing.map((m) => ({ id: m.id, level: m.level, short: m.short }))), 'Listo, buenas noches')}
        />
      </div>
    );
  }

  const sen = sentence(st);
  return (
    <div className="summary" onClick={kiosk.ask}>
      <RedStrip items={reds} />
      <header className="sum-top">
        <div className="sum-clock">{fmtTime(now)}</div>
        <div className="sum-date">
          <div className="cap">{fmtDayLong(today)}</div>
          {isLateNight(now) ? <div className="sum-late">{lateNightNote(today)}</div> : <div className="sum-sub">Vestigia · los rastros del día</div>}
        </div>
        <div className={`sum-state lv-${sen.level}`}>
          <Dot level={sen.level} />
          {sen.text}
        </div>
      </header>

      <main className="sum-main" key={slide.id}>
        {slide.id === 'estado' ? <StatusSlide st={st} visitas={kiosk.visitas} calm={acked} model={model} /> : null}
        {slide.id === 'perras' ? <DogsSlide st={st} model={model} /> : null}
        {slide.id === 'agenda' ? <AgendaSlide model={model} now={now} /> : null}
        {slide.id === 'semana' ? <WeekSlide model={model} now={now} visitas={kiosk.visitas} /> : null}
      </main>

      <footer className="sum-foot">
        <div className="sum-dots" aria-hidden="true">
          {SLIDES.map((s) => (
            <span key={s.id} className={s.id === slide.id ? 'on' : ''} />
          ))}
        </div>
        <span className="sum-slide-name">{slide.label}</span>
        {kiosk.visitas ? <span className="sum-visitas">👥 Modo visitas: pastillas ocultas</span> : null}
        <span className="sum-hint">Tocá la pantalla para anotar</span>
      </footer>
    </div>
  );
}

// ───────────── estado del día ─────────────

function StatusSlide({ st, visitas, calm, model }) {
  const name = (id) => model.peopleById.get(id)?.short_name ?? '';
  const w = st.walks;
  const tiles = [];
  if (!visitas) {
    for (const p of st.pills) tiles.push(<PillTile key={p.id} p={p} calm={calm} />);
  }
  tiles.push(
    <section key="walks" className={`tile ${lv(w.level, { calm })}`}>
      <header className="tile-head">
        <span className="tile-title">
          <PawIcon size={24} /> Salidas
        </span>
        <StatusChip level={w.level} />
      </header>
      <div className="tile-big">
        {w.count} <span className="tile-of">de {w.goal}</span>
      </div>
      <div className="tile-line">
        {w.last ? `Última ${fmtTime(w.last.started_at)} con ${name(w.last.walker_id)} · hace ${fmtSpan(w.sinceMin)}` : 'Todavía no salieron hoy'}
      </div>
      <div className="tile-line strong">{w.text}</div>
    </section>,
  );
  tiles.push(
    <section key="long" className={`tile ${lv(st.long.level, { calm })}`}>
      <header className="tile-head">
        <span className="tile-title">🌳 {st.long.goal === 1 ? 'Paseo largo' : 'Paseos largos'}</span>
        <StatusChip level={st.long.level} />
      </header>
      <div className="tile-big">
        {st.long.count} <span className="tile-of">de {st.long.goal}</span>
      </div>
      <div className="tile-line strong">{st.long.text}</div>
    </section>,
  );
  for (const d of st.dogs) tiles.push(<DogTile key={d.id} d={d} calm={calm} />);
  return <div className={`tiles n${tiles.length}`}>{tiles}</div>;
}

function pillBig(r) {
  if (r.done) return r.doses > 1 ? `Las ${r.doses} ✓` : '✓';
  if (r.level === 'closed') return 'Hoy no';
  return r.doses > 1 ? `${r.amount} de ${r.doses}` : r.level === 'off' ? 'Más tarde' : 'Pendiente';
}

function PillTile({ p, calm }) {
  const single = p.rows.length === 1;
  return (
    <section className={`tile ${lv(p.level, { calm })}`}>
      <header className="tile-head">
        <span className="tile-title">
          <Avatar person={p.person} size="sm" /> {p.person.short_name}
        </span>
        <StatusChip level={p.level} />
      </header>
      <div className="tile-kicker">💊 {single ? p.rows[0].label : 'Pastillas'}</div>
      {single ? (
        <>
          <div className="tile-big">{pillBig(p.rows[0])}</div>
          {p.rows[0].range ? <div className="tile-line">{p.rows[0].range}</div> : null}
          <div className="tile-line strong">{p.rows[0].text}</div>
        </>
      ) : (
        <ul className="trows">
          {p.rows.map((r) => (
            <li key={r.id} className={`trow lv-${r.level}`}>
              <Dot level={r.level} />
              <span className="trow-label">
                {r.label}
                {r.range ? <small>{r.range}</small> : null}
              </span>
              <span className="trow-text">{r.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DogTile({ d, calm }) {
  return (
    <section className={`tile dog-tile ${lv(d.level, { calm })}`} data-dog={d.dog.id}>
      <header className="tile-head">
        <span className="tile-title">
          <PawIcon size={24} style={{ color: DOG_TONE[d.dog.id] }} /> {d.dog.name}
        </span>
        <StatusChip level={d.level} />
      </header>
      <ul className="trows big">
        <li className={`trow lv-${d.lastPoop || d.poopLevel !== 'ok' ? d.poopLevel : 'off'}`}>
          <Dot level={d.lastPoop || d.poopLevel !== 'ok' ? d.poopLevel : 'off'} />
          <span className="trow-label">💩</span>
          <span className="trow-text">{d.lastPoop ? `hace ${fmtSpan(d.poopMin)}` : 'sin registro'}</span>
        </li>
        <li className={`trow lv-${d.lastPee || d.peeLevel !== 'ok' ? d.peeLevel : 'off'}`}>
          <Dot level={d.lastPee || d.peeLevel !== 'ok' ? d.peeLevel : 'off'} />
          <span className="trow-label">💧</span>
          <span className="trow-text">{d.lastPee ? `hace ${fmtSpan(d.peeAgoMin)}` : 'sin registro'}</span>
        </li>
      </ul>
      {d.meds?.length ? (
        <ul className="trows">
          {d.meds.map((m) => (
            <li key={m.id} className={`trow med lv-${m.level}`}>
              <Dot level={m.level} />
              <span className="trow-text">
                <strong>💊 {m.name}:</strong> {m.text}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="tile-line">
        Hoy: {d.pees} pis · {d.poopsToday} caca{d.rareTwice ? ' · algo raro 2 veces seguidas' : ''}
      </div>
    </section>
  );
}

// ───────────── Mocka y Honey: la línea del día ─────────────

function DogsSlide({ st, model }) {
  const w = st.walks;
  const name = (id) => model.peopleById.get(id)?.short_name ?? '';
  const refills = model.refills.filter((r) => r.day === st.day);
  const treats = model.treats.filter((t) => t.day === st.day);
  return (
    <div className="dogslide">
      <div className="dogslide-head">
        <h2>Mocka y Honey</h2>
        <p>
          {w.count} {w.count === 1 ? 'salida' : 'salidas'} · {st.long.count} {st.long.count === 1 ? 'larga' : 'largas'}
          {w.last ? ` · la última hace ${fmtSpan(w.sinceMin)} con ${name(w.last.walker_id)}` : ''}
          {w.nextDm != null && w.level !== 'alert' ? ` · próxima ${atHour(w.nextDm)}` : ''}
        </p>
      </div>
      <DayLine st={st} model={model} />
      <div className="dogslide-foot">
        <span>
          🥣 Tarritos: {refills.length ? refills.map((r) => fmtTime(r.at)).join(' · ') : 'ninguna carga todavía'}
        </span>
        <span>🦴 Premios: {treats.length || 'ninguno'}</span>
      </div>
    </div>
  );
}

function DayLine({ st, model }) {
  const { from: ws, to: we } = st.walks.window;
  const W = 1000;
  const padL = 118;
  const padR = 24;
  const x = (dm) => padL + ((Math.min(we, Math.max(ws, dm)) - ws) / (we - ws)) * (W - padL - padR);
  const trackY = 76;
  const lanes = model.dogs.map((d, i) => ({ dog: d, y: 200 + i * 100 }));
  const ticks = [];
  for (let h = ws; h <= we; h += 120) ticks.push(h);
  const target = hhmmToDayMin(st.rules.first_walk.target);
  const nowIn = !st.ended && st.dm >= ws && st.dm <= we;
  return (
    <svg className="dayline" viewBox="0 0 1000 430" role="img" aria-label="Salidas del día de 8 a 2">
      {ticks.map((h) => (
        <g key={h}>
          <line className="dl-grid" x1={x(h)} x2={x(h)} y1={40} y2={372} />
          <text className="dl-hour" x={x(h)} y={410} textAnchor="middle">
            {fmtHour(h)}
          </text>
        </g>
      ))}
      <text className="dl-lane" x={0} y={trackY} dominantBaseline="central">
        Salidas
      </text>
      <line className="dl-track" x1={padL} x2={W - padR} y1={trackY} y2={trackY} />
      <g className="dl-target">
        <line x1={x(target)} x2={x(target)} y1={trackY - 26} y2={trackY + 26} />
        <text x={x(target)} y={26} textAnchor="middle">
          1ª antes de las {fmtHour(target)}
        </text>
      </g>
      {nowIn ? (
        <g className="dl-now">
          <line x1={x(st.dm)} x2={x(st.dm)} y1={40} y2={372} />
          <text x={x(st.dm)} y={26} textAnchor="middle">
            ahora
          </text>
        </g>
      ) : null}
      {st.walks.nextDm != null && st.walks.level !== 'alert' && !st.ended ? (
        <g className="dl-next" transform={`translate(${x(st.walks.nextDm)} ${trackY})`}>
          <circle r={17} />
          <text y={40} textAnchor="middle">
            próxima {fmtHour(st.walks.nextDm)}
          </text>
        </g>
      ) : null}
      {st.walks.list.map((w) => {
        const s = tsToDayMin(w.started_at, st.day);
        const e = tsToDayMin(w.ended_at ?? w.started_at, st.day);
        const x1 = x(s);
        const x2 = Math.max(x(e), x1 + 18);
        return (
          <g key={w.id}>
            {w.kind === 'larga' ? <rect className="dl-long" x={x1 - 12} y={trackY - 14} width={x2 - x1 + 24} height={28} rx={14} /> : null}
            <g className="dl-paw" transform={`translate(${x1 - 13} ${trackY - 13}) scale(${26 / 24})`}>
              <circle cx={12} cy={12} r={15} className="dl-paw-bg" />
              <PawShape />
            </g>
            {lanes.map(({ dog, y }) => {
              const rec = w.dogs.find((dd) => dd.dog_id === dog.id);
              if (!rec) return null;
              const poop = rec.poop === 'si' ? '💩' : rec.poop === 'raro' ? '⚠️' : null;
              return (
                <g key={dog.id} transform={`translate(${x1} ${y})`}>
                  {rec.pee ? (
                    <text className="dl-emoji" y={-20} textAnchor="middle" dominantBaseline="central">
                      💧
                    </text>
                  ) : null}
                  {poop ? (
                    <text className="dl-emoji" y={20} textAnchor="middle" dominantBaseline="central">
                      {poop}
                    </text>
                  ) : null}
                  {!rec.pee && !poop ? <circle className="dl-none" r={5} /> : null}
                </g>
              );
            })}
          </g>
        );
      })}
      {lanes.map(({ dog, y }) => (
        <g key={dog.id}>
          <line className="dl-lane-line" x1={padL} x2={W - padR} y1={y} y2={y} />
          <g transform={`translate(0 ${y - 13})`} style={{ color: DOG_TONE[dog.id] }}>
            <g transform="scale(1.05)" fill="currentColor">
              <PawShape />
            </g>
          </g>
          <text className="dl-lane" x={32} y={y} dominantBaseline="central">
            {dog.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ───────────── agenda: hoy y los próximos 3 días ─────────────

function AgendaSlide({ model, now }) {
  const cal = calTodayISO(now);
  const days = [0, 1, 2, 3].map((i) => addDays(cal, i));
  const events = visibleEvents(model, 'casa');
  return (
    <div className="agendaslide">
      {days.map((d, i) => {
        const evs = events.filter((e) => calDayOf(e.starts_at) === d);
        return (
          <section key={d} className={`agcol ${i === 0 ? 'today' : ''} ${evs.length ? '' : 'free'}`}>
            <h3>
              <span className="cap">{i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : fmtWeekday(d)}</span>
              <small>
                {i < 2 ? `${fmtWeekday(d, 'short')} ` : ''}
                {Number(d.slice(8, 10))}/{Number(d.slice(5, 7))}
              </small>
            </h3>
            {evs.length ? (
              <ul>
                {evs.map((e) => (
                  <li key={e.id}>
                    <span className="agtime">{e.all_day ? 'Todo el día' : fmtTime(e.starts_at)}</span>
                    <span className="agtitle">
                      <span aria-hidden="true">{CATEGORY[e.category]?.icon}</span> {e.title}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="agfree">
                <FootIcon size={22} /> Día libre
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ───────────── la semana ─────────────

function WeekSlide({ model, now, visitas }) {
  const wk = weekInfo(model, now);
  const filler = Math.max(0, 7 - wk.days.length);
  const lastDay = wk.days[wk.days.length - 1]?.day ?? dayOf(now);
  return (
    <div className="weekslide">
      <div className="weekdays">
        {wk.days.map((r) => (
          <div key={r.day} className={`wday ${r.complete ? 'full' : r.walksOk ? 'half' : ''} ${r.today ? 'today' : ''}`}>
            <span className="wday-name cap">{r.today ? 'Hoy' : fmtWeekday(r.day, 'short')}</span>
            <span className="wday-prints" aria-hidden="true">
              <svg viewBox="0 0 28 44" width={22} height={34}>
                <FootShape />
              </svg>
              <svg viewBox="0 0 24 24" width={24} height={24}>
                <PawShape />
              </svg>
            </span>
            <span className="wday-n">
              {r.walks} {r.walks === 1 ? 'salida' : 'salidas'}
            </span>
            <span className="wday-tag">{r.complete ? 'Completo' : r.walksOk ? 'Perras ✓' : r.today ? 'En curso' : ''}</span>
          </div>
        ))}
        {Array.from({ length: filler }, (_, k) => (
          <div key={`f${k}`} className="wday future">
            <span className="wday-name cap">{fmtWeekday(addDays(lastDay, k + 1), 'short')}</span>
            <span className="wday-prints" aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="weekstats">
        <div>
          <strong>{wk.salidas}</strong> salidas
        </div>
        <div>
          <strong>{wk.largos}</strong> paseos largos
        </div>
        <div>
          <strong>{wk.tarritos}</strong> cargas de tarritos
        </div>
        <div>
          <strong>{wk.premios}</strong> premios
        </div>
      </div>
      <ul className="weekstreaks">
        <li>
          🐾{' '}
          {wk.walkStreak
            ? `${wk.walkStreak === 1 ? '1 día' : `${wk.walkStreak} días seguidos`} con ${goalsText(model)}`
            : wk.completeDays
              ? `Hoy se pueden volver a completar ${goalsText(model)}`
              : `Hoy puede ser el primer día con ${goalsText(model)}`}
        </li>
        {!visitas
          ? wk.pillStreaks
              .filter((p) => p.n)
              .map((p) => (
                <li key={p.person.id}>
                  💊 {p.person.short_name}: {p.n === 1 ? '1 día' : `${p.n} días seguidos`} con sus pastillas
                </li>
              ))
          : null}
        {wk.completeDays ? <li>✨ {wk.completeDays === 1 ? 'Un día completo' : `${wk.completeDays} días completos`} esta semana</li> : null}
      </ul>
      {wk.days.length < 7 && model.startDate ? <p className="weeknote">Vestigia empezó el {fmtDayLong(model.startDate)}: cada huella es un día.</p> : null}
    </div>
  );
}

// ───────────── modo noche ─────────────

function NightView({ night, now, onAck }) {
  const level = worst(night.missing.map((m) => m.level));
  const d = night.day;
  return (
    <div className={`night ${night.calm ? 'calm' : 'attention'}`}>
      {night.calm ? (
        <div className="night-trail" aria-hidden="true">
          <HouseTrail height={420} width={1100} loop />
        </div>
      ) : null}
      <div className="night-clock">{fmtTime(now)}</div>
      <div className="night-day">
        Día del {fmtWeekday(d)} {Number(d.slice(8, 10))}
      </div>
      {night.calm ? (
        <p className="night-msg">
          <Mark size={30} /> {night.acked && night.missing.length ? 'Día cerrado' : 'Todo en orden'} · buenas noches
        </p>
      ) : (
        <div className={`night-panel ${lv(level)}`}>
          <h3>Falta registrar</h3>
          <ul>
            {night.missing.map((m) => (
              <li key={m.id}>
                <Dot level={m.level} /> {m.short}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn night-ack"
            onClick={(e) => {
              e.stopPropagation();
              onAck();
            }}
          >
            Entendido
          </button>
          <p className="night-hint">o tocá la pantalla para anotar lo que falta</p>
        </div>
      )}
    </div>
  );
}

// ───────────── ¿quién está usando el iPad? ─────────────

export function WhoOverlay() {
  const { model } = useData();
  const kiosk = useKiosk();
  return (
    <div className="who-overlay" role="dialog" aria-modal="true" aria-label="¿Quién está usando el iPad?">
      <div className="who-card">
        <h2>¿Quién está usando el iPad?</h2>
        <div className="who-options">
          {model.people.map((p) => (
            <button key={p.id} type="button" className="who-btn" data-person={p.id} onClick={() => kiosk.choose(p.id)}>
              <Avatar person={p} size="xl" />
              <span>{p.short_name}</span>
            </button>
          ))}
          <button type="button" className="who-btn look" onClick={() => kiosk.choose(null)}>
            <span className="who-eye" aria-hidden="true">
              👀
            </span>
            <span>Solo miro</span>
          </button>
        </div>
        <button type="button" className={`visitas-toggle ${kiosk.visitas ? 'on' : ''}`} aria-pressed={kiosk.visitas} onClick={kiosk.toggleVisitas}>
          <span aria-hidden="true">👥</span> {kiosk.visitas ? 'Hay visitas: las pastillas no se muestran en el resumen' : 'Hay visitas (ocultar las pastillas del resumen)'}
        </button>
        <button type="button" className="link-btn who-back" onClick={kiosk.base === 'summary' ? kiosk.toSummary : kiosk.cancelAsk}>
          {kiosk.base === 'summary' ? 'Volver al resumen' : 'Cancelar'}
        </button>
      </div>
    </div>
  );
}
