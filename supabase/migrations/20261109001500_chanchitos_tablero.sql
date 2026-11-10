-- ChanchitOS: vistas de lectura y una función para la página /chanchitos/.
-- El esquema chanchitos sigue cerrado a anon/authenticated. La página solo llama a
-- public.chanchitos_tablero(), que exige una cuenta habilitada de Vestigia (my_role()).

-- Hoy en Buenos Aires.
create or replace function chanchitos.hoy() returns date
language sql stable set search_path = '' as
$$ select (now() at time zone 'America/Argentina/Buenos_Aires')::date $$;

-- Ciclo de sueldo actual: del cobro al último día que debe cubrir.
create or replace view chanchitos.v_ciclo as
select min(fecha) filter (where tipo = 'ingreso') as ini,
       max(fecha) filter (where tipo = 'fin') as fin
from chanchitos.ciclo_eventos;

-- Todos los movimientos con signo, bloque y rubro.
create or replace view chanchitos.v_movimientos as
select m.id, m.fecha, m.fecha_banco, m.medio, m.referencia, m.descripcion, m.categoria, m.subcategoria, m.tipo, m.sentido,
       case when m.sentido in ('ingreso', 'interno_entrada', 'saldo_anterior') then m.monto_ars else -m.monto_ars end as monto,
       m.monto_usd, m.resumen_cierre, m.cuota, m.cuotas_total, m.nota, k.bloque, k.rubro
from chanchitos.movimientos m
left join chanchitos.categorias k on k.subcategoria = m.subcategoria;

-- Saldo de cada cuenta propia (los consumos de tarjeta no mueven saldo).
create or replace view chanchitos.v_saldos as
select medio, round(sum(monto), 2) as saldo
from chanchitos.v_movimientos
where sentido <> 'consumo_tarjeta'
group by medio;

-- Sueldo del ciclo: entró, salió, queda, saldo anterior y disponible.
create or replace view chanchitos.v_flujo as
select c.ini, c.fin,
       coalesce(sum(m.monto_ars) filter (where m.sentido = 'ingreso'), 0) as sueldo,
       coalesce(sum(m.monto_ars) filter (where m.sentido = 'egreso'), 0) as egresos,
       coalesce(sum(m.monto_ars) filter (where m.sentido = 'saldo_anterior'), 0) as saldo_anterior,
       coalesce(sum(m.monto_ars) filter (where m.sentido = 'ingreso'), 0) - coalesce(sum(m.monto_ars) filter (where m.sentido = 'egreso'), 0) as queda,
       coalesce(sum(m.monto_ars) filter (where m.sentido in ('ingreso', 'saldo_anterior')), 0) - coalesce(sum(m.monto_ars) filter (where m.sentido = 'egreso'), 0) as disponible
from chanchitos.v_ciclo c
left join chanchitos.movimientos m on m.fecha between c.ini and c.fin
group by c.ini, c.fin;

-- A dónde fue el sueldo: bloque, rubro y detalle; los pagos de tarjeta se reparten
-- entre los consumos de su resumen, separando la tarjeta.
create or replace view chanchitos.v_capas as
with ciclo as (select * from chanchitos.v_ciclo),
sueldo as (
  select coalesce(sum(m.monto_ars), 0) as s from chanchitos.movimientos m, ciclo where m.sentido = 'ingreso' and m.fecha between ciclo.ini and ciclo.fin
), pagos as (
  select m.*, case when m.subcategoria ilike '%visa%' or m.referencia ilike '%visa%' then 'VISA%' when m.subcategoria ilike '%amex%' or m.referencia ilike '%amex%' then 'AMEX%' else '%' end as marca
  from chanchitos.movimientos m, ciclo where m.sentido = 'egreso' and m.fecha between ciclo.ini and ciclo.fin
), con_resumen as (
  select p.id from pagos p where p.categoria = 'Tarjetas' and exists (
    select 1 from chanchitos.movimientos c where c.sentido = 'consumo_tarjeta' and c.resumen_cierre = p.resumen_cierre and c.medio like p.marca)
), partes as (
  select p.id as item, p.subcategoria, p.categoria, p.tipo,
         case when p.categoria = 'Tarjetas' then coalesce(nullif(replace(p.marca, '%', ''), ''), 'Tarjeta') else '' end as tarjeta,
         p.monto_ars as monto
  from pagos p where p.id not in (select id from con_resumen)
  union all
  select c.id, c.subcategoria, c.categoria, c.tipo, split_part(c.medio, ' ', 1),
         p.monto_ars * c.monto_ars / sum(c.monto_ars) over (partition by p.id)
  from pagos p join chanchitos.movimientos c on c.sentido = 'consumo_tarjeta' and c.resumen_cierre = p.resumen_cierre and c.medio like p.marca
  where p.id in (select id from con_resumen)
), detalle as (
  select coalesce(k.bloque, 'Sin clasificar') as bloque, coalesce(k.rubro, t.categoria) as rubro, t.subcategoria,
         coalesce(t.tipo = 'Extraordinario', false) as extraordinario, t.tarjeta,
         round(sum(t.monto), 2) as monto, count(distinct t.item)::int as n
  from partes t left join chanchitos.categorias k on k.subcategoria = t.subcategoria
  group by 1, 2, 3, 4, 5
)
select bloque, rubro, subcategoria, extraordinario, tarjeta, monto, n, (select s from sueldo) as sueldo from detalle
union all
select 'Queda', 'Queda', 'Queda', false, '', round((select s from sueldo) - (select coalesce(sum(monto), 0) from detalle), 2), 0, (select s from sueldo);

-- Último resumen de tarjeta ya cerrado, por categoría.
create or replace view chanchitos.v_ultimo_resumen as
with cierre as (
  select resumen_cierre as c, split_part(medio, ' ', 1) as tarjeta
  from chanchitos.movimientos
  where sentido = 'consumo_tarjeta' and resumen_cierre <= chanchitos.hoy()
  order by resumen_cierre desc limit 1
)
select cierre.tarjeta, cierre.c as cierre, m.categoria, round(sum(m.monto_ars), 2) as total, count(*)::int as n
from chanchitos.movimientos m join cierre on m.resumen_cierre = cierre.c and split_part(m.medio, ' ', 1) = cierre.tarjeta
where m.sentido = 'consumo_tarjeta'
group by 1, 2, 3;

-- Todo lo que necesita la página, en una sola llamada.
create or replace function public.chanchitos_tablero() returns jsonb
language plpgsql stable security definer set search_path = '' as
$$
declare
  resultado jsonb;
begin
  if (select role from app.users where user_id = auth.uid()) is null then
    raise exception 'Esta cuenta no está habilitada para ver ChanchitOS' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generado', now(),
    'hoy', chanchitos.hoy(),
    'flujo', (select to_jsonb(f) from chanchitos.v_flujo f),
    'saldos', coalesce((select jsonb_agg(s order by s.saldo desc) from chanchitos.v_saldos s), '[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(e order by e.fecha, e.id) from chanchitos.ciclo_eventos e), '[]'::jsonb),
    'pendientes', coalesce((select jsonb_agg(p order by coalesce(p.vence, date '9999-12-31'), p.id) from chanchitos.pendientes p), '[]'::jsonb),
    'capas', coalesce((select jsonb_agg(c order by c.bloque, c.monto desc) from chanchitos.v_capas c), '[]'::jsonb),
    'ultimo_resumen', coalesce((select jsonb_agg(u order by u.total desc) from chanchitos.v_ultimo_resumen u), '[]'::jsonb),
    'movimientos', coalesce((
      select jsonb_agg(m order by m.fecha desc, m.id desc)
      from chanchitos.v_movimientos m, chanchitos.v_ciclo c
      where m.fecha >= c.ini or (m.sentido = 'consumo_tarjeta' and m.resumen_cierre >= c.ini - 40)
    ), '[]'::jsonb)
  ) into resultado;

  return resultado;
end;
$$;

revoke all on function public.chanchitos_tablero() from public, anon;
grant execute on function public.chanchitos_tablero() to authenticated;
comment on function public.chanchitos_tablero() is 'Datos de la página ChanchitOS. Solo cuentas con rol en app.users.';
