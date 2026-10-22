-- 22/10/2026: objetivos de salud por persona (una fila por persona). Se cargan desde el chat.
-- Con esto la app muestra cuánto falta para el peso objetivo, el ritmo y la fecha estimada,
-- el umbral de calorías en el tablero de comidas y la referencia de cintura (mitad de la altura).
-- Los valores viven solo en la base: este repositorio es público.
create table public.health_goals (
  person_id text primary key references public.people(id) on delete cascade,
  height_cm numeric(4,1),
  target_kg numeric(4,1),
  kcal_lo integer,      -- franja diaria de calorías para bajar de peso
  kcal_hi integer,
  kcal_floor integer,   -- por debajo de esto, "muy bajo"
  note text,
  updated_at timestamptz not null default now()
);
alter table public.health_goals enable row level security;
revoke all on public.health_goals from anon;
grant select, insert, update, delete on public.health_goals to authenticated;
create policy "solo_cuentas_habilitadas" on public.health_goals
  for all to authenticated using (app.is_member()) with check (app.is_member());
alter publication supabase_realtime add table public.health_goals;
