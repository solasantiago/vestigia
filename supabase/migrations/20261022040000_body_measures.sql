-- 22/10/2026: medidas del cuerpo, en cm con un decimal. Una fila por medición (cada 2–4 semanas);
-- las medidas que no se tomaron quedan vacías. Se cargan desde el chat: la app solo las muestra.
-- La fila aparece en la tarjeta de salud solo para quien tenga al menos una medición.
-- Los valores viven solo en la base: este repositorio es público.
create table public.body_measures (
  id bigint generated always as identity primary key,
  person_id text not null references public.people(id) on delete cascade,
  measured_at timestamptz not null,
  waist_cm numeric(4,1) check (waist_cm between 30 and 250),   -- cintura, a la altura del ombligo
  hip_cm numeric(4,1) check (hip_cm between 30 and 250),       -- cadera, en la parte más ancha
  chest_cm numeric(4,1) check (chest_cm between 30 and 250),   -- pecho, a la altura de las tetillas
  arm_cm numeric(4,1) check (arm_cm between 10 and 100),       -- brazo, en la mitad, relajado
  thigh_cm numeric(4,1) check (thigh_cm between 20 and 150),   -- muslo, en la mitad
  note text,
  created_at timestamptz not null default now()
);
create index body_measures_person_measured on public.body_measures (person_id, measured_at);
alter table public.body_measures enable row level security;
revoke all on public.body_measures from anon;
grant select, insert, update, delete on public.body_measures to authenticated;
create policy "solo_cuentas_habilitadas" on public.body_measures
  for all to authenticated using (app.is_member()) with check (app.is_member());
alter publication supabase_realtime add table public.body_measures;
