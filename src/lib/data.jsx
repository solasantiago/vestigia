import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTable, LIVE_TABLES, supabase, TABLES } from './supabase.js';
import { buildModel } from './metrics.js';
import { todayISO } from './dates.js';

const DataCtx = createContext(null);

export function useData() {
  return useContext(DataCtx);
}

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

export function DataProvider({ children }) {
  const [db, setDb] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [live, setLive] = useState(false);
  const timers = useRef({});

  const loadAll = useCallback(async () => {
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    try {
      const names = Object.keys(TABLES);
      const rows = await Promise.all(names.map((n) => fetchTable(n)));
      setDb(Object.fromEntries(names.map((n, i) => [n, rows[i]])));
      setStatus('ready');
      setError(null);
    } catch (e) {
      setError(e);
      setStatus('error');
    }
  }, []);

  const reload = useCallback(async (...tables) => {
    const results = await Promise.all(tables.map((t) => fetchTable(t)));
    setDb((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      tables.forEach((t, i) => {
        next[t] = results[i];
      });
      return next;
    });
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Tiempo real: lo que carga uno aparece en los otros dispositivos (iPad incluido).
  useEffect(() => {
    if (status !== 'ready') return undefined;
    let channel;
    try {
      channel = supabase.channel('vestigia-live');
      for (const table of LIVE_TABLES) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          clearTimeout(timers.current[table]);
          timers.current[table] = setTimeout(() => reload(table).catch(() => {}), 350);
        });
      }
      channel.subscribe((s) => setLive(s === 'SUBSCRIBED'));
    } catch {
      setLive(false);
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [status, reload]);

  // Refresco al volver a la pestaña y cada 5 minutos: el iPad queda abierto todo el día
  // y, si se corta el tiempo real, igual se pone al día solo.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && status === 'ready') loadAll();
    };
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(() => {
      if (status === 'ready' && document.visibilityState === 'visible') loadAll();
    }, 5 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(t);
    };
  }, [status, loadAll]);

  const patch = useCallback((table, fn) => {
    setDb((prev) => (prev ? { ...prev, [table]: fn(prev[table]) } : prev));
  }, []);

  const actions = useMemo(
    () => ({
      async answerHabit(habit, day, status, amount = null) {
        const row = { habit_id: habit.id, person_id: habit.person_id, day, status, amount, answered_at: new Date().toISOString() };
        patch('habit_checkins', (rows) => [...rows.filter((r) => !(r.habit_id === habit.id && r.day === day)), { id: -Date.now(), ...row }]);
        try {
          unwrap(await supabase.from('habit_checkins').upsert(row, { onConflict: 'habit_id,day' }));
        } finally {
          await reload('habit_checkins');
        }
      },
      /** Pastillas y check-ins: guarda cuántas tomas van y si se cerró el día sin tomarla ("Hoy no"). */
      async setDose(habit, day, { status, amount, closed = false }) {
        const row = { habit_id: habit.id, person_id: habit.person_id, day, status, amount, closed, answered_at: new Date().toISOString() };
        patch('habit_checkins', (rows) => [...rows.filter((r) => !(r.habit_id === habit.id && r.day === day)), { id: -Date.now(), ...row }]);
        try {
          unwrap(await supabase.from('habit_checkins').upsert(row, { onConflict: 'habit_id,day' }));
        } finally {
          await reload('habit_checkins');
        }
      },
      async clearHabit(habit, day) {
        patch('habit_checkins', (rows) => rows.filter((r) => !(r.habit_id === habit.id && r.day === day)));
        try {
          unwrap(await supabase.from('habit_checkins').delete().eq('habit_id', habit.id).eq('day', day));
        } finally {
          await reload('habit_checkins');
        }
      },
      async saveMood(personId, day, slot, fields) {
        const row = { person_id: personId, day, slot, ...fields };
        unwrap(await supabase.from('mood_entries').upsert(row, { onConflict: 'person_id,day,slot' }));
        await reload('mood_entries');
      },
      async ackDay(day, missing) {
        unwrap(await supabase.from('day_acks').upsert({ day, acked_at: new Date().toISOString(), missing }, { onConflict: 'day' }));
        await reload('day_acks');
      },
      async unackDay(day) {
        unwrap(await supabase.from('day_acks').delete().eq('day', day));
        await reload('day_acks');
      },
      async logWalk({ walkerId, minutes, dogs, kind = 'corta', stairs = null, endedAt = new Date() }) {
        const end = new Date(endedAt);
        const start = new Date(end.getTime() - minutes * 60000);
        const walk = unwrap(
          await supabase
            .from('walks')
            .insert({ started_at: start.toISOString(), ended_at: end.toISOString(), walker_id: walkerId, kind, stairs })
            .select('id')
            .single(),
        );
        unwrap(
          await supabase.from('walk_dogs').insert(
            dogs.map((d) => ({ walk_id: walk.id, dog_id: d.dog_id, poop: d.poop, poop_detail: d.poop_detail ?? null, pee: Boolean(d.pee), note: d.note ?? null })),
          ),
        );
        await reload('walks', 'walk_dogs');
      },
      async undoWalk(id) {
        // walk_dogs se borra en cascada.
        unwrap(await supabase.from('walks').delete().eq('id', id));
        await reload('walks', 'walk_dogs');
      },
      async logMeal(meal, byId) {
        const day = todayISO();
        const res = await supabase.from('dog_meals').insert({ day, meal, given_by: byId, given_at: new Date().toISOString() });
        await reload('dog_meals');
        if (res.error && res.error.code === '23505') return { already: true };
        unwrap(res);
        return { already: false };
      },
      async undoMeal(id) {
        unwrap(await supabase.from('dog_meals').delete().eq('id', id));
        await reload('dog_meals');
      },
      async refill(byId) {
        unwrap(await supabase.from('food_refills').insert({ by_id: byId, at: new Date().toISOString() }));
        await reload('food_refills');
      },
      async buyFood(kg, byId, day = todayISO(), product = null) {
        unwrap(await supabase.from('food_purchases').insert({ bought_on: day, kg, bought_by: byId, product }));
        await reload('food_purchases');
      },
      async choreDone(choreId, byId) {
        unwrap(await supabase.from('chore_logs').insert({ chore_id: choreId, done_by: byId, done_at: new Date().toISOString() }));
        await reload('chore_logs');
      },
      async undoChore(logId) {
        unwrap(await supabase.from('chore_logs').delete().eq('id', logId));
        await reload('chore_logs');
      },
      async undoRefill(id) {
        unwrap(await supabase.from('food_refills').delete().eq('id', id));
        await reload('food_refills');
      },
      async logTreat(kind, byId, dogIds) {
        unwrap(await supabase.from('dog_treats').insert({ kind, given_by: byId, dog_ids: dogIds, given_at: new Date().toISOString() }));
        await reload('dog_treats');
      },
      async markCycle(personId, day) {
        unwrap(await supabase.from('cycle_starts').insert({ person_id: personId, started_on: day }));
        await reload('cycle_starts');
      },
      async undoCycle(id) {
        unwrap(await supabase.from('cycle_starts').delete().eq('id', id));
        await reload('cycle_starts');
      },
      async giveMed(id, byId) {
        unwrap(await supabase.from('dog_meds').update({ given_at: new Date().toISOString(), given_by: byId, skipped: false }).eq('id', id));
        await reload('dog_meds');
      },
      async skipMed(id) {
        unwrap(await supabase.from('dog_meds').update({ given_at: null, given_by: null, skipped: true }).eq('id', id));
        await reload('dog_meds');
      },
      async undoMed(id) {
        unwrap(await supabase.from('dog_meds').update({ given_at: null, given_by: null, skipped: false }).eq('id', id));
        await reload('dog_meds');
      },
      async undoTreat(id) {
        unwrap(await supabase.from('dog_treats').delete().eq('id', id));
        await reload('dog_treats');
      },
      async toggleRoutine(item, day, on) {
        if (on) {
          unwrap(await supabase.from('routine_logs').upsert({ item_id: item.id, person_id: item.person_id, day, done_at: new Date().toISOString() }, { onConflict: 'item_id,day' }));
        } else {
          unwrap(await supabase.from('routine_logs').delete().eq('item_id', item.id).eq('day', day));
        }
        await reload('routine_logs');
      },
      async addEvent(ev) {
        unwrap(await supabase.from('events').insert(ev));
        await reload('events');
      },
      async deleteEvent(id) {
        unwrap(await supabase.from('events').delete().eq('id', id));
        await reload('events');
      },
    }),
    [patch, reload],
  );

  const model = useMemo(() => (db ? buildModel(db) : null), [db]);

  const value = useMemo(
    () => ({ status, error, model, live, actions, retry: loadAll }),
    [status, error, model, live, actions, loadAll],
  );

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

// ───────────── avisos breves ─────────────

const ToastCtx = createContext(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs, { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Ejecuta una acción mostrando éxito o error. */
export function useRun() {
  const toast = useToast();
  return useCallback(
    async (fn, okText) => {
      try {
        const r = await fn();
        if (okText) toast(okText);
        // Avisa al kiosco: después de guardar, vuelve al resumen al minuto.
        window.dispatchEvent(new CustomEvent('vestigia:saved'));
        return r;
      } catch (e) {
        toast(`No se pudo guardar: ${e.message}`, 'error');
        return undefined;
      }
    },
    [toast],
  );
}
