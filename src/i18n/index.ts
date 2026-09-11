import type { Lang } from '../domain/types'

/**
 * Diccionario propio, sin librería. Dos idiomas desde el principio para que
 * añadir un tercero sea copiar un archivo, no reescribir la app.
 *
 * El catálogo de ejercicios NO vive aquí: va dentro de cada ejercicio, en
 * `content/exercises.ts`, para que las dos versiones no se puedan desincronizar
 * sin que salte a la vista.
 */

export const STRINGS = {
  es: {
    appName: 'Nado',
    tagline: 'Tu plan de piscina hecho a tu medida: según tu objetivo, el material que tengas y la piscina donde nades.',
    free: 'Gratis y sin cuenta',
    offline: 'Funciona sin cobertura',
    private: 'Tus datos no salen del móvil',
    createPlan: 'Crear mi plan',
    restore: 'Restaurar una copia de seguridad',
    disclaimer:
      'Orientación general de entrenamiento, no consejo médico. Si tienes una lesión o una condición de salud, consulta antes con un profesional.',
    tabToday: 'Hoy',
    tabPlan: 'Plan',
    tabProgress: 'Progreso',
    tabSettings: 'Ajustes',
    rest: 'Descanso',
    estimatedBurn: 'Gasto estimado',
    logSession: 'Registrar sesión',
    logged: 'Registrada · toca para deshacer',
    minutes: 'Minutos',
    effort: 'Esfuerzo',
    effortEasy: 'Suave',
    effortNormal: 'Normal',
    effortHard: 'Fuerte',
    weekOf: 'Semana {n} de {total}',
    noEquipment: 'sin material',
  },
  en: {
    appName: 'Nado',
    tagline: 'A pool plan built around you: your goal, the kit you own and the pool you swim in.',
    free: 'Free, no account',
    offline: 'Works with no signal',
    private: 'Your data never leaves your phone',
    createPlan: 'Build my plan',
    restore: 'Restore a backup',
    disclaimer:
      'General training guidance, not medical advice. If you have an injury or a health condition, check with a professional first.',
    tabToday: 'Today',
    tabPlan: 'Plan',
    tabProgress: 'Progress',
    tabSettings: 'Settings',
    rest: 'Rest day',
    estimatedBurn: 'Estimated burn',
    logSession: 'Log session',
    logged: 'Logged · tap to undo',
    minutes: 'Minutes',
    effort: 'Effort',
    effortEasy: 'Easy',
    effortNormal: 'Normal',
    effortHard: 'Hard',
    weekOf: 'Week {n} of {total}',
    noEquipment: 'no equipment',
  },
} as const

export type StringKey = keyof (typeof STRINGS)['es']

export function t(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  let s: string = STRINGS[lang][key]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', String(v))
  }
  return s
}

export function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'es'
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es'
}
