import { BLINKS, LEVEL_LABEL } from '../lib/status.js';

// Semáforo: siempre color + punto + texto, nunca solo color.
//   🟢 ok · ⚪ off / due / quiet / closed · 🟠 warn (titila) · 🔴 alert (titila)

/** Clases de un panel con semáforo. `calm` apaga el titileo (p. ej. día reconocido con "Entendido"). */
export function lv(level, { blink = true, calm = false } = {}) {
  return `lv-${level}${blink && !calm && BLINKS.has(level) ? ' blink' : ''}`;
}

export function StatusChip({ level, label, size }) {
  return (
    <span className={`schip lv-${level} ${size ?? ''}`}>
      <span className="sdot" aria-hidden="true" />
      {label ?? LEVEL_LABEL[level]}
    </span>
  );
}

export function Dot({ level }) {
  return <span className={`sdot lv-${level}`} aria-hidden="true" />;
}

/** Franja roja arriba: lo urgente, en una línea. */
export function RedStrip({ items }) {
  if (!items?.length) return null;
  return (
    <div className="redstrip lv-alert blink" role="alert">
      <span className="redstrip-tag">
        <span className="sdot" aria-hidden="true" /> Urgente
      </span>
      <span className="redstrip-text">{items.map((i) => i.short).join(' · ')}</span>
    </div>
  );
}
