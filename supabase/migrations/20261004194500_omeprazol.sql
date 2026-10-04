-- 4/10/2026: nueva pastilla diaria de Santi a la mañana, desde el 5/10 (mismos horarios que la otra de la mañana).
-- Para volver atrás: update public.habits set active = false where person_id = 'santi' and name = 'Omeprazol';
insert into public.habits (person_id, name, question, emoji, slot, days, source, sort, active, created_at, doses, schedule)
select h.person_id, 'Omeprazol', '¿Tomaste el omeprazol?', '💊', h.slot, h.days, 'manual', h.sort, true, timestamptz '2026-10-05 05:00:00-03', 1, h.schedule
from public.habits h where h.person_id = 'santi' and h.name = 'Pastilla de la mañana';
