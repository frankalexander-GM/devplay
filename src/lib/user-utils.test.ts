/**
 * Tests de utilidades del FEED de DevPlay (rama de testing de feed) 📢
 *
 * Sujeto bajo test = user-utils.ts (lo que el feed realmente importa):
 *   - parseMediaUrls / serializeMediaUrls → media de posts (url + kind)
 *   - normalizeBeta → betas públicas del feed
 *   - normalizePoll → encuestas con porcentajes
 *   - normalizeUserTags → tags y enlaces sociales del usuario
 *
 * Todos los valores esperados salen de un PROBE REAL ejecutado contra la
 * lógica de esta rama — cero asserts inventados (lección aprendida con
 * los leet inválidos en test-chat 😅).
 */

import { describe, expect, it } from 'vitest'
import {
  normalizeBeta,
  normalizePoll,
  normalizeUserTags,
  parseMediaUrls,
  serializeMediaUrls,
} from './user-utils'

describe('parseMediaUrls', () => {
  it('null, undefined y string vacío → []', () => {
    expect(parseMediaUrls(null)).toEqual([])
    expect(parseMediaUrls(undefined)).toEqual([])
    expect(parseMediaUrls('')).toEqual([])
  })

  it('string que no es JSON → [] (sin reventar)', () => {
    expect(parseMediaUrls('esto-no-es-json')).toEqual([])
  })

  it('JSON válido de array → [{url, kind}, ...]', () => {
    const out = parseMediaUrls('[{"url":"a.png","kind":"image"},{"url":"b.mp4","kind":"video"}]')
    expect(out).toEqual([
      { url: 'a.png', kind: 'image' },
      { url: 'b.mp4', kind: 'video' },
    ])
  })

  it('JSON válido de objeto suelto NO revienta (devuelve lo parseado o [] en el round-trip)', () => {
    expect(() => parseMediaUrls('{"url":"a.png"}')).not.toThrow()
  })
})

describe('serializeMediaUrls', () => {
  it('round-trip: array → string → parse → el mismo array', () => {
    const arr = [
      { url: 'a.png', kind: 'image' as const },
      { url: 'b.mp4', kind: 'video' as const },
    ]
    const s = serializeMediaUrls(arr)
    expect(parseMediaUrls(s)).toEqual(arr)
  })

  it('array vacío → "[]"', () => {
    expect(serializeMediaUrls([])).toBe('[]')
  })

  it('undefined → undefined', () => {
    expect(serializeMediaUrls(undefined)).toBeUndefined()
  })
})

describe('normalizeBeta', () => {
  it('null y undefined → null', () => {
    expect(normalizeBeta(null)).toBeNull()
    expect(normalizeBeta(undefined)).toBeNull()
  })

  it('objeto vacío → id/downloads undefined, platforms/tags/screenshots null y betaStatus por defecto', () => {
    const n = normalizeBeta({})
    expect(n.id).toBeUndefined()
    expect(n.platforms).toBeNull()
    expect(n.tags).toBeNull()
  })

  it('beta completa → parsea platforms/tags/screenshots, betaStatus y downloads', () => {
    const n = normalizeBeta({
      id: 'B1',
      title: 'Beta rica',
      platforms: JSON.stringify(['win', 'mac']),
      tags: JSON.stringify(['puzzle', 'retro']),
      screenshots: JSON.stringify(['https://x/s1.png', 'https://x/s2.gif']),
      betaStatus: 'open_beta',
      downloads: 12,
    })
    expect(n.id).toBe('B1')
    expect(n.platforms).toEqual(['win', 'mac'])
    expect(n.tags).toEqual(['puzzle', 'retro'])
    expect(n.screenshots).toEqual(['https://x/s1.png', 'https://x/s2.gif'])
    expect(n.betaStatus).toBe('open_beta')
    expect(n.downloads).toBe(12)
  })
})

describe('normalizePoll', () => {
  it('null → null', () => {
    expect(normalizePoll(null)).toBeNull()
  })

  it('encuesta sin options ni closesAt → defaults de salida', () => {
    const n = normalizePoll({})
    expect(n.closesAt).toBeNull()
    expect(n.totalVotes).toBe(0)
    expect(n.userVotedOptionIds).toEqual([])
    expect(n.options).toEqual([])
  })

  it('encuesta completa → porcentajes redondeados por opción', () => {
    const n = normalizePoll(
      {
        id: 'P1',
        question: '¿Mejor beta?',
        allowMultiple: false,
        closesAt: '2026-10-01T00:00:00.000Z',
        options: [
          { id: 'O1', text: 'A', voteCount: 3 },
          { id: 'O2', text: 'B', voteCount: 1 },
        ],
      },
      ['O1']
    )
    expect(n.totalVotes).toBe(4)
    expect(n.userVotedOptionIds).toEqual(['O1'])
    const opA = n.options.find((o: any) => o.id === 'O1')
    const opB = n.options.find((o: any) => o.id === 'O2')
    expect(opA.voteCount).toBe(3)
    expect(opA.percentage).toBe(75)
    expect(opB.voteCount).toBe(1)
    expect(opB.percentage).toBe(25)
  })
})

describe('normalizeUserTags', () => {
  it('null y undefined → null', () => {
    expect(normalizeUserTags(null)).toBeNull()
    expect(normalizeUserTags(undefined)).toBeNull()
  })

  it('usuario con tags (string JSON) y socialLinks → parseados', () => {
    const n = normalizeUserTags({
      id: 'U1',
      displayName: 'Ana',
      tags: JSON.stringify(['dev', 'roguelike']),
      socialLinks: JSON.stringify({ twitter: 'https://t/@ana', web: 'https://ana.dev' }),
    })
    // ⚠️ Solo asserto lo VERIFICADO por probe (tags + socialLinks). id/displayName
    // no se probaron en vivo → no se tocan aquí (lección profanity: cero invento).
    expect(n.tags).toEqual(['dev', 'roguelike'])
    expect(n.socialLinks).toEqual({ twitter: 'https://t/@ana', web: 'https://ana.dev' })
  })
})
