import { describe, expect, it } from 'vitest'
import { EXERCISE_BY_ID, EXERCISES } from './exercises'
import { FALLBACK_TEMPLATE, RECIPES, TEMPLATE_BY_ID, TEMPLATES } from './templates'

/**
 * Test de integridad del catálogo, pendiente desde el principio (ver
 * CLAUDE.md). `RECIPES` es el único sitio del contenido sin red de
 * seguridad de tipos: un id mal escrito ahí no rompe nada visible, solo
 * hace que el objetivo pierda esa plantilla en silencio. Esto lo cierra.
 */
describe('integridad del catálogo de contenido', () => {
  it('todo id de RECIPES existe como plantilla', () => {
    for (const [goal, ids] of Object.entries(RECIPES)) {
      for (const id of ids) {
        expect(TEMPLATE_BY_ID.has(id), `${goal}: plantilla desconocida "${id}"`).toBe(true)
      }
    }
  })

  it('la plantilla de repuesto existe', () => {
    expect(TEMPLATE_BY_ID.has(FALLBACK_TEMPLATE)).toBe(true)
  })

  it('todo exerciseId, fallback y candidato de rotación existe en el catálogo', () => {
    for (const template of TEMPLATES) {
      for (const block of template.blocks) {
        expect(EXERCISE_BY_ID.has(block.exerciseId), `${template.id}: ejercicio desconocido "${block.exerciseId}"`).toBe(true)
        for (const alt of block.fallbacks ?? []) {
          expect(EXERCISE_BY_ID.has(alt), `${template.id}: fallback desconocido "${alt}"`).toBe(true)
        }
        for (const alt of block.styleRotation ?? []) {
          expect(EXERCISE_BY_ID.has(alt), `${template.id}: candidato de rotación desconocido "${alt}"`).toBe(true)
        }
      }
    }
  })

  it('no hay plantillas huérfanas', () => {
    const referenced = new Set<string>(['t-test']) // se inserta a mano en la semana 1
    for (const ids of Object.values(RECIPES)) for (const id of ids) referenced.add(id)
    referenced.add(FALLBACK_TEMPLATE)
    for (const template of TEMPLATES) {
      expect(referenced.has(template.id), `plantilla huérfana: "${template.id}"`).toBe(true)
    }
  })

  it('no hay ejercicios huérfanos', () => {
    const referenced = new Set<string>()
    for (const template of TEMPLATES) {
      for (const block of template.blocks) {
        referenced.add(block.exerciseId)
        for (const alt of block.fallbacks ?? []) referenced.add(alt)
        for (const alt of block.styleRotation ?? []) referenced.add(alt)
      }
    }
    for (const ex of EXERCISES) {
      expect(referenced.has(ex.id), `ejercicio huérfano: "${ex.id}"`).toBe(true)
    }
  })

  it('ningún texto está vacío, en ninguno de los dos idiomas', () => {
    for (const ex of EXERCISES) {
      for (const lang of ['es', 'en'] as const) {
        const text = ex[lang]
        expect(text.name.trim(), `${ex.id}.${lang}.name`).not.toBe('')
        expect(text.query.trim(), `${ex.id}.${lang}.query`).not.toBe('')
        expect(text.detail.length, `${ex.id}.${lang}.detail`).toBeGreaterThan(0)
        for (const p of text.detail) {
          expect(p.trim(), `${ex.id}.${lang}.detail[]`).not.toBe('')
        }
      }
    }
    for (const t of TEMPLATES) {
      expect(t.nameEs.trim(), `${t.id}.nameEs`).not.toBe('')
      expect(t.nameEn.trim(), `${t.id}.nameEn`).not.toBe('')
    }
  })
})
