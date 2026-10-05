-- 4/10/2026: Santi suma una pastilla diaria a la mañana (mismos horarios que la otra de la mañana).
-- Los nombres de los medicamentos y sus dosis se cargan en la base, no en este repositorio (es público):
-- habits.name es lo que se muestra y habits.schedule.detail la dosis ("20 mg").
-- Para volver atrás: desactivar el hábito (active = false).
insert into public.habits (person_id, name, question, emoji, slot, days, source, sort, active, created_at, doses, schedule)
select h.person_id, 'Pastilla de la mañana 2', '¿Tomaste la segunda pastilla de la mañana?', '💊', h.slot, h.days, 'manual', h.sort, true, timestamptz '2026-10-04 05:00:00-03', 1, h.schedule
from public.habits h where h.person_id = 'santi' and h.name = 'Pastilla de la mañana';
