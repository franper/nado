# Nado

PWA de planes de natación. Local-first: sin cuentas, sin servidor, sin analítica.
Los datos del usuario no salen de su móvil. Eso es una decisión de producto, no un
detalle técnico: cualquier cambio que la rompa hay que discutirlo antes.

En vivo: https://franper.github.io/nado/ · Repo: franper/nado

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm test         # vitest, 18 tests. Debe estar verde antes de cualquier push
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
src/content/exercises.ts   20 ejercicios bilingües. El activo real del producto
src/content/templates.ts   9 plantillas de sesión + RECIPES (plantillas por objetivo)
src/domain/generator.ts    escala, sustituye material y reescribe a la piscina
src/domain/metrics.ts      kcal por MET, ritmos derivados del test de 400 m
src/domain/storage.ts      localStorage clave 'nado', con DATA_VERSION y migrate()
src/domain/types.ts        modelo de datos
src/ui/                    App (error boundary + pestañas), componentes y pantallas
```

**No hay generador combinatorio.** Hay plantillas escritas a mano y el generador las
filtra por nivel, sustituye el material que falte siguiendo la cadena de `fallbacks`,
escala el volumen por nivel/minutos/semana y reescribe las series para que encajen en
la piscina (12×25 → 6×50 en piscina de 50 m; no divide, rehace). Añadir bloques libres
producía sesiones incoherentes; no volver a esa idea.

**Separación de datos, por orden de intocabilidad:**
`logs` (sagrado, nunca se regenera) > `overrides` (ediciones del usuario) >
`plan` (regenerable) > `config`. `sessionsForWeek()` aplica los overrides sobre lo
generado. Los logs guardan nombre/minutos/kcal, no ids de ejercicio, así que borrar
un ejercicio no los rompe — pero sí rompería un override que lo contenga.

**Reglas que no se negocian:**
- Las palas quedan bloqueadas por debajo de nivel `medio` (`PADDLES_MIN_LEVEL`), por
  riesgo de hombro. La app lo explica en el onboarding.
- La patada vertical exige un punto de agarre inmediato y se dice en su texto.
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

**Pendiente: test de integridad de contenido** (~30 líneas) que valide que todo id de
`RECIPES` existe, que todo `exerciseId` y `fallback` de *todas* las plantillas existe
(usadas o no), que no hay plantillas ni ejercicios huérfanos y que ningún texto está
vacío. Cierra los dos agujeros de arriba.

**Agujero de calidad medido:** nadie comprueba que la sesión quepa en el tiempo elegido.
Con ritmos realistas por nivel, muchas sesiones ocupan el 56–69% del tiempo que el
usuario eligió (quien pide 60 min recibe ~40). Va en la dirección segura, pero antes de
poner un test de duración hay que ajustar `LEVEL_FACTOR` o el volumen de las plantillas.

**Huecos de contenido conocidos:** `t-seco` es un único bloque fijo de 15 min sin
progresión, y es justo la sesión que sostiene el objetivo "tono"; todo es crol (nada de
braza ni estilos); el ritmo objetivo exige nivel `medio`, así que el principiante no
recibe referencia de velocidad; 9 plantillas hacen que el ciclo 3 se parezca al 1; y el
plan no reacciona a cómo fue la sesión, solo al número de semana y al nivel.

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

## Pendiente de implementar

1. **"Hoy no puedo"**: recortar la sesión a 25–30 min en un toque. Estaba en el diseño
   aprobado y sigue sin hacerse. Es lo que salva el día en que llegas tarde.
2. **Re-test al cerrar el ciclo**: la semana 8 baja el volumen a 0,8 pero no pide repetir
   el test de 400 m, así que el ritmo objetivo se queda congelado para siempre.
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
