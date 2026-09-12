# Nado

PWA de planes de natación. Local-first: sin cuentas, sin servidor, sin analítica.
Los datos del usuario no salen de su móvil. Eso es una decisión de producto, no un
detalle técnico: cualquier cambio que la rompa hay que discutirlo antes.

En vivo: https://franper.github.io/nado/ · Repo: franper/nado

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm test         # vitest, 51 tests. Debe estar verde antes de cualquier push
npm run build    # tsc -b --noEmit && vite build
```

El workflow `.github/workflows/deploy.yml` corre `npm ci`, `npm test` y `npm run build`
con `BASE_PATH=/nado/`, y despliega a GitHub Pages. **Si los tests fallan no se publica
nada y el sitio en vivo se queda con la versión anterior.** Esa es la red de seguridad.
En Settings → Pages, Source tiene que ser "GitHub Actions", no "Deploy from a branch".

## Stack

Vite 6 + Preact 10 + TypeScript estricto (`noUncheckedIndexedAccess`,
`verbatimModuleSyntax`, `noUnusedLocals`) + `vite-plugin-pwa` + Vitest.
Sin librería de estilos: tokens CSS en `src/styles/tokens.css` y estilos en línea.

## Arquitectura

```
src/content/exercises.ts   25 ejercicios bilingües. El activo real del producto
src/content/templates.ts   10 plantillas de sesión + RECIPES (plantillas por objetivo)
src/domain/generator.ts    escala, sustituye material, reescribe a la piscina y a la pared
src/domain/metrics.ts      kcal por MET, ritmos derivados del test, % de cambio entre tests
src/domain/storage.ts      localStorage clave 'nado', con DATA_VERSION y migrate()
src/domain/types.ts        modelo de datos
src/ui/                    App (error boundary + pestañas), componentes y pantallas
```

**No hay generador combinatorio.** Hay plantillas escritas a mano y el generador las
filtra por nivel, sustituye el material que falte siguiendo la cadena de `fallbacks`,
escala el volumen por nivel/minutos/semana y reescribe las series para que encajen en
la piscina (12×25 → 6×50 en piscina de 50 m; no divide, rehace). Añadir bloques libres
producía sesiones incoherentes; no volver a esa idea.

Después de encajar en la piscina (`fitToPool`), `fitToWall` garantiza que cada bloque
nadado vuelve al lado donde empezó — donde el usuario deja el material y lee el
siguiente ejercicio. Añade como mucho una repetición o un largo de propina; nunca
resta. Dos excepciones: `BlockSpec.exactMetres` (el test de 400, que mide una distancia
exacta) y `Exercise.neverAmplify` (mariposa y ondulación: mejor que acaben alguna vez en
el lado contrario a que ganen volumen del estilo que más lesiona).

Algunos bloques rotan de ejercicio según la semana (`BlockSpec.styleRotation`, usado por
`t-estilos` para alternar espalda/braza/mariposa). El índice se calcula sobre la lista
completa y busca hacia delante el primer candidato que pase nivel y material — así
"semana N → estilo X" es estable aunque cambie el material disponible a mitad de ciclo.

**Separación de datos, por orden de intocabilidad:**
`logs` (sagrado, nunca se regenera) > `overrides` (ediciones del usuario) >
`plan` (regenerable) > `config`. `sessionsForWeek()` aplica los overrides sobre lo
generado. Los logs guardan nombre/minutos/kcal, no ids de ejercicio, así que borrar
un ejercicio no los rompe — pero sí rompería un override que lo contenga.

**Reglas que no se negocian:**
- Las palas quedan bloqueadas por debajo de nivel `medio` (`PADDLES_MIN_LEVEL`), por
  riesgo de hombro. La app lo explica en el onboarding, y en `t-fuerza-agua` van
  **antes** del bloque de tirón más duro de la sesión, con el hombro todavía fresco.
- La patada vertical exige un punto de agarre inmediato y nunca hacerla en solitario;
  se dice en su texto.
- Espalda avisa de que no ves hacia dónde vas (colisiones con la pared o con otro
  nadador). Braza avisa de la rodilla, su lesión más común. Mariposa avisa de hombro
  y lumbar, y sus bloques nunca ganan volumen extra por el ajuste de piscina
  (`Exercise.neverAmplify`) — mejor que acabe alguna vez en el lado contrario a que
  se prescriba más mariposa de la debida.
- Los textos de los ejercicios dicen la verdad aunque reste protagonismo al agua:
  la patada con tabla aporta poco en crol de fondo, y la tonificación la da el bloque
  en seco porque el agua no ofrece carga progresiva.
- Nada de enlaces de afiliación de material. Contradice el bloqueo de palas.

## Contenido: cómo tocarlo sin romper nada

Cada ejercicio lleva los dos idiomas en el mismo objeto (para que no se desincronicen)
y la misma estructura de texto: **Montaje / Ejecución / Error típico / Qué debes notar**.
Mantener esa estructura al añadir ejercicios.

Comprobado empíricamente:

| Cambio | ¿Lo detecta algo? |
|---|---|
| Editar textos, añadir un ejercicio nuevo | tsc |
| `exerciseId` mal escrito en una plantilla **en uso** | ✅ los tests fallan |
| Typo en un id dentro de `RECIPES` | ❌ **nada**. El objetivo pierde esa plantilla en silencio |
| Plantilla nueva con ejercicio inexistente, sin meter en `RECIPES` | ❌ **nada** hasta que la enchufes |
| Objetivo nuevo en el tipo `Goal` | tsc obliga a escribir su receta |

**Hecho: test de integridad de contenido** (`src/content/content.test.ts`). Valida que
todo id de `RECIPES` existe, que todo `exerciseId`, `fallback` y candidato de
`styleRotation` de *todas* las plantillas existe (usadas o no), que no hay plantillas ni
ejercicios huérfanos y que ningún texto está vacío. Escríbelo (o revísalo) **antes** de
tocar `RECIPES` — es el único sitio del contenido sin red de tipos.

**Agujero de calidad medido, todavía sin arreglar:** nadie comprueba que la sesión quepa
en el tiempo elegido. Con ritmos realistas por nivel, muchas sesiones ocupan el 56–69%
del tiempo que el usuario eligió (quien pide 60 min recibe ~40). Y `fitToWall` (arriba)
añade otro sesgo medido en la misma dirección: a igualdad de objetivo/nivel/minutos, una
sesión en piscina de 50 m puede pesar hasta un 30% más que la misma en piscina de 25 m,
porque cada largo de más cuesta el doble en distancia. Los dos apuntan al mismo sitio:
antes de tocar `LEVEL_FACTOR` o el volumen de las plantillas para arreglar uno, hay que
mirar los dos juntos, no por separado.

**Huecos de contenido conocidos:** `t-seco` es un único bloque fijo (declarado 25 min,
sin progresión de una semana a otra) y es justo la sesión que sostiene el objetivo
"tono"; el ritmo objetivo exige nivel `medio`, así que el principiante no recibe
referencia de velocidad; el ciclo 2 es idéntico al 1 (mismas plantillas, mismo arranque
de volumen) — `t-estilos` rota de estilo semana a semana dentro de un ciclo, pero esa
rotación también se repite igual en el ciclo siguiente; y el plan no reacciona a cómo
fue la sesión, solo al número de semana y al nivel. El nivel del usuario (`config.level`)
se deriva solo de metros continuos en crol y con eso se decide si desbloquea mariposa o
palas — es un proxy conservador para las palas, pero no acredita nada sobre si alguien
sabe nadar mariposa. Antes de automatizar cualquier subida de nivel, hace falta una
pregunta aparte sobre qué estilos conoce el usuario.

## Actualización en el móvil (problema activo)

`registerType: 'prompt'` pero **nadie llama a `updateSW()`**: no hay ningún
`import 'virtual:pwa-register'`. El `sw.js` solo ejecuta `skipWaiting()` al recibir un
mensaje `SKIP_WAITING` que nadie envía. Consecuencia: al publicar, el service worker
nuevo se queda esperando y la versión vieja sigue sirviendo hasta que se cierran todas
las ventanas del origen. En iOS hay que cerrar la app desde el selector y abrirla dos
veces. Es el mismo fallo que ocultó una caída de Pages en el proyecto dos-calles.

**Arreglo acordado:** pasar a `autoUpdate`, añadir el número de versión visible en
Ajustes y comprobar actualizaciones también al volver al primer plano
(`visibilitychange`). Cuando haya usuarios ajenos, volver a `prompt` **con** su aviso.

## Datos del usuario: riesgos reales

- Safari borra el almacenamiento de una web tras 7 días sin uso. WebKit indica que las
  apps añadidas a la pantalla de inicio tienen su propio contador y no se ven afectadas,
  así que "Añadir a pantalla de inicio" debe ser un paso del onboarding, no una
  sugerencia.
- `franper.github.io` es el mismo origen para todos los proyectos de GitHub Pages: Nado
  y dos-calles comparten `localStorage` con claves distintas. Borrar los datos del sitio
  se lleva los dos.
- El export/import JSON existe en Ajustes pero está enterrado. Antes de cambiar la forma
  de los datos, que cada usuario exporte una copia.
- Hay datos reales en uso (dos personas con sesiones registradas). Nada de cambios que
  puedan perderlos sin migración probada.
- `migrate()` (`storage.ts`) **no** rama por `DATA_VERSION`: hace un merge campo a campo
  contra `emptyData()`, así que un campo opcional nuevo (ej. `TestResult.metres`) no
  necesita subir la versión ni tocar `migrate()` — un documento viejo sin ese campo ya
  funciona, siempre que el código que lo lea use un valor por defecto (`?? 400`, aquí).
  Si el cambio no es opcional (cambia la forma de algo existente), eso sí exige escribir
  la cadena de migración por primera vez — hoy no existe, solo el comentario que dice
  dónde iría.

## Pendiente de implementar

1. **"Hoy no puedo"**: recortar la sesión a 25–30 min en un toque. Estaba en el diseño
   aprobado y sigue sin hacerse. Es lo que salva el día en que llegas tarde.
2. **Re-test al cerrar el ciclo**: la semana 8 baja el volumen a 0,8 y el ciclo nuevo
   vuelve a proponer el test en su semana 1 (`t-test`), y si el usuario lo repite ahora
   ve en Progreso cómo cambió su ritmo frente al ciclo anterior (`paceCompareText` en
   `Progress.tsx`, con el margen de error dicho explícitamente). Lo que sigue faltando:
   nada avisa proactivamente de que toca repetir el test si el usuario no entra solo, y
   nada ajusta el nivel ni el volumen automáticamente a partir del resultado — se decidió
   así a propósito: `config.level` es una puerta de seguridad (palas, plantillas), no una
   puntuación de forma física, y automatizarlo con el proxy actual (metros continuos en
   crol) es arriesgado. Antes de tocarlo, ver el hueco de "nivel" más arriba.
3. **Editor manual de sesiones**: `saveOverride` y `sessionsForWeek` ya existen; falta
   la interfaz.
4. **Vídeo real por ejercicio**: hoy el enlace abre una *búsqueda* de YouTube. Es la
   carencia más visible para un usuario que pague.
5. **Multiperfil**: dos personas compartiendo un juego de material sin coincidir en el
   mismo item a la vez. Es el origen del proyecto y lo único que ningún competidor tiene.
6. Gráfica de peso (`WeightLog` ya se guarda y no se muestra) y exportación a Garmin/FIT.

## Diagnóstico abierto

Se reportó que la app se quedaba en la última pantalla del plan tras el onboarding.
Nunca se reprodujo (20/20 combinaciones llegaban a "Hoy" en Chromium) y parte del
síntoma era que no existía navegación. Hay un error boundary que muestra mensaje y
traza en pantalla: si vuelve a pasar, pedir esa traza y el navegador exacto.

## Trampas de proceso

- Un push desde una sesión en la nube de Claude puede quedar bloqueado por el proxy de
  git si el repo no está en el conjunto autorizado de la sesión. `git fetch` sí funciona.
  Si ocurre, hacer el push desde el Mac.
- Antes de empaquetar o entregar cambios: `git fetch` y rebase sobre `origin/main`.
- No editar archivos en el editor web de GitHub mientras hay cambios en vuelo.
