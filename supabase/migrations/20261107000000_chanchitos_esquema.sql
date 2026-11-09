-- ChanchitOS: esquema de gastos personales (aplicado en partes entre el 7 y el 8/11/2026).
-- Solo estructura: los datos se cargan desde el chat con Claude y no viven en el repo.
-- El esquema queda cerrado a anon/authenticated; la página /chanchitos/ lee con public.chanchitos_tablero().

create schema if not exists chanchitos;

create table if not exists chanchitos.movimientos (
  id text primary key,
  fecha date not null,
  fecha_banco date,
  medio text not null,
  referencia text,
  descripcion text,
  categoria text,
  subcategoria text,
  tipo text,
  sentido text not null check (sentido in ('ingreso','egreso','interno_entrada','interno_salida','saldo_anterior','consumo_tarjeta')),
  monto_ars numeric(14,2) not null,
  monto_usd numeric(12,2),
  resumen_cierre date,
  resumen_vto date,
  operacion text,
  nota text,
  cuota int,
  cuotas_total int,
  creado timestamptz not null default now(),
  constraint movimientos_monto_ars_check check (monto_ars >= 0 or sentido = 'consumo_tarjeta')
);
create index if not exists movimientos_fecha_idx on chanchitos.movimientos (fecha);
create index if not exists movimientos_resumen_cierre_idx on chanchitos.movimientos (resumen_cierre) where resumen_cierre is not null;

create table if not exists chanchitos.categorias (
  subcategoria text primary key,
  rubro text not null,
  bloque text not null check (bloque in ('Necesidades','Gustos','Finanzas')),
  nota text
);

create table if not exists chanchitos.tarjeta_resumenes (
  tarjeta text not null,
  cierre date not null,
  vencimiento date not null,
  cierre_anterior date,
  vencimiento_anterior date,
  proximo_cierre date,
  proximo_vencimiento date,
  total_ars numeric(14,2) not null,
  total_usd numeric(12,2) not null default 0,
  pago_minimo_ars numeric(14,2),
  tc_usd numeric(10,2),
  nota text,
  primary key (tarjeta, cierre)
);

create table if not exists chanchitos.pendientes (
  id text primary key,
  concepto text not null,
  categoria text,
  subcategoria text,
  tipo text,
  estado text,
  vence date,
  monto_estimado numeric(14,2),
  nota text,
  creado timestamptz not null default now()
);

create table if not exists chanchitos.diccionario (
  patron text not null,
  medio text not null,
  comercio text,
  categoria text,
  subcategoria text,
  tipo text,
  descripcion text,
  fuente text,
  primary key (patron, medio)
);

create table if not exists chanchitos.ciclo_eventos (
  id text primary key,
  fecha date not null,
  evento text not null,
  tipo text not null,
  monto_ars numeric(14,2),
  estado text
);

alter table chanchitos.movimientos enable row level security;
alter table chanchitos.categorias enable row level security;
alter table chanchitos.tarjeta_resumenes enable row level security;
alter table chanchitos.pendientes enable row level security;
alter table chanchitos.diccionario enable row level security;
alter table chanchitos.ciclo_eventos enable row level security;
revoke all on schema chanchitos from anon, authenticated;
revoke all on all tables in schema chanchitos from anon, authenticated;
