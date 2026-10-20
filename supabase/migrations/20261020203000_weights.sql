-- 20/10/2026: peso. Una fila por pesada, en kg con un decimal.
-- La tarjeta aparece en el kiosco solo para quien tenga al menos una pesada cargada.
-- Los valores viven solo en la base: este repositorio es público.
create table public.weights (
  id bigint generated always as identity primary key,
  person_id text not null references public.people(id) on delete cascade,
  measured_at timestamptz not null default now(),
  kg numeric(4,1) not null check (kg between 20 and 300),
  created_at timestamptz not null default now()
);
create index weights_person_measured on public.weights (person_id, measured_at);
alter table public.weights enable row level security;
revoke all on public.weights from anon;
grant select, insert, update, delete on public.weights to authenticated;
create policy "solo_cuentas_habilitadas" on public.weights
  for all to authenticated using (app.is_member()) with check (app.is_member());
alter publication supabase_realtime add table public.weights;
