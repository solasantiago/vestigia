import { useState } from 'react';
import { fmt2 } from '../../lib/format.js';

/**
 * Número destacado: etiqueta · valor · variación contra el período anterior.
 * better: 'up' | 'down' | null  → define si subir es bueno.
 */
export function StatTile({ label, value, unit, delta, deltaLabel = 'vs período anterior', better = 'up', sub, icon }) {
  let tone = 'neutral';
  // Si la diferencia redondeada es cero ("±0,0"), no se pinta ni se marca dirección.
  const flat = delta != null && (Math.abs(delta.value) < 1e-9 || String(delta.text).startsWith('±'));
  if (delta != null && better && !flat) {
    const up = delta.value > 0;
    tone = (up && better === 'up') || (!up && better === 'down') ? 'good' : 'bad';
  }
  return (
    <div className="stat">
      <div className="stat-label">
        {icon ? <span aria-hidden="true">{icon} </span> : null}
        {label}
      </div>
      <div className="stat-value">
        {value}
        {unit ? <span className="stat-unit"> {unit}</span> : null}
      </div>
      {delta ? (
        <div className={`stat-delta ${tone}`}>
          <span aria-hidden="true">{flat ? '●' : delta.value > 0 ? '▲' : '▼'}</span> {delta.text}{' '}
          <span className="muted">{deltaLabel}</span>
        </div>
      ) : null}
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}

/** Medidor de una proporción contra un límite. El fondo es un tono más claro del mismo color. */
export function Meter({ value, label, tone = 'accent' }) {
  const pct = Math.max(0, Math.min(1, value ?? 0));
  return (
    <div className={`meter ${tone}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label={label}>
      <div className="meter-fill" style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

/** Barras horizontales en HTML: etiqueta · barra · valor. */
export function BarList({ items, color = 'var(--accent)', fmt = String, max, emptyText = 'Sin datos en el período.' }) {
  if (!items.length) return <p className="empty">{emptyText}</p>;
  const top = max ?? Math.max(...items.map((i) => i.value));
  return (
    <ul className="barlist">
      {items.map((it) => (
        <li key={it.key ?? it.label}>
          <span className="barlist-label">{it.label}</span>
          <span className="barlist-track">
            <span className="barlist-bar" style={{ width: `${top ? (it.value / top) * 100 : 0}%`, background: it.color ?? color }} />
          </span>
          <span className="barlist-value">{fmt(it.value, it)}</span>
          {it.note ? <span className="barlist-note">{it.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Mezcla un color con la superficie según |r| (divergente: negativo / positivo, gris al medio). */
function corrFill(r) {
  if (r == null) return 'var(--surface-2)';
  const a = Math.round(Math.min(1, Math.abs(r)) * 85);
  const pole = r >= 0 ? 'var(--div-pos)' : 'var(--div-neg)';
  return `color-mix(in oklab, ${pole} ${a}%, var(--div-mid))`;
}

export function CorrMatrix({ vars, matrix, onPick }) {
  const [hover, setHover] = useState(null);
  return (
    <div className="corr-wrap">
      <table className="corr">
        <thead>
          <tr>
            <th aria-hidden="true" />
            {vars.map((v) => (
              <th key={v.key} scope="col">
                <span>{v.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vars.map((a, i) => (
            <tr key={a.key}>
              <th scope="row">{a.label}</th>
              {vars.map((b, j) => {
                const c = matrix[i][j];
                if (j > i) return <td key={b.key} className="corr-empty" />;
                const diag = i === j;
                const strong = c.r != null && Math.abs(c.r) >= 0.45;
                const isHover = hover && hover[0] === i && hover[1] === j;
                return (
                  <td
                    key={b.key}
                    className={`corr-cell ${diag ? 'diag' : ''} ${strong ? 'strong' : ''} ${isHover ? 'hover' : ''}`}
                    style={{ background: diag ? 'var(--surface-2)' : corrFill(c.r) }}
                    title={diag ? a.label : `${a.label} × ${b.label}: r = ${c.r == null ? 'sin datos' : fmt2(c.r)} · ${c.n} días`}
                    onPointerEnter={() => setHover([i, j])}
                    onPointerLeave={() => setHover(null)}
                    onClick={() => !diag && onPick?.(a, b)}
                  >
                    {diag ? '' : c.r == null ? '·' : fmt2(c.r).replace('0,', ',')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="corr-scale" aria-hidden="true">
        <span>−1 inversa</span>
        <span className="corr-ramp" />
        <span>+1 directa</span>
      </div>
    </div>
  );
}
