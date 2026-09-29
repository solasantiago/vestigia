-- ⚠️ NO HACE FALTA para volver a la v0.1: la v0.1 funciona con la base tal como está
-- (la v0.1.1 solo agregó columnas y una tabla; probado el 29/9/2026).
--
-- Este script deshace los cambios de base de la v0.1.1 solo si se decide borrarlos del todo.
-- BORRA DATOS: los "Entendido" de la noche, las notas de "algo raro", los "Hoy no",
-- las reglas del semáforo y los horarios de las pastillas.
-- Antes de correrlo: select backup.snapshot('antes_down_v0_1_1', 'antes de deshacer la v0.1.1');

begin;

alter publication supabase_realtime drop table public.day_acks;
drop table public.day_acks;

alter table public.walk_dogs drop column note;
alter table public.household_settings drop column rules;
alter table public.food_purchases drop column known_start;
alter table public.habit_checkins drop column closed;
alter table public.habits drop column schedule;

commit;
