import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { serializeMediaUrls, parseMediaUrls, normalizeBeta, normalizeUserTags, normalizePoll } from '@/lib/user-utils'
import { z } from 'zod'

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

async function getViewerId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return session.user.id
  return req.cookies.get('devplay-guest-id')?.value ?? null
}

/**
 * GET /api/devplay/posts?type=POST|BETA|STREAM|POLL&authorId=...&live=1&media=video&feed=following|news|foryou
 * Filtra posts de usuarios bloqueados.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') // POST | BETA | STREAM | POLL
  const authorId = searchParams.get('authorId')
  const liveOnly = searchParams.get('live') === '1'
  const mediaFilter = searchParams.get('media') // 'video' | 'image'
  const feed = searchParams.get('feed') // 'following' | 'news' | 'foryou'
  const viewerId = await getViewerId(req)

  // Obtener IDs de usuarios bloqueados por el viewer y que bloquearon al viewer
  let blockedIds: string[] = []
  if (viewerId) {
    const [blocked, blockedBy] = await Promise.all([
      db.block.findMany({ where: { blockerId: viewerId }, select: { blockedId: true } }),
      db.block.findMany({ where: { blockedId: viewerId }, select: { blockerId: true } }),
    ])
    blockedIds = [...blocked.map(b => b.blockedId), ...blockedBy.map(b => b.blockerId)]
  }

  // Para feed=following, obtener lista de seguidos
  let followingIds: string[] = []
  if (feed === 'following' && viewerId) {
    const following = await db.follow.findMany({
      where: { followerId: viewerId },
      select: { followeeId: true },
    })
    followingIds = following.map(f => f.followeeId)
    // Si no sigue a nadie, devolver vacío
    if (followingIds.length === 0) {
      return NextResponse.json({ posts: [] })
    }
  }

  const posts = await db.post.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(authorId ? { authorId } : {}),
      ...(liveOnly ? { stream: { isLive: true } } : {}),
      // Feed following: solo posts de seguidos
      ...(feed === 'following' && followingIds.length > 0 ? { authorId: { in: followingIds } } : {}),
      // Feed news: solo posts de tipo POST con contenido (no betas/streams/polls)
      ...(feed === 'news' ? { type: 'POST', content: { not: null } } : {}),
      // Excluir posts de usuarios bloqueados
      ...(blockedIds.length > 0 ? { authorId: { notIn: blockedIds } } : {}),
    },
    include: {
      author: {
        select: { id: true, username: true, avatar: true, role: true, tags: true },
      },
      beta: true,
      stream: true,
      poll: { include: { options: true } },
      repostOf: {
        include: {
          author: { select: { id: true, username: true, avatar: true, role: true, tags: true } },
          beta: true,
          stream: true,
          poll: { include: { options: true } },
          _count: { select: { likes: true, comments: true } },
        },
      },
      _count: { select: { likes: true, comments: true, reposts: true } },
      likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Recoger votos del viewer para todas las encuestas del resultado (en una sola query)
  const allPollIds = [
    ...posts.map((p) => p.poll?.id).filter(Boolean) as string[],
    ...posts.map((p) => p.repostOf?.poll?.id).filter(Boolean) as string[],
  ]
  let viewerVotesByPoll: Record<string, string[]> = {}
  if (viewerId && allPollIds.length > 0) {
    const votes = await db.pollVote.findMany({
      where: { pollId: { in: allPollIds }, userId: viewerId },
      select: { pollId: true, optionId: true },
    })
    for (const v of votes) {
      if (!viewerVotesByPoll[v.pollId]) viewerVotesByPoll[v.pollId] = []
      viewerVotesByPoll[v.pollId].push(v.optionId)
    }
  }

  const result = posts.map((p) => ({
    id: p.id,
    type: p.type,
    content: p.content,
    mediaUrls: parseMediaUrls(p.mediaUrls),
    createdAt: p.createdAt,
    author: normalizeUserTags(p.author),
    beta: normalizeBeta(p.beta),
    stream: p.stream,
    poll: normalizePoll(p.poll, p.poll ? (viewerVotesByPoll[p.poll.id] ?? []) : []),
    repostOf: p.repostOf ? {
      id: p.repostOf.id,
      type: p.repostOf.type,
      content: p.repostOf.content,
      mediaUrls: parseMediaUrls(p.repostOf.mediaUrls),
      createdAt: p.repostOf.createdAt,
      author: normalizeUserTags(p.repostOf.author),
      beta: normalizeBeta(p.repostOf.beta),
      stream: p.repostOf.stream,
      poll: normalizePoll(p.repostOf.poll, p.repostOf.poll ? (viewerVotesByPoll[p.repostOf.poll.id] ?? []) : []),
      likesCount: p.repostOf._count.likes,
      commentsCount: p.repostOf._count.comments,
    } : null,
    likesCount: p._count.likes,
    commentsCount: p._count.comments,
    repostsCount: p._count.reposts,
    liked: viewerId ? p.likes.length > 0 : false,
  }))

  // Filtro por tipo de medio (video / image)
  const filtered = mediaFilter
    ? result.filter(p => p.mediaUrls?.some(m => m.kind === mediaFilter))
    : result

  return NextResponse.json({ posts: filtered })
}

const createSchema = z.object({
  type: z.enum(['POST', 'BETA', 'STREAM', 'POLL']).default('POST'),
  content: z.string().max(2000).optional().nullable(),
  media: z
    .array(z.object({ url: z.string(), kind: z.enum(['image', 'video']) }))
    .default([]),
  // beta fields
  beta: z
    .object({
      title: z.string().min(3).max(100),
      description: z.string().max(2000),
      downloadType: z.enum(['DIRECT', 'LINK']),
      fileUrl: z.string().optional().nullable(),
      fileName: z.string().optional().nullable(),
      fileSize: z.number().optional().nullable(),
      externalUrl: z.string().url().optional().nullable(),
      // Campos nuevos
      genre: z.string().optional().nullable(),
      version: z.string().optional().nullable(),
      platforms: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      requirements: z.string().optional().nullable(),
      changelog: z.string().optional().nullable(),
      installInstructions: z.string().optional().nullable(),
      coverImage: z.string().optional().nullable(),
      screenshots: z.array(z.string()).max(10).optional(),
      externalPlatform: z.string().optional().nullable(),
      betaStatus: z.enum(['alpha', 'closed_beta', 'open_beta', 'tech_test', 'early_access', 'ended', 'coming_soon']).optional(),
    })
    .optional(),
  // stream fields
  stream: z
    .object({
      platform: z.enum(['TWITCH', 'YOUTUBE', 'KICK']),
      streamUrl: z.string().url(),
      embedUrl: z.string().url(),
      title: z.string().min(3).max(120),
    })
    .optional(),
  // poll fields
  poll: z
    .object({
      question: z.string().min(3).max(280),
      options: z.array(z.string().min(1).max(120)).min(2).max(8),
      allowMultiple: z.boolean().optional(),
      closesAt: z.string().datetime().optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  const data = parsed.data

  // Validate beta rule: if LINK, externalUrl required; if DIRECT, fileUrl required
  if (data.type === 'BETA') {
    if (!data.beta) {
      return NextResponse.json({ error: 'Faltan datos de la beta' }, { status: 400 })
    }
    if (data.beta.downloadType === 'DIRECT' && !data.beta.fileUrl) {
      return NextResponse.json({ error: 'Falta el archivo de la beta' }, { status: 400 })
    }
    if (data.beta.downloadType === 'LINK' && !data.beta.externalUrl) {
      return NextResponse.json({ error: 'Falta el enlace externo' }, { status: 400 })
    }
    // Validar que la URL externa sea real y accesible
    if (data.beta.downloadType === 'LINK' && data.beta.externalUrl) {
      const urlCheck = await validateExternalUrl(data.beta.externalUrl)
      if (!urlCheck.valid) {
        return NextResponse.json({ error: urlCheck.error }, { status: 400 })
      }
    }
    // Validar límite de capturas (máximo 10)
    if (data.beta.screenshots && data.beta.screenshots.length > 10) {
      return NextResponse.json({ error: 'Máximo 10 capturas de pantalla permitidas' }, { status: 400 })
    }
  }

  // Validar URL del stream
  if (data.type === 'STREAM' && data.stream) {
    const urlCheck = await validateExternalUrl(data.stream.streamUrl)
    if (!urlCheck.valid) {
      return NextResponse.json({ error: urlCheck.error }, { status: 400 })
    }
  }

  if (data.type === 'STREAM' && !data.stream) {
    return NextResponse.json({ error: 'Faltan datos del stream' }, { status: 400 })
  }

  // Validar encuesta
  if (data.type === 'POLL') {
    if (!data.poll) {
      return NextResponse.json({ error: 'Faltan datos de la encuesta' }, { status: 400 })
    }
    // Limpiar opciones vacías o duplicadas
    const cleanOptions = data.poll.options
      .map((o) => o.trim())
      .filter((o) => o.length > 0)
    if (cleanOptions.length < 2) {
      return NextResponse.json({ error: 'La encuesta necesita al menos 2 opciones' }, { status: 400 })
    }
    if (cleanOptions.length > 8) {
      return NextResponse.json({ error: 'La encuesta admite máximo 8 opciones' }, { status: 400 })
    }
    // Validar fecha de cierre (debe ser futura si se pasa)
    if (data.poll.closesAt) {
      const closeDate = new Date(data.poll.closesAt)
      if (isNaN(closeDate.getTime()) || closeDate.getTime() < Date.now()) {
        return NextResponse.json({ error: 'La fecha de cierre debe ser futura' }, { status: 400 })
      }
    }
  }

  const post = await db.post.create({
    data: {
      authorId: userId,
      type: data.type,
      content: data.content ?? null,
      mediaUrls: serializeMediaUrls(data.media),
      ...(data.type === 'BETA' && data.beta
        ? {
            beta: {
              create: {
                title: data.beta.title,
                description: data.beta.description,
                downloadType: data.beta.downloadType,
                fileUrl: data.beta.fileUrl,
                fileName: data.beta.fileName,
                fileSize: data.beta.fileSize,
                externalUrl: data.beta.externalUrl,
                genre: data.beta.genre ?? null,
                version: data.beta.version ?? null,
                platforms: data.beta.platforms ? JSON.stringify(data.beta.platforms) : null,
                tags: data.beta.tags ? JSON.stringify(data.beta.tags) : null,
                requirements: data.beta.requirements ?? null,
                changelog: data.beta.changelog ?? null,
                installInstructions: data.beta.installInstructions ?? null,
                coverImage: data.beta.coverImage ?? null,
                screenshots: data.beta.screenshots ? JSON.stringify(data.beta.screenshots) : null,
                externalPlatform: data.beta.externalPlatform ?? null,
                betaStatus: data.beta.betaStatus ?? 'open_beta',
              },
            },
          }
        : {}),
      ...(data.type === 'STREAM' && data.stream
        ? {
            stream: {
              create: {
                userId,
                platform: data.stream.platform,
                streamUrl: data.stream.streamUrl,
                embedUrl: data.stream.embedUrl,
                title: data.stream.title,
                isLive: true,
                startedAt: new Date(),
              },
            },
          }
        : {}),
      ...(data.type === 'POLL' && data.poll
        ? {
            poll: {
              create: {
                question: data.poll.question.trim(),
                allowMultiple: data.poll.allowMultiple ?? false,
                closesAt: data.poll.closesAt ? new Date(data.poll.closesAt) : null,
                options: {
                  create: data.poll.options
                    .map((o) => o.trim())
                    .filter((o) => o.length > 0)
                    .map((text) => ({ text })),
                },
              },
            },
          }
        : {}),
    },
    include: {
      beta: true,
      stream: true,
      poll: { include: { options: true } },
      author: { select: { id: true, username: true, avatar: true } },
    },
  })

  // If stream went live, create notifications for followers + broadcast handled by mini-service via DB polling
  if (data.type === 'STREAM' && post.stream) {
    const followers = await db.follow.findMany({
      where: { followeeId: userId },
      select: { followerId: true },
    })
    const author = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
    if (followers.length && author) {
      await db.notification.createMany({
        data: followers.map((f) => ({
          userId: f.followerId,
          fromUserId: userId,
          type: 'LIVE',
          message: `🎮 ${author.username} está en vivo ahora mismo`,
          entityId: post.stream.id,
        })),
      })
    }
  }

  // Incluir datos de poll serializado en la respuesta
  const responsePost = {
    ...post,
    poll: normalizePoll(post.poll, []),
  }

  return NextResponse.json({ post: responsePost })
}

/**
 * Valida que una URL externa sea real y accesible.
 * - Verifica formato
 * - Verifica que el dominio no esté en lista negra
 * - Hace un HEAD request con timeout de 5s
 */
async function validateExternalUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'La URL debe usar http:// o https://' }
    }

    // Lista negra de dominios conocidos por contenido malicioso
    const blockedDomains = [
      'malware-site.com', 'phishing-example.com', 'virus-download.net',
      'adult-content.com', 'illegal-content.org',
    ]
    const hostname = parsed.hostname.toLowerCase()
    if (blockedDomains.some(d => hostname.includes(d))) {
      return { valid: false, error: '⚠️ El dominio de esta URL está bloqueado por contenido malicioso. Si crees que es un error, contacta a soporte. Las URLs con contenido malicioso o inapropiado resultarán en BANEO permanente de la cuenta.' }
    }

    // HEAD request con timeout de 5 segundos
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      })
      clearTimeout(timeout)
      if (!res.ok && res.status !== 405 && res.status !== 403) {
        // 405 = Method Not Allowed (algunos sitios no soportan HEAD, pero la URL existe)
        // 403 = Forbidden (la URL existe pero bloquea HEAD)
        return { valid: false, error: `La URL no responde correctamente (código ${res.status}). Verifica que el enlace sea público y accesible.` }
      }
    } catch (fetchErr: any) {
      clearTimeout(timeout)
      if (fetchErr.name === 'AbortError') {
        return { valid: false, error: 'La URL tardó demasiado en responder. Verifica que el enlace funcione.' }
      }
      // Si el HEAD falla pero la URL tiene formato válido, la aceptamos
      // (algunos sitios bloquean HEAD requests pero la URL es válida)
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'URL inválida. Debe ser un enlace válido con http:// o https://' }
  }
}
