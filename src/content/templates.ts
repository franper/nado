import type { BlockIntensity, Goal, Intensity, LevelId, SessionKind } from '../domain/types'

/**
 * Plantillas de sesión.
 *
 * No hay un generador que combine bloques libremente: eso produce sesiones
 * incoherentes. Hay un catálogo de plantillas escritas a mano y el generador
 * las filtra, sustituye el material que falte y las escala al tiempo y al
 * nivel. Las plantillas están medidas para 60 minutos y nivel medio.
 */

export interface BlockSpec {
  exerciseId: string
  /** Alternativas si falta el material, en orden de preferencia. */
  fallbacks?: string[]
  reps: number
  /** Metros por repetición. 0 si el bloque va por tiempo. */
  metres: number
  seconds?: number
  restSeconds: number
  intensity: BlockIntensity
  /** Si no escala, mantiene su tamaño aunque la sesión se acorte. */
  fixed?: boolean
  /**
   * La distancia es la medida en sí (ej. el test de 400 m): nunca se ajusta
   * para volver al lado de salida de la piscina, aunque salga impar.
   */
  exactMetres?: boolean
  /**
   * Alternativas entre las que el generador rota según la semana del ciclo,
   * en vez de resolver siempre `exerciseId`. Se filtran primero por nivel y
   * material disponibles (igual que `fallbacks`) y solo se rota entre las
   * que sobrevivan, para que nunca quede un hueco en la sesión.
   */
  styleRotation?: string[]
}

export interface SessionTemplate {
  id: string
  nameEs: string
  nameEn: string
  kind: SessionKind
  intensity: Intensity
  minLevel: LevelId
  blocks: BlockSpec[]
}

const b = (s: BlockSpec): BlockSpec => s

export const TEMPLATES: SessionTemplate[] = [
  {
    id: 't-base',
    nameEs: 'Base aeróbica',
    nameEn: 'Aerobic base',
    kind: 'piscina',
    intensity: 'moderada',
    minLevel: 'inicio',
    blocks: [
      b({ exerciseId: 'calentamiento', reps: 1, metres: 300, restSeconds: 0, intensity: 'suave', fixed: true }),
      b({ exerciseId: 'deslizamiento', fallbacks: ['bilateral'], reps: 4, metres: 25, restSeconds: 20, intensity: 'suave' }),
      b({ exerciseId: 'seis-seis', fallbacks: ['bilateral'], reps: 4, metres: 25, restSeconds: 20, intensity: 'suave' }),
      b({ exerciseId: 'crol-medio', reps: 6, metres: 75, restSeconds: 30, intensity: 'medio' }),
      b({ exerciseId: 'patada-costado', fallbacks: ['patada-tabla'], reps: 6, metres: 25, restSeconds: 20, intensity: 'medio' }),
      b({ exerciseId: 'calma', reps: 1, metres: 150, restSeconds: 0, intensity: 'suave', fixed: true }),
    ],
  },
  {
    id: 't-tecnica',
    nameEs: 'Técnica y sensaciones',
    nameEn: 'Technique and feel',
    kind: 'piscina',
    intensity: 'suave',
    minLevel: 'inicio',
    blocks: [
      b({ exerciseId: 'calentamiento', reps: 1, metres: 250, restSeconds: 0, intensity: 'suave', fixed: true }),
      b({ exerciseId: 'deslizamiento', fallbacks: ['bilateral'], reps: 6, metres: 25, restSeconds: 20, intensity: 'suave' }),
      b({ exerciseId: 'seis-seis', fallbacks: ['bilateral'], reps: 6, metres: 25, restSeconds: 20, intensity: 'suave' }),
      b({ exerciseId: 'bilateral', reps: 4, metres: 50, restSeconds: 25, intensity: 'suave' }),
      b({ exerciseId: 'pull-brazos', fallbacks: ['crol-medio'], reps: 4, metres: 50, restSeconds: 30, intensity: 'medio' }),
      b({ exerciseId: 'calma', reps: 1, metres: 150, restSeconds: 0, intensity: 'suave', fixed: true }),
    ],
  },
  {
    id: 't-intervalos',
    nameEs: 'Series cortas a ritmo alto',
    nameEn: 'Short hard repeats',
    kind: 'piscina',
    intensity: 'fuerte',
    minLevel: 'basico',
    blocks: [
      b({ exerciseId: 'calentamiento', reps: 1, metres: 300, restSeconds: 0, intensity: 'suave', fixed: true }),
      b({ exerciseId: 'progresivos', reps: 4, metres: 25, restSeconds: 20, intensity: 'medio' }),
      b({ exerciseId: 'fuerte-corto', reps: 12, metres: 25, restSeconds: 35, intensity: 'fuerte' }),
      b({ exerciseId: 'pull-brazos', fallbacks: ['crol-medio'], reps: 6, metres: 50, restSeconds: 30, intensity: 'medio' }),
      b({ exerciseId: 'calma', reps: 1, metres: 200, restSeconds: 0, intensity: 'suave', fixed: true }),
    ],
  },
  {
    id: 't-fuerza-agua',
    nameEs: 'Fuerza en el agua',
    nameEn: 'Strength in the water',
    kind: 'piscina',
    intensity: 'firme',
    minLevel: 'basico',
    blocks: [
      b({ exerciseId: 'calentamiento', reps: 1, metres: 250, restSeconds: 0, intensity: 'suave', fixed: true }),
      // Las palas van pronto, con el hombro todavía fresco — el propio
      // ejercicio avisa de que cansan mucho antes de lo que parece, así que
      // no deben llegar después del tirón más duro de la sesión.
      b({ exerciseId: 'palas-brazos', fallbacks: [], reps: 4, metres: 50, restSeconds: 35, intensity: 'fuerte' }),
      b({ exerciseId: 'pull-brazos', fallbacks: ['crol-medio'], reps: 8, metres: 50, restSeconds: 30, intensity: 'fuerte' }),
      b({ exerciseId: 'crol-medio', reps: 4, metres: 100, restSeconds: 40, intensity: 'medio' }),
      b({ exerciseId: 'patada-costado', fallbacks: ['patada-tabla'], reps: 8, metres: 25, restSeconds: 20, intensity: 'fuerte' }),
      b({ exerciseId: 'calma', reps: 1, metres: 150, restSeconds: 0, intensity: 'suave', fixed: true }),
    ],
  },
  {
    id: 't-continuo',
    nameEs: 'Continuo suave',
    nameEn: 'Easy continuous',
    kind: 'piscina',
    intensity: 'moderada',
    minLevel: 'inicio',
    blocks: [
      b({ exerciseId: 'calentamiento', reps: 1, metres: 250, restSeconds: 0, intensity: 'suave', fixed: true }),
      b({ exerciseId: 'continuo', reps: 1, metres: 400, restSeconds: 60, intensity: 'medio' }),
      b({ exerciseId: 'pull-brazos', fallbacks: ['crol-medio'], reps: 6, metres: 50, restSeconds: 30, intensity: 'medio' }),
      b({ exerciseId: 'bilateral', reps: 4, metres: 25, restSeconds: 20, intensity: 'suave' }),
      b({ exerciseId: 'calma', reps: 1, metres: 200, restSeconds: 0, intensity: 'suave', fixed: true }),
    ],
  },
  {
    id: 't-cadera',
    nameEs: 'Cadera y ondulación',
    nameEn: 'Hips and undulation',
    kind: 'piscina',
    intensity: 'firme',
    minLevel: 'basico',
    blocks: [
      b({ exerciseId: 'calentamiento', reps: 1, metres: 250, restSeconds: 0, intensity: 'suave', fixed: true }),
      b({ exerciseId: 'pull-brazos', fallbacks: ['crol-medio'], reps: 6, metres: 50, restSeconds: 30, intensity: 'medio' }),
      b({ exerciseId: 'ondulacion', fallbacks: ['patada-costado', 'patada-tabla'], reps: 8, metres: 25, restSeconds: 25, intensity: 'fuerte' }),
      b({ exerciseId: 'patada-espalda', fallbacks: ['patada-costado', 'patada-tabla'], reps: 6, metres: 50, restSeconds: 30, intensity: 'medio' }),
      b({ exerciseId: 'patada-vertical', fallbacks: [], reps: 6, metres: 0, seconds: 30, restSeconds: 45, intensity: 'fuerte' }),
      b({ exerciseId: 'calma', reps: 1, metres: 150, restSeconds: 0, intensity: 'suave', fixed: true }),
    ],
  },
  {
    id: 't-ritmos',
    nameEs: 'Series a ritmo objetivo',
    nameEn: 'Target pace set',
    kind: 'piscina',
    intensity: 'firme',
    minLevel: 'medio',
    blocks: [
      b({ exerciseId: 'calentamiento', reps: 1, metres: 300, restSeconds: 0, intensity: 'suave', fixed: true }),
      b({ exerciseId: 'progresivos', reps: 4, metres: 50, restSeconds: 25, intensity: 'medio' }),
      b({ exerciseId: 'ritmo-objetivo', reps: 8, metres: 100, restSeconds: 30, intensity: 'fuerte' }),
      b({ exerciseId: 'cambios-ritmo', reps: 4, metres: 50, restSeconds: 30, intensity: 'medio' }),
      b({ exerciseId: 'calma', reps: 1, metres: 200, restSeconds: 0, intensity: 'suave', fixed: true }),
    ],
  },
  {
    id: 't-test',
    nameEs: 'Test de 400 m',
    nameEn: '400 m test',
    kind: 'piscina',
    intensity: 'firme',
    minLevel: 'inicio',
    blocks: [
      // 400 + 150 = 550 m de calentamiento antes de un esfuerzo máximo: un
      // calentamiento corto deja el primer test artificialmente lento, y
      // eso desnivela todos los ritmos objetivo del ciclo — y ahora también
      // la comparación con el ciclo siguiente.
      b({ exerciseId: 'calentamiento', reps: 1, metres: 400, restSeconds: 0, intensity: 'suave', fixed: true }),
      b({ exerciseId: 'progresivos', reps: 6, metres: 25, restSeconds: 25, intensity: 'medio', fixed: true }),
      b({ exerciseId: 'test-400', reps: 1, metres: 400, restSeconds: 0, intensity: 'fuerte', fixed: true, exactMetres: true }),
      b({ exerciseId: 'calma', reps: 1, metres: 200, restSeconds: 0, intensity: 'suave', fixed: true }),
    ],
  },
  {
    id: 't-estilos',
    nameEs: 'Técnica de estilos',
    nameEn: 'Stroke technique',
    kind: 'piscina',
    intensity: 'suave',
    minLevel: 'inicio',
    blocks: [
      b({ exerciseId: 'calentamiento', reps: 1, metres: 250, restSeconds: 0, intensity: 'suave', fixed: true }),
      b({
        exerciseId: 'espalda-tecnica',
        fallbacks: ['crol-medio'],
        styleRotation: [
          'espalda-tecnica',
          'braza-tecnica',
          'espalda-continuo',
          'braza-continuo',
          'ondulacion',
          'mariposa-tecnica',
        ],
        reps: 6,
        metres: 25,
        restSeconds: 25,
        intensity: 'medio',
      }),
      b({ exerciseId: 'pull-brazos', fallbacks: ['crol-medio'], reps: 6, metres: 50, restSeconds: 30, intensity: 'medio' }),
      b({ exerciseId: 'calma', reps: 1, metres: 150, restSeconds: 0, intensity: 'suave', fixed: true }),
    ],
  },
  {
    id: 't-seco',
    nameEs: 'Bloque en seco',
    nameEn: 'Dry-land block',
    kind: 'seco',
    intensity: 'moderada',
    minLevel: 'inicio',
    blocks: [
      b({ exerciseId: 'seco-empuje', reps: 1, metres: 0, seconds: 900, restSeconds: 0, intensity: 'medio', fixed: true }),
    ],
  },
]

export const TEMPLATE_BY_ID: ReadonlyMap<string, SessionTemplate> = new Map(
  TEMPLATES.map((t) => [t.id, t]),
)

/**
 * Qué plantillas usa cada objetivo y en qué orden. El generador recorre la
 * lista tantas veces como días haya, saltando las que el nivel no permita.
 */
export const RECIPES: Record<Goal, string[]> = {
  // t-estilos sustituye al SEGUNDO t-intervalos: el objetivo es gasto
  // calórico, así que la única sesión de intensidad no se toca.
  grasa: ['t-intervalos', 't-base', 't-fuerza-agua', 't-continuo', 't-estilos'],
  fondo: ['t-base', 't-continuo', 't-estilos', 't-intervalos', 't-continuo'],
  tecnica: ['t-tecnica', 't-base', 't-estilos', 't-continuo', 't-base'],
  // t-estilos sustituye al SEGUNDO t-ritmos: sin esto, un usuario básico se
  // quedaba sin ninguna sesión de intensidad (t-ritmos exige nivel medio).
  rendimiento: ['t-ritmos', 't-base', 't-intervalos', 't-continuo', 't-estilos'],
  // t-estilos se AÑADE al final en vez de sustituir nada: tono solo tiene
  // dos bloques en seco y perder uno (o los dos en la semana 1, si el que
  // sustituye acaba en el índice 0) contradice lo que la propia app le
  // promete al usuario sobre este objetivo.
  tono: ['t-fuerza-agua', 't-seco', 't-cadera', 't-base', 't-seco', 't-estilos'],
}

/** Plantilla de repuesto cuando el nivel no alcanza para ninguna de la receta. */
export const FALLBACK_TEMPLATE = 't-base'
