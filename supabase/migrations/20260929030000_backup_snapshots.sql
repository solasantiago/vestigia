-- Copias de seguridad dentro de la base, antes de cambios delicados (ver docs/rollback.md).
-- El esquema "backup" no se expone por la API y ninguna cuenta de la app puede leerlo.
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;

create table if not exists backup.snapshots (
  label text primary key,
  taken_at timestamptz not null default now(),
  note text,
  tables jsonb not null
);
alter table backup.snapshots enable row level security;

-- select backup.snapshot('antes_v0_2', 'antes de migrar a la v0.2');
-- Copia cada tabla de public a backup."<etiqueta>__<tabla>" y anota cuántas filas tenía.
create or replace function backup.snapshot(p_label text, p_note text default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  t record;
  n bigint;
  counts jsonb := '{}'::jsonb;
begin
  if p_label !~ '^[a-z0-9_]{1,40}$' then
    raise exception 'La etiqueta solo puede tener minúsculas, números y _ (hasta 40)';
  end if;
  if exists (select 1 from backup.snapshots where label = p_label) then
    raise exception 'Ya existe una copia con la etiqueta %', p_label;
  end if;
  for t in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  loop
    execute format('create table backup.%I as table public.%I', p_label || '__' || t.table_name, t.table_name);
    execute format('alter table backup.%I enable row level security', p_label || '__' || t.table_name);
    execute format('select count(*) from backup.%I', p_label || '__' || t.table_name) into n;
    counts := counts || jsonb_build_object(t.table_name, n);
  end loop;
  insert into backup.snapshots (label, note, tables) values (p_label, p_note, counts);
  return counts;
end;
$$;
revoke all on function backup.snapshot(text, text) from public, anon, authenticated;

-- Primera copia, tomada el 29/9/2026 con la v0.1.1 en producción:
-- select backup.snapshot('v0_1_1_20260929', 'Estado de producción con la v0.1.1 (antes de cualquier cambio posterior)');
