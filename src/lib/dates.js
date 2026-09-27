import { TZ } from '../config.js';

// Los días se manejan como texto 'YYYY-MM-DD' en hora de Buenos Aires.
// La aritmética de días se hace en UTC al mediodía para evitar saltos de horario.

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parts(date) {
  const out = {};
  for (const p of partsFmt.formatToParts(date)) out[p.type] = p.value;
  return out;
}

/** Día (YYYY-MM-DD, hora BA) de un timestamp o Date. */
export function dayOf(ts) {
  const p = parts(new Date(ts));
  return `${p.year}-${p.month}-${p.day}`;
}

/** Minutos desde la medianoche (hora BA) de un timestamp. */
export function minutesOf(ts) {
  const p = parts(new Date(ts));
  return Number(p.hour) * 60 + Number(p.minute);
}

export function hourOf(ts) {
  return Math.floor(minutesOf(ts) / 60);
}

export function todayISO(now = new Date()) {
  return dayOf(now);
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** a − b en días. */
export function diffDays(a, b) {
  return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000);
}

/** 0 = domingo … 6 = sábado (igual que Postgres). */
export function dow(iso) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/** Lunes = 0 … domingo = 6, para grillas que arrancan el lunes. */
export function mondayIndex(iso) {
  return (dow(iso) + 6) % 7;
}

export function range(start, end) {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

const dayFmtCache = new Map();
function dayFmt(opts) {
  const key = JSON.stringify(opts);
  if (!dayFmtCache.has(key)) {
    dayFmtCache.set(key, new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', ...opts }));
  }
  return dayFmtCache.get(key);
}

/** "25 sep" */
export function fmtDayShort(iso) {
  return dayFmt({ day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`)).replace('.', '');
}

/** "vie 25/9" */
export function fmtDayCompact(iso) {
  const wd = dayFmt({ weekday: 'short' }).format(new Date(`${iso}T12:00:00Z`)).replace('.', '');
  const [, m, d] = iso.split('-');
  return `${wd} ${Number(d)}/${Number(m)}`;
}

/** "viernes 25 de septiembre" */
export function fmtDayLong(iso) {
  return dayFmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00Z`));
}

export function fmtWeekday(iso, style = 'long') {
  return dayFmt({ weekday: style }).format(new Date(`${iso}T12:00:00Z`)).replace('.', '');
}

export function fmtMonth(iso) {
  return dayFmt({ month: 'long', year: 'numeric' }).format(new Date(`${iso}T12:00:00Z`));
}

const timeFmt = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** "08:05" en hora BA */
export function fmtTime(ts) {
  return timeFmt.format(new Date(ts));
}

/** "hace 3 h", "hace 25 min", "hace 2 días" */
export function fmtAgo(ts, now = Date.now()) {
  const min = Math.max(0, Math.round((now - new Date(ts).getTime()) / 60000));
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'hace 1 día' : `hace ${d} días`;
}

export function hoursSince(ts, now = Date.now()) {
  return (now - new Date(ts).getTime()) / 3600000;
}

/** "7 h 20 min" */
export function fmtDuration(min) {
  if (min == null) return '—';
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** "23:40" desde 'HH:MM:SS' */
export function fmtClock(t) {
  return t ? t.slice(0, 5) : '—';
}

/** Minutos desde medianoche de un 'HH:MM:SS'; las horas de dormir después de medianoche suman 24 h. */
export function clockToMinutes(t, { lateNight = false } = {}) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  let v = h * 60 + m;
  if (lateNight && v < 12 * 60) v += 24 * 60;
  return v;
}

export function minutesToClock(v) {
  if (v == null) return '—';
  const m = ((Math.round(v) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
