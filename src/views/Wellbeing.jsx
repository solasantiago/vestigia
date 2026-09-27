import { useMemo } from 'react';
import { useApp } from '../lib/appctx.js';
import { useData } from '../lib/data.jsx';
import { addDays, dow, fmtDayCompact, fmtDayShort, fmtDuration, minutesToClock, range } from '../lib/dates.js';
import { fmt1, fmtCompact, fmtHours, fmtInt, fmtPct, fmtSigned } from '../lib/format.js';
import { avgClock, mean, personDaily, rolling, SCREEN_CATEGORIES, screenApps, tagStats } from '../lib/metrics.js';
import { ChartCard } from '../components/charts/core.jsx';
import { LineChart } from '../components/charts/LineChart.jsx';
import { ColumnChart } from '../components/charts/ColumnChart.jsx';
import { DayGrid } from '../components/charts/DayGrid.jsx';
import { BarList, StatTile } from '../components/charts/Figures.jsx';
import { Card, SectionTitle } from '../components/ui.jsx';

export const CAT_COLOR = {
  Redes: 'var(--cat-1)',
  Mensajería: 'var(--cat-2)',
  Video: 'var(--cat-3)',
  Navegación: 'var(--cat-4)',
  Productividad: 'var(--cat-5)',
  Música: 'var(--cat-6)',
};

function delta(cur, prev, digits = 1, suffix = '') {
  if (cur == null || prev == null) return null;
  return { value: cur - prev, text: `${fmtSigned(cur - prev, digits)}${suffix}` };
}

const toH = (min) => (min == null ? null : min / 60);

function moodFill(v) {
  if (v == null) return 'var(--state-off)';
  return `color-mix(in oklab, var(--accent) ${Math.round(10 + ((v - 1) / 4) * 90)}%, var(--surface))`;
}

export default function Wellbeing() {
  const { model } = useData();
  const { person, today, days, prevDays, period } = useApp();
  const me = model.peopleById.get(person);
  const start90 = addDays(today, -90);

  const rows = useMemo(() => personDaily(model, person, days, today), [model, person, days, today]);
  const prev = useMemo(() => personDaily(model, person, prevDays, today), [model, person, prevDays, today]);
  const rows90 = useMemo(() => personDaily(model, person, range(start90, today), today), [model, person, start90, today]);

  const avg = (rs, k) => mean(rs.map((r) => r[k]));
  const moodRoll = rolling(rows.map((r) => r.mood), 7);
  const energyRoll = rolling(rows.map((r) => r.energy), 7);
  const stressRoll = rolling(rows.map((r) => r.stress), 7);
  const moodData = rows.map((r, i) => ({ day: r.day, mood: r.mood, roll: moodRoll[i], energy: r.energy, eroll: energyRoll[i], stress: r.stress, sroll: stressRoll[i] }));

  const sleepGoal = me.sleep_goal_min / 60;
  const sleepRows = rows.filter((r) => r.sleepMin != null);
  const stepRows = rows.filter((r) => r.steps != null);
  const shortNights = sleepRows.filter((r) => r.sleepMin < 360).length;
  const stepsHit = stepRows.filter((r) => r.steps >= me.steps_goal).length;

  // Pantalla: diario para 7/30 días, promedio semanal para 90.
  const weeklyScreen = period > 30;
  const screenData = useMemo(() => {
    const withData = rows.filter((r) => r.byCat);
    if (!weeklyScreen) {
      return rows.map((r) => ({
        key: r.day,
        label: fmtDayShort(r.day),
        title: fmtDayCompact(r.day),
        values: Object.fromEntries(SCREEN_CATEGORIES.map((c) => [c, r.byCat ? (r.byCat[c] ?? 0) / 60 : null])),
      }));
    }
    const weeks = new Map();
    for (const r of withData) {
      const monday = addDays(r.day, -((dow(r.day) + 6) % 7));
      if (!weeks.has(monday)) weeks.set(monday, []);
      weeks.get(monday).push(r);
    }
    return [...weeks.entries()].map(([monday, rs]) => ({
      key: monday,
      label: fmtDayShort(monday),
      title: `Semana del ${fmtDayShort(monday)} · promedio por día`,
      values: Object.fromEntries(SCREEN_CATEGORIES.map((c) => [c, mean(rs.map((r) => (r.byCat[c] ?? 0) / 60))])),
    }));
  }, [rows, weeklyScreen]);
  const apps = useMemo(() => screenApps(model, person, days, prevDays), [model, person, days, prevDays]);

  const moodMap = model.moodByPerson.get(person) ?? new Map();
  const slotVals = { manana: [], tarde: [], noche: [] };
  for (const d of days) {
    const e = moodMap.get(d);
    if (!e) continue;
    for (const s of Object.keys(slotVals)) if (e[s]?.mood != null) slotVals[s].push(e[s].mood);
  }
  const bySlot = [
    ['manana', 'Mañana'],
    ['tarde', 'Tarde'],
    ['noche', 'Noche'],
  ]
    .filter(([k]) => slotVals[k].length)
    .map(([k, label]) => ({ key: k, label, value: mean(slotVals[k]), note: `${slotVals[k].length} respuestas` }));
  const nAnswers = slotVals.manana.length + slotVals.tarde.length + slotVals.noche.length;

  const feelings = tagStats(rows, 'feelings');
  const influences = tagStats(rows, 'influences');
  const bests = rows.filter((r) => r.best).slice(-6).reverse();

  return (
    <div className="stack">
      <div className="kpis six">
        <StatTile label="Ánimo" value={fmt1(avg(rows, 'mood'))} unit="/ 5" delta={delta(avg(rows, 'mood'), avg(prev, 'mood'))} deltaLabel="vs antes" />
        <StatTile label="Energía" value={fmt1(avg(rows, 'energy'))} unit="/ 5" delta={delta(avg(rows, 'energy'), avg(prev, 'energy'))} deltaLabel="vs antes" />
        <StatTile label="Estrés" value={fmt1(avg(rows, 'stress'))} unit="/ 5" better="down" delta={delta(avg(rows, 'stress'), avg(prev, 'stress'))} deltaLabel="vs antes" />
        <StatTile
          label="Sueño"
          value={fmt1(toH(avg(rows, 'sleepMin')))}
          unit="h / noche"
          delta={delta(toH(avg(rows, 'sleepMin')), toH(avg(prev, 'sleepMin')), 1, ' h')}
          deltaLabel="vs antes"
        />
        <StatTile label="Pasos" value={fmtCompact(avg(rows, 'steps'))} unit="/ día" delta={delta(avg(rows, 'steps'), avg(prev, 'steps'), 0)} deltaLabel="vs antes" />
        <StatTile
          label="Pantalla"
          value={fmt1(toH(avg(rows, 'screen')))}
          unit="h / día"
          better="down"
          delta={delta(toH(avg(rows, 'screen')), toH(avg(prev, 'screen')), 1, ' h')}
          deltaLabel="vs antes"
        />
      </div>

      <SectionTitle sub="Promedio de las respuestas del día (1 a 5). La línea es el promedio de 7 días.">Estado de ánimo</SectionTitle>
      <ChartCard
        title="Ánimo diario"
        subtitle="Privado: solo lo ves vos"
        legend={[
          { label: 'Promedio de 7 días', color: 'var(--accent)', shape: 'line' },
          { label: 'Día', color: 'var(--accent)', shape: 'dot' },
        ]}
        table={{
          columns: [
            { key: 'day', label: 'Día', fmt: (v) => fmtDayCompact(v) },
            { key: 'mood', label: 'Ánimo', num: true, fmt: fmt1 },
            { key: 'energy', label: 'Energía', num: true },
            { key: 'stress', label: 'Estrés', num: true },
          ],
          rows,
        }}
      >
        <LineChart
          ariaLabel="Ánimo diario y promedio de 7 días"
          data={moodData}
          series={[
            { key: 'mood', label: 'Ánimo del día', color: 'var(--accent)', dots: true },
            { key: 'roll', label: 'Promedio 7 días', color: 'var(--accent)' },
          ]}
          yDomain={[1, 5]}
          yTicks={[1, 2, 3, 4, 5]}
          fmtY={fmt1}
          fmtTick={String}
          endLabel={{ key: 'roll', color: 'var(--accent)' }}
          height={220}
        />
      </ChartCard>

      <div className="grid two">
        <ChartCard title="Energía a la mañana" subtitle="Respuesta de la mañana, 1 a 5">
          <LineChart
            ariaLabel="Energía a la mañana"
            data={moodData}
            series={[
              { key: 'energy', label: 'Energía', color: 'var(--accent)', dots: true },
              { key: 'eroll', label: 'Promedio 7 días', color: 'var(--accent)' },
            ]}
            yDomain={[1, 5]}
            yTicks={[1, 3, 5]}
            fmtY={fmt1}
            fmtTick={String}
            height={170}
          />
        </ChartCard>
        <ChartCard title="Estrés a la tarde" subtitle="Respuesta de la tarde, 1 a 5 (más bajo es mejor)">
          <LineChart
            ariaLabel="Estrés a la tarde"
            data={moodData}
            series={[
              { key: 'stress', label: 'Estrés', color: 'var(--accent)', dots: true },
              { key: 'sroll', label: 'Promedio 7 días', color: 'var(--accent)' },
            ]}
            yDomain={[1, 5]}
            yTicks={[1, 3, 5]}
            fmtY={fmt1}
            fmtTick={String}
            height={170}
          />
        </ChartCard>
      </div>

      <div className="grid two wide-left">
      <ChartCard
        title="Calendario de ánimo · 90 días"
        subtitle="Más oscuro, mejor día"
        legend={[1, 2, 3, 4, 5].map((v) => ({ label: String(v), color: moodFill(v) })).concat([{ label: 'Sin respuesta', color: 'var(--state-off)' }])}
      >
        <DayGrid
          ariaLabel="Calendario de ánimo de los últimos 90 días"
          start={start90}
          end={today}
          maxCell={20}
          cell={(d) => {
            const r = rows90.find((x) => x.day === d);
            if (!r) return null;
            if (d === today && r.mood == null) return { fill: 'transparent', ring: true, label: 'Hoy, sin cargar' };
            return { fill: moodFill(r.mood), label: r.mood == null ? 'Sin respuesta' : `Ánimo ${fmt1(r.mood)}${r.feelings.length ? ` · ${r.feelings.join(', ')}` : ''}` };
          }}
        />
      </ChartCard>
      <Card title="Según el momento del día" subtitle={`Ánimo promedio de cada respuesta, últimos ${period} días`}>
        <BarList
          items={bySlot}
          max={5}
          fmt={(v) => fmt1(v)}
          emptyText="Sin respuestas en el período."
        />
        <dl className="facts">
          <div>
            <dt>Días buenos (4 o más)</dt>
            <dd>{rows.filter((r) => r.mood != null && r.mood >= 4).length}</dd>
          </div>
          <div>
            <dt>Días pesados (2 o menos)</dt>
            <dd>{rows.filter((r) => r.mood != null && r.mood <= 2).length}</dd>
          </div>
          <div>
            <dt>Días sin cargar</dt>
            <dd>{rows.filter((r) => r.mood == null && r.day < today).length}</dd>
          </div>
          <div>
            <dt>Respuestas en el período</dt>
            <dd>{nAnswers}</dd>
          </div>
        </dl>
      </Card>
      </div>

      <div className="grid three">
        <Card title="Cómo me sentí" subtitle="Días con cada etiqueta · ánimo promedio esos días">
          <BarList
            items={feelings.map((t) => ({ key: t.tag, label: t.tag, value: t.n, note: t.mood != null ? `ánimo ${fmt1(t.mood)}` : null }))}
            fmt={(v) => fmtInt(v)}
          />
        </Card>
        <Card title="Qué influyó" subtitle="Días con cada etiqueta · ánimo promedio esos días">
          <BarList
            items={influences.map((t) => ({ key: t.tag, label: t.tag, value: t.n, note: t.mood != null ? `ánimo ${fmt1(t.mood)}` : null }))}
            fmt={(v) => fmtInt(v)}
          />
        </Card>
        <Card title="Lo mejor del día" subtitle="Tus últimas notas de la noche">
          {bests.length ? (
            <ul className="notes">
              {bests.map((r) => (
                <li key={r.day}>
                  <span className="muted small">{fmtDayCompact(r.day)}</span>
                  <span>{r.best}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Sin notas en el período.</p>
          )}
        </Card>
      </div>

      <SectionTitle sub="Llegan solos desde el Apple Watch con el Atajo de iPhone (en esta PoC son datos simulados).">Sueño y pasos</SectionTitle>
      <div className="grid two">
        <ChartCard
          title="Horas de sueño"
          subtitle={`Te acostás en promedio a las ${minutesToClock(avgClock(sleepRows.map((r) => r.bedtime), { lateNight: true }))} y te levantás a las ${minutesToClock(avgClock(sleepRows.map((r) => r.wake)))}`}
          footnote={`${shortNights} ${shortNights === 1 ? 'noche' : 'noches'} con menos de 6 h en el período.`}
          table={{
            columns: [
              { key: 'day', label: 'Noche anterior a', fmt: (v) => fmtDayCompact(v) },
              { key: 'sleepMin', label: 'Sueño', num: true, fmt: (v) => fmtDuration(v) },
              { key: 'bedtime', label: 'Se acostó', fmt: (v) => (v ? v.slice(0, 5) : '—') },
              { key: 'wake', label: 'Se levantó', fmt: (v) => (v ? v.slice(0, 5) : '—') },
            ],
            rows,
          }}
        >
          <ColumnChart
            ariaLabel="Horas de sueño por noche"
            data={rows.map((r) => ({ key: r.day, label: fmtDayShort(r.day), title: fmtDayCompact(r.day), values: { h: r.sleepMin == null ? null : r.sleepMin / 60 } }))}
            stack={[{ key: 'h', label: 'Sueño', color: 'var(--accent)' }]}
            fmtY={(v) => `${Math.round(v)} h`}
            fmtValue={(v) => fmtDuration(v * 60)}
            yMax={10}
            goal={{ value: sleepGoal, label: `Meta ${fmtDuration(me.sleep_goal_min)}` }}
          />
        </ChartCard>
        <ChartCard
          title="Pasos por día"
          subtitle={`Llegaste a la meta ${stepsHit} de ${stepRows.length} días (${fmtPct(stepRows.length ? stepsHit / stepRows.length : null)})`}
          table={{
            columns: [
              { key: 'day', label: 'Día', fmt: (v) => fmtDayCompact(v) },
              { key: 'steps', label: 'Pasos', num: true, fmt: fmtInt },
              { key: 'walks', label: 'Paseos con los perros', num: true },
            ],
            rows,
          }}
        >
          <ColumnChart
            ariaLabel="Pasos por día"
            data={rows.map((r) => ({ key: r.day, label: fmtDayShort(r.day), title: fmtDayCompact(r.day), values: { s: r.steps } }))}
            stack={[{ key: 's', label: 'Pasos', color: 'var(--accent)' }]}
            fmtY={(v) => (v >= 1000 ? `${Math.round(v / 1000)} k` : String(v))}
            fmtValue={fmtInt}
            goal={{ value: me.steps_goal, label: `Meta ${fmtInt(me.steps_goal)}` }}
          />
        </ChartCard>
      </div>

      <SectionTitle sub="Tiempo en el celular por categoría de app.">Uso de pantalla</SectionTitle>
      <div className="grid two wide-left">
        <ChartCard
          title={weeklyScreen ? 'Horas por día, promedio semanal' : 'Horas por día'}
          subtitle="Apilado por categoría"
          legend={SCREEN_CATEGORIES.map((c) => ({ label: c, color: CAT_COLOR[c] }))}
          table={{
            columns: [{ key: 'title', label: weeklyScreen ? 'Semana' : 'Día' }, ...SCREEN_CATEGORIES.map((c) => ({ key: c, label: c, num: true, fmt: (v) => (v == null ? '—' : fmtHours(v * 60)) }))],
            rows: screenData.map((d) => ({ key: d.key, title: d.title, ...d.values })),
          }}
        >
          <ColumnChart
            ariaLabel="Horas de pantalla por categoría"
            data={screenData}
            stack={SCREEN_CATEGORIES.map((c) => ({ key: c, label: c, color: CAT_COLOR[c] }))}
            fmtY={(v) => `${Math.round(v)} h`}
            fmtValue={(v) => fmtDuration(v * 60)}
            height={220}
          />
        </ChartCard>
        <Card title="Apps más usadas" subtitle={`Promedio por día · variación vs los ${period} días anteriores`}>
          <ul className="apps">
            {apps.slice(0, 8).map((a) => {
              const d = a.prevAvg ? (a.avg - a.prevAvg) / a.prevAvg : null;
              return (
                <li key={a.app}>
                  <span className="app-key" style={{ background: CAT_COLOR[a.category] }} aria-hidden="true" />
                  <span className="app-name">
                    {a.app}
                    <span className="muted small"> · {a.category}</span>
                  </span>
                  <span className="app-val">{fmtDuration(a.avg)}</span>
                  <span className={`app-delta ${d == null ? '' : d > 0.05 ? 'up-bad' : d < -0.05 ? 'down-good' : ''}`}>
                    {d == null ? '—' : Math.abs(d) < 0.02 ? '= igual' : `${d > 0 ? '▲' : '▼'} ${fmtPct(Math.abs(d))}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
