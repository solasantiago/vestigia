-- 22/10/2026: comidas. Una fila por comida, cargada desde el chat a partir de fotos
-- (la app no tiene botón para cargar: solo muestra). No se guardan las fotos.
-- Las cantidades son estimaciones por foto (±20–30 %).
-- La tarjeta aparece en el kiosco solo para quien tenga al menos una comida cargada.
-- Los valores viven solo en la base: este repositorio es público.
create table public.meals (
  id bigint generated always as identity primary key,
  person_id text not null references public.people(id) on delete cascade,
  eaten_at timestamptz not null,
  slot text not null check (slot in ('desayuno', 'almuerzo', 'merienda', 'cena', 'colacion')),
  description text not null,             -- qué fue, en una línea
  items jsonb,                           -- [{ "name": "…", "portion": "…", "kcal": 0, "protein_g": 0 }, …]
  kcal integer,
  protein_g numeric(5,1),
  carbs_g numeric(5,1),
  fat_g numeric(5,1),
  veg_servings numeric(3,1) not null default 0,   -- porciones de verdura
  fruit_servings numeric(3,1) not null default 0, -- porciones de fruta
  ultra boolean not null default false,           -- ultraprocesado
  tip text,                              -- sugerencia para la próxima comida
  note text,
  created_at timestamptz not null default now()
);
create index meals_person_eaten on public.meals (person_id, eaten_at);
alter table public.meals enable row level security;
revoke all on public.meals from anon;
grant select, insert, update, delete on public.meals to authenticated;
create policy "solo_cuentas_habilitadas" on public.meals
  for all to authenticated using (app.is_member()) with check (app.is_member());
alter publication supabase_realtime add table public.meals;
