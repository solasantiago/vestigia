# Versiones de Vestigia

Cada versión suma una sola cosa nueva, para acostumbrarse de a poco. Las próximas son una propuesta: se validan al arrancar cada una.

## v0.1 — El iPad de la casa ✅ (desde el 27/9/2026)

- Cuenta **Casa** con la sesión abierta en el iPad, en modo kiosco.
- Check-ins de los dos en el iPad, con pastillas en varias tomas y rutina opcional para dormir.
- Salidas cortas y paseos largos, caca, cargas de tarritos, premios y bolsa de alimento.
- Agenda compartida y registro opcional de la casa (sin pendientes ni atrasos).
- Métricas de perros y de hábitos.
- Sin ánimo: en una pantalla compartida deja de ser privado.

**Para pasar a la siguiente:** unas dos semanas registrando salidas y pastillas sin que se olviden.

Las ideas sueltas, con su costo y lo que ya se definió, están en [Ideas pendientes](ideas.md). Anotado para más adelante: ficha de cada perra (peso, veterinario), medir la ración (tazas por carga) y ajustar las reglas del semáforo desde la app.

## v0.1.1 — El tablero del iPad ✅ (27/9/2026)

- **Resumen a pantalla completa** cuando nadie usa el iPad: estado del día, línea del día de las perras, agenda y la semana, rotando cada 12 s. Con algo en rojo se queda en el estado con una franja roja.
- **Semáforo** con ícono, texto y color de fondo: verde fijo, naranja y rojo titilan.
- **¿Quién está usando el iPad?** al tocar; vuelve solo al resumen (5 min sin tocar, 1 min después de guardar) y se olvida quién era.
- **Kiosco sin scroll** en tres columnas (Mica y Santi · Mocka y Honey · Agenda); en vertical, dos columnas y la agenda abajo.
- **Salidas de las dos juntas** con pis, caca y "algo raro" por perra; la próxima salida se sugiere por ritmo para llegar a 4 antes de las 2.
- **El día cierra a las 5**, **modo noche** de 1 a 7 con "Entendido", y **modo visitas** que oculta las pastillas del resumen.
- La bolsa de alimento y el historial pasan a la pestaña Perros; la bolsa que ya estaba empezada no se usa para calcular.

## v0.1.2 — Un paseo largo por día ✅ (30/9/2026)

- La meta pasa a **1 paseo largo por día** (antes 2): atención a las 19 si no hubo ninguno, urgente a las 23.
- Los textos siguen a la meta de la casa ("las 4 salidas y el paseo largo").
- Al anotar un paseo largo, la escalera arranca destildada.

## v0.1.3 — Tratamientos de las perras ✅ (2/10/2026)

- **Tratamientos con horario** (el colirio de Mocka): cada aplicación programada aparece en el kiosco con un botón "Aplicado ✓" cuando toca, y se puede anotar adelantada o marcar "No se aplicó".
- Semáforo: recordatorio 15 minutos antes, naranja a los 30 minutos de atraso, rojo a los 90. Si llega la siguiente aplicación, la anterior se da por pasada.
- En el resumen se ve en el mosaico de la perra; en la pestaña Perros queda la planilla completa (programada, aplicada, quién).
- Nueva categoría de eventos: Trabajo.
- Por ahora los tratamientos se cargan desde la base (no hay pantalla para crearlos).

## v0.1.4 — Pastillas opcionales ✅ (3/10/2026)

- La pastilla de la noche de Santi pasa a ser **opcional**: se puede anotar, pero no insiste, no aparece en "Falta registrar" de la noche y no cuenta para el día completo ni las rachas.
- Cualquier hábito se puede marcar como opcional desde la base (`habits.schedule.optional`).

## v0.1.5 — Una pastilla más a la mañana ✅ (4/10/2026)

- Santi suma una pastilla diaria a la mañana desde el 5/10, con los mismos horarios que la otra (naranja a las 10, rojo a las 12).
- Un hábito nuevo no se muestra ni cuenta para los días anteriores a su inicio.

## v0.1.6 — Cada pastilla con su nombre y horario ✅ (5/10/2026)

- Las pastillas se muestran con el nombre cargado en la base y el horario sugerido ("antes de las 10", "desde las 00:00"); los horarios del semáforo no cambian.
- Las opcionales tienen un solo botón chico ("La tomé ✓").
- Los nombres de los medicamentos se cargan solo en la base, no en el repositorio.

## v0.1.7 — También en el iPhone ✅ (10/10/2026)

- En un teléfono la app abre directo en Hoy: sin resumen rotativo, sin modo noche y sin volver sola al resumen.
- "¿Quién sos?" se elige una vez y el celular lo recuerda; sus pastillas aparecen primero.
- Barra compacta con la franja de urgente fija; formularios como hoja desde abajo.
- El iPad no cambia: se comprobó comparando capturas antes y después, píxel por píxel.

## v0.1.8 — Ciclo ✅ (10/10/2026)

- Arriba de la agenda: la fase (menstruación, folicular, ovulación, lútea) y el día del ciclo, con la ovulación estimada o la ventana del próximo período.
- "¿Te vino? Hoy / Ayer" aparece solo antes de la primera marca y desde 26 días después de la última. Se puede deshacer durante 10 minutos.
- Sin semáforo ni avisos; se oculta en modo visitas. La configuración y las fechas viven solo en la base.

## v0.1.9 — Peso ✅ (20/10/2026)

- Tarjeta **⚖️ Peso** en la columna de la agenda, para quien tenga al menos una pesada cargada: el último peso en kg con un decimal, cuándo fue y la diferencia con la pesada anterior.
- **"+ Pesada"** abre un cuadro con el último peso para ajustar con − / + (de a 100 g) o escribirlo; se guarda con la hora de ahora y muestra las últimas 5 pesadas. Se puede deshacer durante 10 minutos.
- Sin semáforo ni avisos; se oculta en modo visitas. Los valores viven solo en la base.

## v0.1.10 — Ejercicio ✅ (21/10/2026)

- Tarjeta **🏃 Ejercicio** debajo del peso, para quien tenga entrenamientos cargados: la última sesión (duración, distancia, cuándo, pulso promedio y esfuerzo) y cuántas van en la semana.
- **Solo lectura:** los entrenamientos se cargan desde el chat con las capturas de la app Fitness del Apple Watch; la app no tiene botón para cargarlos. Se guardan también el pulso máximo, las calorías y los minutos en cada zona.
- Sin semáforo ni avisos; se oculta en modo visitas. Los valores viven solo en la base. Que lleguen solos desde el Watch queda en [Ideas pendientes](ideas.md#9--ejercicio-automático-desde-el-apple-watch).

## v0.1.11 — Detalle del ejercicio ✅ (21/10/2026)

- La tarjeta de ejercicio suma una barra con el tiempo en cada zona de pulso y el total de la semana (sesiones, tiempo y km).
- **"Ver detalle"** abre todo lo que traen las capturas de Fitness: duración, distancia, ritmo, pulso promedio y máximo, calorías, esfuerzo, clima, zonas con tiempo y porcentaje, tramos por km, recuperación al minuto y la nota. Abajo, el historial de sesiones: tocando una se ve su detalle.
- Sigue siendo solo lectura: todo se carga desde el chat.

## v0.1.12 — Sin registro de la casa ✅ (21/10/2026)

- Se quita el **registro de la casa** (no se usaba): la pestaña pasa a llamarse **Agenda**. Lo anotado sigue guardado en la base.
- En las opciones, **"Actualizar la app"** recarga la versión más nueva sin tener que cerrar la app.

## v0.1.13 — Comidas y tarjeta de salud ✅ (22/10/2026)

- **Comidas:** se cargan desde el chat con fotos (no se guardan las fotos) y la app solo las muestra. Cada comida queda con hora, qué fue, porciones, calorías, proteína, carbohidratos y grasas estimados, porciones de verdura y fruta, si es ultraprocesada y una sugerencia para la próxima. Las cantidades son estimaciones por foto (±20–30 %).
- **Tarjeta "Salud de …"** en la columna de la agenda: junta peso, ejercicio y comidas en una sola tarjeta para que la agenda siga entrando en el iPad. Comidas muestra las calorías del día, verdura y fruta (referencia 3 y 2 por día), proteína y la última sugerencia; "Ver" abre cada comida con sus porciones y el historial por día.
- Sin semáforo ni avisos; se oculta en modo visitas. Los valores viven solo en la base.

## v0.1.14 — Medidas y tablero de comidas ✅ (22/10/2026)

- **Medidas del cuerpo** (cintura, cadera, pecho, brazo y muslo, en cm): se cargan desde el chat cada 2 a 4 semanas. En la tarjeta de salud, la cintura con la diferencia contra la medición anterior; "Ver" muestra el cambio desde el inicio y el historial.
- **Tablero de comidas** al tocar "Ver":
  - una **lectura en palabras** del día y de la semana (qué viene bien, qué falta y qué es lo que más se desvía);
  - el **balance del día** contra la referencia, con la banda de rango: proteína 1,2–1,6 g por kg del último peso, verdura 3 y fruta 2 porciones, ultraprocesados hasta 1, grasas 20–35 % y carbohidratos 45–65 % de las calorías;
  - la **semana en una grilla**: ✓ en rango, ↓ abajo, ↑ arriba; hoy cuenta como "en curso" hasta que termina el día.
- Son referencias generales para orientarse, no un plan: sin meta de calorías.

## v0.1.15 — Objetivo de peso y umbral de calorías ✅ (22/10/2026)

- **Objetivos por persona** (se cargan desde el chat): peso objetivo, franja diaria de calorías para bajar de peso, piso de calorías y altura. Los valores viven solo en la base.
- **Peso:** cuánto falta para el objetivo, el ritmo (kg por semana, con la recta de las pesadas de las últimas 4 semanas) y el mes estimado de llegada. En "+ Pesada", una barra de progreso desde la primera pesada y el promedio de los últimos 7 días.
- **Comidas:** las calorías del día contra el tope ("≈ 485 / 2.200 kcal"), una barra con la franja en el tablero y una fila más en la grilla de la semana. La lectura en palabras dice cuántas calorías quedan hasta el tope. "Muy bajo" solo se marca con 3 comidas o más cargadas, para no confundir un día a medio cargar.
- **Medidas:** la referencia de cintura (menos de la mitad de la altura).

## v0.1.16 — Dosis en el mapa de hábitos ✅ (26/10/2026)

- Si una pastilla cambió de dosis, en su mapa de **Hábitos** cada día hecho se pinta con el color de la dosis de ese día, con una leyenda debajo ("… · desde el …"). La tarjeta muestra también la dosis actual.
- Los cambios de dosis se cargan desde el chat (en el horario del hábito, solo en la base).

## v0.2 — Cada uno en su celular (propuesta)

- Cuentas de Mica y de Santi, con la privacidad de la §7 del documento funcional.
- Ánimo privado y vista "Hoy" personal en el celular; en el iPad, solo "N pendientes".
- Pantalla para crear, editar y pausar hábitos.
- **Novedades en esta versión:** un aviso al abrir la app que cuenta qué cambió.

## v0.3 — Mirar hacia atrás (propuesta)

- Carga manual de sueño y pasos.
- Se habilita Análisis (correlaciones) con semanas de historia.
- Resumen del domingo en la app.
- Copia de seguridad semanal.

## v0.4 — La app pregunta (propuesta)

- Notificaciones por franja y alertas (requiere agregar la web a la pantalla de inicio en iPhone).
- Turnos de paseo opcionales.

## v0.5 — Datos automáticos (propuesta)

- Atajo de iPhone que manda sueño y pasos desde Apple Salud.
- Tiempo de pantalla: carga manual semanal o afuera (Apple no lo expone a Atajos ni a webs).

## v1.0 — Cierre de la beta (propuesta)

- Lo que pida el uso: Telegram, modos viaje y enfermo, stock de pastillas, sincronizar calendarios, exportar el historial para el veterinario.
