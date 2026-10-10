# Volver a una versión anterior (rollback)

Producción es una sola: https://solasantiago.github.io/vestigia/ con la base del proyecto **vestigia** en Supabase. Para volver atrás hay tres piezas: el **código**, la **base** y el **iPad**.

## Versiones marcadas

Cada versión publicada queda marcada con una rama `release/…` que no se toca más, para saber exactamente a qué volver. Esas ramas no se publican: GitHub Pages solo publica `main`.

| Rama | Commit | Qué es | ¿Funciona con la base actual? |
|---|---|---|---|
| `release/v0.1` | `f44bb34` | El iPad de la casa (kiosco original) | ✅ Sí, probado el 29/9/2026 |
| `release/v0.1.1` | `9af0729` | Tablero del iPad: resumen, semáforo, kiosco en 3 columnas (incluye la escalera destildada) | ✅ Sí (con la meta de 1 paseo largo muestra "Los 1, antes de las 23") |
| `release/v0.1.2` | `f091b1c` | Un paseo largo por día | ✅ Sí (no muestra los tratamientos ni el ícono de Trabajo) |
| `release/v0.1.3` | `6196700` | Tratamientos de las perras (colirio) y categoría Trabajo | ✅ Sí (la pastilla de la noche vuelve a contar para el día completo, sin insistir) |
| `release/v0.1.4` | `4b27b83` | Pastilla de la noche opcional | ⚠️ Con la pastilla nueva, los días anteriores al 5/10 dejan de verse completos para Santi; al volver a esta versión conviene desactivar ese hábito |
| `release/v0.1.5` | `cb5c1f9` | Pastilla nueva de la mañana; hábitos nuevos no cuentan hacia atrás | ✅ Sí (muestra el nombre, sin el horario sugerido) |
| `release/v0.1.6` | `ca4d9ad` | Pastillas con nombre y horario sugerido | ✅ Sí |
| `release/v0.1.7` | `8d1f3f0` | Modo iPhone (el iPad igual que la v0.1.6) | ✅ Es la de hoy |

Al publicar una versión nueva se crea su rama: `git push origin main:refs/heads/release/v0.2`.

## 1. Código

Volver atrás **no reescribe la historia**: se agrega un commit nuevo que deja la app como estaba en esa versión, y GitHub Pages la publica sola en ~1 minuto.

```bash
# Volver toda la app a una versión (deja los documentos como están)
git fetch origin release/v0.1
git checkout FETCH_HEAD -- src index.html public package.json
git commit -m "Rollback a v0.1"
git push origin main

# Deshacer un solo cambio puntual
git revert <commit>
git push origin main
```

Para volver a avanzar después, lo mismo con la rama nueva (`git fetch origin release/v0.1.1` y `git checkout FETCH_HEAD -- src index.html public package.json`).

Verificar que la publicación terminó bien en la pestaña **Actions** del repositorio.

## 2. Base de datos

**Regla:** los cambios de base se hacen de forma que la versión anterior siga funcionando (agregar columnas y tablas, no borrarlas ni renombrarlas). Así, volver atrás el código alcanza.

- **v0.1.2 → v0.1.1:** volver la meta a 2 paseos largos si se quiere: `update public.household_settings set long_walks_goal = 2;`
- **v0.1.1 → v0.1:** no hay que tocar la base. Si alguna vez se quiere borrar lo que agregó la v0.1.1, está en [`supabase/rollback/v0.1.1_down.sql`](../supabase/rollback/v0.1.1_down.sql) — borra datos, no hace falta.
- **Antes de cualquier cambio delicado en la base,** tomar una copia desde el SQL editor de Supabase:

```sql
select backup.snapshot('antes_v0_2', 'antes de migrar a la v0.2');
```

La copia queda dentro de la misma base, en el esquema `backup` (no se ve desde la app ni desde la API). Para ver las copias:

```sql
select label, taken_at, note, tables from backup.snapshots order by taken_at desc;
```

Para recuperar datos de una copia, por ejemplo las salidas:

```sql
-- mirar primero qué hay
select * from backup."v0_1_1_20260929__walks";
-- recuperar una fila borrada por error
insert into public.walks select * from backup."v0_1_1_20260929__walks" where id = 123;
```

Recuperar una tabla entera pisa lo que se anotó después de la copia: se decide caso por caso.

**Copias tomadas:**

| Etiqueta | Fecha | Motivo |
|---|---|---|
| `v0_1_1_20260929` | 29/9/2026 | Estado de producción con la v0.1.1 |

## 3. iPad

Después de publicar, cerrar Vestigia (deslizar hacia arriba desde el selector de apps) y volver a abrirla desde el ícono. Si sigue mostrando la versión anterior, esperar un par de minutos y repetir: GitHub Pages tarda un poco en actualizar.

La versión que está corriendo se ve en el menú **⋯** del kiosco.
