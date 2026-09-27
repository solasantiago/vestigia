import { useState } from 'react';
import { addDays, diffDays, fmtDayCompact, mondayIndex } from '../../lib/dates.js';
import { Tooltip, useWidth } from './core.jsx';

const WD = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Calendario de días en columnas por semana (lunes arriba), estilo mapa de contribuciones.
 * cell(day) → { fill, stroke?, hatch?, ring?, label: string }  (o null si no se dibuja)
 */
export function DayGrid({ start, end, cell, maxCell = 18, minCell = 7, gap = 3, showMonths = true, showWeekdays = true, ariaLabel }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const first = addDays(start, -mondayIndex(start));
  const weeks = Math.ceil((diffDays(end, first) + 1) / 7);
  const labelW = showWeekdays ? 16 : 0;
  const size = Math.max(minCell, Math.min(maxCell, Math.floor((width - labelW) / weeks) - gap));
  const topPad = showMonths ? 16 : 2;
  const w = labelW + weeks * (size + gap);
  const h = topPad + 7 * (size + gap);

  const cells = [];
  const monthLabels = [];
  let lastMonth = null;
  for (let wk = 0; wk < weeks; wk += 1) {
    for (let r = 0; r < 7; r += 1) {
      const day = addDays(first, wk * 7 + r);
      if (day < start || day > end) continue;
      const month = Number(day.slice(5, 7)) - 1;
      if (showMonths && month !== lastMonth && Number(day.slice(8, 10)) <= 7) {
        monthLabels.push({ x: labelW + wk * (size + gap), label: MONTHS[month], key: day });
        lastMonth = month;
      }
      const c = cell(day);
      if (!c) continue;
      cells.push({ day, x: labelW + wk * (size + gap), y: topPad + r * (size + gap), ...c });
    }
  }

  return (
    <div className="chart daygrid" ref={ref} style={{ height: h }}>
      {width > 0 ? (
        <svg width={Math.min(w, width)} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel} onPointerLeave={() => setHover(null)}>
          <defs>
            <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" className="hatch-line" strokeWidth="1.5" />
            </pattern>
          </defs>
          {showWeekdays
            ? [0, 2, 4, 6].map((r) => (
                <text key={r} className="axis-label" x={0} y={topPad + r * (size + gap) + size / 2} dy="0.32em">
                  {WD[r]}
                </text>
              ))
            : null}
          {monthLabels.map((mnth) => (
            <text key={mnth.key} className="axis-label" x={mnth.x} y={10}>
              {mnth.label}
            </text>
          ))}
          {cells.map((c) => (
            <rect
              key={c.day}
              x={c.x + (c.ring ? 1 : 0)}
              y={c.y + (c.ring ? 1 : 0)}
              width={size - (c.ring ? 2 : 0)}
              height={size - (c.ring ? 2 : 0)}
              rx={Math.min(4, size / 3)}
              style={{ fill: c.hatch ? 'url(#hatch)' : c.fill, stroke: c.stroke ?? (c.ring ? 'var(--text-2)' : 'none') }}
              strokeWidth={c.ring || c.stroke ? 1.5 : 0}
              strokeDasharray={c.ring ? '2 2' : undefined}
              opacity={hover && hover.day !== c.day ? 0.75 : 1}
              onPointerEnter={() => setHover(c)}
              onPointerDown={() => setHover(c)}
            />
          ))}
        </svg>
      ) : null}
      {hover ? (
        <Tooltip x={Math.min(hover.x * (Math.min(w, width) / w), width)} y={hover.y + size + 4} width={width}>
          <div className="tt-title">{fmtDayCompact(hover.day)}</div>
          <div className="tt-row">
            <strong>{hover.label}</strong>
          </div>
        </Tooltip>
      ) : null}
    </div>
  );
}
