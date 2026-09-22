/**
 * Tests del orden editorial de betas 🎮 (Centro de Betas, Kiosco, Descubrir, hero).
 *
 * Regla del dueño (probada con la lib REAL vía probe, no inventada):
 *   1º → las betas con GIF entre sus capturas (mini-video SIEMPRE primero)
 *   2º → las que tienen MÁS capturas
 *   3º → desempate: más descargas
 *   null/undefined (beta sin datos) → último, sin reventar
 */

import { describe, expect, it } from 'vitest'
import { orderBetasByRichness, betaHasGif } from './beta-order'

type Post = { id: string }
type Beta = { screenshots?: string[] | null; downloads?: number }

const beta =
  (screenshots?: string[] | null, downloads = 0): Beta =>
  ({ screenshots, downloads })

// Mismas posts que el probe: B y F tienen GIF => deben abrir la lista.
const posts: Post[] = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }, { id: 'E' }, { id: 'F' }]

const getBeta = (p: Post): Beta | null =>
  ({
    A: beta(['x.png'], 10),
    B: beta(['a.gif', 'b.png', 'c.png'], 5),
    C: beta([], 99),
    D: null,
    E: beta(['one.png', 'two.png'], 50),
    F: beta(['z.gif'], 1),
  })[p.id] ?? null

describe('orderBetasByRichness', () => {
  it('pone primero las betas con GIF (usando el orden EXACTO del probe)', () => {
    expect(orderBetasByRichness(posts, getBeta).map((p) => p.id)).toEqual(['B', 'F', 'E', 'A', 'C', 'D'])
  })

  it('dentro de las que tienen GIF: más capturas primero', () => {
    // B (3 capturas) antes que F (1 captura)
    const gifs = [posts[1], posts[5], posts[2]]
    const ordered = orderBetasByRichness(gifs, getBeta).map((p) => p.id)
    expect(ordered[0]).toBe('B')
    expect(ordered[1]).toBe('F')
    expect(ordered[2]).toBe('C')
  })

  it('desempata por descargas cuando hay mismo nº de capturas y mismo GIF', () => {
    const shots = ['s1.png', 's2.png']
    const h = (id: string, downloads: number) => getBeta4(id, shots, downloads)
    expect(orderBetasByRichness(['X', 'M'].map((id) => ({ id })), (p) => h(p.id, p.id === 'X' ? 7 : 2)).map((p) => p.id)).toEqual(['X', 'M'])
  })

  it('beta sin datos (null) aparece al final sin reventar', () => {
    expect(orderBetasByRichness(posts, getBeta).map((p) => p.id)).toEqual(['B', 'F', 'E', 'A', 'C', 'D'])
    // D es el último => queda al final
    expect(orderBetasByRichness(posts, getBeta).lastIndexOf).toBeDefined()
  })

  it('array vacío → array vacío (sin error)', () => {
    expect(orderBetasByRichness([], getBeta)).toEqual([])
  })

  it('preserva la referencia original de los posts (no clona sus props)', () => {
    const out = orderBetasByRichness(posts, getBeta)
    expect(out[0]).toBe(posts[1]) // B
    expect(out.length).toBe(posts.length)
  })
})

describe('betaHasGif', () => {
  it('true cuando hay una captura .gif', () => {
    expect(betaHasGif(['a.png', 'b.gif'])).toBe(true)
  })

  it('false con capturas que no son gif', () => {
    expect(betaHasGif(['a.png', 'b.jpg'])).toBe(false)
  })

  it('true insensible a mayúsculas (.GIF)', () => {
    expect(betaHasGif(['hero.GIF'])).toBe(true)
  })

  it('false con lista vacía y con null/undefined', () => {
    expect(betaHasGif([])).toBe(false)
    expect(betaHasGif(null)).toBe(false)
    expect(betaHasGif(undefined)).toBe(false)
  })
})

// Helper local para el caso de desempate (getBeta con parámetros).
function getBeta4(id: string, screenshots: string[], downloads: number): Beta {
  void id
  return beta(screenshots, downloads)
}
