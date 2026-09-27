import { useState } from 'react';
import { linear, niceMax, ticks as niceTicks, Tooltip, TTRow, topRoundedRect, useWidth } from './core.jsx';

const GAP = 2;

/**
 * Columnas (apiladas o simples).
 * data: [{ key, label, title?, values: { [stackKey]: number|null } }]
 * stack: [{ key, label, color }]
 */
export function ColumnChart({
  data,
  stack,
  height = 190,
  fmtY = (v) => String(Math.round(v)),
  fmtValue,
  goal,
  yMax,
  ariaLabel,
  highlight,
  labelMinGap = 44,
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const n = data.length;
  const m = { l: 38, r: 10, t: 14, b: 26 };
  const iw = Math.max(10, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const totals = data.map((d) => stack.reduce((s, k) => s + (d.values[k.key] ?? 0), 0));
  const hasValue = data.map((d) => stack.some((k) => d.values[k.key] != null));
  const top = yMax ?? niceMax(Math.max(...totals, goal?.value ?? 0) * 1.05);
  const y = linear(0, top, m.t + ih, m.t);
  const yt = niceTicks(0, top, 4);
  const band = iw / Math.max(1, n);
  const barW = Math.max(1, Math.min(24, band - GAP));
  const every = Math.max(1, Math.ceil(labelMinGap / band));
  const fv = fmtValue ?? fmtY;

  const onKey = (e) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === 'Escape') setHover(null);
  };

  return (
    <div className="chart" ref={ref} style={{ height }}>
      {width > 0 && n > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
          onPointerLeave={() => setHover(null)}
        >
          {yt.map((t) => (
            <g key={t}>
              <line className="gridline" x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} />
              <text className="axis-label" x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {fmtY(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = m.l + band * i + band / 2;
            const x0 = cx - barW / 2;
            let base = 0;
            const visible = stack.filter((k) => (d.values[k.key] ?? 0) > 0);
            const lastKey = visible[visible.length - 1]?.key;
            const dimmed = hover != null && hover !== i;
            return (
              <g key={d.key} opacity={dimmed ? 0.55 : highlight && !highlight(d, i) ? 0.45 : 1}>
                {visible.map((k, si) => {
                  const v = d.values[k.key];
                  const yTop = y(base + v);
                  let yBot = y(base);
                  if (si > 0) yBot -= GAP;
                  base += v;
                  const h = yBot - yTop;
                  if (h <= 0.5) return null;
                  return k.key === lastKey ? (
                    <path key={k.key} d={topRoundedRect(x0, yTop, barW, h, 4)} style={{ fill: k.color }} />
                  ) : (
                    <rect key={k.key} x={x0} y={yTop} width={barW} height={h} style={{ fill: k.color }} />
                  );
                })}
              </g>
            );
          })}
          <line className="baseline" x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} />
          {goal ? (
            <g>
              <line className="goal" x1={m.l} x2={m.l + iw} y1={y(goal.value)} y2={y(goal.value)} />
              <text className="goal-label" x={m.l + iw} y={y(goal.value) - 5} textAnchor="end">
                {goal.label}
              </text>
            </g>
          ) : null}
          {data.map((d, i) =>
            i % every === 0 ? (
              <text key={d.key} className="axis-label" x={m.l + band * i + band / 2} y={height - 8} textAnchor="middle">
                {d.label}
              </text>
            ) : null,
          )}
          {data.map((d, i) => (
            <rect
              key={`hit-${d.key}`}
              x={m.l + band * i}
              y={m.t}
              width={band}
              height={ih}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
              onPointerDown={() => setHover(i)}
            />
          ))}
        </svg>
      ) : null}
      {hover != null && data[hover] ? (
        <Tooltip x={m.l + band * hover + band / 2} y={m.t} width={width}>
          <div className="tt-title">{data[hover].title ?? data[hover].label}</div>
          {!hasValue[hover] ? (
            <div className="tt-row">
              <span>Sin datos</span>
            </div>
          ) : (
            <>
              {[...stack].reverse().map((k) => (
                <TTRow
                  key={k.key}
                  color={k.color}
                  shape="rect"
                  value={data[hover].values[k.key] == null ? '—' : fv(data[hover].values[k.key])}
                  label={k.label}
                />
              ))}
              {stack.length > 1 ? <TTRow value={fv(totals[hover])} label="Total" /> : null}
            </>
          )}
        </Tooltip>
      ) : null}
    </div>
  );
}
