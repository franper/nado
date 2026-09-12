import type { Effort, Intensity, SessionKind } from './types'

/**
 * Gasto calórico y ritmos.
 *
 * kcal = MET × peso(kg) × horas.
 *
 * Los MET salen del Compendium of Physical Activities: crol suave 5,8; crol
 * rápido y vigoroso 9,8; espalda en entrenamiento 10,3; calistenia moderada
 * 3,8. A cada intensidad de sesión se le asigna un valor intermedio, ajustado
 * a la baja porque parte del tiempo se pasa parado en la pared.
 *
 * Es una estimación, no una medición: puede desviarse un 20-30 % según la
 * técnica, la temperatura del agua y la eficiencia de cada persona. Sirve para
 * comparar semanas entre sí, no como cifra absoluta.
 */

export const MET_BY_INTENSITY: Record<Intensity, number> = {
  suave: 5.8,
  moderada: 6.5,
  firme: 7.5,
  fuerte: 8.5,
}

/** Calistenia moderada, 3,8 MET. */
export const MET_DRY_LAND = 3.8

export const EFFORT_FACTOR: Record<Effort, number> = {
  suave: 0.85,
  normal: 1,
  fuerte: 1.15,
}

export function metFor(kind: SessionKind, intensity: Intensity): number {
  return kind === 'seco' ? MET_DRY_LAND : MET_BY_INTENSITY[intensity]
}

export function kcal(args: {
  kind: SessionKind
  intensity: Intensity
  weightKg: number
  minutes: number
  effort: Effort
}): number {
  const met = metFor(args.kind, args.intensity)
  return Math.round(met * EFFORT_FACTOR[args.effort] * args.weightKg * (args.minutes / 60))
}

// ---------------------------------------------------------------- ritmos

/** Ritmo por 100 m, en segundos, a partir de un test de 400 m. */
export function pacePer100(testSeconds: number, distance = 400): number {
  if (testSeconds <= 0 || distance <= 0) return 0
  return (testSeconds / distance) * 100
}

/**
 * Ritmos de entrenamiento derivados del test, como porcentaje del ritmo del
 * test. Un número mayor significa más lento.
 */
export const PACE_ZONES = {
  suave: 1.15,
  medio: 1.07,
  umbral: 1.0,
  fuerte: 0.94,
} as const

export type PaceZone = keyof typeof PACE_ZONES

export function zonePace(testSeconds: number, zone: PaceZone): number {
  return pacePer100(testSeconds) * PACE_ZONES[zone]
}

/**
 * % de cambio entre dos valores de ritmo (segundos por 100 m). Positivo =
 * más rápido. Es una simple diferencia porcentual: si los dos tests fueron
 * a la misma distancia, comparar segundos totales o ritmo por 100 da lo
 * mismo, pero si uno no llegó a los 400 hace falta pasar por `pacePer100`
 * primero para que la comparación tenga sentido.
 */
export function paceChangePercent(previousPace: number, currentPace: number): number {
  if (previousPace <= 0) return 0
  return ((previousPace - currentPace) / previousPace) * 100
}

/** Segundos → "m:ss". */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '—'
  const total = Math.round(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Ritmo objetivo de un bloque, en segundos, para una distancia dada. */
export function targetTime(testSeconds: number, zone: PaceZone, metres: number): number {
  return (zonePace(testSeconds, zone) * metres) / 100
}

// ---------------------------------------------------------------- IMC

export function bmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0
  const m = heightCm / 100
  return weightKg / (m * m)
}
