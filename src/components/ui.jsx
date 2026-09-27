import { useEffect, useRef } from 'react';

export function Avatar({ person, size = 'md' }) {
  if (!person) return null;
  return (
    <span className={`avatar ${size}`} data-person={person.id} aria-hidden="true">
      {person.short_name.slice(0, 1)}
    </span>
  );
}

export function Segmented({ options, value, onChange, label, size }) {
  return (
    <div className={`segmented ${size ?? ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
          data-person={o.person}
        >
          {o.icon ? <span aria-hidden="true">{o.icon}</span> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}

const THEME_ICONS = {
  system: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" />
    </svg>
  ),
  light: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
      </g>
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7z" fill="currentColor" />
    </svg>
  ),
};

const THEME_OPTIONS = [
  { value: 'system', label: 'Auto', title: 'Seguir el modo del dispositivo' },
  { value: 'light', label: 'Claro', title: 'Modo claro' },
  { value: 'dark', label: 'Oscuro', title: 'Modo oscuro' },
];

/** Claro / oscuro / automático (lo que diga el sistema). */
export function ThemeSwitch({ value, onChange }) {
  return (
    <div className="segmented sm theme-switch" role="radiogroup" aria-label="Tema">
      {THEME_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.title}
          title={o.title}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {THEME_ICONS[o.value]}
          <span className="theme-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** "¿Quién lo hizo?" — en el iPad hay que elegir; en el celular ya viene la persona. */
export function WhoPicker({ people, value, onChange }) {
  return (
    <Segmented
      label="Quién"
      value={value}
      onChange={onChange}
      options={people.map((p) => ({ value: p.id, label: p.short_name, person: p.id }))}
    />
  );
}

export function Chip({ children, tone = 'neutral', icon }) {
  return (
    <span className={`chip ${tone}`}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

export function Card({ title, subtitle, actions, children, className = '', as: Tag = 'section' }) {
  return (
    <Tag className={`card ${className}`}>
      {title || actions ? (
        <header className="card-head">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p className="card-sub">{subtitle}</p> : null}
          </div>
          {actions ? <div className="card-actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </Tag>
  );
}

export function SectionTitle({ children, sub }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {sub ? <p>{sub}</p> : null}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

/** Diálogo modal nativo. */
export function Dialog({ open, onClose, title, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close?.();
  }, [open]);
  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose}>
      <form method="dialog" className="dialog-inner" onSubmit={(e) => e.preventDefault()}>
        <header className="dialog-head">
          <h3>{title}</h3>
          <button type="button" className="btn ghost icon" aria-label="Cerrar" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="dialog-body">{children}</div>
        {footer ? <footer className="dialog-foot">{footer}</footer> : null}
      </form>
    </dialog>
  );
}
