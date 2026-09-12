import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * El entorno de test es `node` (vite.config.ts), sin `localStorage`. Se
 * sustituye por una versión en memoria antes de importar `storage.ts`, para
 * poder probar de verdad las escrituras sin arrastrar un DOM completo.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length(): number {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

vi.stubGlobal('localStorage', new MemoryStorage())

const { _reset, load, setTest } = await import('./storage')

beforeEach(() => {
  localStorage.clear()
  _reset()
})

describe('setTest', () => {
  it('la primera vez no tiene con qué comparar', () => {
    setTest({ date: '2026-01-05', seconds: 536 })
    const d = load()
    expect(d.test).toEqual({ date: '2026-01-05', seconds: 536 })
    expect(d.previousTest).toBeNull()
  })

  it('un test en un día distinto desplaza el anterior', () => {
    setTest({ date: '2026-01-05', seconds: 536 })
    setTest({ date: '2026-03-02', seconds: 500 })
    const d = load()
    expect(d.test).toEqual({ date: '2026-03-02', seconds: 500 })
    expect(d.previousTest).toEqual({ date: '2026-01-05', seconds: 536 })
  })

  it('repetir el test el mismo día NO borra el ciclo anterior', () => {
    // El bug real: alguien mete el tiempo mal, lo corrige un minuto después,
    // y el test del ciclo anterior no puede desaparecer solo por eso.
    setTest({ date: '2026-01-05', seconds: 536 })
    setTest({ date: '2026-03-02', seconds: 500 })
    setTest({ date: '2026-03-02', seconds: 495 }) // corrige un tecleo, mismo día
    const d = load()
    expect(d.test).toEqual({ date: '2026-03-02', seconds: 495 })
    expect(d.previousTest).toEqual({ date: '2026-01-05', seconds: 536 }) // sigue intacto
  })
})
