import { useMemo, useState } from 'react';
import { useApp } from '../lib/appctx.js';
import { useData } from '../lib/data.jsx';
import { dow } from '../lib/dates.js';
import { fmt1, fmt2, fmtCompact, fmtInt, fmtPct } from '../lib/format.js';
import { buildInsights, corrMatrix, corrStrength, mean, pearson, personDaily, VARIABLES, withDerived } from '../lib/metrics.js';
import { ChartCard } from '../components/charts/core.jsx';
import { ScatterChart } from '../components/charts/ScatterChart.jsx';
import { CorrMatrix } from '../components/charts/Figures.jsx';
import { Card, SectionTitle } from '../components/ui.jsx';

const FMT = {
  mood: fmt1,
  energy: fmt1,
  stress: fmt1,
  sleepH: (v) => `${fmt1(v)} h`,
  steps: fmtCompact,
  socialH: (v) => `${fmt1(v)} h`,
  screenH: (v) => `${fmt1(v)} h`,
  walks: fmtInt,
  habitPct: fmtPct,
};

const FMT_TICK = {
  steps: (v) => `${Math.round(v / 1000)} k`,
  sleepH: (v) => `${Math.round(v * 10) / 10} h`.replace('.', ','),
};

const PAIRS = [
  ['sleepH', 'mood'],
  ['sleepH', 'energy'],
  ['socialH', 'mood'],
  ['steps', 'mood'],
  ['walks', 'stress'],
  ['habitPct', 'mood'],
];

const byKey = Object.fromEntries(VARIABLES.map((v) => [v.key, v]));
const INTEGER = new Set(['mood', 'energy', 'stress', 'walks']);

function Insight({ ins }) {
  const good = ins.better === 'lower' ? ins.diff < 0 : ins.diff > 0;
  const max = Math.max(ins.ma, ins.mb, 5);
  const abs = Math.abs(ins.diff);
  return (
    <li className="insight">
      <p className="insight-text">
        Los días que <strong>{ins.yes}</strong>, tu {ins.metric} promedio es <strong>{fmt1(ins.ma)}</strong> contra {fmt1(ins.mb)} el resto:{' '}
        <span className={good ? 'up' : 'down'}>
          {ins.diff > 0 ? 'sube' : 'baja'} {fmt1(abs)} {abs === 1 ? 'punto' : 'puntos'}
        </span>
        .
      </p>
      <div className="insight-bars" aria-hidden="true">
        <div>
          <span className="insight-lbl">Sí</span>
          <span className="insight-track">
            <span className="insight-bar on" style={{ width: `${(ins.ma / max) * 100}%` }} />
          </span>
          <span className="insight-val">{fmt1(ins.ma)}</span>
        </div>
        <div>
          <span className="insight-lbl">No</span>
          <span className="insight-track">
            <span className="insight-bar" style={{ width: `${(ins.mb / max) * 100}%` }} />
          </span>
          <span className="insight-val">{fmt1(ins.mb)}</span>
        </div>
      </div>
      <p className="muted small">
        {ins.na} días contra {ins.nb}
      </p>
    </li>
  );
}

export default function Analysis() {
  const { model } = useData();
  const { person, days, today, period } = useApp();
  const me = model.peopleById.get(person);
  const rows = useMemo(() => withDerived(personDaily(model, person, days, today).filter((r) => r.day < today)), [model, person, days, today]);
  const matrix = useMemo(() => corrMatrix(rows), [rows]);
  const insights = useMemo(() => buildInsights(rows, { stepsGoal: me.steps_goal }).filter((i) => Math.abs(i.diff) >= 0.15), [rows, me]);
  const [pair, setPair] = useState(null);
  const pairs = pair ? [pair, ...PAIRS.filter((p) => !(p[0] === pair[0] && p[1] === pair[1]))] : PAIRS;

  const weekday = useMemo(() => {
    const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return names.map((label, i) => {
      const rs = rows.filter((r) => (dow(r.day) + 6) % 7 === i);
      return {
        label,
        mood: mean(rs.map((r) => r.mood)),
        stress: mean(rs.map((r) => r.stress)),
        sleepH: mean(rs.map((r) => r.sleepH)),
        steps: mean(rs.map((r) => r.steps)),
        screenH: mean(rs.map((r) => r.screenH)),
        habitPct: mean(rs.map((r) => r.habitPct)),
      };
    });
  }, [rows]);
  const wdCols = ['mood', 'stress', 'sleepH', 'steps', 'screenH', 'habitPct'];
  const best = Object.fromEntries(
    wdCols.map((k) => {
      const vals = weekday.map((w) => w[k]).filter((v) => v != null);
      const lowerIsBetter = k === 'stress' || k === 'screenH';
      return [k, lowerIsBetter ? Math.min(...vals) : Math.max(...vals)];
    }),
  );

  if (rows.length < 7) {
    return <p className="empty">Hacen falta al menos 7 días de datos para analizar relaciones. Probá con un período más largo.</p>;
  }

  return (
    <div className="stack">
      <p className="lede">
        Cruces entre lo que registrás en los últimos {period} días ({rows.length} días completos). Muestran qué cosas suelen ir juntas, no qué causa qué.
      </p>

      <SectionTitle>Lo que se ve en tus datos</SectionTitle>
      {insights.length ? (
        <ul className="insights">
          {insights.slice(0, 6).map((ins) => (
            <Insight key={ins.id} ins={ins} />
          ))}
        </ul>
      ) : (
        <p className="empty">Con este período no aparece ninguna diferencia clara. Probá con 90 días.</p>
      )}

      <div className="grid two wide-right">
        <ChartCard
          title="Mapa de correlaciones"
          subtitle="De −1 a +1. Tocá una celda para ver el gráfico de ese cruce."
          footnote="Azul: suben juntas. Terracota: cuando una sube, la otra baja. Cerca de 0: sin relación."
        >
          <CorrMatrix vars={VARIABLES} matrix={matrix} onPick={(a, b) => setPair([b.key, a.key])} />
        </ChartCard>
        <Card title="Por día de la semana" subtitle="Promedios. En negrita, el mejor día de cada columna.">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Día</th>
                  <th className="num">Ánimo</th>
                  <th className="num">Estrés</th>
                  <th className="num">Sueño</th>
                  <th className="num">Pasos</th>
                  <th className="num">Pantalla</th>
                  <th className="num">Hábitos</th>
                </tr>
              </thead>
              <tbody>
                {weekday.map((w) => (
                  <tr key={w.label}>
                    <td>{w.label}</td>
                    {wdCols.map((k) => (
                      <td key={k} className={`num ${w[k] != null && w[k] === best[k] ? 'best' : ''}`}>
                        {w[k] == null ? '—' : FMT[k](w[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <SectionTitle sub="Cada punto es un día. La línea muestra la tendencia.">Cruces</SectionTitle>
      <div className="grid three">
        {pairs.slice(0, 6).map(([xk, yk]) => {
          const pts = rows.filter((r) => r[xk] != null && r[yk] != null).map((r) => ({ x: r[xk], y: r[yk], day: r.day }));
          const fit = pearson(
            rows.map((r) => r[xk]),
            rows.map((r) => r[yk]),
          );
          const xv = byKey[xk];
          const yv = byKey[yk];
          return (
            <ChartCard
              key={`${xk}-${yk}`}
              title={`${yv.label} según ${xv.label.toLowerCase()}`}
              subtitle={fit.r == null ? 'Pocos datos' : `r = ${fmt2(fit.r)} · ${corrStrength(fit.r)} · ${fit.n} días`}
              table={{
                columns: [
                  { key: 'day', label: 'Día' },
                  { key: 'x', label: xv.label, num: true, fmt: FMT[xk] },
                  { key: 'y', label: yv.label, num: true, fmt: FMT[yk] },
                ],
                rows: pts.map((p) => ({ ...p, key: p.day })),
              }}
            >
              <ScatterChart
                ariaLabel={`${yv.label} contra ${xv.label}`}
                points={pts}
                color="var(--accent)"
                xLabel={xv.label}
                yLabel={yv.label}
                fmtX={FMT[xk]}
                fmtTickX={FMT_TICK[xk]}
                fmtY={FMT[yk]}
                yDomain={INTEGER.has(yk) && yk !== 'walks' ? [1, 5] : undefined}
                jitterY={INTEGER.has(yk) && yk !== 'walks' ? 0.3 : 0}
                fit={fit}
                height={210}
              />
            </ChartCard>
          );
        })}
      </div>
    </div>
  );
}
