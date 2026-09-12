# Nado

PWA de planes de natación. Local-first: sin cuentas, sin servidor, sin analítica.
Los datos del usuario no salen de su móvil. Eso es una decisión de producto, no un
detalle técnico: cualquier cambio que la rompa hay que discutirlo antes.

En vivo: https://franper.github.io/nado/ · Repo: franper/nado

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm test         # vitest, 64 tests. Debe estar verde antes de cualquier push
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
src/content/exercises.ts   27 ejercicios bilingües. El activo real del producto
src/content/templates.ts   11 plantillas de sesión + RECIPES (plantillas por objetivo)
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
"tono"; `rendimiento/basico` no tiene ningún trabajo de ritmo (`ritmo-objetivo` exige
nivel `medio` y además tiene `reps: 8` fijo, así que sus metros nunca escalan hacia
abajo — el gateo es correcto, el texto de `GOAL_COPY` ya lo avisa con el badge "nivel
medio" y con el texto actual); y el ciclo 2 es idéntico al 1 (mismas plantillas, mismo
arranque de volumen) — el plan no reacciona a cómo fue la sesión, solo al número de
semana y al nivel.

**Dos agujeros sistémicos medidos, sin arreglar** (misma familia que el de abajo, pero
no son de `GOAL_COPY` — son del generador):
- **Los metros por repetición nunca escalan con el nivel cuando `reps > 1`** (solo
  escalan las repeticiones, `buildOneBlock`). Medido en piscina de 25 m, nivel `inicio`
  (`continuous: 'lt50'`, no aguanta 50 m seguidos): `t-base` da `crol-medio 4×75` (75 m
  seguidos), `t-tecnica` da `bilateral 3×50`, `t-continuo` da `pull-brazos 4×50` —
  repeticiones por encima de la distancia continua que define ese nivel, en los 5
  objetivos. Es el mismo fallo que el de las plantillas gateadas, en dirección
  contraria: aquí no falta intensidad, sobra distancia por tramo.
- **En piscina de 50 m, `fitToPool` dobla toda repetición de 25 m — a cualquier
  nivel.** A nivel `inicio` produce `crol-medio 3×100`, `espalda-tecnica 2×50`,
  `braza-tecnica 2×50`. `exactMetres` no lo evita (solo salta `fitToWall`, no
  `fitToPool`); haría falta un flag tipo `maxRepMetres` en `BlockSpec`. `t-arranque`
  (nuevo, ver más abajo) lo resuelve solo en el texto de `fuerte-controlado`
  (instrucción de nadar fuerte hasta la mitad y volver suave); el resto del catálogo
  sigue con este agujero.
- `t-cadera` sin aletas y sin tabla se queda en 3 bloques (calentamiento + `crol-medio`
  + calma) — ya pasaba en `basico` y ahora, al bajar `t-cadera` a nivel `inicio`,
  también afecta a `tono/inicio` con ese material.
- `tono/inicio` con 2-3 días pierde el bloque en seco en la semana 1, porque `t-seco`
  cae en el índice 0 del pool filtrado y el test de esa semana lo sobrescribe. Es 1
  semana de 8 y no se tocó el orden de la receta de `tono` para arreglarlo: cualquier
  reordenación que lo evite cambia los pools de `basico+`, que es justo lo que este
  cambio garantiza que no pasa (ver test "el pool de cada objetivo/nivel es el
  esperado" en `generator.test.ts`).
- En piscina de 50 m y 30 min, `t-arranque` suma ~900 m — no cabe en el tiempo elegido.
  Es el agujero de "nadie comprueba que la sesión quepa" que ya está documentado arriba
  (56-69 %); `t-arranque` no lo empeora ni lo mejora, hereda el mismo `LEVEL_FACTOR`.

**Ya resueltos** (estaban aquí como "pendiente, no es un arreglo de una tarde" y se
hicieron):
- ***`grasa` y `rendimiento` sin ninguna sesión de intensidad a nivel `inicio`.*** Medido:
  antes, `grasa/inicio` y `rendimiento/inicio` generaban el plan **idéntico** —
  `[t-base, t-continuo, t-estilos]`, mismas kcal, mismos metros— que alguien que hubiera
  elegido "ganar fondo", contradiciendo lo que el propio onboarding promete
  (`GOAL_COPY`: "más intervalos", "series por ritmos"). Causa: `t-intervalos` y
  `t-fuerza-agua` exigen `minLevel: 'basico'`, y a nivel `inicio` `pickTemplates` las
  filtra **enteras** de la receta, no las suaviza. Arreglo: plantilla nueva `t-arranque`
  (rampa, `maxLevel: 'inicio'`, se retira sola en `basico`) con dos ejercicios nuevos —
  `fuerte-controlado` (series de 25 m a esfuerzo fuerte-controlado, con regla explícita
  de parar si la técnica se rompe; nunca sprints al máximo) y `brazadas-contadas`
  (referencia de ritmo por conteo de brazadas, sin depender de un test de 400). Nivel
  mínimo `inicio` en los dos: el gateo por seguridad de `t-intervalos`/`t-fuerza-agua`
  seguía correcto (sprint al máximo y tirón resistido no son para quien no controla la
  técnica de crol), lo que faltaba era el peldaño de abajo, no bajar el gateo existente.
  `RECIPES` de `grasa` y `rendimiento` llevan `t-arranque` en la 3ª posición a propósito
  (queda en el índice 1 del pool filtrado a nivel inicio: entra con 2 días, nunca en el
  índice 0 que la semana 1 sobrescribe con el test).
- ***`tono/inicio` con más sesiones en seco que en el agua.*** Medido: antes, el pool
  filtrado a nivel `inicio` era `[t-seco, t-base, t-seco]` — dos sesiones en seco por
  una sola en el agua, 1050 m y 726 kcal a la semana (la mitad que cualquier otro
  objetivo), contradiciendo el propio `GOAL_COPY` ("brazos y cadera en el agua, más un
  bloque en seco"). Causa: `t-cadera` exigía `minLevel: 'basico'`, heredado de sus
  ejercicios (`ondulacion`, `patada-vertical`), no una decisión propia de la plantilla —
  los dos ejercicios ya degradan solos por su propio `minLevel`. Arreglo: `t-cadera`
  baja a `minLevel: 'inicio'`. De propina, se invirtió el orden de los `fallbacks` de
  `patada-espalda` dentro de `t-cadera` (antes coincidía con los de `ondulacion` y, a
  nivel inicio sin aletas, los dos bloques caían en el mismo ejercicio de repuesto).
- *Un estilo por semana enseña poco* → `t-estilos` (`templates.ts`) ya no rota una sola
  posición entre 5-6 candidatos (una vez cada mes y medio). Ahora tiene **dos bloques
  garantizados** (espalda y braza, siempre los dos) más uno opcional de nivel avanzado
  que cae a `crol-medio` si no aplica. Lo que rota semana a semana es el énfasis dentro
  de cada estilo (técnica ↔ continuo), no si aparece o no.
- *El nivel no acredita mariposa* → `mariposa-tecnica` ya no depende de
  `minLevel: avanzado` (medía forma física en crol, no si conoces el estilo). Ahora
  exige `Exercise.requiresMariposaConfirmed` + `Config.knowsMariposa`, una pregunta
  aparte y explícita (paso 4 del onboarding, y también en Ajustes para quien ya pasó
  por el onboarding antes de este cambio). El nivel sigue poniendo un suelo (`basico`),
  pero ya no es el único criterio.
- `Config.knowsMariposa` es opcional (`?: boolean`) precisamente para que un documento
  guardado sin este campo (usuarios de antes de este cambio) siga funcionando sin
  migración — se lee como `false` por defecto, igual que `TestResult.metres`.

## Actualización en el móvil

**Hecho** (era "problema activo"): `registerType: 'autoUpdate'` (`vite.config.ts`), con
`registerSW()` en `App.tsx` — al detectar una versión nueva se activa sola y recarga,
sin banner ni botón. Se comprueba al volver del segundo plano (`visibilitychange`, el
momento que más importa: es cuando alguien reabre una PWA instalada días después) y,
de propina, cada hora si se queda en primer plano. El número de versión (de
`package.json`, inyectado por `define: { __APP_VERSION__ }` en `vite.config.ts`) se ve
al final de Ajustes — sube ese número antes de cada release que quieras identificar así.

Antes tenía `registerType: 'prompt'` sin que nadie llamara a `updateSW()`: el service
worker nuevo se quedaba esperando para siempre. Y aunque se hubiera llamado, un banner
manual de "hay actualización" es poco fiable en una PWA añadida a la pantalla de inicio
en iOS — de ahí la decisión de ir a `autoUpdate` directamente en vez de arreglar el
banner. **Cuando haya usuarios ajenos** (no solo los 1-2 de confianza actuales), sí
merece la pena volver a `prompt` con su propio aviso, porque un recargado sin avisar en
mitad de una sesión de otro usuario es peor experiencia que unos segundos de banner.

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

1. **"Hoy no puedo" — hecho.** `trimSession()` en `generator.ts` recorta la sesión de
   hoy a menos tiempo y/o resuelve sin el material que hoy no tienes, reutilizando
   `buildOneBlock` (la misma pieza que la generación semanal, factorizada para esto). A
   diferencia de la generación normal, aquí sí escalan los bloques `fixed`
   (calentamiento, vuelta a la calma) — no hay minutos que perder en un tamaño fijo
   cuando el tiempo ya es poco. El enlace vive bajo cada sesión de piscina en `Today.tsx`
   (`TrimSheet`), y "Usar esta versión" llama a `saveOverride()` — el mecanismo de
   overrides que ya existía y no tenía interfaz (ver punto 3, ahora parcialmente hecho).
2. **Re-test al cerrar el ciclo**: la semana 8 baja el volumen a 0,8 y el ciclo nuevo
   vuelve a proponer el test en su semana 1 (`t-test`), y si el usuario lo repite ahora
   ve en Progreso cómo cambió su ritmo frente al ciclo anterior (`paceCompareText` en
   `Progress.tsx`, con el margen de error dicho explícitamente). Lo que sigue faltando:
   nada avisa proactivamente de que toca repetir el test si el usuario no entra solo, y
   nada ajusta el nivel ni el volumen automáticamente a partir del resultado — se decidió
   así a propósito: `config.level` es una puerta de seguridad (palas, plantillas), no una
   puntuación de forma física, y automatizarlo con el proxy actual (metros continuos en
   crol) es arriesgado. Antes de tocarlo, ver el hueco de "nivel" más arriba.
3. **Editor manual de sesiones**: `saveOverride`/`sessionsForWeek` ya tienen un primer
   consumidor real (el "Hoy no puedo" del punto 1), pero solo para recortar tiempo/
   material — sigue sin existir una interfaz para editar un bloque suelto a mano
   (cambiar una distancia, quitar un ejercicio concreto sin más contexto).
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
