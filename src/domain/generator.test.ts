import { describe, expect, it } from 'vitest'
import { getExercise } from '../content/exercises'
import {
  buildSessions,
  cyclePosition,
  fitToPool,
  paddlesLocked,
  sessionMetres,
  usableEquipment,
  weekFactor,
} from './generator'
import { kcal, pacePer100, formatTime, targetTime } from './metrics'
import type { Config, Equipment, Goal, LevelId, PoolLength } from './types'

const GOALS: Goal[] = ['grasa', 'fondo', 'tecnica', 'rendimiento', 'tono']
const LEVELS: LevelId[] = ['inicio', 'basico', 'medio', 'avanzado']
const POOLS: PoolLength[] = [25, 50]
const ALL_EQUIPMENT: Equipment[] = ['aletas', 'pull', 'tabla', 'tubo', 'palas']

function subsets<T>(items: T[]): T[][] {
  const out: T[][] = []
  for (let mask = 0; mask < 1 << items.length; mask += 1) {
    out.push(items.filter((_, i) => (mask >> i) & 1))
  }
  return out
}

function makeConfig(over: Partial<Config>): Config {
  return {
    goal: 'grasa',
    days: [2, 4, 6, 0],
    minutesPerSession: 60,
    equipment: ['aletas', 'pull'],
    pool: 25,
    level: 'basico',
    continuous: 'm50_200',
    breathEvery: 3,
    weightKg: 75,
    heightCm: 175,
    lang: 'es',
    ...over,
  }
}

describe('fitToPool', () => {
  it('deja en paz lo que ya encaja', () => {
    expect(fitToPool(8, 50, 30, 25)).toEqual({ reps: 8, metres: 50, restSeconds: 30 })
    expect(fitToPool(6, 100, 40, 50)).toEqual({ reps: 6, metres: 100, restSeconds: 40 })
  })

  it('reescribe una serie de 25 en piscina de 50 conservando el volumen', () => {
    const r = fitToPool(12, 25, 30, 50)
    expect(r.metres).toBe(50)
    expect(r.reps).toBe(6)
    expect(r.reps * r.metres).toBe(300)
  })

  it('sube el descanso al haber menos paredes', () => {
    const r = fitToPool(12, 25, 30, 50)
    expect(r.restSeconds).toBeGreaterThanOrEqual(30)
  })

  it('no toca los bloques medidos en tiempo', () => {
    expect(fitToPool(6, 0, 45, 50)).toEqual({ reps: 6, metres: 0, restSeconds: 45 })
  })
})

describe('weekFactor', () => {
  it('empieza por debajo de 1 y sube', () => {
    expect(weekFactor(1, 8)).toBeLessThan(1)
    expect(weekFactor(6, 8)).toBeGreaterThan(weekFactor(1, 8))
  })
  it('descarga en la semana de cierre', () => {
    expect(weekFactor(8, 8)).toBeLessThan(weekFactor(7, 8))
  })
})

describe('cyclePosition', () => {
  it('deja igual las semanas dentro del ciclo', () => {
    expect(cyclePosition(1, 8)).toBe(1)
    expect(cyclePosition(7, 8)).toBe(7)
    expect(cyclePosition(8, 8)).toBe(8)
  })

  it('rota a un nuevo ciclo en vez de congelarse en la última semana', () => {
    expect(cyclePosition(9, 8)).toBe(1)
    expect(cyclePosition(10, 8)).toBe(2)
    expect(cyclePosition(16, 8)).toBe(8)
    expect(cyclePosition(17, 8)).toBe(1)
    expect(cyclePosition(45, 8)).toBe(cyclePosition(45 - 8 * 5, 8))
  })
})

describe('rotación del ciclo en el plan generado', () => {
  it('una semana muy avanzada produce el mismo plan que su equivalente dentro del ciclo', () => {
    const config = makeConfig({})
    const far = buildSessions({ config, week: 33, cycleWeeks: 8 }) // 33 -> semana 1 del ciclo 5
    const equivalent = buildSessions({ config, week: 1, cycleWeeks: 8 })
    expect(far).toEqual(equivalent)
  })

  it('vuelve a proponer el test al empezar un nuevo ciclo', () => {
    const sessions = buildSessions({ config: makeConfig({}), week: 17, cycleWeeks: 8 })
    expect(sessions[0]?.templateId).toBe('t-test')
  })

  it('no se queda para siempre en la semana de descarga', () => {
    const config = makeConfig({})
    const week8 = buildSessions({ config, week: 8, cycleWeeks: 8 })
    const week10 = buildSessions({ config, week: 10, cycleWeeks: 8 }) // equivale a la semana 2
    expect(sessionMetres(week10[0]!)).not.toBe(sessionMetres(week8[0]!))
  })
})

describe('palas', () => {
  it('no se usan por debajo de nivel medio aunque estén marcadas', () => {
    const c = makeConfig({ equipment: ['palas', 'pull'], level: 'basico' })
    expect(usableEquipment(c)).not.toContain('palas')
    expect(paddlesLocked(c)).toBe(true)
  })
  it('se habilitan a partir de medio', () => {
    const c = makeConfig({ equipment: ['palas', 'pull'], level: 'medio' })
    expect(usableEquipment(c)).toContain('palas')
    expect(paddlesLocked(c)).toBe(false)
  })
})

describe('generador, todas las combinaciones', () => {
  const equipmentSets = subsets(ALL_EQUIPMENT)

  it('produce un plan válido para cualquier configuración', () => {
    let combos = 0

    for (const goal of GOALS) {
      for (const level of LEVELS) {
        for (const pool of POOLS) {
          for (const minutes of [30, 75] as const) {
            for (const equipment of equipmentSets) {
              for (const dayCount of [2, 5]) {
                const days = [1, 2, 4, 5, 6].slice(0, dayCount)
                const config = makeConfig({ goal, level, pool, minutesPerSession: minutes, equipment, days })
                const sessions = buildSessions({ config, week: 3, cycleWeeks: 8 })
                combos += 1

                expect(sessions).toHaveLength(dayCount)

                for (const s of sessions) {
                  expect(s.blocks.length).toBeGreaterThan(0)
                  expect(days).toContain(s.day)

                  for (const block of s.blocks) {
                    // El ejercicio existe
                    const ex = getExercise(block.exerciseId)
                    // Nunca se pide material que el usuario no tenga disponible
                    if (ex.equipment !== null) {
                      expect(usableEquipment(config)).toContain(ex.equipment)
                    }
                    // Las distancias encajan en la piscina
                    if (block.metres > 0) {
                      expect(block.metres % pool).toBe(0)
                    }
                    expect(block.reps).toBeGreaterThan(0)
                    expect(block.restSeconds).toBeGreaterThanOrEqual(0)
                  }

                  if (s.kind === 'piscina') {
                    expect(sessionMetres(s)).toBeGreaterThan(0)
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(combos).toBeGreaterThan(2000)
  })

  it('sin nada de material sigue habiendo plan', () => {
    for (const goal of GOALS) {
      const config = makeConfig({ goal, equipment: [], level: 'inicio' })
      const sessions = buildSessions({ config, week: 1, cycleWeeks: 8 })
      expect(sessions.length).toBe(config.days.length)
      for (const s of sessions) {
        expect(s.blocks.length).toBeGreaterThan(0)
        for (const b of s.blocks) {
          expect(getExercise(b.exerciseId).equipment).toBeNull()
        }
      }
    }
  })

  it('la primera sesión del ciclo es el test', () => {
    const sessions = buildSessions({ config: makeConfig({}), week: 1, cycleWeeks: 8 })
    expect(sessions[0]?.templateId).toBe('t-test')
  })

  it('a más minutos, más metros', () => {
    const short = buildSessions({ config: makeConfig({ minutesPerSession: 30 }), week: 3 })
    const long = buildSessions({ config: makeConfig({ minutesPerSession: 75 }), week: 3 })
    const sum = (xs: ReturnType<typeof buildSessions>): number =>
      xs.reduce((t, s) => t + sessionMetres(s), 0)
    expect(sum(long)).toBeGreaterThan(sum(short))
  })

  it('a más nivel, más metros', () => {
    const easy = buildSessions({ config: makeConfig({ level: 'inicio' }), week: 3 })
    const hard = buildSessions({ config: makeConfig({ level: 'avanzado' }), week: 3 })
    const sum = (xs: ReturnType<typeof buildSessions>): number =>
      xs.reduce((t, s) => t + sessionMetres(s), 0)
    expect(sum(hard)).toBeGreaterThan(sum(easy))
  })
})

describe('métricas', () => {
  it('calcula kcal con MET × peso × horas', () => {
    // 6,5 MET × 80 kg × 1 h = 520
    expect(kcal({ kind: 'piscina', intensity: 'moderada', weightKg: 80, minutes: 60, effort: 'normal' })).toBe(520)
  })

  it('el esfuerzo escala el gasto', () => {
    const base = { kind: 'piscina' as const, intensity: 'firme' as const, weightKg: 70, minutes: 60 }
    expect(kcal({ ...base, effort: 'suave' })).toBeLessThan(kcal({ ...base, effort: 'normal' }))
    expect(kcal({ ...base, effort: 'fuerte' })).toBeGreaterThan(kcal({ ...base, effort: 'normal' }))
  })

  it('el bloque en seco usa el MET de calistenia', () => {
    expect(kcal({ kind: 'seco', intensity: 'fuerte', weightKg: 100, minutes: 60, effort: 'normal' })).toBe(380)
  })

  it('saca el ritmo por 100 del test de 400', () => {
    expect(pacePer100(536)).toBe(134) // 8:56 → 2:14 /100
    expect(formatTime(134)).toBe('2:14')
  })

  it('las zonas ordenan de suave a fuerte', () => {
    const t = 536
    expect(targetTime(t, 'suave', 100)).toBeGreaterThan(targetTime(t, 'medio', 100))
    expect(targetTime(t, 'medio', 100)).toBeGreaterThan(targetTime(t, 'umbral', 100))
    expect(targetTime(t, 'umbral', 100)).toBeGreaterThan(targetTime(t, 'fuerte', 100))
  })
})
