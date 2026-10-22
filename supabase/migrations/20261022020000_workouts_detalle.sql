-- 21/10/2026: más detalle de cada entrenamiento (todo lo que traen las capturas de Fitness).
alter table public.workouts
  add column splits jsonb,          -- tramos: [{ "km": 1, "sec": 855, "hr": 105 }, …] (el último puede ser parcial)
  add column temp_c smallint,       -- clima al empezar
  add column humidity smallint,     -- humedad (%)
  add column hr_end smallint,       -- pulso al terminar
  add column hr_1min smallint;      -- pulso 1 minuto después de terminar
