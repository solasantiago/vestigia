-- 21/10/2026: ejercicio. Una fila por entrenamiento, cargada desde el chat a partir de las
-- capturas del Apple Watch (la app no tiene botón para cargar: solo muestra).
-- La tarjeta aparece en el kiosco solo para quien tenga al menos un entrenamiento.
-- Los valores viven solo en la base: este repositorio es público.
create table public.workouts (
  id bigint generated always as identity primary key,
  person_id text not null references public.people(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  kind text not null,                       -- tipo en el Watch (p. ej. "Caminata al aire libre")
  plan text,                                -- rutina que se siguió (p. ej. "Plaza 60")
  distance_km numeric(5,2),
  kcal_active integer,
  kcal_total integer,
  hr_avg smallint,
  hr_max smallint,
  zones_sec integer[],                      -- segundos en zona 1…5, como los muestra el Watch
  effort smallint check (effort between 1 and 10),
  note text,
  created_at timestamptz not null default now(),
  check (ended_at > started_at)
);
create index workouts_person_started on public.workouts (person_id, started_at);
alter table public.workouts enable row level security;
revoke all on public.workouts from anon;
grant select, insert, update, delete on public.workouts to authenticated;
create policy "solo_cuentas_habilitadas" on public.workouts
  for all to authenticated using (app.is_member()) with check (app.is_member());
alter publication supabase_realtime add table public.workouts;
