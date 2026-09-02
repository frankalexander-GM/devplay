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

interface Achievement {
  id: string
  label: string
  description: string
  emoji: string
  unlocked: boolean
  progress: number
  target: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
}

/**
 * GET /api/devplay/users/me/achievements
 * Calcula los logros del usuario basados en su actividad.
 */
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ achievements: [], totalUnlocked: 0 })

  const [posts, comments, likes, betas, followers, following, bookmarks] = await Promise.all([
    db.post.count({ where: { authorId: userId, type: 'POST' } }),
    db.comment.count({ where: { userId } }),
    db.like.count({ where: { userId } }),
    db.beta.count({ where: { post: { authorId: userId } } }),
    db.follow.count({ where: { followeeId: userId } }),
    db.follow.count({ where: { followerId: userId } }),
    db.bookmark.count({ where: { userId } }),
  ])

  const betaDownloadsAgg = await db.beta.aggregate({
    where: { post: { authorId: userId } },
    _sum: { downloads: true },
  })
  const totalDownloads = betaDownloadsAgg._sum.downloads ?? 0

  const receivedLikesAgg = await db.post.findMany({
    where: { authorId: userId },
    select: { _count: { select: { likes: true } } },
  })
  const totalLikesReceived = receivedLikesAgg.reduce((sum, p) => sum + p._count.likes, 0)

  const receivedCommentsAgg = await db.post.findMany({
    where: { authorId: userId },
    select: { _count: { select: { comments: true } } },
  })
  const totalCommentsReceived = receivedCommentsAgg.reduce((sum, p) => sum + p._count.comments, 0)

  // Stream count
  const streamsCount = await db.stream.count({ where: { userId } })

  const achievements: Achievement[] = [
    // Publicaciones
    { id: 'first-post', label: 'Primer paso', description: 'Publica tu primera publicación', emoji: '📝', unlocked: posts >= 1, progress: Math.min(posts, 1), target: 1, tier: 'bronze' },
    { id: 'posts-10', label: 'Activo', description: 'Publica 10 publicaciones', emoji: '✍️', unlocked: posts >= 10, progress: Math.min(posts, 10), target: 10, tier: 'silver' },
    { id: 'posts-50', label: 'Prolífico', description: 'Publica 50 publicaciones', emoji: '📚', unlocked: posts >= 50, progress: Math.min(posts, 50), target: 50, tier: 'gold' },
    // Betas
    { id: 'first-beta', label: 'Desarrollador', description: 'Sube tu primera beta', emoji: '🎮', unlocked: betas >= 1, progress: Math.min(betas, 1), target: 1, tier: 'bronze' },
    { id: 'betas-5', label: 'Estudio indie', description: 'Sube 5 betas', emoji: '🕹️', unlocked: betas >= 5, progress: Math.min(betas, 5), target: 5, tier: 'silver' },
    { id: 'betas-10', label: 'Estudio pro', description: 'Sube 10 betas', emoji: '🏆', unlocked: betas >= 10, progress: Math.min(betas, 10), target: 10, tier: 'gold' },
    // Descargas
    { id: 'downloads-10', label: 'Probado', description: 'Consigue 10 descargas', emoji: '⬇️', unlocked: totalDownloads >= 10, progress: Math.min(totalDownloads, 10), target: 10, tier: 'bronze' },
    { id: 'downloads-100', label: 'Popular', description: 'Consigue 100 descargas', emoji: '🔥', unlocked: totalDownloads >= 100, progress: Math.min(totalDownloads, 100), target: 100, tier: 'silver' },
    { id: 'downloads-1000', label: 'Viral', description: 'Consigue 1000 descargas', emoji: '💥', unlocked: totalDownloads >= 1000, progress: Math.min(totalDownloads, 1000), target: 1000, tier: 'platinum' },
    // Likes
    { id: 'likes-10', label: 'Apreciado', description: 'Recibe 10 likes', emoji: '❤️', unlocked: totalLikesReceived >= 10, progress: Math.min(totalLikesReceived, 10), target: 10, tier: 'bronze' },
    { id: 'likes-100', label: 'Querido', description: 'Recibe 100 likes', emoji: '💖', unlocked: totalLikesReceived >= 100, progress: Math.min(totalLikesReceived, 100), target: 100, tier: 'silver' },
    // Comentarios
    { id: 'comments-5', label: 'Conversador', description: 'Comenta 5 veces', emoji: '💬', unlocked: comments >= 5, progress: Math.min(comments, 5), target: 5, tier: 'bronze' },
    { id: 'comments-50', label: 'Sociable', description: 'Comenta 50 veces', emoji: '🗣️', unlocked: comments >= 50, progress: Math.min(comments, 50), target: 50, tier: 'silver' },
    // Seguidores
    { id: 'followers-1', label: 'Seguido', description: 'Consigue tu primer seguidor', emoji: '👥', unlocked: followers >= 1, progress: Math.min(followers, 1), target: 1, tier: 'bronze' },
    { id: 'followers-10', label: 'Influencer', description: 'Consigue 10 seguidores', emoji: '⭐', unlocked: followers >= 10, progress: Math.min(followers, 10), target: 10, tier: 'silver' },
    { id: 'followers-100', label: 'Estrella', description: 'Consigue 100 seguidores', emoji: '🌟', unlocked: followers >= 100, progress: Math.min(followers, 100), target: 100, tier: 'gold' },
    // Streams
    { id: 'first-stream', label: 'Streamear', description: 'Haz tu primer directo', emoji: '📡', unlocked: streamsCount >= 1, progress: Math.min(streamsCount, 1), target: 1, tier: 'bronze' },
    { id: 'streams-10', label: 'Streamer', description: 'Haz 10 directos', emoji: '🎬', unlocked: streamsCount >= 10, progress: Math.min(streamsCount, 10), target: 10, tier: 'silver' },
    // Exploración
    { id: 'likes-given-10', label: 'Generoso', description: 'Da 10 likes', emoji: '👍', unlocked: likes >= 10, progress: Math.min(likes, 10), target: 10, tier: 'bronze' },
    { id: 'bookmarks-5', label: 'Coleccionista', description: 'Guarda 5 publicaciones', emoji: '🔖', unlocked: bookmarks >= 5, progress: Math.min(bookmarks, 5), target: 5, tier: 'bronze' },
    { id: 'following-5', label: 'Curioso', description: 'Sigue a 5 usuarios', emoji: '👀', unlocked: following >= 5, progress: Math.min(following, 5), target: 5, tier: 'bronze' },
  ]

  const totalUnlocked = achievements.filter(a => a.unlocked).length

  return NextResponse.json({ achievements, totalUnlocked, total: achievements.length })
}
