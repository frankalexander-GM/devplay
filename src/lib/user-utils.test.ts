/**
 * Tests del PERFIL de usuario en DevPlay 👤 (rama feature/test-perfil)
 *
 * Sujeto bajo test = `user-utils.ts` → función `normalizeUserTags` (la que el
 * perfil público usa para normalizar tags del usuario + socialLinks).
 *
 * TODOS los valores esperados salen de un PROBE REAL ejecutado contra el
 * archivo de ESTA rama — cero asserts inventados:
 *
 *   normalizeUserTags(null|undefined)           => null
 *   sin tags/socialLinks (solo id+names)        => tags:null  socialLinks:null
 *   tags string JSON + socialLinks string JSON  => parseados a array/objeto ✓
 *   tags como ARRAY directo                     => []     (espera string JSON)
 *   tags string NO-JSON                         => []     (no revienta)
 *   socialLinks como OBJETO directo             => null   (espera string JSON)
 */

import { describe, expect, it } from 'vitest'
import { normalizeUserTags } from './user-utils'

describe('normalizeUserTags (perfil)', () => {
  it('null y undefined → null (probe: null)', () => {
    expect(normalizeUserTags(null)).toBeNull()
    expect(normalizeUserTags(undefined)).toBeNull()
  })

  it('solo id/displayName/username → los preserva y tags/socialLinks a null (probe: null/null)', () => {
    const n = normalizeUserTags({ id: 'U1', displayName: 'Ana', username: 'ana' })
    expect(n.id).toBe('U1')
    expect(n.displayName).toBe('Ana')
    expect(n.username).toBe('ana')
    expect(n.tags).toBeNull()
    expect(n.socialLinks).toBeNull()
  })

  it('tags y socialLinks como STRING JSON → parseados (probe: array + objeto)', () => {
    const n = normalizeUserTags({
      id: 'U1',
      displayName: 'Ana',
      username: 'ana',
      tags: JSON.stringify(['dev', 'roguelike']),
      socialLinks: JSON.stringify({ twitter: 'https://t/@ana', web: 'https://ana.dev' }),
    })
    expect(n.id).toBe('U1')
    expect(n.displayName).toBe('Ana')
    expect(n.username).toBe('ana')
    expect(n.tags).toEqual(['dev', 'roguelike'])
    expect(n.socialLinks).toEqual({ twitter: 'https://t/@ana', web: 'https://ana.dev' })
  })

  it('tags como ARRAY directo (no string JSON) → tags a [] (probe: descarta)', () => {
    const n = normalizeUserTags({ id: 'U2', tags: ['dev', 'roguelike'], socialLinks: null })
    expect(n.tags).toEqual([])
    expect(n.socialLinks).toBeNull()
  })

  it('tags string que NO es JSON → [] sin reventar (probe: no-JSON → [])', () => {
    const n = normalizeUserTags({ id: 'U3', tags: 'esto-no-es-json', socialLinks: null })
    expect(n.tags).toEqual([])
    expect(n.socialLinks).toBeNull()
  })

  it('socialLinks como OBJETO directo (no string JSON) → socialLinks a null (probe: descarta)', () => {
    const n = normalizeUserTags({
      id: 'U4',
      tags: ['dev'],
      socialLinks: { github: 'https://github.com/ana', web: 'https://ana.dev' },
    })
    expect(n.socialLinks).toBeNull()
    // probe: tags array directo también se descarta → []
    expect(n.tags).toEqual([])
  })
})
