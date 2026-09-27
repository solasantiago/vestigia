-- Vestigia v0.1 · ajustes con la configuración real de la casa
--   · Hábitos con varias tomas por día (p. ej. 2 pastillas): cantidad por registro y estado "parcial".
--   · Rutinas opcionales (higiene del sueño): se marcan, no cuentan como incumplidas.
--   · Salidas cortas y paseos largos, y si subieron por la escalera.
--   · Premios para los perros. Las cargas de tarritos usan food_refills.
--   · Tareas de la casa opcionales, sin frecuencia obligatoria.
--   · Metas de salidas de la casa.

-- Hábitos con varias tomas
alter table public.habits add column doses smallint not null default 1 check (doses between 1 and 6);
alter table public.habits add column reminder_slot text check (reminder_slot in ('manana','mediodia','tarde','noche'));
alter table public.habit_checkins add column amount smallint check (amount >= 0);
alter table public.habit_checkins drop constraint habit_checkins_status_check;
alter table public.habit_checkins add constraint habit_checkins_status_check check (status in ('si','no','na','parcial'));

-- Rutinas opcionales
create table public.routine_items (
  id        bigint generated always as identity primary key,
  person_id text references public.people(id) on delete cascade,
  kind      text not null default 'sueno',
  label     text not null,
  emoji     text,
  sort      int  not null default 0,
  active    boolean not null default true
);
create table public.routine_logs (
  id        bigint generated always as identity primary key,
  item_id   bigint not null references public.routine_items(id) on delete cascade,
  person_id text references public.people(id) on delete cascade,
  day       date not null,
  done_at   timestamptz not null default now(),
  unique (item_id, day)
);
create index on public.routine_items (person_id);
create index on public.routine_logs (person_id, day);

-- Salidas de los perros
alter table public.walks add column kind text not null default 'corta' check (kind in ('corta','larga'));
alter table public.walks add column stairs boolean;

-- Premios
create table public.dog_treats (
  id       bigint generated always as identity primary key,
  given_at timestamptz not null default now(),
  given_by text not null references public.people(id),
  kind     text not null check (kind in ('pollito','dentastix','golosina','otro')),
  dog_ids  text[] not null default '{mocka,honey}'
);
create index on public.dog_treats (given_by);

-- Alimento: producto y notas de cada bolsa
alter table public.food_purchases add column product text;
alter table public.food_purchases add column notes text;

-- Tareas opcionales: la frecuencia deja de ser obligatoria
alter table public.chores alter column every_days drop not null;
alter table public.chores drop constraint chores_every_days_check;
alter table public.chores add constraint chores_every_days_check check (every_days is null or every_days > 0);

-- Metas de salidas de la casa
alter table public.household_settings add column walks_goal int;
alter table public.household_settings add column long_walks_goal int;

-- Permisos y tiempo real de las tablas nuevas
do $$
declare t text;
begin
  foreach t in array array['routine_items','routine_logs','dog_treats'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "solo_cuentas_habilitadas" on public.%I for all to authenticated using (app.is_member()) with check (app.is_member())', t);
  end loop;
end $$;
grant usage on all sequences in schema public to authenticated;
alter publication supabase_realtime add table public.routine_items, public.routine_logs, public.dog_treats;
