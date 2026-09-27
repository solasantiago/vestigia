import { useMemo, useState } from 'react';
import { useApp } from '../lib/appctx.js';
import { useData } from '../lib/data.jsx';
import { addDays, fmtDayShort } from '../lib/dates.js';
import { fmtPct, fmtSigned } from '../lib/format.js';
import {
  complianceByWeek,
  complianceByWeekday,
  groupCompliance,
  habitCompliance,
  habitDayState,
  habitsOf,
  habitStreaks,
  SLOT_LABEL,
} from '../lib/metrics.js';
import { ChartCard, Legend } from '../components/charts/core.jsx';
import { ColumnChart } from '../components/charts/ColumnChart.jsx';
import { DayGrid } from '../components/charts/DayGrid.jsx';
import { BarList, StatTile } from '../components/charts/Figures.jsx';
import { Card, SectionTitle, Segmented } from '../components/ui.jsx';
import { NoTraces } from '../components/prints.jsx';

const DAY_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function daysText(days) {
  if (days.length === 7) return 'todos los días';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'de lunes a viernes';
  return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY_NAMES[d]).join(', ');
}

const STATE_LABEL = {
  si: 'Hecho',
  no: 'No',
  miss: 'Sin responder',
  na: 'No aplica',
  off: 'No tocaba',
  pending: 'Pendiente',
  parcial: 'A medias',
};

export function stateCell(state) {
  switch (state) {
    case 'si':
      return { fill: 'var(--accent)', label: STATE_LABEL.si };
    case 'no':
    case 'miss':
      return { fill: 'var(--state-no)', label: STATE_LABEL[state] };
    case 'parcial':
      return { fill: 'color-mix(in oklab, var(--accent) 45%, var(--surface))', label: STATE_LABEL.parcial };
    case 'na':
      return { hatch: true, label: STATE_LABEL.na };
    case 'off':
      return { fill: 'var(--state-off)', label: STATE_LABEL.off };
    case 'pending':
      return { fill: 'transparent', ring: true, label: STATE_LABEL.pending };
    default:
      return null;
  }
}

export const STATE_LEGEND = [
  { label: 'Hecho', color: 'var(--accent)' },
  { label: 'A medias', color: 'color-mix(in oklab, var(--accent) 45%, var(--surface))' },
  { label: 'No o sin responder', color: 'var(--state-no)' },
  { label: 'No aplica', color: 'var(--state-na)', shape: 'hatch' },
  { label: 'No tocaba', color: 'var(--state-off)' },
];

export function seqFill(pct) {
  if (pct == null) return 'var(--state-off)';
  return `color-mix(in oklab, var(--accent) ${Math.round(12 + pct * 88)}%, var(--surface))`;
}

export default function Habits() {
  const { model } = useData();
  const { person: appPerson, today, days, prevDays, period, startDate } = useApp();
  // En el iPad (cuenta Casa) se elige de quién ver los hábitos.
  const [picked, setPicked] = useState(model.people[0]?.id);
  const person = appPerson === 'casa' ? picked : appPerson;
  const habits = habitsOf(model, person);
  const manual = habits.filter((h) => h.source === 'manual');
  const start90 = addDays(today, -90) < startDate ? startDate : addDays(today, -90);

  const stats = useMemo(
    () =>
      habits.map((h) => ({
        habit: h,
        streak: habitStreaks(model, h, today),
        comp: habitCompliance(model, h, days, today),
        prev: habitCompliance(model, h, prevDays, today),
      })),
    [model, habits, today, days, prevDays],
  );

  const cur = groupCompliance(model, habits, days, today);
  const prev = groupCompliance(model, habits, prevDays, today);
  const bestActive = [...stats].sort((a, b) => b.streak.current - a.streak.current)[0];
  const bestEver = [...stats].sort((a, b) => b.streak.max - a.streak.max)[0];
  const weekly = complianceByWeek(model, habits, days, today);
  const weekday = complianceByWeekday(model, habits, days, today);
  const worstDay = [...weekday].filter((w) => w.pct != null).sort((a, b) => a.pct - b.pct)[0];
  const bestDay = [...weekday].filter((w) => w.pct != null).sort((a, b) => b.pct - a.pct)[0];

  const daily = useMemo(() => {
    const out = new Map();
    for (let d = start90; d <= today; d = addDays(d, 1)) out.set(d, groupCompliance(model, habits, [d], today));
    return out;
  }, [model, habits, start90, today]);

  const picker =
    appPerson === 'casa' ? (
      <div className="person-pick">
        <Segmented
          label="De quién"
          value={person}
          onChange={setPicked}
          options={model.people.map((p) => ({ value: p.id, label: p.short_name, person: p.id }))}
        />
      </div>
    ) : null;

  if (!habits.length) {
    return (
      <div className="stack">
        {picker}
        <NoTraces>Todavía no hay hábitos cargados para {model.peopleById.get(person)?.short_name}.</NoTraces>
      </div>
    );
  }

  const fewDays = days.length < 7;

  return (
    <div className="stack">
      {picker}
      {fewDays ? (
        <p className="lede">
          Vestigia registra desde el {startDate.slice(8, 10)}/{Number(startDate.slice(5, 7))}: con cada día que pasa, estos números se van llenando.
        </p>
      ) : null}
      <div className="kpis">
        <StatTile
          label="Cumplimiento"
          value={fmtPct(cur.pct)}
          delta={prev.pct != null && cur.pct != null ? { value: cur.pct - prev.pct, text: `${fmtSigned((cur.pct - prev.pct) * 100, 0)} pts` } : null}
          deltaLabel={`vs ${period} días anteriores`}
          sub={`${cur.si} de ${cur.base} check-ins cumplidos`}
        />
        <StatTile
          label="Racha activa más larga"
          value={bestActive?.streak.current ?? 0}
          unit="seguidos"
          sub={bestActive ? `${bestActive.habit.emoji} ${bestActive.habit.name}` : null}
        />
        <StatTile label="Mejor racha histórica" value={bestEver?.streak.max ?? 0} unit="seguidos" sub={bestEver ? `${bestEver.habit.emoji} ${bestEver.habit.name}` : null} />
        <StatTile
          label="Sin responder"
          value={cur.miss}
          unit="check-ins"
          better="down"
          delta={prev.base ? { value: cur.miss - prev.miss, text: fmtSigned(cur.miss - prev.miss, 0) } : null}
          deltaLabel={`vs ${period} días anteriores`}
          sub="Cuentan como no cumplidos"
        />
      </div>

      <div className="grid two">
        <ChartCard
          title="Cumplimiento por semana"
          subtitle="Todos los hábitos, incluida la meta de pasos"
          table={{
            columns: [
              { key: 'day', label: 'Semana del', fmt: (v) => fmtDayShort(v) },
              { key: 'pct', label: 'Cumplimiento', num: true, fmt: fmtPct },
              { key: 'n', label: 'Check-ins', num: true },
            ],
            rows: weekly,
          }}
        >
          <ColumnChart
            ariaLabel="Cumplimiento semanal de hábitos"
            data={weekly.map((w) => ({ key: w.day, label: fmtDayShort(w.day), title: `Semana del ${fmtDayShort(w.day)}`, values: { pct: w.pct == null ? null : w.pct * 100 } }))}
            stack={[{ key: 'pct', label: 'Cumplimiento', color: 'var(--accent)' }]}
            yMax={100}
            fmtY={(v) => `${Math.round(v)}%`}
            goal={{ value: 80, label: 'Meta 80%' }}
          />
        </ChartCard>
        <ChartCard
          title="Por día de la semana"
          subtitle={worstDay && bestDay ? `Mejor el ${bestDay.label.toLowerCase()} (${fmtPct(bestDay.pct)}), peor el ${worstDay.label.toLowerCase()} (${fmtPct(worstDay.pct)})` : null}
          table={{
            columns: [
              { key: 'label', label: 'Día' },
              { key: 'pct', label: 'Cumplimiento', num: true, fmt: fmtPct },
              { key: 'n', label: 'Check-ins', num: true },
            ],
            rows: weekday,
          }}
        >
          <ColumnChart
            ariaLabel="Cumplimiento por día de la semana"
            data={weekday.map((w) => ({ key: w.key, label: w.label, values: { pct: w.pct == null ? null : w.pct * 100 } }))}
            stack={[{ key: 'pct', label: 'Cumplimiento', color: 'var(--accent)' }]}
            yMax={100}
            fmtY={(v) => `${Math.round(v)}%`}
          />
        </ChartCard>
      </div>

      <div className="grid two wide-left">
      <ChartCard
        title="Últimos 90 días, todos los hábitos"
        subtitle="Cada cuadrado es un día: más oscuro, más hábitos cumplidos"
        legend={[
          { label: '0%', color: seqFill(0) },
          { label: '50%', color: seqFill(0.5) },
          { label: '100%', color: seqFill(1) },
          { label: 'Sin datos', color: 'var(--state-off)' },
        ]}
        table={{
          columns: [
            { key: 'day', label: 'Día', fmt: (v) => fmtDayShort(v) },
            { key: 'pct', label: 'Cumplimiento', num: true, fmt: fmtPct },
            { key: 'si', label: 'Hechos', num: true },
            { key: 'base', label: 'Programados', num: true },
          ],
          rows: [...daily.entries()].map(([day, c]) => ({ key: day, day, ...c })),
        }}
      >
        <DayGrid
          ariaLabel="Mapa de calor de hábitos de los últimos 90 días"
          start={start90}
          end={today}
          maxCell={20}
          cell={(d) => {
            const c = daily.get(d);
            if (!c) return null;
            if (d === today && !c.base) return { fill: 'transparent', ring: true, label: 'Hoy, en curso' };
            return { fill: seqFill(c.pct), label: c.pct == null ? 'Sin datos' : `${fmtPct(c.pct)} · ${c.si} de ${c.base}` };
          }}
        />
      </ChartCard>
      <Card title="Ranking del período" subtitle={`Cumplimiento de cada hábito, últimos ${period} días`}>
        <BarList
          items={[...stats]
            .filter((x) => x.comp.pct != null)
            .sort((a, b) => b.comp.pct - a.comp.pct)
            .map((x) => ({ key: x.habit.id, label: `${x.habit.emoji} ${x.habit.name}`, value: x.comp.pct }))}
          max={1}
          fmt={fmtPct}
        />
      </Card>
      </div>

      <SectionTitle sub={`Racha = días programados seguidos con "Sí". "No aplica" no la corta. Porcentaje de los últimos ${period} días.`}>
        Hábito por hábito
      </SectionTitle>
      <Legend items={STATE_LEGEND} />
      <div className="grid habits-grid">
        {stats.map(({ habit: h, streak, comp, prev: pv }) => (
          <section key={h.id} className="card habit-card">
            <header className="habit-head">
              <span className="habit-emoji" aria-hidden="true">
                {h.emoji}
              </span>
              <div>
                <h3>{h.name}</h3>
                <p className="card-sub">
                  {h.source === 'auto' ? 'Automático · ' : `${SLOT_LABEL[h.slot]} · `}
                  {daysText(h.days)}
                  {h.doses > 1 ? ` · ${h.doses} tomas` : ''}
                </p>
              </div>
            </header>
            <div className="habit-nums">
              <div>
                <span className="big">{streak.current}</span>
                <span className="lbl">racha actual</span>
              </div>
              <div>
                <span className="big">{streak.max}</span>
                <span className="lbl">récord</span>
              </div>
              <div>
                <span className="big">{fmtPct(comp.pct)}</span>
                <span className="lbl">
                  {pv.pct != null && comp.pct != null ? (
                    <span className={comp.pct - pv.pct >= 0 ? 'up' : 'down'}>
                      {comp.pct - pv.pct >= 0 ? '▲' : '▼'} {fmtSigned((comp.pct - pv.pct) * 100, 0)}
                    </span>
                  ) : (
                    'cumplimiento'
                  )}
                </span>
              </div>
            </div>
            <DayGrid
              ariaLabel={`${h.name}: últimos 90 días`}
              start={start90}
              end={today}
              maxCell={13}
              minCell={6}
              gap={2}
              showWeekdays={false}
              cell={(d) => stateCell(habitDayState(model, h, d, today))}
            />
            {comp.na || comp.miss || comp.parcial ? (
              <p className="card-foot">
                {[
                  comp.parcial ? `${comp.parcial} a medias` : null,
                  comp.miss ? `${comp.miss} sin responder` : null,
                  comp.na ? `${comp.na} "no aplica"` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </section>
        ))}
      </div>
      {!manual.length ? <p className="empty">Todavía no hay hábitos cargados.</p> : null}
    </div>
  );
}
