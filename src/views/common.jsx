import { calDayOf, fmtDayCompact, fmtTime } from '../lib/dates.js';
import { Chip } from '../components/ui.jsx';

export const CATEGORY = {
  facu: { label: 'Facu', icon: '📚' },
  trabajo: { label: 'Trabajo', icon: '💼' },
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

/** Un evento de la agenda. `today` es el día calendario (la agenda no usa el día de la casa). */
export function EventRow({ ev, today, people, onDelete }) {
  const cat = CATEGORY[ev.category];
  const day = calDayOf(ev.starts_at);
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
