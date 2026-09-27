# Vestigia

Los rastros de cada día en casa: check-ins de hábitos, paseos, caca y comida de Mocka y Honey, tareas y agenda compartida. Registra datos reales desde el **domingo 27 de septiembre de 2026**.

🌐 **Web:** https://solasantiago.github.io/vestigia/
📄 [Documento funcional](docs/documento-funcional.md) · 🗺️ [Versiones](docs/versiones.md) · 🥣 [Alimento](docs/alimento.md)

La prueba de concepto con datos de ejemplo vive aparte, en [tracker_demo](https://github.com/solasantiago/tracker_demo).

## Versión actual: v0.1, el iPad de la casa

- Una sola cuenta, **Casa**, con la sesión abierta en el iPad.
- **Hoy**, pensado para el iPad horizontal, en tres columnas:
  - **Mica y Santi**, cada uno con sus check-ins. Las pastillas en dos tomas se pueden marcar de a una, y la que falta vuelve a aparecer a la noche. Santi tiene además una rutina opcional para dormir, que aparece desde las 18 h.
  - **Mocka y Honey:** salidas cortas y paseos largos contra la meta del día (4 salidas, 2 largas), caca, **+1 tarritos**, **+1 premio** y la bolsa de alimento.
  - **Agenda compartida.**
- **Perros, Hábitos y Agenda y casa:** métricas que se llenan desde el primer día.
- **Registro de la casa:** botones opcionales para anotar lo que se hizo. Sin pendientes, atrasos ni metas.
- Antes de anotar una salida, una carga o un premio, se toca **quién** lo hizo. Se borra solo a los 5 minutos.
- Ánimo, sueño, pantalla y análisis quedan para las próximas versiones.

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

Cada push a `main` compila y publica en GitHub Pages (`.github/workflows/pages.yml`).

| Carpeta | Contenido |
|---|---|
| `src/lib/` | Sesión (`auth.jsx`), datos y tiempo real (`data.jsx`), cálculos (`metrics.js`), fechas en hora de Buenos Aires (`dates.js`). |
| `src/views/` | Una vista por sección. |
| `src/components/` | Gráficos en SVG, huellas y rastros (`prints.jsx`), login. |
| `src/config.js` | Conexión, versión y qué partes están encendidas en esta versión. |
| `supabase/migrations/` | Esquema y permisos. |
