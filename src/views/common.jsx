import { dayOf, fmtDayCompact, fmtTime } from '../lib/dates.js';
import { dogStatus, foodStock, visibleEvents } from '../lib/metrics.js';
import { Chip } from '../components/ui.jsx';

export const CATEGORY = {
  facu: { label: 'Facu', icon: '📚' },
  salud: { label: 'Salud', icon: '🩺' },
  perros: { label: 'Perros', icon: '🐾' },
  social: { label: 'Social', icon: '🎉' },
  casa: { label: 'Casa', icon: '🏠' },
};

export const DOG_COLOR = { mocka: 'var(--c-mocka)', honey: 'var(--c-honey)' };
export const PERSON_COLOR = { mica: 'var(--c-mica)', santi: 'var(--c-santi)' };

export const FEELINGS = ['tranquilo', 'contento', 'motivado', 'cansado', 'ansioso', 'irritable', 'triste'];
export const INFLUENCES = ['sueño', 'trabajo', 'facu', 'salud', 'pareja', 'perros', 'social', 'clima'];

export function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** Avisos automáticos (documento funcional §5.4 y §5.5). */
export function buildAlerts(model, { today, now, person }) {
  const out = [];
  const cfg = model.settings ?? {};
  const dogs = model.dogs.map((d) => ({ dog: d, st: dogStatus(model, d.id, now) }));

  // Cada aviso se activa solo si su umbral está configurado en los ajustes de la casa.
  const walkH = cfg.walks_alert_hours;
  const noWalk = walkH ? dogs.filter((x) => x.st.hoursSinceWalk != null && x.st.hoursSinceWalk >= walkH) : [];
  if (noWalk.length) {
    const h = Math.floor(Math.max(...noWalk.map((x) => x.st.hoursSinceWalk)));
    out.push({
      id: 'walk',
      tone: h >= walkH + 3 ? 'critical' : 'warning',
      icon: '🐾',
      text: `Hace ${h} h que no ${noWalk.length > 1 ? 'salen' : 'sale'} ${joinNames(noWalk.map((x) => x.dog.name))}`,
    });
  }
  for (const x of dogs) {
    if (cfg.poop_alert_hours && x.st.hoursSincePoop != null && x.st.hoursSincePoop >= cfg.poop_alert_hours) {
      out.push({ id: `poop-${x.dog.id}`, tone: 'warning', icon: '💩', text: `${x.dog.name} no hizo caca desde ${x.st.hoursSincePoop >= 48 ? 'hace 2 días o más' : 'ayer'}` });
    }
    if (x.st.rareTwice) {
      out.push({ id: `rare-${x.dog.id}`, tone: 'critical', icon: '⚠️', text: `${x.dog.name}: caca rara dos veces seguidas. Conviene consultar al veterinario.` });
    }
  }
  const food = foodStock(model, today);
  if (cfg.food_alert_days && food && food.daysLeft != null && food.daysLeft <= cfg.food_alert_days) {
    const d = Math.max(0, Math.round(food.daysLeft));
    out.push({ id: 'food', tone: d <= 2 ? 'critical' : 'warning', icon: '🛒', text: `Comprá alimento: queda para ~${d} ${d === 1 ? 'día' : 'días'}` });
  }
  for (const e of visibleEvents(model, person)) {
    if (dayOf(e.starts_at) !== today) continue;
    const cat = CATEGORY[e.category];
    out.push({ id: `ev-${e.id}`, tone: 'info', icon: cat?.icon ?? '📅', text: `Hoy${e.all_day ? '' : ` ${fmtTime(e.starts_at)}`} · ${e.title}` });
  }
  return out;
}

const TONE_LABEL = { warning: 'Atención', critical: 'Importante', info: 'Agenda', good: 'Bien' };

export function AlertList({ alerts }) {
  if (!alerts.length) return null;
  return (
    <ul className="alerts" aria-label="Avisos">
      {alerts.map((a) => (
        <li key={a.id} className={`alert ${a.tone}`}>
          <span className="alert-icon" aria-hidden="true">
            {a.icon}
          </span>
          <span className="sr-only">{TONE_LABEL[a.tone]}: </span>
          <span>{a.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function EventRow({ ev, today, people, onDelete }) {
  const cat = CATEGORY[ev.category];
  const day = dayOf(ev.starts_at);
  const owner = ev.owner_id ? people.get(ev.owner_id) : null;
  return (
    <li className="event">
      <div className="event-when">
        <span className="event-day">{day === today ? 'Hoy' : fmtDayCompact(day)}</span>
        <span className="event-time">{ev.all_day ? 'Todo el día' : fmtTime(ev.starts_at)}</span>
      </div>
      <div className="event-body">
        <div className="event-title">{ev.title}</div>
        <div className="event-meta">
          <Chip icon={cat?.icon}>{cat?.label}</Chip>
          {ev.visibility === 'personal' ? <Chip tone="quiet">Personal{owner ? ` · ${owner.short_name}` : ''}</Chip> : <Chip tone="quiet">Compartido</Chip>}
          {ev.notes ? <span className="muted small">{ev.notes}</span> : null}
        </div>
      </div>
      {onDelete ? (
        <button type="button" className="btn ghost xs" onClick={() => onDelete(ev)} aria-label={`Borrar ${ev.title}`}>
          Borrar
        </button>
      ) : null}
    </li>
  );
}

export function greeting(minutes) {
  if (minutes < 6 * 60) return 'Buenas noches';
  if (minutes < 12 * 60) return 'Buen día';
  if (minutes < 20 * 60) return 'Buenas tardes';
  return 'Buenas noches';
}
