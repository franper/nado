import type { AppData, Config, PlanSession, SessionLog, Settings, TestResult, WeightLog } from './types'
import { DATA_VERSION, emptyData } from './types'

/**
 * Almacenamiento local, detrás de una capa tipada.
 *
 * Va sobre localStorage a propósito. IndexedDB suena más serio, pero el riesgo
 * real es que el sistema borre el almacenamiento del origen entero, y eso le
 * pasa igual a las dos. Con unos cientos de KB, localStorage es suficiente y
 * mucho más simple. Esta capa existe para poder cambiarlo sin tocar la app.
 */

const KEY = 'nado'

type Listener = (data: AppData) => void

let cache: AppData | null = null
const listeners = new Set<Listener>()

function migrate(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') return emptyData()
  const d = raw as Partial<AppData>
  const base = emptyData()
  // Versión 1 es la primera. Las migraciones futuras van aquí, en cadena.
  return {
    version: DATA_VERSION,
    config: d.config ?? base.config,
    test: d.test ?? null,
    previousTest: d.previousTest ?? null,
    plan: d.plan ?? null,
    overrides: d.overrides ?? {},
    logs: d.logs ?? {},
    weights: d.weights ?? {},
    settings: { ...base.settings, ...(d.settings ?? {}) },
  }
}

export function load(): AppData {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? migrate(JSON.parse(raw)) : emptyData()
  } catch {
    cache = emptyData()
  }
  return cache
}

function commit(next: AppData): void {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Cuota llena o almacenamiento bloqueado: la sesión sigue en memoria.
  }
  for (const fn of listeners) fn(next)
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function update(fn: (d: AppData) => AppData): AppData {
  const next = fn(load())
  commit(next)
  return next
}

// ---------------------------------------------------------------- escrituras

export const setConfig = (config: Config): void => {
  update((d) => ({ ...d, config }))
}

export const setTest = (test: TestResult): void => {
  update((d) => {
    // Si se repite el test el mismo día (por ejemplo, corrigiendo un tecleo),
    // no se debe desplazar el test anterior: si no, el ciclo previo se
    // pierde para siempre solo por haber guardado dos veces en un rato.
    const sameDay = d.test?.date === test.date
    return {
      ...d,
      previousTest: sameDay ? d.previousTest : d.test,
      test,
    }
  })
}

export const setPlan = (plan: AppData['plan']): void => {
  update((d) => ({ ...d, plan }))
}

export const setSettings = (patch: Partial<Settings>): void => {
  update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
}

export const saveOverride = (session: PlanSession): void => {
  update((d) => ({ ...d, overrides: { ...d.overrides, [session.id]: session } }))
}

export const clearOverride = (id: string): void => {
  update((d) => {
    const next = { ...d.overrides }
    delete next[id]
    return { ...d, overrides: next }
  })
}

export const addLog = (log: SessionLog): void => {
  update((d) => ({ ...d, logs: { ...d.logs, [log.id]: log } }))
}

export const removeLog = (id: string): void => {
  update((d) => {
    const next = { ...d.logs }
    delete next[id]
    return { ...d, logs: next }
  })
}

export const addWeight = (w: WeightLog): void => {
  update((d) => ({ ...d, weights: { ...d.weights, [w.id]: w } }))
}

// ---------------------------------------------------------------- copia

export function exportJson(): string {
  return JSON.stringify({ ...load(), _app: 'nado', _exported: new Date().toISOString() }, null, 2)
}

export interface ImportResult {
  ok: boolean
  logs: number
  reason?: 'formato' | 'lectura'
}

export function importJson(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, logs: 0, reason: 'lectura' }
  }
  if (!parsed || typeof parsed !== 'object' || (parsed as { _app?: string })._app !== 'nado') {
    return { ok: false, logs: 0, reason: 'formato' }
  }
  const incoming = migrate(parsed)
  update((d) => ({
    ...incoming,
    // Nunca se pierden registros existentes: se fusionan.
    logs: { ...d.logs, ...incoming.logs },
    weights: { ...d.weights, ...incoming.weights },
  }))
  return { ok: true, logs: Object.keys(incoming.logs).length }
}

/** Solo para pruebas. */
export function _reset(): void {
  cache = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}
