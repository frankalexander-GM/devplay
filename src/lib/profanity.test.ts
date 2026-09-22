/**
 * Tests del filtro anti-groserías del chat 🧼
 *
 * Lógica 100% pura (regex + string, sin red ni BD) → determinista, verde
 * garantizado. Cubre lo que importa para modear el chat realtime:
 *   1. Reemplazo básico conservando longitud (mierda → ******)
 *   2. Leet / trampas de escritura (pu7a, m13rda)
 *   3. Acentos (coño → **ño / cono)
 *   4. Letras repetidas (puuuta)
 *   5. Emojis pegados a la grosería se preservan (🎮****)
 *   6. Palabras inocentes con la grosería DENTRO no se tocan (conocer, penélope)
 *   7. hasProfanity true/false
 */

import { describe, expect, it } from 'vitest'
import { filterProfanity, hasProfanity } from './profanity'

describe('filterProfanity', () => {
  it('tapa una grosería básica conservando la longitud', () => {
    expect(filterProfanity('vaya mierda de día')).toBe('vaya ****** de día')
  })

  it('tapa por igual mayúsculas y minúsculas', () => {
    expect(filterProfanity('MIERDA mal')).toBe('****** mal')
    expect(filterProfanity('mierda MAL')).toBe('****** MAL')
  })

  it('detecta leet válido: pu7a (7→t), m13rda (1→i,3→e), v3rg4', () => {
    expect(filterProfanity('esto es m13rda')).toBe('esto es ******')
    expect(filterProfanity('qué pu7a situación')).toMatch(/\*\*\*\*/)
    expect(filterProfanity('dame la v3rg4')).toMatch(/\*\*\*\*\*/)
  })

  it('normaliza acentos: coño → cono, y lo tapa', () => {
    expect(filterProfanity('eres un coño')).not.toContain('coño')
    expect(filterProfanity('eres un coño')).not.toContain('cono')
  })

  it('tapa letras repetidas tipo puuuta', () => {
    expect(filterProfanity('que puuuta estrella')).not.toMatch(/p+u+t+a/i)
  })

  it('NO toca palabras inocentes que contienen la raíz (conocer, penélope)', () => {
    expect(filterProfanity('quiero conocer a penélope')).toBe('quiero conocer a penélope')
  })

  it('preserva emojis adyacentes a la grosería', () => {
    const out = filterProfanity('🎮 puta 😡')
    expect(out).toContain('🎮')
    expect(out).toContain('😡')
    expect(out).toMatch(/\*\*\*\*/)
  })

  it('devuelve vacío/undefined sin reventar', () => {
    expect(filterProfanity('')).toBe('')
    expect(filterProfanity(undefined as any)).toBeUndefined()
    expect(filterProfanity(null as any)).toBeNull()
  })

  it('texto limpio pasa intacto', () => {
    expect(filterProfanity('que bonito día hace hoy')).toBe('que bonito día hace hoy')
  })
})

describe('hasProfanity', () => {
  it('true con groserías directas y con leet', () => {
    expect(hasProfanity('esto apesta mierda')).toBe(true)
    expect(hasProfanity('qué m13rda de día')).toBe(true)
  })

  it('false con texto limpio y con raíces dentro de palabras', () => {
    expect(hasProfanity('hola qué tal')).toBe(false)
    expect(hasProfanity('quiero conocer a penélope')).toBe(false)
  })

  it('false con vacío y con null/undefined', () => {
    expect(hasProfanity('')).toBe(false)
    expect(hasProfanity(undefined as any)).toBe(false)
    expect(hasProfanity(null as any)).toBe(false)
  })
})
