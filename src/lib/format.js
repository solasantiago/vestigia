const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (v) => (v == null || Number.isNaN(v) ? '—' : nf0.format(v));
export const fmt1 = (v) => (v == null || Number.isNaN(v) ? '—' : nf1.format(v));
export const fmt2 = (v) => (v == null || Number.isNaN(v) ? '—' : nf2.format(v));
export const fmtPct = (v) => (v == null || Number.isNaN(v) ? '—' : `${nf0.format(v * 100)}%`);

/** 12.345 → "12,3 mil"; 980 → "980" */
export function fmtCompact(v) {
  if (v == null || Number.isNaN(v)) return '—';
  if (Math.abs(v) >= 10000) return `${nf1.format(v / 1000)} mil`;
  return nf0.format(v);
}

export function fmtHours(min) {
  if (min == null) return '—';
  return `${nf1.format(min / 60)} h`;
}

/** Signo explícito: "+0,4" / "−1,2" */
export function fmtSigned(v, digits = 1) {
  if (v == null || Number.isNaN(v)) return '—';
  const f = digits === 0 ? nf0 : digits === 2 ? nf2 : nf1;
  const s = f.format(Math.abs(v));
  if (Math.abs(v) < 10 ** -digits / 2) return `±${s}`;
  return v > 0 ? `+${s}` : `−${s}`;
}

export const plural = (n, one, many) => `${fmtInt(n)} ${n === 1 ? one : many}`;

/** 7.5 → "7,5"; 15 → "15" */
export function fmtKg(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(Number(v));
}
