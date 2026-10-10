-- 10/10/2026: ciclo. Una fila por cada día en que empezó un período.
-- La configuración (de quién es, ventana esperada antes de la primera marca, días sin pedir la marca,
-- duración del ciclo, días hasta la ovulación y del período) va en household_settings.rules.cycle,
-- solo en la base: este repositorio es público.
--   { "person_id": "…", "expected_from": "AAAA-MM-DD", "expected_to": "AAAA-MM-DD",
--     "hide_days": 26, "length": 28, "ovulation_after": 14, "period_days": 5 }
-- Sin esa configuración, la app no muestra nada del ciclo.
create table public.cycle_starts (
  id bigint generated always as identity primary key,
  person_id text not null references public.people(id) on delete cascade,
  started_on date not null,
  created_at timestamptz not null default now(),
  unique (person_id, started_on)
);
alter table public.cycle_starts enable row level security;
revoke all on public.cycle_starts from anon;
grant select, insert, update, delete on public.cycle_starts to authenticated;
create policy "solo_cuentas_habilitadas" on public.cycle_starts
  for all to authenticated using (app.is_member()) with check (app.is_member());
alter publication supabase_realtime add table public.cycle_starts;
