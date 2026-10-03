-- 3/10/2026: la pastilla de la noche de Santi es opcional: se puede anotar, pero no insiste
-- ni cuenta para el día completo ni las rachas. ("quiet" queda para que las versiones anteriores no insistan.)
-- Para volver atrás: schedule = '{"from":"00:00","warn":"01:00","quiet":"02:00"}'
update public.habits set schedule = '{"from":"00:00","quiet":"02:00","optional":true}'::jsonb
where person_id = 'santi' and name = 'Pastilla de la noche';
