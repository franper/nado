/**
 * Modelo de datos de Nado.
 *
 * Cuatro cosas separadas a propósito, porque de esa separación depende poder
 * regenerar planes sin destruir lo que el usuario ha hecho:
 *
 *   config     — lo que respondió en la configuración
 *   plan       — generado a partir de config; siempre reconstruible
 *   overrides  — sesiones que ha editado a mano; sobreviven a una regeneración
 *   logs       — sesiones registradas y pesos; nunca se tocan
 */

export type Lang = 'es' | 'en'

export type Goal =
  | 'grasa'        // perder grasa
  | 'fondo'        // ganar fondo
  | 'tecnica'      // mejorar la técnica
  | 'rendimiento'  // rendimiento por ritmos
  | 'tono'         // fuerza y tono (incluye bloque en seco)

export type Equipment = 'aletas' | 'pull' | 'tabla' | 'tubo' | 'palas'

export type PoolLength = 25 | 50

/** Nivel en el agua. El orden importa: se compara con `>=`. */
export type LevelId = 'inicio' | 'basico' | 'medio' | 'avanzado'

export const LEVEL_ORDER: readonly LevelId[] = ['inicio', 'basico', 'medio', 'avanzado']

export function levelAtLeast(level: LevelId, min: LevelId): boolean {
  return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(min)
}

/** Cuánto aguanta nadando sin parar. Entrada objetiva, no autoevaluación. */
export type ContinuousMetres = 'lt50' | 'm50_200' | 'm200_600' | 'gt600'

/** Esfuerzo que el usuario marca al registrar la sesión. */
export type Effort = 'suave' | 'normal' | 'fuerte'

/** Intensidad de la sesión completa. Determina el MET. */
export type Intensity = 'suave' | 'moderada' | 'firme' | 'fuerte'

/** Intensidad de un bloque suelto dentro de la sesión. */
export type BlockIntensity = 'suave' | 'medio' | 'fuerte'

export type SessionKind = 'piscina' | 'seco'

// ---------------------------------------------------------------- configuración

export interface Config {
  goal: Goal
  /** Días de la semana en formato Date#getDay(): 0 domingo … 6 sábado. */
  days: number[]
  minutesPerSession: 30 | 45 | 60 | 75
  equipment: Equipment[]
  pool: PoolLength
  level: LevelId
  continuous: ContinuousMetres
  /** Cada cuántas brazadas respira. */
  breathEvery: 2 | 3 | 4
  weightKg: number
  heightCm: number
  lang: Lang
}

/** Resultado del test de 400 m, del que salen los ritmos. */
export interface TestResult {
  date: string
  /** Tiempo total, en segundos. */
  seconds: number
  /** Metros nadados, si no llegó a los 400. undefined = 400 (el test completo). */
  metres?: number
}

// ---------------------------------------------------------------- plan

export interface PlanBlock {
  id: string
  /** Referencia al catálogo de ejercicios. */
  exerciseId: string
  /** Número de repeticiones. 1 para un bloque continuo. */
  reps: number
  /** Metros por repetición. 0 si el bloque se mide en tiempo. */
  metres: number
  /** Segundos por repetición, para bloques medidos en tiempo. */
  seconds?: number
  restSeconds: number
  equipment: Equipment | null
  intensity: BlockIntensity
}

export interface PlanSession {
  id: string
  /** Día de la semana, Date#getDay(). */
  day: number
  kind: SessionKind
  templateId: string
  /** Nombre visible. Se copia del catálogo al generar para que sea editable. */
  name: string
  intensity: Intensity
  minutes: number
  blocks: PlanBlock[]
}

export interface Plan {
  id: string
  createdAt: string
  /** Lunes de la primera semana del ciclo, en ISO (YYYY-MM-DD). */
  startDate: string
  cycleWeeks: number
  /** Sesiones de la semana 1. Las demás se derivan aplicando la progresión. */
  base: PlanSession[]
  /** Huella de la configuración con la que se generó, para detectar desfases. */
  configHash: string
}

// ---------------------------------------------------------------- registros

export interface SessionLog {
  id: string
  date: string
  sessionId: string
  name: string
  minutes: number
  effort: Effort
  kcal: number
  weightKg: number
  ts: number
}

export interface WeightLog {
  id: string
  date: string
  kg: number
  ts: number
}

export interface Settings {
  /** Cada cuántas semanas recordar revisar la rutina. 0 = nunca. */
  reviewWeeks: number
  lastReview: string | null
  /** El usuario ya vio el aviso honesto de su objetivo. */
  goalNoticeSeen: boolean
}

// ---------------------------------------------------------------- documento

export interface AppData {
  version: number
  config: Config | null
  test: TestResult | null
  /** Test anterior, para comparar al cerrar el ciclo. */
  previousTest: TestResult | null
  plan: Plan | null
  /** Sesiones editadas a mano, por id de sesión. Ganan sobre el plan generado. */
  overrides: Record<string, PlanSession>
  logs: Record<string, SessionLog>
  weights: Record<string, WeightLog>
  settings: Settings
}

export const DATA_VERSION = 1

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    config: null,
    test: null,
    previousTest: null,
    plan: null,
    overrides: {},
    logs: {},
    weights: {},
    settings: { reviewWeeks: 0, lastReview: null, goalNoticeSeen: false },
  }
}
