# ChanchitOS

Página aparte para seguir el sueldo del mes: cuánto queda, a dónde fue y qué falta pagar. Vive en el mismo sitio que Vestigia pero **la app no la enlaza**.

🔗 **Link:** https://solasantiago.github.io/vestigia/chanchitos/

## Qué muestra

- **Cifras:** disponible en las cuentas (y por día hasta el próximo cobro), cuánto salió del sueldo, cuánto se fue en pagar tarjetas de crédito y los pendientes.
- **Ciclo de sueldo:** del cobro (4.º día hábil) al día anterior al siguiente, con vencimientos y cierres.
- **¿A dónde fue el sueldo?** En tres capas: bloque (Necesidades, Gustos, Finanzas), rubro y detalle. El interruptor *Separar gastos con tarjeta de crédito* junta en un bloque lo que el sueldo pagó de resúmenes de tarjeta.
- **Pendientes**, **último resumen de tarjeta por categoría** y **movimientos** con filtro por medio y búsqueda.

## Acceso y datos

- Mismo login y misma sesión que Vestigia: cualquier cuenta habilitada en `app.users` puede verla.
- Lee todo con una sola llamada a `public.chanchitos_tablero()` (security definer), que rechaza cuentas sin rol. El esquema `chanchitos` sigue cerrado a `anon` y `authenticated`, así que la clave pública no alcanza para leer nada.
- Los datos se cargan desde el chat con Claude. Las cuentas (saldos, capas, ciclo) viven en vistas SQL (`chanchitos.v_*`), las mismas que usa el tablero de Claude.
- Migraciones: `20261107000000_chanchitos_esquema.sql` (estructura) y `20261109001500_chanchitos_tablero.sql` (vistas y función).
