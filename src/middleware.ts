/**
 * Middleware global de seguridad 🛡️ (tarea 33: blindaje anti-bots)
 *
 * - Tope general de peticiones a /api/* por IP (red de seguridad por si a una
 *   ruta concreta se le escapa un límite más fino).
 * - Rechaza cuerpos gigantes (413) antes de que lleguen al handler.
 *
 * Los headers de seguridad viven en next.config.ts (headers()).
 * Límites específicos (registro, login, chat...) viven en cada ruta.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimitByKey } from '@/lib/rate-limit'

const MAX_API_RPM = 300 // peticiones por minuto por IP a cualquier endpoint de la API
const MAX_BODY_BYTES = 1 * 1024 * 1024 // 1 MB por petición a la API

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Cuerpos gigantes fuera (evita OOM/flood sin ni leer el body)
  const contentLength = Number(req.headers.get('content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Cuerpo demasiado grande' },
      { status: 413 }
    )
  }

  // Tope global por IP para toda la API
  const ip = getClientIp(req)
  const rl = rateLimitByKey(`global:${ip}`, MAX_API_RPM, 60_000)
  if (!rl.ok) {
    console.warn(`[middleware] rate limit global alcanzado por ${ip} en ${pathname}`)
    return NextResponse.json(
      { error: 'Demasiadas peticiones. Respira un segundo y prueba otra vez plis 🙏' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
