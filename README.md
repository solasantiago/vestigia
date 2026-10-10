# Vestigia

Los rastros de cada día en casa: check-ins de hábitos, paseos, caca y comida de Mocka y Honey, tareas y agenda compartida. Registra datos reales desde el **domingo 27 de septiembre de 2026**.

🌐 **Web:** https://solasantiago.github.io/vestigia/
📄 [Documento funcional](docs/documento-funcional.md) · 🗺️ [Versiones](docs/versiones.md) · 💡 [Ideas pendientes](docs/ideas.md) · 🥣 [Alimento](docs/alimento.md)

La prueba de concepto con datos de ejemplo vive aparte, en [tracker_demo](https://github.com/solasantiago/tracker_demo).

## Versión actual: v0.1.8, el tablero del iPad (y el iPhone)

Una sola cuenta, **Casa**, con la sesión abierta en el iPad (pensado para el iPad horizontal, 1080 × 810).

**Cuando nadie lo usa, un resumen a pantalla completa**, con letra grande y sin botones, que rota cada 12 segundos:

1. **Estado del día:** las pastillas de Mica y Santi y las perras (salidas, última salida y próxima sugerida, pis y caca de cada una), cada cosa con su semáforo.
2. **Mocka y Honey:** la línea del día de 8 a 2 con cada salida y el pis y la caca de cada una.
3. **Agenda:** hoy y los próximos 3 días.
4. **La semana:** días completos y rachas.

Si algo está en rojo, se queda en el estado del día con una franja roja arriba.

**Semáforo**, siempre con ícono y texto: 🟢 al día (fijo) · ⚪ todavía no toca · 🟡 atención (titila) · 🔴 urgente (titila).

**Al tocar el resumen:** "¿Quién está usando el iPad?" (Mica, Santi o Solo miro) y después el kiosco. Vuelve solo al resumen a los 5 minutos sin tocar, o 1 minuto después de guardar algo; al volver se olvida quién era y se descarta lo que no se guardó.

**Hoy**, sin scroll, en tres columnas:

- **Mica y Santi:** las pastillas en un toque, con "Hoy no" para cerrar una toma que no se va a tomar. La rutina opcional para dormir aparece desde las 18 h, plegada en un botón.
- **Mocka y Honey:** botones grandes para salida corta, paseo largo, +1 tarritos y +1 premio, y la lista de salidas del día (la última se puede deshacer durante 10 minutos). Salen siempre las dos: por cada una se marca pis y caca (lo que no se toca queda como "no") y, si hace falta, "algo raro".
- **Tratamientos** (por ejemplo, un colirio): cuando toca una aplicación aparece con el botón "Aplicado ✓"; recordatorio 15 min antes, naranja a los 30 min de atraso y rojo a los 90. La planilla completa queda en la pestaña Perros.
- **Ciclo** (opcional, se configura en la base): fase y día del ciclo arriba de la agenda, con "¿Te vino? Hoy / Ayer" solo cuando corresponde. Sin semáforo; se oculta en modo visitas.
- **Agenda** de hoy y los próximos días.

**Además:**

- **El día de la casa termina a las 5:00:** una salida a la 1 cuenta para el día anterior. Entre las 0 y las 5, la pantalla lo avisa.
- **Modo noche (de 1 a 7):** pantalla tenue con el reloj. Si falta algo, titila hasta que se anote o se toque "Entendido".
- **Modo visitas:** el resumen no muestra las pastillas. Se apaga solo al terminar el día.
- **Perras:** bolsa de alimento, gráficos e historial. La bolsa que ya estaba empezada al arrancar no se usa para calcular; Vestigia aprende el consumo desde la primera bolsa nueva.
- **Hábitos y Agenda y casa:** métricas que se llenan desde el primer día y registro opcional de la casa, sin pendientes, atrasos ni metas.
- Ánimo, sueño, pantalla y análisis quedan para las próximas versiones.

### Reglas del semáforo de las perras

Las salidas se miden de 8 a 2. Fuera de ese horario nada titila.

| Qué | 🟡 Atención | 🔴 Urgente |
|---|---|---|
| Primera salida (la meta es antes de las 10) | A las 9, si no salieron | A las 11, si no salieron |
| Próxima salida (por ritmo, para llegar a las 4 antes de las 2) | Cuando llega la hora sugerida | 1 h 30 min después |
| Paseo largo (1 por día, desde el 30/9; antes eran 2) | Ninguno a las 19 | Ninguno a las 23 |
| Caca de cada una | 18 h sin | 24 h sin |
| Pis de cada una (horas de 8 a 2) | 6 h sin | — |

**Pastillas**

| Qué | Se pregunta | 🟡 Atención | 🔴 Urgente |
|---|---|---|---|
| Mica (2 tomas) | Desde que empieza el día | A las 12 si no tomó ninguna | A las 15 |
| Mica, la segunda toma | Desde las 21 | A las 23 | — |
| Santi, mañana | Desde que empieza el día | A las 10 | A las 12 |
| Santi, segunda de la mañana (desde el 4/10) | Desde que empieza el día | A las 10 | A las 12 |
| Santi, noche (opcional desde el 3/10) | Desde las 00:00, sin insistir | Nunca | Nunca; no cuenta para el día completo ni las rachas |

Cada pastilla se muestra con el nombre que tenga cargado en la base y su horario sugerido ("antes de las 10"); el modo visitas las oculta del resumen. Los nombres de los medicamentos viven solo en la base: este repositorio es público y no los incluye.

Cada pastilla tiene su propio horario: desde cuándo se pregunta, cuándo pasa a atención y cuándo a urgente. Todo se ajusta desde la base, sin tocar el código: `household_settings.rules` (perras, tiempos del iPad y modo noche) y `habits.schedule` (cada hábito).

### En el iPhone

La misma web, con la cuenta Casa, agregada a la pantalla de inicio (Safari → Compartir → Agregar a inicio). Se detecta por el tamaño de la pantalla, así que el iPad no cambia.

- Abre directo en **Hoy**, sin resumen rotativo ni modo noche.
- La primera vez pregunta **"¿Quién sos?"** y el celular lo recuerda; se cambia tocando el nombre arriba. No vuelve solo a ningún lado.
- Las pastillas de quien usa el celular aparecen primero; la franja de urgente queda fija arriba con la barra.
- Los formularios se abren como hoja desde abajo.

## Seguridad

- Sin sesión no se ve nada. Una cuenta que no esté habilitada en la base tampoco ve nada.
- La clave pública de Supabase está en el código, como corresponde; lo que protege los datos son las políticas de la base (`supabase/migrations`).
- Para habilitar una cuenta nueva, se agrega a `app.users` desde el SQL editor:

```sql
insert into app.users (user_id, role)
select id, 'casa' from auth.users where email = 'MAIL_DE_LA_CUENTA';
```

## Crear la cuenta del iPad (una sola vez)

1. En Supabase, abrí el proyecto **vestigia** → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Poné el mail y una contraseña, y marcá **Auto Confirm User**.
3. En **Authentication** → **Sign In / Providers**, apagá **Allow new users to sign up**, así nadie más puede crear cuentas.
4. Avisá para habilitarla (el `insert` de arriba).

## Dejar el iPad como kiosco

1. Abrí la web en Safari, entrá con la cuenta Casa y tocá **Compartir → Agregar a inicio**. Abrí Vestigia desde el ícono nuevo: se ve a pantalla completa.
2. **Ajustes → Pantalla y brillo → Bloqueo automático → Nunca** (con el iPad enchufado). Como alternativa, en la app está **Mantener pantalla encendida**.
3. **Ajustes → Accesibilidad → Acceso guiado**: activalo y definí un código. Con Vestigia abierta, triple clic en el botón (superior o de inicio) → **Iniciar**. Así nadie sale de la app sin el código.
4. El tema **Auto** sigue al iPad: si programás el modo oscuro para la noche, Vestigia acompaña.

## Desarrollo

```bash
npm install
npm run dev
npm run build
```

Cada push a `main` compila y publica en GitHub Pages (`.github/workflows/pages.yml`). Cada versión publicada queda marcada con una rama `release/…`; para volver atrás, ver [Rollback](docs/rollback.md).

| Carpeta | Contenido |
|---|---|
| `src/lib/` | Sesión (`auth.jsx`), datos y tiempo real (`data.jsx`), cálculos (`metrics.js`), semáforo (`status.js`), resumen y kiosco (`kiosk.jsx`), fechas en hora de Buenos Aires con el día que cierra a las 5 (`dates.js`). |
| `src/views/` | Una vista por sección. |
| `src/components/` | Resumen del iPad (`Summary.jsx`), panel de las perras (`DogsPanel.jsx`), semáforo (`Semaforo.jsx`), gráficos en SVG, huellas y rastros (`prints.jsx`), login. |
| `src/config.js` | Conexión, versión y qué partes están encendidas en esta versión. |
| `supabase/migrations/` | Esquema y permisos. |
