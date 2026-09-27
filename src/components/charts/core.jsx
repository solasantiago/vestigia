import { useLayoutEffect, useRef, useState } from 'react';

export function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(Math.floor(el.getBoundingClientRect().width));
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      setWidth((prev) => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export function linear(d0, d1, r0, r1) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * k;
}

export function niceStep(span, count) {
  const raw = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const e = raw / mag;
  return (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag;
}

export function niceMax(v, count = 4) {
  if (!v || v <= 0) return 1;
  const step = niceStep(v, count);
  return Math.ceil(v / step) * step;
}

export function ticks(min, max, count = 4) {
  if (max <= min) return [min];
  const step = niceStep(max - min, count);
  const out = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-6; t += step) out.push(+t.toFixed(10));
  return out;
}

/** Rectángulo con esquinas superiores redondeadas (extremo de dato) y base recta. */
export function topRoundedRect(x, y, w, h, r) {
  if (h <= 0 || w <= 0) return '';
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return [
    `M${x},${y + h}`,
    `L${x},${y + rr}`,
    `Q${x},${y} ${x + rr},${y}`,
    `L${x + w - rr},${y}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `L${x + w},${y + h}`,
    'Z',
  ].join(' ');
}

/** Rectángulo con el extremo derecho redondeado (barras horizontales). */
export function rightRoundedRect(x, y, w, h, r) {
  if (h <= 0 || w <= 0) return '';
  const rr = Math.max(0, Math.min(r, h / 2, w));
  return [
    `M${x},${y}`,
    `L${x + w - rr},${y}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `L${x + w},${y + h - rr}`,
    `Q${x + w},${y + h} ${x + w - rr},${y + h}`,
    `L${x},${y + h}`,
    'Z',
  ].join(' ');
}

/** Tooltip de un gráfico. Se posiciona dentro del contenedor y se da vuelta cerca del borde. */
export function Tooltip({ x, y, width, children }) {
  const flip = x > width * 0.6;
  const style = flip
    ? { right: Math.max(4, width - x + 12), top: y }
    : { left: Math.max(4, x + 12), top: y };
  return (
    <div className="tt" style={style} role="status">
      {children}
    </div>
  );
}

export function TTRow({ color, value, label, shape = 'line' }) {
  return (
    <div className="tt-row">
      {color ? <span className={`tt-key ${shape}`} style={{ background: color }} /> : null}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function Legend({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="legend">
      {items.map((it) => (
        <li key={it.label}>
          <span
            className={`legend-key ${it.shape ?? 'rect'}`}
            style={it.shape === 'outline' ? { borderColor: it.color } : { background: it.color }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

export function DataTable({ columns, rows, max = 120 }) {
  const shown = rows.slice(-max);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.num ? 'num' : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={r.key ?? i}>
              {columns.map((c) => (
                <td key={c.key} className={c.num ? 'num' : undefined}>
                  {c.fmt ? c.fmt(r[c.key], r) : r[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > max ? <p className="muted small">Mostrando las últimas {max} filas.</p> : null}
    </div>
  );
}

/** Tarjeta de gráfico: título, bajada, acciones, leyenda y alternativa en tabla. */
export function ChartCard({ title, subtitle, table, legend, footnote, actions, className = '', children }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`card chart-card ${className}`}>
      <header className="card-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p className="card-sub">{subtitle}</p> : null}
        </div>
        <div className="card-actions">
          {actions}
          {table ? (
            <button type="button" className="btn ghost xs" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
              {asTable ? 'Ver gráfico' : 'Ver tabla'}
            </button>
          ) : null}
        </div>
      </header>
      {asTable && table ? <DataTable {...table} /> : children}
      {!asTable && legend ? <Legend items={legend} /> : null}
      {footnote ? <p className="card-foot">{footnote}</p> : null}
    </section>
  );
}
