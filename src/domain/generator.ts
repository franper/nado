import { getExercise } from '../content/exercises'
import type { BlockSpec, SessionTemplate } from '../content/templates'
import { FALLBACK_TEMPLATE, RECIPES, TEMPLATE_BY_ID, TEMPLATES } from '../content/templates'
import type { Config, Equipment, LevelId, Plan, PlanBlock, PlanSession, PoolLength } from './types'
import { levelAtLeast, levelAtMost } from './types'

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
 *
 * Si el bloque declara `styleRotation`, la semana decide qué candidato "le
 * toca" sobre la lista COMPLETA (no la filtrada), y desde ahí se busca hacia
 * delante el primero que pase nivel y material. Así "semana N → estilo X"
 * es estable: si un candidato deja de estar disponible a mitad de ciclo
 * (por ejemplo, se quitan las aletas), solo cambia lo que toca ESA semana,
 * no se reordena la rotación de las semanas siguientes.
 */
export function resolveExercise(
  spec: BlockSpec,
  available: Equipment[],
  level: LevelId,
  week: number,
  knowsMariposa: boolean,
): string | null {
  const ok = (id: string): boolean => {
    const ex = getExercise(id)
    if (ex.equipment !== null && !available.includes(ex.equipment)) return false
    if (ex.requiresMariposaConfirmed && !knowsMariposa) return false
    return levelAtLeast(level, ex.minLevel)
  }

  if (spec.styleRotation && spec.styleRotation.length > 0) {
    const list = spec.styleRotation
    const start = (week - 1) % list.length // week siempre ≥ 1 (viene de cyclePosition)
    for (let i = 0; i < list.length; i += 1) {
      const candidate = list[(start + i) % list.length]!
      if (ok(candidate)) return candidate
    }
    // Ningún candidato de la rotación vale hoy (nivel o material): cae al
    // resto de la resolución normal, como cualquier otro bloque.
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

/**
 * Semana dentro del ciclo actual (1..cycleWeeks) para una semana transcurrida
 * cualquiera. El ciclo se repite: al terminar cycleWeeks empieza uno nuevo
 * desde la semana 1 (con test incluido), en vez de quedarse para siempre en
 * la última semana de descarga.
 */
export function cyclePosition(week: number, cycleWeeks: number): number {
  if (cycleWeeks <= 0) return 1
  const w = Math.max(1, Math.floor(week))
  return ((w - 1) % cycleWeeks) + 1
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

/**
 * Última red de seguridad, después de `fitToPool`: garantiza que el bloque,
 * ya encajado en la piscina, vuelve al lado donde se empezó — sin ella,
 * un bloque de 6×25 en piscina de 50 se reescribe a 3×50 (impar) y deja al
 * nadador en la pared contraria a donde tiene el material. El ajuste nunca
 * resta volumen: como mucho añade una repetición o un largo de piscina de
 * propina. (Intentar forzar la paridad ya en el escalado, antes de esta
 * función, se probó y solo empeoraba las cosas: reducía a la mitad la
 * resolución del escalado semanal sin evitar que `fitToPool` la deshiciera
 * de todos modos.)
 */
export function fitToWall(
  reps: number,
  metres: number,
  pool: PoolLength,
  /**
   * Si el bloque se diseñó como una serie de repeticiones (`spec.reps > 1`),
   * aunque `fitToPool` lo haya dejado en una sola tirada al reescribirlo
   * para una piscina distinta a la de diseño. Decide si el ajuste añade una
   * repetición (mantiene el ejercicio como una serie) o alarga la tirada
   * (lo trata como un nado continuo) — no es lo mismo para el nadador: un
   * ejercicio de "repite y para" no debe acabar convertido en un continuo.
   */
  isSeries: boolean,
): { reps: number; metres: number } {
  if (metres === 0) return { reps, metres } // bloques por tiempo: no cambian de lado
  const lengthsPerRep = metres / pool // fitToPool garantiza que es un entero
  const totalLengths = reps * lengthsPerRep
  if (totalLengths % 2 === 0) return { reps, metres } // el bloque ya vuelve al lado de salida

  if (isSeries) {
    // Se añade una repetición en vez de alargar la tirada, aunque
    // `fitToPool` haya dejado el bloque en una sola repetición.
    return { reps: reps + 1, metres }
  }

  // Bloque de una sola tirada por diseño (calentamiento, vuelta a la calma,
  // continuo largo...): se sube la distancia al múltiplo de 2×piscina más
  // próximo por arriba (metres ya es un múltiplo impar de pool, así que
  // +pool basta).
  return { reps, metres: metres + pool }
}

export interface BuildOptions {
  config: Config
  /** 1 = primera semana del ciclo. */
  week?: number
  cycleWeeks?: number
}

/**
 * Construye un único bloque a partir de su especificación, o `null` si no
 * hay ejercicio válido (sin material ni alternativa). Aislado de
 * `buildBlocks` para que `trimSession` pueda reutilizar exactamente la
 * misma lógica de escalado/encaje sin duplicarla.
 *
 * `scaleFixed`: en la generación semanal normal, los bloques `fixed`
 * (calentamiento, vuelta a la calma) nunca escalan — mantienen su tamaño
 * de diseño pase lo que pase. En un recorte de "hoy no puedo con esto" sí
 * interesa que encojan como el resto: no hay 5 minutos que perder en un
 * calentamiento de tamaño fijo cuando solo hay 20 minutos en total.
 */
function buildOneBlock(
  spec: BlockSpec,
  config: Config,
  factor: number,
  available: Equipment[],
  week: number,
  idPrefix: string,
  n: number,
  scaleFixed = false,
): PlanBlock | null {
  const exerciseId = resolveExercise(spec, available, config.level, week, config.knowsMariposa ?? false)
  if (exerciseId === null) return null

  const ex = getExercise(exerciseId)
  let reps = spec.reps
  let metres = spec.metres
  let rest = spec.restSeconds
  let seconds = spec.seconds

  if (!spec.fixed || scaleFixed) {
    if (metres > 0 && reps > 1) reps = scaleReps(reps, factor)
    else if (metres > 0) metres = scaleMetres(metres, factor, config.pool)
    else if (seconds !== undefined) seconds = Math.max(10, Math.round(seconds * factor))
    else reps = scaleReps(reps, factor)
  }

  if (metres > 0) {
    const fitted = fitToPool(reps, metres, rest, config.pool)
    reps = fitted.reps
    metres = fitted.metres
    rest = fitted.restSeconds

    // Los estilos más exigentes de hombro (mariposa) o de fatiga (ondulación
    // con aletas) no deben ganar volumen solo para volver a la pared: para
    // esos, el ajuste se salta y el bloque puede, en algún caso raro,
    // quedar en el lado contrario — un mal menor frente a añadir más
    // mariposa de la prescrita.
    if (!spec.exactMetres && !ex.neverAmplify) {
      const walled = fitToWall(reps, metres, config.pool, spec.reps > 1)
      reps = walled.reps
      metres = walled.metres
    }
  }

  return {
    id: `${idPrefix}-b${n}`,
    exerciseId,
    reps,
    metres,
    ...(seconds !== undefined ? { seconds } : {}),
    restSeconds: rest,
    equipment: ex.equipment,
    intensity: spec.intensity,
  }
}

export function buildBlocks(
  template: SessionTemplate,
  config: Config,
  factor: number,
  idPrefix: string,
  week: number,
): PlanBlock[] {
  const available = usableEquipment(config)
  const blocks: PlanBlock[] = []
  let n = 0

  for (const spec of template.blocks) {
    const block = buildOneBlock(spec, config, factor, available, week, idPrefix, n + 1)
    if (block === null) continue
    n += 1
    blocks.push(block)
  }

  return blocks
}

/** Elige las plantillas de la semana según objetivo, nivel y número de días. */
export function pickTemplates(config: Config, week: number): SessionTemplate[] {
  const wanted = config.days.length
  const recipe = RECIPES[config.goal]
  const allowed = recipe
    .map((id) => TEMPLATE_BY_ID.get(id))
    .filter(
      (t): t is SessionTemplate =>
        !!t &&
        levelAtLeast(config.level, t.minLevel) &&
        (t.maxLevel === undefined || levelAtMost(config.level, t.maxLevel)),
    )

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
  const cycleWeeks = opts.cycleWeeks ?? 8
  // Se normaliza aquí para que una semana transcurrida más allá del ciclo
  // (9, 17, 45…) vuelva a caer en 1..cycleWeeks en vez de congelarse en la
  // última semana de descarga.
  const week = cyclePosition(opts.week ?? 1, cycleWeeks)
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
      // 5 ejercicios × 2-3 series con descanso real son más cerca de 25 min
      // que de 20 — declararlo corto es lo que hace que la gente se salte
      // el último ejercicio (la rotación externa de hombro, justo el único
      // preventivo de la lista).
      minutes: template.kind === 'seco' ? 25 : config.minutesPerSession,
      blocks: buildBlocks(template, config, factor, id, week),
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

/** Un bloque antes/después de recortar la sesión de hoy. `null` = no existía o se ha quitado. */
export interface TrimmedBlock {
  before: PlanBlock | null
  after: PlanBlock | null
}

export interface TrimResult {
  /** La sesión recortada, lista para guardarse como override de hoy. */
  session: PlanSession
  /** Los bloques originales y los nuevos, en el mismo orden, para pintar el antes/después. */
  blocks: TrimmedBlock[]
}

/**
 * "Hoy no puedo con esto": recorta una sesión ya generada a los minutos
 * disponibles hoy, y/o resuelve sin el material que hoy no tienes a mano.
 * No es una regeneración normal — es un ajuste puntual de un solo día, así
 * que aquí sí escalan los bloques `fixed` (calentamiento, vuelta a la
 * calma): no hay minutos que perder en un tamaño fijo cuando el tiempo
 * disponible ya es poco.
 *
 * Se reconstruye desde la plantilla en vez de recortar `session.blocks`
 * directamente, para que "antes" y "después" salgan alineados bloque a
 * bloque incluso si alguno se cae por falta de material.
 */
export function trimSession(
  session: PlanSession,
  config: Config,
  targetMinutes: number,
  unavailableToday: Equipment[],
  week: number,
  cycleWeeks: number,
): TrimResult {
  const template = TEMPLATE_BY_ID.get(session.templateId)
  if (!template) return { session, blocks: [] }

  const weekF = weekFactor(week, cycleWeeks)
  const baseFactor = LEVEL_FACTOR[config.level] * (config.minutesPerSession / TEMPLATE_MINUTES) * weekF
  const trimFactor = LEVEL_FACTOR[config.level] * (targetMinutes / TEMPLATE_MINUTES) * weekF

  const normalAvailable = usableEquipment(config)
  const trimAvailable = normalAvailable.filter((e) => !unavailableToday.includes(e))

  const blocks: TrimmedBlock[] = []
  const newBlocks: PlanBlock[] = []
  let n = 0

  template.blocks.forEach((spec, i) => {
    const before = buildOneBlock(spec, config, baseFactor, normalAvailable, week, session.id, i + 1)
    const after = buildOneBlock(spec, config, trimFactor, trimAvailable, week, session.id, n + 1, true)
    if (after !== null) {
      n += 1
      newBlocks.push(after)
    }
    blocks.push({ before, after })
  })

  return {
    session: { ...session, minutes: targetMinutes, blocks: newBlocks },
    blocks,
  }
}
