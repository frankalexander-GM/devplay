import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return session.user.id
  const guestId = req.cookies.get('devplay-guest-id')?.value
  if (guestId) {
    const guest = await db.user.findUnique({ where: { id: guestId } })
    if (guest && !guest.isGuest) return guest.id
  }
  return null
}

/**
 * GET /api/devplay/users/me/stats
 * Estadísticas del usuario actual para mostrar en el perfil.
 */
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ stats: null })

  const [posts, comments, likes, betas, followers, following, bookmarks] = await Promise.all([
    db.post.count({ where: { authorId: userId } }),
    db.comment.count({ where: { userId } }),
    db.like.count({ where: { userId } }),
    db.beta.count({ where: { post: { authorId: userId } } }),
    db.follow.count({ where: { followeeId: userId } }),
    db.follow.count({ where: { followerId: userId } }),
    db.bookmark.count({ where: { userId } }),
  ])

  // Total de descargas de todas las betas del usuario
  const betaDownloadsAgg = await db.beta.aggregate({
    where: { post: { authorId: userId } },
    _sum: { downloads: true },
  })
  const totalDownloads = betaDownloadsAgg._sum.downloads ?? 0

  // Total de likes recibidos en todos los posts
  const receivedLikesAgg = await db.post.findMany({
    where: { authorId: userId },
    select: { _count: { select: { likes: true } } },
  })
  const totalLikesReceived = receivedLikesAgg.reduce((sum, p) => sum + p._count.likes, 0)

  // Total de comentarios recibidos
  const receivedCommentsAgg = await db.post.findMany({
    where: { authorId: userId },
    select: { _count: { select: { comments: true } } },
  })
  const totalCommentsReceived = receivedCommentsAgg.reduce((sum, p) => sum + p._count.comments, 0)

  // Actividad de los últimos 7 días (posts creados por día)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentPosts = await db.post.findMany({
    where: { authorId: userId, createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, type: true },
  })

  const activityByDay: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = recentPosts.filter((p) => p.createdAt.toISOString().split('T')[0] === dateStr).length
    activityByDay.push({ date: dateStr, count })
  }

  // Calcular nivel: 1 punto por post, 2 por beta, 1 por like recibido, 3 por seguidor
  const points = posts + betas * 2 + totalLikesReceived + followers * 3
  const level = Math.floor(points / 10) + 1
  const pointsForNextLevel = level * 10
  const progressToNext = ((points % 10) / 10) * 100

  return NextResponse.json({
    stats: {
      posts,
      comments,
      likes: likes,
      betas,
      followers,
      following,
      bookmarks,
      totalDownloads,
      totalLikesReceived,
      totalCommentsReceived,
      points,
      level,
      pointsForNextLevel,
      progressToNext,
      activityByDay,
    },
  })
}
