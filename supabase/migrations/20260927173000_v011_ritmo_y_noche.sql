-- Vestigia v0.1.1 · ritmo de salidas y "Entendido" del modo noche
--   · Las salidas se avisan por ritmo: la próxima se calcula para llegar a la meta antes de las 2.
--     Naranja al pasarse de esa hora, rojo 90 min después. Con la meta cumplida, naranja a las 5 h sin salir.
--   · La pastilla de la noche de Santi se recuerda desde las 00:00 (su hora de acostarse), naranja a la 01:00,
--     y a partir de las 02:00 deja de insistir: queda "sin registrar".
--   · day_acks: de noche, si falta algo y se toca "Entendido", el día queda reconocido y la pantalla se calma.

update public.household_settings
set rules = (coalesce(rules, '{}'::jsonb) - 'since_walk_min')
            || '{"walk_pace": {"alert_after_min": 90, "min_gap_min": 90, "after_goal_warn_min": 300}}'::jsonb,
    updated_at = now();

update public.habits
set schedule = '{"from": "00:00", "warn": "01:00", "quiet": "02:00"}'::jsonb
where person_id = 'santi' and slot = 'noche' and source = 'manual';

create table public.day_acks (
  day      date primary key,
  acked_at timestamptz not null default now(),
  missing  jsonb not null default '[]'::jsonb
);
alter table public.day_acks enable row level security;
revoke all on public.day_acks from anon;
grant select, insert, update, delete on public.day_acks to authenticated;
create policy "solo_cuentas_habilitadas" on public.day_acks
  for all to authenticated using (app.is_member()) with check (app.is_member());
alter publication supabase_realtime add table public.day_acks;
