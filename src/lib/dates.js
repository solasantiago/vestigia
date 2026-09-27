import { DAY_START_HOUR, TZ, TZ_OFFSET } from '../config.js';

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

const DAY_START_MIN = DAY_START_HOUR * 60;

/** Día calendario (YYYY-MM-DD, hora BA) de un timestamp. Se usa para la agenda. */
export function calDayOf(ts) {
  const p = parts(new Date(ts));
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Día de la casa (YYYY-MM-DD): empieza a las 05:00.
 * Una salida a la 1 de la madrugada cuenta para el día anterior.
 */
export function dayOf(ts) {
  return calDayOf(new Date(new Date(ts).getTime() - DAY_START_MIN * 60000));
}

/** Minutos desde la medianoche (hora BA) de un timestamp. */
export function minutesOf(ts) {
  const p = parts(new Date(ts));
  return Number(p.hour) * 60 + Number(p.minute);
}

export function hourOf(ts) {
  return Math.floor(minutesOf(ts) / 60);
}

/** Hoy, como día de la casa. */
export function todayISO(now = new Date()) {
  return dayOf(now);
}

/** Hoy, como día calendario (para la agenda). */
export function calTodayISO(now = new Date()) {
  return calDayOf(now);
}

/** ¿Estamos entre las 0 y las 5, cuando todavía cuenta el día anterior? */
export function isLateNight(now = new Date()) {
  return minutesOf(now) < DAY_START_MIN;
}

/**
 * Minutos del día de la casa: 08:00 = 480 … 23:59 = 1439, y la madrugada sigue: 01:00 = 1500 … 04:59 = 1799.
 */
export function dayMinutesOf(ts) {
  const m = minutesOf(ts);
  return m < DAY_START_MIN ? m + 1440 : m;
}

/** 'HH:MM' → minutos del día de la casa ('02:00' → 1560). */
export function hhmmToDayMin(s) {
  if (!s) return null;
  const [h, m] = String(s).split(':').map(Number);
  const v = h * 60 + (m || 0);
  return v < DAY_START_MIN ? v + 1440 : v;
}

/** Momento (ms) de un minuto del día de la casa. */
export function dayMinToTs(day, dayMin) {
  return Date.parse(`${day}T00:00:00${TZ_OFFSET}`) + dayMin * 60000;
}

/** Minutos desde las 00:00 del día `day` (pueden pasar de 1440 en la madrugada). */
export function tsToDayMin(ts, day) {
  return Math.round((new Date(ts).getTime() - dayMinToTs(day, 0)) / 60000);
}

/** Fin del día de la casa, en minutos (las 05:00 del día siguiente). */
export const DAY_END_MIN = 1440 + DAY_START_MIN;

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

/** 125 → "2 h 5 min"; 45 → "45 min"; 180 → "3 h" (versión corta para pantallas grandes). */
export function fmtSpan(min) {
  if (min == null) return '—';
  const m = Math.max(0, Math.round(min));
  if (m < 1) return 'un momento';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r}` : `${h} h`;
}

/** Hora corta: 600 → "10", 1290 → "21:30", 1440 → "00:00", 1500 → "1". */
export function fmtHour(dayMin) {
  if (dayMin == null) return '—';
  const v = ((Math.round(dayMin) % 1440) + 1440) % 1440;
  const h = Math.floor(v / 60);
  const m = v % 60;
  if (m) return `${h}:${String(m).padStart(2, '0')}`;
  return h === 0 ? '00:00' : String(h);
}

function article(dayMin) {
  const v = ((Math.round(dayMin) % 1440) + 1440) % 1440;
  return Math.floor(v / 60) === 1 ? 'la' : 'las';
}

/** "a las 10" · "a la 1" */
export const atHour = (dm) => `a ${article(dm)} ${fmtHour(dm)}`;
/** "antes de las 10" · "antes de la 1" */
export const beforeHour = (dm) => `antes de ${article(dm)} ${fmtHour(dm)}`;
/** "desde las 21" · "desde la 1" */
export const fromHour = (dm) => `desde ${article(dm)} ${fmtHour(dm)}`;
