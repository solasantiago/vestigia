import { createClient } from '@supabase/supabase-js';
import { STORE, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config.js';

// La sesión queda guardada en el dispositivo: el iPad no pide contraseña cada vez.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: `${STORE}-auth` },
});

// Tabla → columnas de orden estable (necesario para paginar de a 1000 filas).
export const TABLES = {
  household_settings: ['id'],
  people: ['id'],
  dogs: ['id'],
  habits: ['id'],
  chores: ['id'],
  habit_checkins: ['id'],
  mood_entries: ['id'],
  health_daily: ['person_id', 'day'],
  screen_time: ['person_id', 'day', 'app'],
  walks: ['id'],
  walk_dogs: ['walk_id', 'dog_id'],
  dog_meals: ['id'],
  food_purchases: ['id'],
  food_refills: ['id'],
  events: ['id'],
  chore_logs: ['id'],
  routine_items: ['id'],
  routine_logs: ['id'],
  dog_treats: ['id'],
  day_acks: ['day'],
  dog_meds: ['id'],
};

// Tablas que se escuchan en tiempo real.
export const LIVE_TABLES = [
  'habit_checkins',
  'walks',
  'walk_dogs',
  'dog_meals',
  'food_purchases',
  'food_refills',
  'events',
  'chore_logs',
  'habits',
  'chores',
  'dogs',
  'household_settings',
  'routine_items',
  'routine_logs',
  'dog_treats',
  'day_acks',
  'dog_meds',
];

const PAGE = 1000;

export async function fetchTable(table) {
  const order = TABLES[table] ?? [];
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select('*');
    for (const col of order) q = q.order(col, { ascending: true });
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}
