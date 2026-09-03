import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/devplay/store/items
 * Devuelve todos los artículos de la tienda agrupados por categoría.
 */
export async function GET() {
  const items = await db.storeItem.findMany({
    orderBy: [{ category: 'asc' }, { price: 'asc' }],
  })

  // Agrupar por categoría
  const grouped: Record<string, typeof items> = {
    powerup: [],
    avatar: [],
    premium: [],
    bundle: [],
  }
  for (const it of items) {
    if (!grouped[it.category]) grouped[it.category] = []
    grouped[it.category].push(it)
  }

  return NextResponse.json({ items, grouped })
}
