import { describe, expect, it } from 'vitest'
import { getExercise } from '../content/exercises'
import type { BlockSpec, SessionTemplate } from '../content/templates'
import {
  buildBlocks,
  buildSessions,
  cyclePosition,
  fitToPool,
  fitToWall,
  paddlesLocked,
  pickTemplates,
  resolveExercise,
  sessionMetres,
  trimSession,
  usableEquipment,
  weekFactor,
} from './generator'
import { kcal, pacePer100, formatTime, targetTime, paceChangePercent } from './metrics'
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

describe('fitToWall', () => {
  it('no toca un bloque que ya vuelve al lado de salida', () => {
    expect(fitToWall(4, 25, 25, true)).toEqual({ reps: 4, metres: 25 }) // 4 largos, par
    expect(fitToWall(1, 100, 25, false)).toEqual({ reps: 1, metres: 100 }) // 4 largos, par
  })

  it('en una serie, añade una repetición en vez de alargar la tirada', () => {
    // 1×50 en piscina de 25 = 2 largos... espera, ha de ser impar para probarlo:
    expect(fitToWall(1, 50, 50, true)).toEqual({ reps: 2, metres: 50 }) // 1 largo → 2×50
    expect(fitToWall(3, 25, 25, true)).toEqual({ reps: 4, metres: 25 }) // 3 largos → 4×25
  })

  it('en un bloque continuo, sube la distancia en vez de añadir una tirada', () => {
    expect(fitToWall(1, 250, 50, false)).toEqual({ reps: 1, metres: 300 }) // 5 largos → 300
    expect(fitToWall(1, 150, 50, false)).toEqual({ reps: 1, metres: 200 }) // 3 largos → 200
  })

  it('no toca los bloques por tiempo', () => {
    expect(fitToWall(6, 0, 50, true)).toEqual({ reps: 6, metres: 0 })
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
    const week10 = buildSessions({ config, week: 10, cycleWeeks: 8 }) // equivale a la semana 2 del ciclo siguiente
    expect(sessionMetres(week10[0]!)).not.toBe(sessionMetres(week8[0]!))
  })

  it('la descarga se nota también sumada a lo largo de toda la semana', () => {
    const config = makeConfig({})
    const totalFor = (week: number): number =>
      buildSessions({ config, week, cycleWeeks: 8 }).reduce((sum, s) => sum + sessionMetres(s), 0)
    expect(totalFor(10)).not.toBe(totalFor(8))
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

describe('t-estilos llega a la mayoría de usuarios', () => {
  it('aparece con 6 días, en cualquier objetivo y nivel', () => {
    // Con menos días, en algunos objetivos t-estilos no llega — a propósito:
    // se le dio prioridad a no romper el contenido existente (el seco de
    // tono, la intensidad de rendimiento en básico, el gasto de grasa) antes
    // que a que t-estilos llegara siempre con pocos días. Esta prueba solo
    // garantiza que nunca queda huérfano del todo.
    for (const goal of GOALS) {
      for (const level of LEVELS) {
        const config = makeConfig({ goal, level, days: [0, 1, 2, 3, 4, 5] }) // 6 días
        const templates = pickTemplates(config, 3) // semana normal, no la del test
        const ids = templates.map((t) => t.id)
        expect(ids, `${goal}/${level}`).toContain('t-estilos')
      }
    }
  })

  it('nunca ocupa la posición 0 de la receta (la semana 1 la sobrescribe con el test)', () => {
    for (const goal of GOALS) {
      for (const level of LEVELS) {
        // Con una semana que no sea la 1, para comprobar la posición tal
        // cual sale de la receta, sin la sobrescritura del test de por medio.
        const config = makeConfig({ goal, level, days: [1, 2, 3, 4, 5] })
        const templates = pickTemplates(config, 3)
        expect(templates[0]?.id, `${goal}/${level}`).not.toBe('t-estilos')
      }
    }
  })
})

describe('las recetas no pierden contenido al añadir t-estilos', () => {
  it('tono conserva sus dos sesiones en seco', () => {
    const config = makeConfig({ goal: 'tono', level: 'basico', days: [1, 2, 3, 4, 5, 6] })
    const templates = pickTemplates(config, 3)
    const secoCount = templates.filter((t) => t.id === 't-seco').length
    expect(secoCount).toBe(2)
  })

  it('rendimiento conserva una sesión de intensidad en nivel básico', () => {
    const config = makeConfig({ goal: 'rendimiento', level: 'basico', days: [1, 2, 3, 4] })
    const templates = pickTemplates(config, 3)
    expect(templates.map((t) => t.id)).toContain('t-intervalos')
  })

  it('grasa conserva la sesión de fuerza en el agua', () => {
    const config = makeConfig({ goal: 'grasa', level: 'basico', days: [1, 2, 3] })
    const templates = pickTemplates(config, 3)
    expect(templates.map((t) => t.id)).toContain('t-fuerza-agua')
  })
})

describe('exactMetres exime de verdad del ajuste de pared', () => {
  const fakeTemplate = (exactMetres: boolean): SessionTemplate => ({
    id: 't-fake',
    nameEs: 'x',
    nameEn: 'x',
    kind: 'piscina',
    intensity: 'fuerte',
    minLevel: 'inicio',
    blocks: [
      { exerciseId: 'test-400', reps: 1, metres: 350, restSeconds: 0, intensity: 'fuerte', fixed: true, exactMetres },
    ],
  })

  it('con exactMetres, una distancia impar en largos se queda tal cual', () => {
    const config = makeConfig({ pool: 50 })
    const blocks = buildBlocks(fakeTemplate(true), config, 1, 'x', 3)
    expect(blocks[0]!.metres).toBe(350) // 350/50 = 7 largos, impar, y no se toca
    expect(blocks[0]!.reps).toBe(1)
  })

  it('sin exactMetres, la misma distancia impar sí se ajusta', () => {
    const config = makeConfig({ pool: 50 })
    const blocks = buildBlocks(fakeTemplate(false), config, 1, 'x', 3)
    expect(blocks[0]!.metres).toBe(400) // sube al múltiplo de 2×50 más próximo
  })
})

describe('neverAmplify: mariposa y ondulación nunca ganan volumen por la pared', () => {
  const fakeTemplate = (exerciseId: string): SessionTemplate => ({
    id: 't-fake',
    nameEs: 'x',
    nameEn: 'x',
    kind: 'piscina',
    intensity: 'fuerte',
    minLevel: 'inicio',
    blocks: [{ exerciseId, reps: 1, metres: 150, restSeconds: 30, intensity: 'fuerte' }],
  })

  it('mariposa-tecnica con una distancia impar en largos no se amplía', () => {
    const config = makeConfig({ pool: 50, level: 'avanzado' })
    const blocks = buildBlocks(fakeTemplate('mariposa-tecnica'), config, 1, 'x', 3)
    expect(blocks[0]!.metres).toBe(150) // 150/50 = 3, impar, pero se queda así
  })

  it('el mismo bloque con un ejercicio normal SÍ se amplía', () => {
    const config = makeConfig({ pool: 50 })
    const blocks = buildBlocks(fakeTemplate('crol-medio'), config, 1, 'x', 3)
    expect(blocks[0]!.metres).toBe(200) // aquí sí sube, para volver a la pared
  })
})

describe('styleRotation es estable frente a cambios de material', () => {
  const spec: BlockSpec = {
    exerciseId: 'espalda-tecnica',
    styleRotation: ['espalda-tecnica', 'braza-tecnica', 'ondulacion'],
    reps: 6,
    metres: 25,
    restSeconds: 25,
    intensity: 'medio',
  }

  it('quitar material no cambia semanas cuyo candidato ideal no lo necesitaba', () => {
    const conAletas = resolveExercise(spec, ['aletas'], 'basico', 1)
    const sinAletas = resolveExercise(spec, [], 'basico', 1)
    expect(conAletas).toBe(sinAletas) // la semana 1 no tocaba 'ondulacion'
  })

  it('quitar material solo cambia la semana que sí dependía de él', () => {
    // Con la lista completa, la semana 3 le toca 'ondulacion' (pide aletas).
    const conAletas = resolveExercise(spec, ['aletas'], 'basico', 3)
    expect(conAletas).toBe('ondulacion')
    const sinAletas = resolveExercise(spec, [], 'basico', 3)
    expect(sinAletas).not.toBe('ondulacion')
    expect(sinAletas).not.toBeNull()
  })
})

describe('trimSession: "hoy no puedo con esto"', () => {
  const config = makeConfig({ goal: 'grasa', level: 'basico', pool: 25, minutesPerSession: 60, equipment: ['aletas', 'pull'] })
  const week = 3
  const cycleWeeks = 8
  const session = buildSessions({ config, week, cycleWeeks }).find((s) => s.kind === 'piscina')!

  it('recorta el total de metros al reducir los minutos', () => {
    const full = sessionMetres(session)
    const { session: trimmed } = trimSession(session, config, 30, [], week, cycleWeeks)
    expect(trimmed.minutes).toBe(30)
    expect(sessionMetres(trimmed)).toBeLessThan(full)
  })

  it('a diferencia de la generación normal, los bloques fijos SÍ encogen', () => {
    const { blocks } = trimSession(session, config, 20, [], week, cycleWeeks)
    const calentamiento = blocks.find((b) => b.before?.exerciseId === 'calentamiento')
    expect(calentamiento?.before).toBeTruthy()
    expect(calentamiento?.after).toBeTruthy()
    expect(calentamiento!.after!.metres).toBeLessThan(calentamiento!.before!.metres)
  })

  it('marcar material como no disponible hoy cambia el ejercicio resuelto, sin tocar la config guardada', () => {
    const { session: trimmed } = trimSession(session, config, config.minutesPerSession, ['aletas'], week, cycleWeeks)
    for (const b of trimmed.blocks) {
      expect(getExercise(b.exerciseId).equipment).not.toBe('aletas')
    }
    expect(config.equipment).toContain('aletas') // la config del usuario no se ha tocado
  })

  it('los bloques resultantes siguen cumpliendo la invariante de la pared', () => {
    const { session: trimmed } = trimSession(session, config, 20, ['aletas'], week, cycleWeeks)
    for (const b of trimmed.blocks) {
      if (b.metres === 0) continue
      if (getExercise(b.exerciseId).neverAmplify) continue
      expect((b.reps * b.metres) % (2 * config.pool)).toBe(0)
    }
  })

  it('antes y después quedan alineados igual, tenga o no material disponible', () => {
    const { blocks: conMaterial } = trimSession(session, config, 60, [], week, cycleWeeks)
    const { blocks: sinMaterial } = trimSession(session, config, 60, ['aletas', 'pull'], week, cycleWeeks)
    expect(sinMaterial.length).toBe(conMaterial.length)
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
                      // El bloque vuelve al lado de la piscina donde empezó
                      // (donde está el material y toca leer el siguiente
                      // ejercicio), salvo el test de 400 (distancia exacta)
                      // y los estilos marcados `neverAmplify` (mariposa,
                      // ondulación): para esos, un mal menor es acabar en el
                      // lado contrario antes que añadir más volumen del
                      // estilo que más lesiona.
                      if (block.exerciseId !== 'test-400' && !ex.neverAmplify) {
                        expect((block.reps * block.metres) % (2 * pool)).toBe(0)
                      }
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

  it('el test de 400 mide siempre 400 exactos, en cualquier piscina y nivel', () => {
    for (const pool of POOLS) {
      for (const level of LEVELS) {
        const config = makeConfig({ pool, level })
        const sessions = buildSessions({ config, week: 1, cycleWeeks: 8 })
        const test = sessions[0]!.blocks.find((b) => b.exerciseId === 'test-400')!
        expect(test.reps * test.metres).toBe(400)
      }
    }
  })

  it('una serie que fitToPool deja en una sola repetición sigue siendo una serie, no un continuo', () => {
    // deslizamiento (6×25, aletas) sin aletas cae a bilateral (4×50): en
    // piscina de 50 fitToPool la reescribe a una tirada de 50. No debe
    // convertirse en "1×100": tiene que quedar "2×50", con descanso entre
    // medias, porque es un ejercicio de repetir y parar, no de nadar seguido.
    const config = makeConfig({ goal: 'tecnica', level: 'inicio', pool: 50, minutesPerSession: 30, equipment: [] })
    const sessions = buildSessions({ config, week: 3, cycleWeeks: 8 })
    const tecnica = sessions.find((s) => s.templateId === 't-tecnica')!
    for (const block of tecnica.blocks) {
      if (block.exerciseId === 'bilateral' || block.exerciseId === 'crol-medio') {
        expect(block.reps).toBeGreaterThan(1)
      }
    }
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

  it('paceChangePercent: positivo cuando el test nuevo es más rápido', () => {
    expect(paceChangePercent(536, 500)).toBeCloseTo(6.72, 1) // 536->500, más rápido
    expect(paceChangePercent(500, 536)).toBeLessThan(0) // más lento
    expect(paceChangePercent(500, 500)).toBe(0)
  })
})
