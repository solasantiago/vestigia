import { useState } from 'react';
import { fmtDayCompact, fmtDayShort } from '../../lib/dates.js';
import { linear, ticks as niceTicks, Tooltip, TTRow, useWidth } from './core.jsx';

/**
 * Serie temporal diaria.
 * data: [{ day, [key]: number|null }]
 * series: [{ key, label, color, dots?: true (valores diarios tenues), width?: 2 }]
 */
export function LineChart({
  data,
  series,
  yDomain,
  yTicks,
  height = 200,
  fmtY = (v) => String(v),
  fmtTick,
  goal,
  endLabel,
  ariaLabel,
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const n = data.length;
  const m = { l: 34, r: endLabel ? 46 : 14, t: 12, b: 26 };
  const iw = Math.max(10, width - m.l - m.r);
  const ih = height - m.t - m.b;

  let [y0, y1] = yDomain ?? [0, 1];
  if (!yDomain) {
    const vals = data.flatMap((d) => series.map((s) => d[s.key])).filter((v) => v != null);
    y0 = Math.min(0, ...vals);
    y1 = Math.max(1, ...vals, goal?.value ?? 0);
  }
  const x = (i) => m.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = linear(y0, y1, m.t + ih, m.t);
  const yt = yTicks ?? niceTicks(y0, y1, 4);
  const step = n > 1 ? iw / (n - 1) : iw;
  const every = Math.max(1, Math.ceil(58 / Math.max(1, step)));

  const pathFor = (key) => {
    let d = '';
    let pen = false;
    data.forEach((row, i) => {
      const v = row[key];
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - m.l) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === 'Escape') setHover(null);
  };

  const lastIdx = endLabel ? [...data.keys()].reverse().find((i) => data[i][endLabel.key] != null) : null;

  return (
    <div className="chart" ref={ref} style={{ height }}>
      {width > 0 && n > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          {yt.map((t) => (
            <g key={t}>
              <line className="gridline" x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} />
              <text className="axis-label" x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {(fmtTick ?? fmtY)(t)}
              </text>
            </g>
          ))}
          <line className="baseline" x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} />
          {data.map((row, i) =>
            i % every === 0 || i === n - 1 ? (
              i === n - 1 && i % every !== 0 && (n - 1) % every < every * 0.6 ? null : (
                <text key={row.day} className="axis-label" x={x(i)} y={height - 8} textAnchor="middle">
                  {fmtDayShort(row.day)}
                </text>
              )
            ) : null,
          )}
          {goal ? (
            <g>
              <line className="goal" x1={m.l} x2={m.l + iw} y1={y(goal.value)} y2={y(goal.value)} />
              <text className="goal-label" x={m.l + iw} y={y(goal.value) - 5} textAnchor="end">
                {goal.label}
              </text>
            </g>
          ) : null}
          {series.map((s) =>
            s.dots
              ? data.map((row, i) =>
                  row[s.key] == null ? null : (
                    <circle key={`${s.key}-${row.day}`} cx={x(i)} cy={y(row[s.key])} r={3} style={{ fill: s.color }} opacity={0.4} />
                  ),
                )
              : null,
          )}
          {series.map((s) =>
            s.dots ? null : (
              <path
                key={s.key}
                d={pathFor(s.key)}
                fill="none"
                style={{ stroke: s.color }}
                strokeWidth={s.width ?? 2}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={s.dim ? 0.45 : 1}
              />
            ),
          )}
          {lastIdx != null ? (
            <g>
              <circle className="ring" cx={x(lastIdx)} cy={y(data[lastIdx][endLabel.key])} r={4} style={{ fill: endLabel.color }} />
              <text className="end-label" x={x(lastIdx) + 8} y={y(data[lastIdx][endLabel.key])} dy="0.32em">
                {fmtY(data[lastIdx][endLabel.key])}
              </text>
            </g>
          ) : null}
          {hover != null ? (
            <g>
              <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} />
              {series.map((s) =>
                data[hover][s.key] == null ? null : (
                  <circle key={s.key} className="ring" cx={x(hover)} cy={y(data[hover][s.key])} r={4} style={{ fill: s.color }} />
                ),
              )}
            </g>
          ) : null}
          <rect x={m.l} y={m.t} width={iw} height={ih} fill="transparent" />
        </svg>
      ) : null}
      {hover != null && data[hover] ? (
        <Tooltip x={x(hover)} y={m.t} width={width}>
          <div className="tt-title">{fmtDayCompact(data[hover].day)}</div>
          {series.map((s) => (
            <TTRow
              key={s.key}
              color={s.color}
              value={data[hover][s.key] == null ? 'sin dato' : fmtY(data[hover][s.key])}
              label={s.label}
              shape={s.dots ? 'dot' : 'line'}
            />
          ))}
        </Tooltip>
      ) : null}
    </div>
  );
}
