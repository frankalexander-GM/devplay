/**
 * Tests de la firma/verificación del token realtime 🔐
 *
 * Son funciones 100% puras (HMAC + base64url, sin red ni BD) → estos tests
 * son deterministas y pasan SIEMPRE, en cualquier máquina.
 *
 * Cubren los casos de seguridad reales:
 *  1. Round-trip: firmar y verificar devuelve el payload original
 *  2. Token manipulado (se cambió el uid) → rechazado (null)
 *  3. Token con secreto equivocado → rechazado (null)
 *  4. Token expirado → rechazado (null)
 *  5. Formato corrupto → rechazado (null)
 */

import { describe, expect, it } from 'vitest'
import { createHmac } from 'crypto'
import {
  b64url,
  signRealtimeToken,
  verifyRealtimeToken,
  type RealtimeTokenPayload,
} from './realtime-token'

const SECRET = 'test-secret-para-devplay-2026'
const NOW = 1_750_000_000_000

describe('signRealtimeToken', () => {
  it('produce un token con formato <exp>.<payload>.<sig> (3 segmentos)', () => {
    const { token } = signRealtimeToken(SECRET, 'u_123', 'frank', NOW)
    const parts = token.split('.')
    expect(parts).toHaveLength(3)
    expect(Number(parts[0])).toBeGreaterThan(NOW) // exp futuro
  })

  it('firma determinista: mismo input → mismo token', () => {
    const a = signRealtimeToken(SECRET, 'u_123', 'frank', NOW)
    const b = signRealtimeToken(SECRET, 'u_123', 'frank', NOW)
    expect(a.token).toBe(b.token)
  })

  it('el payload viaja en base64url con uid y un legibles', () => {
    const { token } = signRealtimeToken(SECRET, 'u_456', 'devplay', NOW)
    const payloadB64 = token.split('.')[1]
    const decoded = JSON.parse(Buffer.from(payloadB64!, 'base64url').toString('utf8'))
    expect(decoded.uid).toBe('u_456')
    expect(decoded.un).toBe('devplay')
    expect(decoded.exp).toBeGreaterThan(NOW)
  })
})

describe('verifyRealtimeToken', () => {
  it('round-trip: un token bien firmado se verifica y devuelve el payload', () => {
    const { token } = signRealtimeToken(SECRET, 'u_123', 'frank', NOW)
    const payload: RealtimeTokenPayload | null = verifyRealtimeToken(SECRET, token, NOW)
    expect(payload).not.toBeNull()
    expect(payload!.uid).toBe('u_123')
    expect(payload!.un).toBe('frank')
  })

  it('rechaza un token al que le cambiaron el uid (manipulación)', () => {
    const { token } = signRealtimeToken(SECRET, 'u_123', 'frank', NOW)
    // Cambiamos el uid dentro del payload SIN refirmar → HMAC inválido
    const [exp, , sig] = token.split('.')
    const forgedPayload = b64url(JSON.stringify({ uid: 'u_MALO', un: 'frank', exp: +exp! }))
    const forged = [exp, forgedPayload, sig].join('.')
    expect(verifyRealtimeToken(SECRET, forged, NOW)).toBeNull()
  })

  it('rechaza si el secreto no coincide', () => {
    const { token } = signRealtimeToken(SECRET, 'u_123', 'frank', NOW)
    expect(verifyRealtimeToken('otro-secreto-distinto', token, NOW)).toBeNull()
  })

  it('rechaza un token expirado', () => {
    const { token } = signRealtimeToken(SECRET, 'u_123', 'frank', NOW)
    // Verificamos en un momento posterior a la expiración (30 min TTL)
    const later = NOW + 31 * 60 * 1000
    expect(verifyRealtimeToken(SECRET, token, later)).toBeNull()
  })

  it('rechaza formatos corruptos (sin exp, sin firma, basura)', () => {
    expect(verifyRealtimeToken(SECRET, '', NOW)).toBeNull()
    expect(verifyRealtimeToken(SECRET, 'solo-un-segmento', NOW)).toBeNull()
    expect(verifyRealtimeToken(SECRET, 'abc.def', NOW)).toBeNull()
    expect(verifyRealtimeToken(SECRET, 'no-es-hmac', NOW)).toBeNull()
    expect(verifyRealtimeToken(SECRET, '0..', NOW)).toBeNull()
  })
})

describe('interoperabilidad con la lógica de HMAC real', () => {
  it('la firma coincide con createHmac-sha256 manual (misma receta del backend)', () => {
    const uid = 'u_888'
    const un = 'pepe'
    const exp = NOW + 30 * 60 * 1000
    const payload = b64url(JSON.stringify({ uid, un, exp }))

    const manualSig = createHmac('sha256', SECRET)
      .update(`${exp}.${payload}`)
      .digest('base64url')

    const { token } = signRealtimeToken(SECRET, uid, un, NOW)
    const parts = token.split('.')
    expect(parts[2]).toBe(manualSig) // la firma del lib ES la misma receta
  })
})
