-- Vestigia v0.1.1 · tablero del iPad
-- (Aplicada el 27/9 a las 02:33. Los valores de reglas y horarios se cargaron aparte; abajo quedan documentados.)
alter table public.habits add column schedule jsonb;
alter table public.habit_checkins add column closed boolean not null default false;   -- "Hoy no": la toma se cierra sin tomarla
alter table public.food_purchases add column known_start boolean not null default true; -- false = bolsa ya empezada: no sirve para aprender el consumo
alter table public.household_settings add column rules jsonb;
alter table public.walk_dogs add column note text;

-- Valores cargados:
-- update public.household_settings set rules = '{
--   "walk_window":   {"from": "08:00", "to": "02:00"},
--   "first_walk":    {"target": "10:00", "warn": "09:00", "alert": "11:00"},
--   "long_walks":    {"warn": "19:00", "alert": "23:00"},
--   "poop_hours":    {"warn": 18, "alert": 24},
--   "pee_hours":     {"warn": 6},
--   "ipad":          {"slide_sec": 12, "idle_sec": 300, "after_save_sec": 60, "night": {"from": "01:00", "to": "07:00"}}
-- }';
-- Pastillas (habits.schedule, horas del día de la casa; antes de las 05:00 cuenta como madrugada):
--   Mica:              {"warn": "12:00", "alert": "15:00", "next": {"from": "21:00", "warn": "23:00"}}
--   Santi (mañana):    {"warn": "10:00", "alert": "12:00"}
--   Santi (noche):     ver la migración siguiente
-- update public.food_purchases set known_start = false where notes = 'Bolsa en uso al empezar el registro';
