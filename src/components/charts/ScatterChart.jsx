import { useMemo, useState } from 'react';
import { fmtDayCompact } from '../../lib/dates.js';
import { linear, ticks as niceTicks, Tooltip, TTRow, useWidth } from './core.jsx';

// Desplazamiento determinístico para valores enteros (ánimo 1–5) que se superponen.
function jitter(i) {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}

/**
 * Dispersión de una sola serie con recta de tendencia.
 * points: [{ x, y, day }]
 */
export function ScatterChart({
  points,
  color,
  xLabel,
  yLabel,
  fmtX = (v) => String(v),
  fmtY = (v) => String(v),
  fmtTickX,
  xDomain,
  yDomain,
  fit,
  jitterY = 0,
  height = 220,
  ariaLabel,
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const m = { l: 34, r: 12, t: 12, b: 38 };
  const iw = Math.max(10, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [x0, x1] = xDomain ?? [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = yDomain ?? [Math.min(...ys), Math.max(...ys)];
  const padX = (x1 - x0) * 0.04 || 1;
  const padY = (y1 - y0) * 0.06 || 1;
  const x = linear(x0 - padX, x1 + padX, m.l, m.l + iw);
  const y = linear(y0 - padY, y1 + padY, m.t + ih, m.t);
  const xt = niceTicks(x0, x1, width < 420 ? 3 : 5);
  const yt = niceTicks(y0, y1, 4);

  const placed = useMemo(
    () => points.map((p, i) => ({ ...p, px: x(p.x), py: y(p.y + (jitterY ? jitter(i) * jitterY : 0)) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, width, height, x0, x1, y0, y1, jitterY],
  );

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best = null;
    let bd = 24 * 24;
    placed.forEach((p, i) => {
      const d = (p.px - px) ** 2 + (p.py - py) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setHover(best);
  };

  const fitLine =
    fit?.slope != null
      ? { xa: x0, xb: x1, ya: fit.intercept + fit.slope * x0, yb: fit.intercept + fit.slope * x1 }
      : null;

  return (
    <div className="chart" ref={ref} style={{ height }}>
      {width > 0 && points.length ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {yt.map((t) => (
            <g key={`y${t}`}>
              <line className="gridline" x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} />
              <text className="axis-label" x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {fmtY(t)}
              </text>
            </g>
          ))}
          {xt.map((t) => (
            <text key={`x${t}`} className="axis-label" x={x(t)} y={m.t + ih + 16} textAnchor="middle">
              {(fmtTickX ?? fmtX)(t)}
            </text>
          ))}
          <line className="baseline" x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} />
          <text className="axis-title" x={m.l + iw} y={height - 4} textAnchor="end">
            {xLabel} →
          </text>
          <text className="axis-title" x={m.l} y={m.t - 2} textAnchor="start" dy="-0.2em">
            ↑ {yLabel}
          </text>
          {placed.map((p, i) => (
            <circle
              key={p.day ?? i}
              className="ring"
              cx={p.px}
              cy={p.py}
              r={hover === i ? 5.5 : 4}
              style={{ fill: color }}
              opacity={hover == null || hover === i ? 0.85 : 0.35}
            />
          ))}
          {fitLine ? (
            <line
              className="fit"
              x1={x(fitLine.xa)}
              y1={y(fitLine.ya)}
              x2={x(fitLine.xb)}
              y2={y(fitLine.yb)}
            />
          ) : null}
        </svg>
      ) : (
        <p className="empty">Todavía no hay suficientes días con ambos datos.</p>
      )}
      {hover != null && placed[hover] ? (
        <Tooltip x={placed[hover].px} y={Math.max(0, placed[hover].py - 30)} width={width}>
          {placed[hover].day ? <div className="tt-title">{fmtDayCompact(placed[hover].day)}</div> : null}
          <TTRow value={fmtY(placed[hover].y)} label={yLabel} />
          <TTRow value={fmtX(placed[hover].x)} label={xLabel} />
        </Tooltip>
      ) : null}
    </div>
  );
}
