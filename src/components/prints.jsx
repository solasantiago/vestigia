// Huellas y rastros de Vestigia: pies (Mica y Santi) y patitas (Mocka y Honey).
// Todo en SVG propio, con el color heredado (currentColor) o pasado por prop.

const FOOT_SOLE =
  'M13 13C8 13 6.5 18 7.5 23C8.5 28 11 30 10.5 35C10 40 12.5 43 15 43C18 43 19.5 40 19 35C18.5 30 20.5 25 20.5 19C20.5 15 17.5 13 13 13Z';
const FOOT_TOES = [
  [9.6, 8.6, 2.9],
  [14, 6.9, 1.9],
  [17, 7.7, 1.7],
  [19.4, 9.6, 1.5],
  [21.1, 12.1, 1.25],
];

/** Pie derecho en una caja de 28 × 44 apuntando hacia arriba. */
export function FootShape() {
  return (
    <>
      <path d={FOOT_SOLE} />
      {FOOT_TOES.map(([cx, cy, r]) => (
        <circle key={cx} cx={cx} cy={cy} r={r} />
      ))}
    </>
  );
}

/** Patita en una caja de 24 × 24 apuntando hacia arriba. */
export function PawShape() {
  return (
    <>
      <path d="M12 22.5c-4.2 0-7.2-2.1-7.2-5.1 0-3.4 3.4-6.6 7.2-6.6s7.2 3.2 7.2 6.6c0 3-3 5.1-7.2 5.1z" />
      <ellipse cx="4.6" cy="9.6" rx="2.2" ry="2.9" transform="rotate(-22 4.6 9.6)" />
      <ellipse cx="9.3" cy="5.4" rx="2.3" ry="3.1" transform="rotate(-8 9.3 5.4)" />
      <ellipse cx="14.7" cy="5.4" rx="2.3" ry="3.1" transform="rotate(8 14.7 5.4)" />
      <ellipse cx="19.4" cy="9.6" rx="2.2" ry="2.9" transform="rotate(22 19.4 9.6)" />
    </>
  );
}

export function PawIcon({ size = 20, className = '', style, title }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`print-icon ${className}`} style={style} fill="currentColor" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : 'true'}>
      <PawShape />
    </svg>
  );
}

export function FootIcon({ size = 20, left = false, className = '', style, title }) {
  return (
    <svg viewBox="0 0 28 44" width={(size * 28) / 44} height={size} className={`print-icon ${className}`} style={style} fill="currentColor" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : 'true'}>
      <g transform={left ? 'translate(28 0) scale(-1 1)' : undefined}>
        <FootShape />
      </g>
    </svg>
  );
}

/** Marca de Vestigia: un pie y una patita que caminan juntos. */
export function Mark({ size = 44 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className="mark" aria-hidden="true">
      <rect width="48" height="48" rx="14" className="mark-bg" />
      <g className="mark-foot" transform="translate(8 8) scale(0.62) rotate(-12 14 22)">
        <FootShape />
      </g>
      <g className="mark-paw" transform="translate(25 22) scale(0.62) rotate(14 12 12)">
        <PawShape />
      </g>
    </svg>
  );
}

// ───────────── rastros ─────────────

/**
 * Posiciones de un rastro a lo largo de una onda suave.
 * Devuelve [{ x, y, angle, left }] con el ángulo de avance en grados.
 */
function trailPoints({ width, y, amp, waves, step, stride, phase }) {
  const pts = [];
  const f = (x) => y + amp * Math.sin((x / width) * Math.PI * 2 * waves + phase);
  const df = (x) => amp * Math.cos((x / width) * Math.PI * 2 * waves + phase) * ((Math.PI * 2 * waves) / width);
  let i = 0;
  for (let x = -step; x < width + step; x += step, i += 1) {
    const left = i % 2 === 0;
    const slope = df(x);
    const ang = Math.atan(slope);
    // desplazamiento a un costado de la línea de marcha
    const off = (left ? -1 : 1) * stride;
    pts.push({
      x: x - Math.sin(ang) * off,
      y: f(x) + Math.cos(ang) * off,
      angle: (ang * 180) / Math.PI + 90,
      left,
      i,
    });
  }
  return pts;
}

/**
 * Rastro de la casa: dos personas y dos perros caminando juntos.
 * Decorativo: se dibuja detrás del contenido, sin texto.
 */
export function HouseTrail({ width = 1200, height = 140, className = '', animate = false, loop = false, dense = false }) {
  const walkers = [
    { kind: 'foot', color: 'var(--c-mica)', y: height * 0.3, amp: height * 0.08, step: dense ? 58 : 74, stride: 7, size: 22, phase: 0.2 },
    { kind: 'paw', color: 'var(--c-mocka)', y: height * 0.48, amp: height * 0.1, step: dense ? 34 : 42, stride: 5, size: 14, phase: 1.1 },
    { kind: 'foot', color: 'var(--c-santi)', y: height * 0.64, amp: height * 0.08, step: dense ? 60 : 78, stride: 7.5, size: 23, phase: 0.6 },
    { kind: 'paw', color: 'var(--c-honey)', y: height * 0.82, amp: height * 0.09, step: dense ? 30 : 38, stride: 4.5, size: 12, phase: 1.9 },
  ];
  return (
    <svg
      className={`house-trail ${animate ? 'animate' : ''} ${loop ? 'loop' : ''} ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {walkers.map((w, wi) =>
        trailPoints({ width, y: w.y, amp: w.amp, waves: 1.3, step: w.step, stride: w.stride, phase: w.phase }).map((p) => {
          const s = w.size / (w.kind === 'foot' ? 44 : 24);
          const bw = w.kind === 'foot' ? 28 : 24;
          const bh = w.kind === 'foot' ? 44 : 24;
          return (
            <g
              key={`${wi}-${p.i}`}
              className="trail-print"
              style={{ color: w.color, animationDelay: animate || loop ? `${(p.i * (loop ? 0.45 : 0.18) + wi * (loop ? 0.2 : 0.07)).toFixed(2)}s` : undefined }}
              transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.angle.toFixed(1)}) scale(${s.toFixed(3)}) translate(${-bw / 2} ${-bh / 2})`}
              fill="currentColor"
            >
              {w.kind === 'foot' ? (
                <g transform={p.left ? 'translate(28 0) scale(-1 1)' : undefined}>
                  <FootShape />
                </g>
              ) : (
                <PawShape />
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}

/** Rastro corto de patitas para estados vacíos y carga. */
export function PawSteps({ count = 5, animate = true }) {
  return (
    <span className={`paw-steps ${animate ? 'animate' : ''}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={i % 2 ? 'ps-up' : 'ps-down'} style={{ animationDelay: `${i * 0.22}s` }}>
          <PawIcon size={16} />
        </span>
      ))}
    </span>
  );
}

/** Estado vacío con huellas: "todavía no hay rastros". */
export function NoTraces({ children }) {
  return (
    <div className="no-traces">
      <PawSteps count={4} animate={false} />
      <p>{children}</p>
    </div>
  );
}
