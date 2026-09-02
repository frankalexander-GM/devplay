import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
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

async function isBlockedPair(userA: string, userB: string) {
  return db.block.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
    select: { id: true },
  })
}

/**
 * Serializa un Poll con opciones, totales, porcentajes y votos del usuario actual.
 */
function serializePoll(poll: any, userVotedOptionIds: string[]) {
  const totalVotes = poll.options.reduce(
    (sum: number, o: any) => sum + (o.voteCount ?? 0),
    0
  )
  return {
    id: poll.id,
    question: poll.question,
    allowMultiple: poll.allowMultiple,
    closesAt: poll.closesAt ? new Date(poll.closesAt).toISOString() : null,
    totalVotes,
    userVotedOptionIds,
    options: (poll.options as any[]).map((o: any) => ({
      id: o.id,
      text: o.text,
      voteCount: o.voteCount ?? 0,
      percentage:
        totalVotes > 0 ? Math.round(((o.voteCount ?? 0) / totalVotes) * 100) : 0,
    })),
  }
}

/**
 * GET /api/devplay/posts/[id]/poll
 * Devuelve la encuesta del post con opciones, contadores, porcentajes y votos del usuario.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const viewerId = await getViewerId(req)

  const poll = await db.poll.findUnique({
    where: { postId: id },
    include: {
      options: { orderBy: { id: 'asc' } },
    },
  })

  if (!poll) {
    return NextResponse.json({ error: 'Encuesta no encontrada' }, { status: 404 })
  }

  let userVotedOptionIds: string[] = []
  if (viewerId) {
    const votes = await db.pollVote.findMany({
      where: { pollId: poll.id, userId: viewerId },
      select: { optionId: true },
    })
    userVotedOptionIds = votes.map((v) => v.optionId)
  }

  return NextResponse.json({ poll: serializePoll(poll, userVotedOptionIds) })
}

const voteSchema = z.object({
  optionIds: z.array(z.string().min(1)).min(1).max(10),
})

/**
 * POST /api/devplay/posts/[id]/poll
 * Body: { optionIds: string[] }
 * Emite voto(s) en la encuesta. Valida:
 *  - usuario autenticado (no invitado)
 *  - encuesta existe y no está cerrada
 *  - usuario no bloqueado por el autor
 *  - usuario no ha votado antes (salvo allowMultiple)
 *  - opciones pertenecen a la encuesta
 * Usa transacción: crea votos + incrementa voteCount.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getAuthUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = voteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    )
  }

  const poll = await db.poll.findUnique({
    where: { postId: id },
    include: {
      options: true,
      post: { select: { authorId: true } },
    },
  })

  if (!poll) {
    return NextResponse.json({ error: 'Encuesta no encontrada' }, { status: 404 })
  }

  // Cerrada por fecha
  if (poll.closesAt && new Date(poll.closesAt).getTime() < Date.now()) {
    return NextResponse.json({ error: 'La encuesta está cerrada' }, { status: 400 })
  }

  // Bloqueo entre usuario y autor
  if (poll.post?.authorId) {
    const blocked = await isBlockedPair(userId, poll.post.authorId)
    if (blocked) {
      return NextResponse.json({ error: 'Acción no permitida' }, { status: 403 })
    }
  }

  // Validar que las opciones pertenezcan a la encuesta
  const validOptionIds = new Set(poll.options.map((o) => o.id))
  const requestedIds = Array.from(new Set(parsed.data.optionIds))
  const invalid = requestedIds.filter((oid) => !validOptionIds.has(oid))
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: 'Una o más opciones no pertenecen a la encuesta' },
      { status: 400 }
    )
  }

  // Votos previos del usuario en esta encuesta
  const previousVotes = await db.pollVote.findMany({
    where: { pollId: poll.id, userId },
    select: { optionId: true },
  })
  const previousIds = new Set(previousVotes.map((v) => v.optionId))

  if (!poll.allowMultiple) {
    if (previousIds.size > 0) {
      return NextResponse.json(
        { error: 'Ya has votado en esta encuesta' },
        { status: 400 }
      )
    }
    if (requestedIds.length > 1) {
      return NextResponse.json(
        { error: 'Esta encuesta solo permite una opción' },
        { status: 400 }
      )
    }
  }

  // En modo múltiple, filtrar opciones ya votadas para no duplicar
  const toCreate = requestedIds.filter((oid) => !previousIds.has(oid))
  if (toCreate.length === 0) {
    return NextResponse.json(
      { error: 'Ya has votado todas las opciones seleccionadas' },
      { status: 400 }
    )
  }

  // Transacción: crear votos + incrementar voteCount en paralelo
  await db.$transaction([
    db.pollVote.createMany({
      data: toCreate.map((optionId) => ({
        pollId: poll.id,
        optionId,
        userId,
      })),
    }),
    db.pollOption.updateMany({
      where: { id: { in: toCreate } },
      data: { voteCount: { increment: 1 } },
    }),
  ])

  // Recargar para devolver el estado actualizado
  const updated = await db.poll.findUnique({
    where: { id: poll.id },
    include: { options: { orderBy: { id: 'asc' } } },
  })
  if (!updated) {
    return NextResponse.json({ error: 'Error al recargar la encuesta' }, { status: 500 })
  }

  const userVotes = await db.pollVote.findMany({
    where: { pollId: updated.id, userId },
    select: { optionId: true },
  })

  return NextResponse.json({
    poll: serializePoll(updated, userVotes.map((v) => v.optionId)),
  })
}
