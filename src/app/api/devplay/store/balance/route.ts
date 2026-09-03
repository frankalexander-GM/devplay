import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getViewerId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return session.user.id
  return req.cookies.get('devplay-guest-id')?.value ?? null
}

/**
 * GET /api/devplay/store/balance
 * Devuelve el balance de DevCoins del usuario + transacciones recientes.
 */
export async function GET(req: NextRequest) {
  const userId = await getViewerId(req)
  if (!userId) {
    return NextResponse.json({ balance: 0, transactions: [] })
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { devCoins: true },
  })

  const transactions = await db.devCoinTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({
    balance: user?.devCoins ?? 0,
    transactions: transactions.map((t) => ({
      id: t.id,
      userId: t.userId,
      amount: t.amount,
      type: t.type,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  })
}
