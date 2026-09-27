# Tracker Hub: documento funcional (prueba de concepto)

| | |
|---|---|
| **Estado** | Borrador de la prueba de concepto (PoC) |
| **Fecha** | 25/09/2026 |
| **Usuarios** | Micaela (Mica) y Santiago (Santi) |
| **Perros** | Mocka y Honey |

---

## 1. Qué es Tracker Hub

Tracker Hub es una web app para la casa. Ayuda a seguir los hábitos y las tareas de todos los días: te pregunta cosas en el momento justo, guarda lo que respondés y te muestra cómo venís.

Cubre cuatro áreas:

1. **Hábitos personales:** pastillas, comidas, sueño, pasos, rutinas.
2. **Estado de ánimo:** cómo te sentís durante el día y qué influye.
3. **Perros:** paseos, caca, comida y salud de Mocka y Honey.
4. **Agenda:** un calendario propio de la app con turnos, fechas importantes y compromisos.

La app no es para gestionar proyectos de la facultad (LUMEN va por separado). Acá se sigue **el día y las actividades necesarias**.

### Idea central

> La app **pregunta** y el usuario **responde con un toque**.
> Lo que se puede medir solo (pasos, sueño) no se pregunta.
> Lo que ya respondió alguien no se vuelve a preguntar.

---

## 2. Objetivos de la PoC

- Comprobar que responder check-ins con uno o dos toques es sostenible en el día a día.
- Coordinar entre Mica y Santi el cuidado de Mocka y Honey sin repetir ni olvidar tareas.
- Tener en el iPad un tablero de la casa que recuerde las cosas sin tener que abrir nada.
- Juntar datos suficientes (hábitos, ánimo, sueño, paseos) para ver patrones simples.
- Validar que alcanza con **web app + notificaciones** y no hace falta una app nativa.

---

## 3. Usuarios y dispositivos

### 3.1 Quiénes usan la app

| Usuario | Descripción |
|---|---|
| **Mica** | Usuaria con cuenta propia. Tiene hábitos, ánimo y agenda personales, y comparte lo de la casa. |
| **Santi** | Usuario con cuenta propia. Igual que Mica. |
| **Casa (iPad)** | No es una persona: es el tablero compartido fijo en casa. Muestra solo lo compartido. |

Mocka y Honey no son usuarios. Son **perfiles** sobre los que se registran paseos, caca, comida y salud.

### 3.2 Desde dónde se usa

| Acceso | Quién | Para qué |
|---|---|---|
| **iPhone (PWA instalada en la pantalla de inicio)** | Mica y Santi, cada uno con su login | Entrada principal: check-ins, notificaciones, registrar paseos, cargar eventos, ver historial. |
| **iPad (web en modo kiosco)** | La casa | Tablero ambiente: perros, comida, agenda compartida del día y botones rápidos. |
| **Telegram (opcional)** | Chat individual y grupo "Casa" | Responder preguntas con botones sin abrir la app. |
| **Atajos de iPhone (automático)** | Cada uno, desde su iPhone | Enviar sueño y pasos del Apple Watch (vía Apple Salud) una vez por día. |

Todos los accesos usan la misma base de datos: lo que se registra en un lado aparece al instante en los demás.

---

## 4. Conceptos básicos

| Concepto | Qué significa |
|---|---|
| **Check-in** | Una pregunta que la app hace en un momento del día, por ejemplo "¿Tomaste las pastillas?". |
| **Respuesta rápida** | Las opciones de un check-in: **Sí / Todavía no / Hoy no aplica**. |
| **Hábito** | Algo que se quiere sostener en el tiempo. Tiene meta, racha y porcentaje de cumplimiento. |
| **Registro** | Cualquier dato guardado: un paseo, una caca, un refill, un ánimo, una respuesta. Siempre tiene hora y autor. |
| **Evento** | Algo en la agenda interna, por ejemplo un turno médico o un cumpleaños. |
| **Alerta** | Un aviso que la app genera sola, por ejemplo "Mocka no hizo caca desde ayer". |
| **Personal / Compartido** | Lo personal solo lo ve su dueño. Lo compartido lo ven Mica, Santi y el iPad. |
| **Franja** | Parte del día que agrupa preguntas: mañana, mediodía, tarde y noche. |

---

## 5. Funcionalidades

### 5.1 Check-ins y hábitos personales

**Qué hace el usuario**

- Recibe preguntas agrupadas por franja horaria, en una notificación o al abrir la app.
- Responde con un toque: **Sí**, **Todavía no** o **Hoy no aplica**.
- Configura sus propios hábitos: nombre, franja, días de la semana y meta.

**Ejemplos de preguntas por franja**

| Franja | Preguntas |
|---|---|
| Mañana | ¿Tomaste las pastillas? · ¿Desayunaste? · ¿Tomaste agua? |
| Mediodía | ¿Decidiste qué almorzar? · ¿Almorzaste? |
| Tarde | ¿Tomaste agua? · ¿Te moviste un rato? |
| Noche | ¿Tomaste las pastillas de la noche? · ¿Dejaste listo lo de mañana? |

**Reglas**

- "Todavía no" vuelve a preguntar más tarde, entre 30 y 60 minutos después (configurable). Si al final del día sigue sin respuesta, cuenta como no cumplido.
- "Hoy no aplica" no corta la racha.
- Si una pregunta ya se respondió desde otro dispositivo, desaparece de todos los demás.

**Lo que ve el usuario**

- Lista de check-ins pendientes de hoy.
- Por cada hábito: racha actual, mapa de calor semanal y porcentaje de cumplimiento del mes.

---

### 5.2 Estado de ánimo

**Qué hace el usuario**

Responde dos o tres preguntas cortas por día, en escala del 1 al 5:

| Momento | Preguntas |
|---|---|
| Mañana | ¿Cómo arrancás el día? · ¿Con cuánta energía? |
| Tarde | ¿Cómo viene el día? · ¿Nivel de estrés? |
| Noche | ¿Cómo estuvo el día en general? · ¿Qué fue lo mejor de hoy? (texto libre de una línea, opcional) |

Después de puntuar, puede marcar **etiquetas** con un toque (varias a la vez):

- **Cómo me siento:** tranquilo, contento, motivado, cansado, ansioso, irritable, triste.
- **Qué influyó:** sueño, trabajo, facu, salud, pareja, perros, social, clima.

**Lo que ve el usuario**

- Evolución del ánimo, la energía y el estrés por semana y por mes.
- Relaciones simples con otros datos, por ejemplo:
  - "Los días con menos de 6 h de sueño tu ánimo baja en promedio 1 punto."
  - "Los días con 2 paseos o más, tu estrés es menor."

**Reglas**

- El ánimo es **privado por defecto**. El otro usuario y el iPad no lo ven.
- Opcionalmente, cada uno puede compartir un estado simple con el otro (por ejemplo "día pesado 🌧"), sin detalles ni puntajes.
- Si el ánimo viene bajo varios días seguidos, la app muestra un mensaje cuidadoso que sugiere hablar con alguien de confianza. No es un diagnóstico, es solo un aviso.

---

### 5.3 Sueño y pasos (Apple Watch)

**Qué hace el usuario**

- La primera vez, instala un **Atajo de iPhone** que lee de Apple Salud las horas de sueño y los pasos del día anterior y los envía a la app.
- Deja una automatización diaria del Atajo, por ejemplo a las 9:00. Después no tiene que hacer nada más.

**Qué hace la app con esos datos**

- **Pasos:** el hábito "Meta de pasos" se marca solo al llegar a la meta. No se pregunta.
- **Sueño:** el check-in de la mañana lo usa como contexto, por ejemplo "Dormiste 5 h 40 min, ¿con cuánta energía arrancás?".
- **Recordatorio suave:** si a las 18:00 vas por debajo de un umbral (por ejemplo 3.000 pasos), sugiere una caminata. Si coincide con la hora de paseo, sugiere sacar a Mocka y Honey.

El Apple Watch se sincroniza con el iPhone, no con el iPad, así que el Atajo corre en el iPhone de cada uno.

---

### 5.4 Perros: Mocka y Honey

#### 5.4.1 Paseos

**Qué hace el usuario**

1. Toca **Salí a pasear**, en el celular o en el iPad.
2. Elige quién sale. Por defecto son los dos perros, y se puede desmarcar uno.
3. Al volver, toca **Volví**.
4. La app pregunta enseguida **"¿Hicieron caca?"**, con un botón por perro (ver 5.4.2).

**Lo que se registra:** perros, quién los sacó, hora de salida, hora de vuelta y duración.

**Si el usuario se olvida de tocar "Salí"**, puede cargar el paseo después con **Registrar paseo pasado** e indicar la hora aproximada.

**Lo que ve el usuario**

- Último paseo de cada perro y cuánto hace que salió.
- Contador diario y semanal por perro, contra una meta (por ejemplo, 3 paseos por día).

**Alertas**

- Si pasó demasiado tiempo sin paseo (por ejemplo 9 h, configurable): "Hace 9 h que no salen Mocka y Honey".
- Si hay turnos de paseo definidos (ver 5.8), la alerta le llega a quien le toca.

#### 5.4.2 Caca (y pis)

**Qué hace el usuario**

- Al volver de un paseo responde por cada perro: **Sí / No / Algo raro**.
- Si elige "Algo raro", marca qué pasó: blanda, con sangre, con moco, esfuerzo, u otra cosa con una nota.
- Opcionalmente registra si hizo pis.
- También puede registrar una caca fuera de un paseo, por ejemplo en el patio.

**Alertas**

- 24 h sin caca registrada: "Mocka no hizo caca desde ayer".
- Algo raro dos veces seguidas en el mismo perro: sugiere consultar al veterinario.

**Para qué sirve:** el historial por perro se puede mostrar en la consulta del veterinario, en lugar de tener que recordarlo de memoria.

#### 5.4.3 Comida

**Horarios de comida (check-in compartido)**

- A la hora de cada ración, la app pregunta "¿Les diste el desayuno?" o "¿Les diste la cena?".
- La primera persona que responde cierra la pregunta para los dos, con el mensaje "Ya les dio Santi a las 8:05". Así se evita que coman dos veces.

**Stock de alimento**

- Al comprar una bolsa, el usuario carga **Compré alimento** con los kilos.
- La app conoce la ración diaria de cada perro y calcula cuántos días quedan.
- Unos 5 días antes de que se termine avisa: **"Comprá alimento: queda para ~5 días"**.

**Refill del tarro**

- Cada vez que se llena el tarro, el usuario toca **Refill**.
- La app aprende cada cuánto se rellena y lo usa para ajustar la estimación de stock.

#### 5.4.4 Salud

- Vacunas, antipulgas, desparasitarios y turnos al veterinario se cargan como **eventos** de la agenda en la categoría Perros (ver 5.5), con recurrencia cuando corresponde (por ejemplo, antipulgas cada 30 días).
- El día anterior la app pregunta por la preparación: "¿Tenés la pipeta?", "¿Tenés la libreta de vacunas?".
- Cada perro tiene una ficha con sus datos básicos (peso, ración diaria, veterinario) y su historial.

---

### 5.5 Agenda interna

La app tiene un calendario propio. En esta etapa **no se sincroniza** con Google Calendar ni con iCloud.

**Qué hace el usuario**

- Carga un evento rápido desde el celular, por ejemplo: *1er parcial Análisis Matemático II · vie 25/9 · 19:00*.
- Ve su agenda: hoy, los próximos 7 días y una vista de mes.
- Edita, mueve o borra eventos.

**Datos de un evento**

| Campo | Ejemplo |
|---|---|
| Título | 1er parcial Análisis Matemático II |
| Fecha y hora | vie 25/9, 19:00 |
| Duración (opcional) | 2 h |
| Categoría | Facu · Salud · Perros · Social · Casa |
| Visibilidad | Personal (solo yo) o Compartido (Casa) |
| Recordatorios | 1 día antes, 1 hora antes (editables) |
| Repetición | Nunca, semanal, mensual, anual, cada N días |
| Notas | Texto libre |

**Preguntas según la categoría**

| Categoría | Qué pregunta la app |
|---|---|
| **Facu** | 3 días antes: "¿Cómo venís con el estudio?" · La noche anterior: "¿Tenés todo listo?" · Ese día: aviso unas horas antes. |
| **Salud** | El día anterior: "¿Tenés la orden y los estudios?" · Ese día: "¿A qué hora salís?" |
| **Social** (cumpleaños) | 3 días antes: "¿Compraste regalo?" · Ese día: "¿Mandaste mensaje?" |
| **Perros** | El día anterior: la preparación (pipeta, libreta, orden). |
| **Casa** | Recordatorio simple a la hora del evento. |

**Reglas**

- Los eventos compartidos se ven en los celulares de los dos y en el iPad.
- Los eventos personales solo los ve su dueño. En el iPad no aparecen.
- Los cumpleaños se cargan una vez con repetición anual.
- Los eventos se guardan en un formato compatible con calendarios estándar (iCalendar), para poder sincronizarlos en el futuro sin migrar datos.

---

### 5.6 Notificaciones

**Qué hace el usuario la primera vez**

1. Abre la app en Safari desde el iPhone.
2. La agrega a la pantalla de inicio con *Compartir → Agregar a inicio*. Es obligatorio para recibir notificaciones en iPhone (iOS 16.4 o superior).
3. Abre la app desde el ícono nuevo y toca **Activar notificaciones**.

**Cómo funcionan**

- La app manda un aviso por franja con las preguntas pendientes, no una notificación por pregunta.
- Tocar la notificación abre la app directamente en esas preguntas.
- Las alertas importantes (perros sin paseo, sin caca, alimento por terminarse) llegan aparte.
- Si se usa el bot de Telegram, las preguntas llegan con botones y se responden desde ahí.

---

### 5.7 Tablero del iPad (vista Casa)

El iPad queda fijo en casa con la app abierta en pantalla completa. No tiene login personal y **solo muestra información compartida**.

**Qué muestra**

- **Encabezado:** hora, fecha y próximo check-in compartido.
- **Tarjeta por perro (Mocka y Honey):** último paseo y con quién, si hizo caca hoy, si comió.
  - Ejemplo: *"Honey salió a las 8:10 con Santi · 💩 ✓ · Mocka no hizo caca desde ayer"*.
- **Comida:** "Queda alimento para ~6 días".
- **Agenda compartida:** eventos de hoy y de los próximos días.
- **Pendientes personales, sin detalle:** "Mica tiene 1 check-in pendiente".
- **Cierre del día (a la noche):** "Hoy: Mocka 2 paseos, Honey 2 · mañana: basura y cumpleaños de X".

**Botones rápidos**

- Salí a pasear / Volví.
- ¿Les diste la comida? · Refill.
- Cada acción pide un toque en **Mica** o **Santi** para saber quién la hizo.

---

### 5.8 Coordinación entre Mica y Santi

- **Todo registro compartido tiene autor.** La app muestra "Ya lo sacó Santi a las 8:00" y nadie repite ni se olvida.
- **Turnos de paseo (opcional):** por ejemplo, mañana Santi y noche Mica. Si a la hora límite no salió nadie, se avisa a quien le toca.
- **Estado compartido de ánimo (opcional):** ver 5.2.
- **Resumen semanal compartido:** paseos por perro, quién hizo qué, alertas de salud de los perros y eventos de la semana que viene.

---

### 5.9 Historial y resumen semanal

**Qué ve cada usuario en su celular**

- **Hoy:** pendientes, completados y ánimo del día.
- **Semana:** mapa de calor de hábitos, ánimo promedio, sueño y pasos.
- **Perros:** historial de paseos, caca y comida por perro, con filtro por fecha.

**Revisión del domingo**

La app manda un resumen y hace dos preguntas cortas:

- "¿Qué salió bien esta semana?"
- "¿Qué querés ajustar para la próxima?"

---

## 6. Recorridos de uso

### 6.1 Configuración inicial (una sola vez)

1. Mica y Santi crean su cuenta.
2. Crean la **Casa** y se unen los dos.
3. Cargan los perfiles de **Mocka** y **Honey**: peso, ración diaria y meta de paseos.
4. Cada uno elige sus **hábitos personales** y en qué franja van.
5. Cada uno instala la PWA en su iPhone y activa las notificaciones.
6. Cada uno instala el **Atajo de Salud** para sueño y pasos.
7. Se abre la vista **Casa** en el iPad y se deja fija.
8. Se cargan los eventos recurrentes: antipulgas, vacunas y cumpleaños.

### 6.2 Un día típico

| Hora | Qué pasa |
|---|---|
| 8:00 | El Atajo envía el sueño. Notificación a Mica: "Dormiste 6 h. ¿Cómo arrancás el día? ¿Energía?" Responde 3 y 3, etiqueta "cansada". |
| 8:05 | Santi toca **Salí a pasear** en el iPad → Santi. El iPad muestra "Mocka y Honey salieron con Santi". |
| 8:35 | Santi toca **Volví**. Responde "¿Hicieron caca?": Mocka ✓, Honey ✓. |
| 8:40 | "¿Les diste el desayuno?" Mica toca **Sí** en su celular. La pregunta desaparece para Santi. |
| 9:00 | Check-in de la mañana: "¿Tomaste las pastillas?" Santi toca **Todavía no**, y la app vuelve a preguntar a las 9:45. |
| 12:00 | "¿Decidiste qué almorzar?" |
| 16:00 | Aviso a Santi: "Hoy 19:00 · 1er parcial Análisis Matemático II". |
| 18:00 | Mica va por 2.500 pasos. La app sugiere: "¿Una vuelta con Mocka y Honey?" |
| 21:00 | Check-in de la noche: pastillas, "¿Cómo estuvo el día?", "¿Qué fue lo mejor de hoy?". |
| 22:00 | El iPad muestra el cierre del día. |

### 6.3 Cargar un evento

1. En el celular: **Agenda → +**.
2. Escribe el título, elige fecha y hora, categoría **Salud** y visibilidad **Personal**.
3. Deja los recordatorios por defecto y guarda.
4. El día anterior la app pregunta: "¿Tenés la orden y los estudios?"

### 6.4 Alerta de alimento

1. La app calcula que queda alimento para 5 días.
2. Les avisa a los dos: "Comprá alimento: queda para ~5 días". El aviso también aparece en el iPad.
3. Quien compra toca **Compré alimento** y carga 15 kg.
4. La estimación se reinicia y la alerta desaparece para los dos.

---

## 7. Privacidad

| Dato | Lo ve el dueño | Lo ve el otro usuario | Se ve en el iPad |
|---|---|---|---|
| Hábitos personales (pastillas, comidas) | ✓ | ✗ | Solo "N pendientes" |
| Ánimo, energía, estrés, notas | ✓ | Solo el estado simple, si se comparte | ✗ |
| Sueño y pasos | ✓ | ✗ | ✗ |
| Eventos personales | ✓ | ✗ | ✗ |
| Eventos compartidos | ✓ | ✓ | ✓ |
| Perros (paseos, caca, comida, salud) | ✓ | ✓ | ✓ |

---

## 8. Reglas para que la app no canse

- **Tope diario de preguntas** por usuario (configurable).
- **Preguntas agrupadas** por franja en un solo check-in.
- **No preguntar lo medible:** pasos y sueño vienen del Watch.
- **No repetir:** lo que ya respondió alguien desde otro dispositivo no se vuelve a preguntar.
- **Modos especiales:** *Día libre*, *Enfermo* y *Viaje* pausan o reducen las preguntas. En *Viaje* no se preguntan hábitos de la casa.

---

## 9. Fuera de alcance en esta PoC

- **Tags NFC:** descartados. Los paseos se registran con botones.
- **Google Calendar e iCloud:** se sincronizarán más adelante. Por ahora solo existe la agenda interna.
- **Proyecto LUMEN:** se gestiona en otro lado.
- **App nativa (iOS/Android):** se usa una web app instalable (PWA).
- **Diagnósticos o recomendaciones médicas:** la app registra y avisa, no diagnostica.

---

## 10. Propuestas para próximas iteraciones

| Propuesta | Qué haría el usuario |
|---|---|
| **Plan de comidas** | Armar almuerzos y cenas de la semana. El "¿decidiste qué almorzar?" muestra lo planeado. |
| **Lista de compras compartida** | Una sola lista para comida, alimento de perros y cosas de la casa. Las alertas agregan ítems solas. |
| **Stock de pastillas** | Cargar cuántas quedan. La app avisa unos días antes de que se terminen. |
| **Tareas de la casa** | Tareas recurrentes y rotativas (basura, ropa, limpieza, plantas) con a quién le toca. |
| **Rutinas de mañana y noche** | Checklist con hora objetivo para dormir y aviso de "empezá a bajar" 30 min antes. |
| **Sincronizar calendarios** | Conectar Google Calendar o iCloud de cada uno. |

---

## 11. Arquitectura de referencia (resumen)

| Pieza | Tecnología | Rol |
|---|---|---|
| Frontend | Web app (PWA) en **GitHub Pages** | Vista celular y vista iPad, con el mismo código. |
| Datos y login | **Supabase** (Postgres + Auth) | Registros, usuarios y reglas de privacidad por fila. |
| Tiempo real | Supabase Realtime | El iPad y los celulares se actualizan al instante. |
| Horarios | `pg_cron` en Supabase | Dispara check-ins, alertas y resúmenes. |
| Notificaciones | Web Push (VAPID) desde Edge Functions | Avisos al iPhone con la PWA instalada. |
| Bot (opcional) | Telegram Bot API + Edge Function | Preguntas con botones. |
| Salud | Atajos de iPhone → endpoint propio | Sueño y pasos diarios. |

Las claves privadas (VAPID, Telegram) viven solo en Supabase, nunca en el repositorio. El frontend usa solo la clave pública.

---

## 12. Preguntas abiertas

- ¿Qué hábitos personales arranca usando cada uno en la PoC?
- ¿Cuál es la meta de paseos por día y el límite de horas sin paseo para la alerta?
- ¿Cuál es la ración diaria de Mocka y de Honey?
- ¿Se usan turnos de paseo fijos o se coordina libremente?
- ¿Se incluye el bot de Telegram en la PoC o queda para después?
- ¿Cuántas preguntas por día como máximo?
