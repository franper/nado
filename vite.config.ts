import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// El repositorio se sirve en https://<usuario>.github.io/nado/
const BASE = process.env.BASE_PATH ?? '/nado/'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
) as { version: string }

export default defineConfig({
  base: BASE,
  define: {
    // Visible en Ajustes, para poder confirmar qué versión está desplegada
    // sin tener que ir a GitHub. Sube el número en package.json antes de
    // cada release que quieras poder identificar así.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    preact(),
    VitePWA({
      // 'autoUpdate' en vez de 'prompt': en apps añadidas a la pantalla de
      // inicio en iOS, el aviso manual de actualización no es fiable (ver
      // CLAUDE.md, "Actualización en el móvil"). Con solo un par de
      // usuarios de confianza, un recargado automático al detectar versión
      // nueva es aceptable — volver a 'prompt' con su propio aviso cuando
      // haya usuarios ajenos que no esperen un recargado sin avisar.
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Nado',
        short_name: 'Nado',
        description: 'Tu plan de piscina, según tu objetivo, tu material y tu piscina.',
        lang: 'es',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F1F3F4',
        theme_color: '#0D6E78',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
  },
} as never)
