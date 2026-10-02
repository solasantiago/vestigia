-- 2/10/2026: tratamientos de las perras. Una fila por aplicación programada (colirio, antibiótico, etc.).
-- Para volver atrás no hace falta borrar nada: la versión anterior ignora esta tabla.
create table public.dog_meds (
  id bigint generated always as identity primary key,
  dog_id text not null references public.dogs(id) on delete cascade,
  name text not null,
  due_at timestamptz not null,
  given_at timestamptz,
  given_by text references public.people(id),
  skipped boolean not null default false,
  created_at timestamptz not null default now()
);
create index dog_meds_due_idx on public.dog_meds (due_at);
alter table public.dog_meds enable row level security;
revoke all on public.dog_meds from anon;
grant select, insert, update, delete on public.dog_meds to authenticated;
create policy "solo_cuentas_habilitadas" on public.dog_meds
  for all to authenticated using (app.is_member()) with check (app.is_member());
alter publication supabase_realtime add table public.dog_meds;

-- Colirio de Mocka (conjuntivitis): 16 aplicaciones del 2 al 8 de octubre.
insert into public.dog_meds (dog_id, name, due_at)
select d.id, 'Colirio', t::timestamptz from public.dogs d, unnest(array[
 '2026-10-02 11:00-03','2026-10-02 17:00-03',
 '2026-10-03 00:00-03','2026-10-03 08:00-03','2026-10-03 16:00-03',
 '2026-10-04 00:00-03','2026-10-04 08:00-03','2026-10-04 16:00-03',
 '2026-10-05 00:00-03','2026-10-05 12:00-03',
 '2026-10-06 00:00-03','2026-10-06 12:00-03',
 '2026-10-07 00:00-03','2026-10-07 12:00-03',
 '2026-10-08 00:00-03','2026-10-08 12:00-03']) as t
where d.name = 'Mocka';
