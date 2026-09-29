# Ideas pendientes

Ideas sueltas para Vestigia, con su costo, de qué dependen y qué quedó definido. **Nada de esto es para ya:** se anota, se charla y se decide después. Cuando una idea se decide para implementar, pasa a un issue de GitHub y acá se marca su estado.

- **Costo:** bajo (algo como la pantalla "La semana" de la v0.1.1), medio, o alto (como la v0.1 y la v0.1.1 juntas).
- **Delicado:** toca datos ya guardados, permisos, privacidad o las reglas del semáforo; se prueba con más cuidado.
- **Estado:** 💡 idea · ✅ decidida · 🎫 en GitHub · 🚀 hecha.

Última revisión: 28/9/2026.

## Resumen

| # | Idea | Costo | Delicado | Depende de | Estado |
|---|---|---|---|---|---|
| 1 | [Clima de hoy y 2 días, con animaciones](#1--clima) | Bajo | No | — | 💡 |
| 1b | [Clima cruzado con las perras](#1b--clima-cruzado-con-las-perras) | Bajo | No | 1 | 💡 |
| 2 | [Marquesina tipo noticiero](#2--marquesina-tipo-noticiero) | Bajo | No | Mejor junto con 1 | 💡 |
| 3 | [Varios hogares](#3--varios-hogares) | Alto | Sí | Junto con las cuentas personales (v0.2) | 💡 |
| 4 | [Notificaciones en iPhone y iPad](#4--notificaciones-en-iphone-y-ipad) | Medio | Poco | Cuentas personales · sincronizar dispositivos | 💡 |
| 5 | [Quién está en casa](#5--quién-está-en-casa) | Medio | Privacidad | Sincronizar dispositivos | 💡 |
| 6 | [Estado de ánimo](#6--estado-de-ánimo) | Bajo a medio | Privacidad | — | 💡 |
| 7 | [Ambientes: producción, testing y POC](#7--ambientes-producción-testing-y-poc) | Medio | Sí (base de producción) | — | 💡 |

## Orden sugerido

```
 Sin dependencias             Cuentas personales (v0.2)     Sincronizar dispositivos
 (cuando quieran)        →    + varios hogares         →    (después de las cuentas)
 1 · Clima                    3 · Varios hogares            4 · Notificaciones
 1b · Clima y perras                                         5 · Quién está en casa
 2 · Marquesina
 6 · Ánimo en el iPad (C)
```

Las ideas de costo bajo se pueden hacer en cualquier momento. Como las familias van a usar iPad **y** celulares, varios hogares y las cuentas personales conviene hacerlos juntos, para no rehacer las cuentas dos veces. Notificaciones y quién está en casa necesitan que cada iPhone esté configurado y cada persona tenga su cuenta.

---

## 1 · Clima

Una quinta pantalla del carrusel con hoy, mañana y pasado. Costo bajo; no toca la base de datos ni las reglas del semáforo.

- **Datos:** [Open-Meteo](https://open-meteo.com/), gratis, sin cuenta ni clave, consultado directo desde la web. Se actualiza cada hora; si se corta internet muestra el último pronóstico con su hora ("actualizado a las 14:00").
- **Pantalla:** máxima, mínima, probabilidad de lluvia y un dibujo del estado para cada día. La vuelta completa del carrusel pasa de 48 a 60 segundos.
- **Animaciones:** lluvia, llovizna, tormenta con relámpagos, nublado, sol, niebla y viento. Dibujadas (no videos), livianas para el iPad 9. Los ~30 códigos del pronóstico se agrupan en esos 7 u 8 escenarios.
- **Cuidados:** en modo noche no se anima; con algo en rojo el resumen sigue fijo en el estado del día; si no hay pronóstico, la pantalla se saltea sola.

**Definido:**

- Zona: **CABA**.
- La animación sigue el **pronóstico del día**: si llueve en algún momento del día, la pantalla de ese día muestra lluvia.

## 1b · Clima cruzado con las perras

Sugerencias a partir del pronóstico hora por hora. Costo bajo si se hace junto con el clima.

- **Paseo largo:** "Llueve desde las 17: conviene el paseo largo antes".
- **Próxima salida:** si la hora sugerida cae en lluvia, sugerir adelantarla ("mejor salir antes de las 15").
- **Estado del día:** una línea "Llueve 17–20 h" en el mosaico de Salidas.
- **Calor:** con más de 30 °C, sugerir los paseos largos temprano o de noche (el asfalto les quema las patas).

**Definido:**

- **Son solo sugerencias:** la lluvia no afloja los tiempos ni cambia los colores del semáforo.

## 2 · Marquesina tipo noticiero

Una franja fina abajo del resumen, en el lugar de "Tocá la pantalla para anotar", que corre de derecha a izquierda por encima de todas las pantallas del carrusel. Costo bajo; más barata junto con el clima porque usa los mismos datos.

- **Contenido:** lo lindo e informativo del día, por ejemplo "Llueve 17–20 h", "Próxima salida 18:40", "Mañana 19:00 · 1er Parcial CDD", "3 días seguidos con las 4 salidas", "Tarritos cargados 15:10".
- **Lo urgente no va ahí:** sigue en la franja roja fija de arriba, que se lee de un vistazo.
- **Cuidados:** lenta y con letra grande (se afina viéndola en el iPad); sin pastillas en modo visitas; quieta en modo noche y con "Reducir movimiento" activado, donde rota frases de a una.

## 3 · Varios hogares

Que cada hogar tenga sus familiares y sus mascotas, y que se pueda ir agregando y configurando. Viable, pero es lo más costoso y delicado de la lista: un error de permisos dejaría que una familia vea los datos de otra, incluidas las pastillas.

- **A favor:** las reglas del semáforo y los horarios de cada pastilla ya se guardan en la base, así que cada hogar puede tener los suyos sin tocar código.
- **Base de datos:** cada dato pasa a saber de qué hogar es y los permisos pasan a "solo ves lo de tu hogar". Lo ya cargado queda como hogar 1, sin perder nada.
- **Código:** hay 83 menciones fijas a Mica, Santi, Mocka, Honey o "las perras" en 10 archivos; nombres y colores tienen que salir de la configuración. El resumen y el kiosco hoy asumen 2 personas y 2 perras: hay que rediseñarlos para cantidades variables.
- **Mascotas:** todo lo actual (salidas, paseos largos, pis y caca) es de perros.

| Etapa | Qué | Costo |
|---|---|---|
| A | Varios hogares en la base con permisos separados; nombres y colores desde la configuración | Medio, delicado |
| B | Pantallas para configurar familiares, mascotas, pastillas y reglas | Medio |
| C | Registro propio de cada familia e invitaciones | Medio |

**Definido:**

- Probarían **3 a 5 familias** al principio.
- **Cada familia configura lo suyo** → hacen falta las pantallas de configuración (etapa B).
- **Registro propio:** cada familia se registra e invita a los suyos → hace falta la etapa C. Para que las familias prueben, entonces, van las tres etapas.
- Lo usarían con **iPad y celulares** → va junto con las cuentas personales de la v0.2.
- **Solo perros** por ahora.

## 4 · Notificaciones en iPhone y iPad

Avisos en todos los dispositivos, **solo iOS y iPadOS** para simplificar. Safari los soporta desde iOS/iPadOS 16.4. Costo medio.

- **Condiciones de Apple:** solo desde el ícono en la pantalla de inicio ("Agregar a inicio"); el permiso se pide con un toque en cada dispositivo; toda notificación se ve (no hay avisos silenciosos); los modos de concentración pueden frenarlas.
- **Lo que hay que construir:** un servicio en Supabase que cada pocos minutos calcule el semáforo y mande el aviso (hoy ese cálculo solo corre en la pantalla del iPad), y una tabla con qué dispositivo quiere qué avisos.
- **Lo delicado es no molestar:** un aviso por cambio de color, no cada 5 minutos; respetar la noche; un tope diario.
- **A quién:** a cada uno lo suyo ("Falta la pastilla de la mañana" solo a quien corresponde; "Hace 5 h que no salen" a los dos). Por eso va con o después de las cuentas personales.
- Estaban previstas para la v0.4 ("La app pregunta").

**Abierto:**

- [ ] Si el Acceso guiado del iPad tapa los avisos: desactivarlo o dejar el iPad solo con la franja en pantalla. Se prueba antes de prometerlo.

## 5 · Quién está en casa

Registrar cuándo sale y vuelve cada uno para entender por qué se atrasó una salida: **"no se podía"** (no había nadie) o **"se nos pasó"** (alguien estaba). Costo medio. Se hace junto con la sincronización de dispositivos, con el atajo de Apple Salud previsto para la v0.5.

- **Cómo (propuesta):** un Atajo de iPhone que avisa solo al salir y al llegar a casa, con botones "Salgo" y "Volví" en el iPad para corregir.
- **Qué se guarda:** solo "salió a las 14:20" y "volvió a las 19:05"; nunca coordenadas ni recorridos.
- **Análisis:** cada atraso que llegó al rojo se clasifica según si había alguien. En la pestaña Perros: "Este mes: 6 atrasos · 4 no se podía · 2 se nos pasó", con tono amable.
- **En vivo:** "Nadie en casa desde las 14:20" en el resumen; con notificaciones, "Nadie en casa y hace 4 h que no salen".
- **Hoy ya se puede:** abrir Vestigia en el celular con la cuenta Casa para ver desde afuera si comieron y cuándo salieron.

**Definido:**

- Cuenta como "afuera" **desde 2 horas**.
- **El semáforo no cambia** si no hay nadie: solo se muestra el contexto.

**Abierto:**

- [ ] Registro automático, manual o los dos (propuesta: los dos).
- [ ] Que los dos estén de acuerdo en registrarlo.

## 6 · Estado de ánimo

La pantalla y la tabla ya existen y están apagadas (`FEATURES.mood`). Quedó fuera de la v0.1 por privacidad, no por costo: el iPad es una pantalla compartida. Hoy la pantalla pregunta ánimo del 1 al 5, energía o estrés, "cómo me siento", "qué influyó" y, a la noche, lo mejor del día.

| Opción | Cómo | Privacidad |
|---|---|---|
| A | Cada uno en su celular, con su cuenta (v0.2) | Real |
| B | En el iPad al elegir quién sos; se guarda y no se muestra en ninguna pantalla del iPad | A medias |
| C | Como B, pero cada uno elige si el otro puede ver su ánimo | Decidida por cada uno |

**Definido:**

- **Opción C:** se anota en el iPad y cada uno elige si el otro lo ve. Cuando lleguen las cuentas personales, el historial y los gráficos pasan también al celular de cada uno.
- **Una vez por día, a la noche.**
- **Recordatorio suave** en el kiosco a la noche: gris, sin titilar, nunca en rojo.

**Abierto:**

- [ ] Que los dos estén de acuerdo en registrarlo y en qué comparte cada uno.

## 7 · Ambientes: producción, testing y POC

Tres versiones de la app, todas a partir del código de Vestigia (la prueba de concepto vieja, `tracker_demo`, quedó desactualizada). Costo medio para armarlo; después, cada idea se programa una sola vez.

| Ambiente | Para qué | Código | Datos | Dirección (propuesta) |
|---|---|---|---|---|
| Producción | La casa, el iPad de todos los días | Rama `main` | Base real (proyecto vestigia) | `/vestigia/` |
| Testing | La próxima versión, hasta probarla bien | Rama `next` | Segundo proyecto de Supabase, con datos de prueba | `/vestigia/test/` |
| POC | Todas las ideas funcionando, sin conectarse a los dispositivos | Rama `next`, todo prendido | Sin base: 3 meses ficticios generados en el navegador, relativos a hoy | `/vestigia/demo/` |

- **Recorrido de una idea:** se programa con su interruptor → se ve en la POC → se decide → se prende en testing → se prueba → pasa a `main`.
- **POC sin base:** entra en el cupo gratis de Supabase (2 proyectos), cada visitante tiene su copia con un botón para volver a empezar, no se pausa por inactividad. Notificaciones y "quién está en casa" se simulan en pantalla; un selector permite ver cada animación del clima.
- **Testing:** vacía el segundo proyecto de Supabase (hoy con los datos de la demo vieja) y necesita su propia cuenta Casa.
- **Cambios de base:** primero en testing, después en producción, con una copia de seguridad antes ([rollback](rollback.md)).
- **Cuidado:** las tres direcciones comparten dominio; hay que separar lo que cada una guarda en el navegador (sesión, tema, visitas).
- **Mejora propuesta:** llevar al repo las pruebas automáticas usadas para la v0.1.1 (capturas en tamaño iPad y flujos) y correrlas en cada cambio de `next`.

**Por ahora:** los cambios se aplican directo en producción, con etiquetas por versión y copia de la base para poder volver atrás ([rollback](rollback.md)).

**Abierto:**

- [ ] Direcciones de testing y POC (subcarpetas de `/vestigia/` u otro repositorio).
- [ ] Confirmar vaciar el segundo proyecto de Supabase para testing.
- [ ] Si se suman las pruebas automáticas.
- [ ] Qué pasa con `tracker_demo`: archivar con aviso o borrar.
