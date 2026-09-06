import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health — latido del corazón de DevPlay 💓
 *
 * Dos usos:
 *  1. Monitor: apunta un cron gratuito (cron-job.org, UptimeRobot) cada 2-3 días
 *     a este endpoint → cada visita cuenta como "actividad" para Supabase y el
 *     plan gratuito NUNCA pausa la base de datos (la pausa es a los 7 días sin uso).
 *  2. Diagnóstico: responde si la web y la base de datos están vivas y cuánto tardó.
 *
 * Devuelve 200 si todo va bien, 503 si la base de datos no responde
 * (así el monitor te avisa).
 */
export async function GET(_req: NextRequest) {
  const startedAt = Date.now()
  try {
    const users = await db.user.count()
    return NextResponse.json({
      ok: true,
      db: 'up',
      users,
      ms: Date.now() - startedAt,
      time: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[health] db no responde:', err instanceof Error ? err.message.slice(0, 150) : err)
    return NextResponse.json(
      { ok: false, db: 'down', ms: Date.now() - startedAt, time: new Date().toISOString() },
      { status: 503 }
    )
  }
}
