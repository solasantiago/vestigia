-- 30/9/2026: la meta de paseos largos pasa de 2 a 1 por día.
-- Para volver atrás: update public.household_settings set long_walks_goal = 2;
update public.household_settings set long_walks_goal = 1, updated_at = now();
