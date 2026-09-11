import { getExercise } from '../content/exercises'
import type { BlockSpec, SessionTemplate } from '../content/templates'
import { FALLBACK_TEMPLATE, RECIPES, TEMPLATE_BY_ID, TEMPLATES } from '../content/templates'
import type { Config, Equipment, LevelId, Plan, PlanBlock, PlanSession, PoolLength } from './types'
import { levelAtLeast } from './types'

/** Cuánto volumen soporta cada nivel respecto de la plantilla, medida a nivel medio. */
const LEVEL_FACTOR: Record<LevelId, number> = {
  inicio: 0.62,
  basico: 0.82,
  medio: 1,
  avanzado: 1.18,
}

/** Las plantillas están escritas para 60 minutos. */
const TEMPLATE_MINUTES = 60

/** Las palas solo entran a partir de este nivel, por riesgo de hombro. */
export const PADDLES_MIN_LEVEL: LevelId = 'medio'

export function usableEquipment(config: Config): Equipment[] {
  return config.equipment.filter(
    (e) => e !== 'palas' || levelAtLeast(config.level, PADDLES_MIN_LEVEL),
  )
}

/** Las palas están marcadas pero el nivel todavía no las permite. */
export function paddlesLocked(config: Config): boolean {
  return config.equipment.includes('palas') && !levelAtLeast(config.level, PADDLES_MIN_LEVEL)
}

/**
 * Sustituye un bloque cuyo material no está disponible. Devuelve el id del
 * ejercicio a usar, o null si hay que quitar el bloque entero.
 */
export function resolveExercise(
  spec: BlockSpec,
  available: Equipment[],
  level: LevelId,
): string | null {
  const ok = (id: string): boolean => {
    const ex = getExercise(id)
    if (ex.equipment !== null && !available.includes(ex.equipment)) return false
    return levelAtLeast(level, ex.minLevel)
  }
  if (ok(spec.exerciseId)) return spec.exerciseId
  for (const alt of spec.fallbacks ?? []) {
    if (ok(alt)) return alt
  }
  return null
}

/**
 * Reescribe una serie para que cada repetición sea múltiplo de la piscina.
 * En 50 m no se divide: se rehace. Hay la mitad de paredes, así que los
 * mismos metros cuestan más y el descanso sube un poco.
 */
export function fitToPool(
  reps: number,
  metres: number,
  restSeconds: number,
  pool: PoolLength,
): { reps: number; metres: number; restSeconds: number } {
  if (metres === 0) return { reps, metres, restSeconds }
  if (metres % pool === 0) return { reps, metres, restSeconds }

  const total = reps * metres
  const perRep = Math.max(pool, Math.round(metres / pool) * pool || pool)
  const newReps = Math.max(1, Math.round(total / perRep))
  // Menos paredes por repetición: un poco más de descanso.
  const newRest = restSeconds > 0 ? Math.round((restSeconds * perRep) / metres / 5) * 5 : 0
  return { reps: newReps, metres: perRep, restSeconds: Math.max(restSeconds, newRest) }
}

/** Multiplicador de volumen por semana dentro del ciclo. */
export function weekFactor(week: number, cycleWeeks: number): number {
  if (week >= cycleWeeks) return 0.8 // semana de cierre y re-test
  const span = Math.max(1, cycleWeeks - 2)
  const t = Math.min(1, (week - 1) / span)
  return 0.85 + t * 0.35
}

function scaleReps(reps: number, factor: number): number {
  return Math.max(1, Math.round(reps * factor))
}

function scaleMetres(metres: number, factor: number, pool: PoolLength): number {
  if (metres === 0) return 0
  const scaled = metres * factor
  const steps = Math.max(1, Math.round(scaled / pool))
  return steps * pool
}

export interface BuildOptions {
  config: Config
  /** 1 = primera semana del ciclo. */
  week?: number
  cycleWeeks?: number
}

function buildBlocks(
  template: SessionTemplate,
  config: Config,
  factor: number,
  idPrefix: string,
): PlanBlock[] {
  const available = usableEquipment(config)
  const blocks: PlanBlock[] = []
  let n = 0

  for (const spec of template.blocks) {
    const exerciseId = resolveExercise(spec, available, config.level)
    if (exerciseId === null) continue

    const ex = getExercise(exerciseId)
    let reps = spec.reps
    let metres = spec.metres
    let rest = spec.restSeconds

    if (!spec.fixed) {
      if (metres > 0 && reps > 1) reps = scaleReps(reps, factor)
      else if (metres > 0) metres = scaleMetres(metres, factor, config.pool)
      else reps = scaleReps(reps, factor)
    }

    if (metres > 0) {
      const fitted = fitToPool(reps, metres, rest, config.pool)
      reps = fitted.reps
      metres = fitted.metres
      rest = fitted.restSeconds
    }

    n += 1
    blocks.push({
      id: `${idPrefix}-b${n}`,
      exerciseId,
      reps,
      metres,
      ...(spec.seconds !== undefined ? { seconds: spec.seconds } : {}),
      restSeconds: rest,
      equipment: ex.equipment,
      intensity: spec.intensity,
    })
  }

  return blocks
}

/** Elige las plantillas de la semana según objetivo, nivel y número de días. */
export function pickTemplates(config: Config, week: number): SessionTemplate[] {
  const wanted = config.days.length
  const recipe = RECIPES[config.goal]
  const allowed = recipe
    .map((id) => TEMPLATE_BY_ID.get(id))
    .filter((t): t is SessionTemplate => !!t && levelAtLeast(config.level, t.minLevel))

  const pool = allowed.length > 0
    ? allowed
    : [TEMPLATE_BY_ID.get(FALLBACK_TEMPLATE)!]

  const out: SessionTemplate[] = []
  for (let i = 0; i < wanted; i += 1) {
    out.push(pool[i % pool.length]!)
  }

  // La primera sesión del ciclo es el test, salvo que no haya semana 1.
  if (week === 1) {
    const test = TEMPLATE_BY_ID.get('t-test')
    if (test) out[0] = test
  }
  return out
}

export function buildSessions(opts: BuildOptions): PlanSession[] {
  const { config } = opts
  const week = opts.week ?? 1
  const cycleWeeks = opts.cycleWeeks ?? 8
  const factor =
    LEVEL_FACTOR[config.level] *
    (config.minutesPerSession / TEMPLATE_MINUTES) *
    weekFactor(week, cycleWeeks)

  const templates = pickTemplates(config, week)
  const days = [...config.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))

  return templates.map((template, i) => {
    const day = days[i % days.length]!
    const id = `s${week}-${i + 1}`
    return {
      id,
      day,
      kind: template.kind,
      templateId: template.id,
      name: config.lang === 'en' ? template.nameEn : template.nameEs,
      intensity: template.intensity,
      minutes: template.kind === 'seco' ? 20 : config.minutesPerSession,
      blocks: buildBlocks(template, config, factor, id),
    }
  })
}

export function sessionMetres(session: PlanSession): number {
  return session.blocks.reduce((sum, b) => sum + b.reps * b.metres, 0)
}

export function configHash(config: Config): string {
  const parts = [
    config.goal,
    config.level,
    config.pool,
    config.minutesPerSession,
    [...config.days].sort().join(''),
    [...config.equipment].sort().join(','),
  ]
  return parts.join('|')
}

export function generatePlan(config: Config, startDate: string, cycleWeeks = 8): Plan {
  return {
    id: 'plan-' + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    startDate,
    cycleWeeks,
    base: buildSessions({ config, week: 1, cycleWeeks }),
    configHash: configHash(config),
  }
}

/** Sesiones de una semana concreta del ciclo, con las ediciones del usuario aplicadas. */
export function sessionsForWeek(
  config: Config,
  week: number,
  cycleWeeks: number,
  overrides: Record<string, PlanSession>,
): PlanSession[] {
  const generated = buildSessions({ config, week, cycleWeeks })
  return generated.map((s) => overrides[s.id] ?? s)
}

export const ALL_TEMPLATE_IDS = TEMPLATES.map((t) => t.id)
