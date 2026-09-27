-- Vestigia · esquema v0.1 (datos reales)
-- Diferencias con la demo (repo tracker_demo):
--   · Sin acceso anónimo: solo cuentas habilitadas en app.users pueden leer o escribir.
--   · Sin generador de datos de ejemplo.
--   · Ajustes de la casa en una tabla (fecha de inicio, avisos, horarios de comida).
-- Los días se interpretan en hora de Buenos Aires (America/Argentina/Buenos_Aires).

-- ───────────── Cuentas habilitadas (esquema privado, no expuesto por la API) ─────────────

create schema if not exists app;
revoke all on schema app from public, anon;
grant usage on schema app to authenticated;

create table app.users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('casa', 'mica', 'santi')),
  created_at timestamptz not null default now()
);
revoke all on app.users from public, anon, authenticated;

-- ¿La sesión actual pertenece a una cuenta habilitada?
create or replace function app.is_member() returns boolean
language sql stable security definer set search_path = '' as
$$ select exists (select 1 from app.users where user_id = auth.uid()) $$;

-- Rol de la sesión actual (casa / mica / santi), para que la app sepa qué mostrar.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = '' as
$$ select role from app.users where user_id = auth.uid() $$;

revoke all on function app.is_member() from public, anon;
grant execute on function app.is_member() to authenticated;
revoke all on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;

-- ───────────── Ajustes de la casa (una sola fila) ─────────────

create table public.household_settings (
  id                boolean primary key default true check (id),
  start_date        date not null,
  walks_alert_hours int,
  poop_alert_hours  int,
  food_alert_days   int,
  breakfast_time    time,
  dinner_time       time,
  updated_at        timestamptz not null default now()
);

-- ───────────── Catálogos ─────────────

create table public.people (
  id             text primary key,               -- 'mica' | 'santi'
  name           text not null,
  short_name     text not null,
  sort           int  not null default 0,
  steps_goal     int,
  sleep_goal_min int
);

create table public.dogs (
  id             text primary key,               -- 'mocka' | 'honey'
  name           text not null,
  weight_kg      numeric(4,1),
  daily_ration_g int,
  walks_goal     int,
  vet            text,
  sort           int not null default 0
);

create table public.habits (
  id         bigint generated always as identity primary key,
  person_id  text not null references public.people(id) on delete cascade,
  name       text not null,
  question   text,
  emoji      text,
  slot       text not null check (slot in ('manana','mediodia','tarde','noche')),
  days       smallint[] not null default '{0,1,2,3,4,5,6}',   -- 0 = domingo … 6 = sábado
  source     text not null default 'manual' check (source in ('manual','auto')),
  sort       int  not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.chores (
  id         bigint generated always as identity primary key,
  name       text not null,
  emoji      text,
  every_days int  not null check (every_days > 0),
  sort       int  not null default 0,
  active     boolean not null default true
);

-- ───────────── Registros ─────────────

create table public.habit_checkins (
  id          bigint generated always as identity primary key,
  habit_id    bigint not null references public.habits(id) on delete cascade,
  person_id   text   not null references public.people(id) on delete cascade,
  day         date   not null,
  status      text   not null check (status in ('si','no','na')),
  answered_at timestamptz not null default now(),
  unique (habit_id, day)
);

create table public.walks (
  id         bigint generated always as identity primary key,
  started_at timestamptz not null,
  ended_at   timestamptz,
  walker_id  text not null references public.people(id),
  created_at timestamptz not null default now()
);

create table public.walk_dogs (
  walk_id     bigint not null references public.walks(id) on delete cascade,
  dog_id      text   not null references public.dogs(id),
  poop        text check (poop in ('si','no','raro')),
  poop_detail text,
  pee         boolean,
  primary key (walk_id, dog_id)
);

create table public.dog_meals (
  id       bigint generated always as identity primary key,
  day      date not null,
  meal     text not null check (meal in ('desayuno','cena')),
  given_by text not null references public.people(id),
  given_at timestamptz not null default now(),
  unique (day, meal)
);

create table public.food_purchases (
  id         bigint generated always as identity primary key,
  bought_on  date not null,
  kg         numeric(4,1) not null check (kg > 0),
  bought_by  text references public.people(id),
  created_at timestamptz not null default now()
);

create table public.food_refills (
  id    bigint generated always as identity primary key,
  at    timestamptz not null default now(),
  by_id text not null references public.people(id)
);

create table public.events (
  id           bigint generated always as identity primary key,
  title        text not null,
  starts_at    timestamptz not null,
  duration_min int,
  all_day      boolean not null default false,
  category     text not null check (category in ('facu','salud','perros','social','casa')),
  visibility   text not null check (visibility in ('personal','compartido')),
  owner_id     text references public.people(id),
  recurrence   text,
  notes        text,
  created_at   timestamptz not null default now()
);

create table public.chore_logs (
  id       bigint generated always as identity primary key,
  chore_id bigint not null references public.chores(id) on delete cascade,
  done_by  text   not null references public.people(id),
  done_at  timestamptz not null default now()
);

-- Para versiones siguientes (v0.2 en adelante). Quedan creadas y protegidas.
create table public.mood_entries (
  id          bigint generated always as identity primary key,
  person_id   text not null references public.people(id) on delete cascade,
  day         date not null,
  slot        text not null check (slot in ('manana','tarde','noche')),
  mood        smallint check (mood   between 1 and 5),
  energy      smallint check (energy between 1 and 5),
  stress      smallint check (stress between 1 and 5),
  feelings    text[] not null default '{}',
  influences  text[] not null default '{}',
  best_of_day text,
  created_at  timestamptz not null default now(),
  unique (person_id, day, slot)
);

create table public.health_daily (
  person_id text not null references public.people(id) on delete cascade,
  day       date not null,
  sleep_min int,
  bedtime   time,
  wake_time time,
  steps     int,
  primary key (person_id, day)
);

create table public.screen_time (
  person_id text not null references public.people(id) on delete cascade,
  day       date not null,
  app       text not null,
  category  text not null,
  minutes   int  not null check (minutes >= 0),
  primary key (person_id, day, app)
);

-- ───────────── Índices ─────────────

create index on public.habits (person_id);
create index on public.habit_checkins (person_id, day);
create index on public.walks (started_at);
create index on public.walks (walker_id);
create index on public.walk_dogs (dog_id);
create index on public.dog_meals (given_by);
create index on public.food_purchases (bought_by);
create index on public.food_refills (by_id);
create index on public.events (starts_at);
create index on public.events (owner_id);
create index on public.chore_logs (chore_id, done_at);
create index on public.chore_logs (done_by);
create index on public.mood_entries (person_id, day);
create index on public.screen_time (person_id, day);

-- ───────────── Permisos ─────────────
-- Nadie sin sesión ve nada. Las cuentas habilitadas (por ahora solo "casa") leen y escriben todo.
-- En la v0.2, con las cuentas personales, se separa lo personal de lo compartido (§7 del documento funcional).

do $$
declare
  t text;
  tables text[] := array['household_settings','people','dogs','habits','chores','habit_checkins','walks','walk_dogs',
                         'dog_meals','food_purchases','food_refills','events','chore_logs',
                         'mood_entries','health_daily','screen_time'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "solo_cuentas_habilitadas" on public.%I for all to authenticated using (app.is_member()) with check (app.is_member())', t);
  end loop;
end $$;

revoke usage on all sequences in schema public from anon;
grant usage on all sequences in schema public to authenticated;

-- Tiempo real: lo que se carga en un dispositivo aparece en los otros.
alter publication supabase_realtime add table
  public.habit_checkins, public.walks, public.walk_dogs, public.dog_meals, public.food_refills,
  public.food_purchases, public.events, public.chore_logs, public.habits, public.chores, public.dogs,
  public.household_settings;
