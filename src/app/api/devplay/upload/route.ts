import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

const MAX_BETA_SIZE = 50 * 1024 * 1024 // 50 MB
const MAX_MEDIA_SIZE = 20 * 1024 * 1024 // 20 MB for images/videos
const ALLOWED_BETA_EXT = ['.zip', '.rar', '.7z', '.tar', '.gz', '.exe', '.apk']
const ALLOWED_MEDIA_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov']
const ALLOWED_AVATAR_EXT = ['.jpg', '.jpeg', '.png', '.webp']

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const guestId = req.cookies.get('devplay-guest-id')?.value

    let userId: string | null = null
    if (session?.user?.id) userId = session.user.id
    else if (guestId) {
      const guest = await db.user.findUnique({ where: { id: guestId } })
      if (guest && !guest.isGuest) userId = guest.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const kind = (formData.get('kind') as string) || 'media' // 'media' | 'beta' | 'avatar'

    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 })
    }

    const ext = path.extname(file.name).toLowerCase()
    const allowed =
      kind === 'beta'
        ? ALLOWED_BETA_EXT
        : kind === 'avatar'
        ? ALLOWED_AVATAR_EXT
        : ALLOWED_MEDIA_EXT

    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: `Extensión no permitida: ${ext}` }, { status: 400 })
    }

    const max = kind === 'beta' ? MAX_BETA_SIZE : kind === 'avatar' ? 5 * 1024 * 1024 : MAX_MEDIA_SIZE
    if (file.size > max) {
      if (kind === 'beta') {
        return NextResponse.json(
          { error: 'El archivo pesa más de 50MB. Usa la opción de enlace externo.' },
          { status: 413 }
        )
      }
      return NextResponse.json({ error: 'Archivo demasiado grande' }, { status: 413 })
    }

    const dir =
      kind === 'beta'
        ? path.join(process.cwd(), 'download', 'betas')
        : kind === 'avatar'
        ? path.join(process.cwd(), 'public', 'uploads', 'avatars')
        : path.join(process.cwd(), 'public', 'uploads', 'media')

    if (!existsSync(dir)) await mkdir(dir, { recursive: true })

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`
    const fullPath = path.join(dir, fileName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(fullPath, buffer)

    const url =
      kind === 'beta'
        ? `/api/devplay/betas/${''}/download?file=${fileName}` // placeholder, set by caller
        : kind === 'avatar'
        ? `/uploads/avatars/${fileName}`
        : `/uploads/media/${fileName}`

    const absolutePath =
      kind === 'beta' ? path.join('download', 'betas', fileName) : null

    return NextResponse.json({
      url,
      fileName,
      originalName: file.name,
      size: file.size,
      path: absolutePath,
      kind,
    })
  } catch (e) {
    console.error('upload error', e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
