import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guion bajo'),
  password: z.string().min(6),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
    }

    const { email, username, password } = parsed.data

    const existing = await db.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'El email o usuario ya existe' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        username,
        passwordHash,
        role: 'USER',
      },
    })

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
    })
  } catch (e) {
    console.error('register error', e)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
