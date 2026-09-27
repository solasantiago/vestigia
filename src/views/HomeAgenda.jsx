import { useMemo, useState } from 'react';
import { useApp } from '../lib/appctx.js';
import { useData, useRun } from '../lib/data.jsx';
import { addDays, calDayOf, calTodayISO, dayOf, fmtDayLong, fmtMonth, fmtTime, mondayIndex, range } from '../lib/dates.js';
import { useKiosk } from '../lib/kiosk.jsx';
import { TZ } from '../config.js';
import { visibleEvents } from '../lib/metrics.js';
import { Card, Dialog, Segmented, SectionTitle } from '../components/ui.jsx';
import { NoTraces } from '../components/prints.jsx';
import { CATEGORY, EventRow } from './common.jsx';

/** 'YYYY-MM-DD' + 'HH:MM' en hora de Buenos Aires → ISO UTC. */
function localToISO(day, time) {
  // Buenos Aires no tiene horario de verano: UTC−3 fijo.
  const offset = TZ === 'America/Argentina/Buenos_Aires' ? '-03:00' : 'Z';
  return new Date(`${day}T${time || '00:00'}:00${offset}`).toISOString();
}

export default function HomeAgenda() {
  const { model, actions } = useData();
  const { person, now } = useApp();
  // La agenda usa días calendario: a la 1 de la madrugada, "hoy" ya es el día nuevo.
  const today = calTodayISO(new Date(now));
  const run = useRun();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [picked, setPicked] = useState(today);
  const [cat, setCat] = useState('todas');
  const [open, setOpen] = useState(false);

  const events = visibleEvents(model, person).filter((e) => cat === 'todas' || e.category === cat);
  const byDay = useMemo(() => {
    const m = new Map();
    for (const e of events) {
      const d = calDayOf(e.starts_at);
      if (!m.has(d)) m.set(d, []);
      m.get(d).push(e);
    }
    return m;
  }, [events]);

  const first = `${month}-01`;
  const lastDay = addDays(`${nextMonth(month)}-01`, -1);
  const gridStart = addDays(first, -mondayIndex(first));
  const gridEnd = addDays(lastDay, 6 - mondayIndex(lastDay));
  const cells = range(gridStart, gridEnd);
  const upcoming = events.filter((e) => calDayOf(e.starts_at) >= today).slice(0, 12);
  const pickedEvents = byDay.get(picked) ?? [];

  const remove = (ev) => {
    if (window.confirm(`¿Borrar "${ev.title}"?`)) run(() => actions.deleteEvent(ev.id), 'Evento borrado');
  };

  return (
    <div className="stack">
      <div className="filters">
        <Segmented
          size="sm"
          label="Categoría"
          value={cat}
          onChange={setCat}
          options={[{ value: 'todas', label: 'Todas' }, ...Object.entries(CATEGORY).map(([k, v]) => ({ value: k, label: v.label, icon: `${v.icon} ` }))]}
        />
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          + Nuevo evento
        </button>
      </div>

      <div className="grid two wide-left">
        <Card
          title={<span className="cap">{fmtMonth(first)}</span>}
          actions={
            <div className="month-nav">
              <button type="button" className="btn ghost icon" aria-label="Mes anterior" onClick={() => setMonth(prevMonth(month))}>
                ‹
              </button>
              <button type="button" className="btn ghost xs" onClick={() => { setMonth(today.slice(0, 7)); setPicked(today); }}>
                Hoy
              </button>
              <button type="button" className="btn ghost icon" aria-label="Mes siguiente" onClick={() => setMonth(nextMonth(month))}>
                ›
              </button>
            </div>
          }
        >
          <div className="month">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <div key={`h${i}`} className="month-h">
                {d}
              </div>
            ))}
            {cells.map((d) => {
              const evs = byDay.get(d) ?? [];
              const inMonth = d.slice(0, 7) === month;
              return (
                <button
                  key={d}
                  type="button"
                  className={`month-cell ${inMonth ? '' : 'out'} ${d === today ? 'today' : ''} ${d === picked ? 'picked' : ''}`}
                  onClick={() => setPicked(d)}
                  aria-label={`${fmtDayLong(d)}${evs.length ? `, ${evs.length} eventos` : ''}`}
                >
                  <span className="month-n">{Number(d.slice(8, 10))}</span>
                  <span className="month-dots">
                    {evs.slice(0, 3).map((e) => (
                      <span key={e.id} className="month-ev" title={e.title}>
                        {CATEGORY[e.category]?.icon}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="picked-day">
            <h4 className="cap">{fmtDayLong(picked)}</h4>
            {pickedEvents.length ? (
              <ul className="events">
                {pickedEvents.map((e) => (
                  <EventRow key={e.id} ev={e} today={today} people={model.peopleById} onDelete={remove} />
                ))}
              </ul>
            ) : (
              <p className="empty">Sin eventos.</p>
            )}
          </div>
        </Card>
        <Card title="Próximos" subtitle={person === 'casa' ? 'Solo eventos compartidos' : 'Tuyos y compartidos'}>
          {upcoming.length ? (
            <ul className="events">
              {upcoming.map((e) => (
                <EventRow key={e.id} ev={e} today={today} people={model.peopleById} />
              ))}
            </ul>
          ) : (
            <p className="empty">No hay eventos próximos.</p>
          )}
        </Card>
      </div>

      {model.chores.length ? (
        <SectionTitle sub="Opcional: se anota lo que se hizo, si se quiere. No hay pendientes, atrasos ni metas.">Registro de la casa</SectionTitle>
      ) : null}
      <HouseLog />

      <EventDialog open={open} onClose={() => setOpen(false)} defaultDay={picked >= today ? picked : today} />
    </div>
  );
}

function HouseLog() {
  const { model, actions } = useData();
  const { person, today, startDate } = useApp();
  const kiosk = useKiosk();
  const run = useRun();
  // En el iPad, quién anota es quien eligió su nombre al tocar el resumen.
  const who = person === 'casa' ? kiosk.who : person;
  if (!model.chores.length) return null;
  const since = addDays(today, -6) < startDate ? startDate : addDays(today, -6);
  const byId = new Map(model.chores.map((c) => [c.id, c]));
  const logs = [...model.logsByChore.values()]
    .flat()
    .map((l) => ({ ...l, day: dayOf(l.done_at), chore: byId.get(l.chore_id) }))
    .filter((l) => l.chore && l.day >= since)
    .sort((a, b) => new Date(b.done_at) - new Date(a.done_at));
  const todayCount = (id) => logs.filter((l) => l.day === today && l.chore_id === id).length;
  const days = [...new Set(logs.map((l) => l.day))];
  const name = (id) => model.peopleById.get(id)?.short_name ?? '';

  return (
    <div className="grid two wide-left">
      <Card
        title="¿Qué se hizo?"
        subtitle="Tocá lo que hicieron para dejarlo anotado."
        actions={person === 'casa' && who ? <span className="muted small">Anota: {model.peopleById.get(who)?.short_name}</span> : null}
      >
        <div className="choice-grid chores-grid">
          {model.chores.map((c) => {
            const n = todayCount(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`choice ${n ? 'on' : ''}`}
                disabled={!who}
                onClick={() => run(() => actions.choreDone(c.id, who), `${c.name}: anotado`)}
              >
                <span aria-hidden="true">{c.emoji}</span>
                <span className="choice-label">{c.name}</span>
                {n ? <span className="choice-count">✓{n > 1 ? ` ×${n}` : ''}</span> : null}
              </button>
            );
          })}
        </div>
        {!who ? (
          <p className="muted small">
            Para anotar, tocá <strong>👀 Solo miro</strong> arriba y elegí quién sos.
          </p>
        ) : null}
      </Card>
      <Card title="Anotado estos días" subtitle="Solo como registro">
        {days.length ? (
          <div className="log-days">
            {days.map((d) => (
              <div key={d} className="log-day">
                <h4 className="cap">{d === today ? 'Hoy' : fmtDayLong(d)}</h4>
                <ul>
                  {logs
                    .filter((l) => l.day === d)
                    .map((l) => (
                      <li key={l.id}>
                        <span aria-hidden="true">{l.chore.emoji}</span> {l.chore.name}
                        <span className="muted small">
                          {' '}
                          · {name(l.done_by)} {fmtTime(l.done_at)}
                        </span>
                        {d === today ? (
                          <button type="button" className="link-btn" aria-label={`Borrar ${l.chore.name}`} onClick={() => run(() => actions.undoChore(l.id), 'Borrado')}>
                            borrar
                          </button>
                        ) : null}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <NoTraces>Todavía no se anotó nada. Es opcional.</NoTraces>
        )}
      </Card>
    </div>
  );
}

function EventDialog({ open, onClose, defaultDay }) {
  const { actions } = useData();
  const { person } = useApp();
  const run = useRun();
  const blank = () => ({ title: '', day: defaultDay, time: '19:00', allDay: false, category: 'casa', visibility: person === 'casa' ? 'compartido' : 'personal', notes: '' });
  const [f, setF] = useState(blank);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = () =>
    run(async () => {
      await actions.addEvent({
        title: f.title.trim(),
        starts_at: localToISO(f.day, f.allDay ? '00:00' : f.time),
        all_day: f.allDay,
        category: f.category,
        visibility: f.visibility,
        owner_id: person === 'casa' ? null : person,
        notes: f.notes.trim() || null,
      });
      setF(blank());
      onClose();
    }, 'Evento agregado');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nuevo evento"
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={!f.title.trim() || !f.day} onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <label className="field">
        <span>Título</span>
        <input type="text" value={f.title} onChange={set('title')} placeholder="Ej.: Turno veterinario Honey" autoFocus />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Fecha</span>
          <input type="date" value={f.day} onChange={set('day')} />
        </label>
        <label className="field">
          <span>Hora</span>
          <input type="time" value={f.time} onChange={set('time')} disabled={f.allDay} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={f.allDay} onChange={set('allDay')} />
        <span>Todo el día</span>
      </label>
      <div className="field-row">
        <label className="field">
          <span>Categoría</span>
          <select value={f.category} onChange={set('category')}>
            {Object.entries(CATEGORY).map(([k, v]) => (
              <option key={k} value={k}>
                {v.icon} {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Quién lo ve</span>
          <select value={f.visibility} onChange={set('visibility')} disabled={person === 'casa'}>
            <option value="personal">Solo yo</option>
            <option value="compartido">Compartido (casa)</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Notas</span>
        <input type="text" value={f.notes} onChange={set('notes')} placeholder="Opcional" />
      </label>
    </Dialog>
  );
}

function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
