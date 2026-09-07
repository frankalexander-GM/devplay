import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { verifyLoginCode } from '@/lib/login-code'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        code: { label: 'Código de acceso', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user || user.isGuest) return null
        if (!user.passwordHash) return null

        // ===== Camino 1: código de acceso enviado por correo 🔐 =====
        if (credentials.code) {
          const ok = await verifyLoginCode(user.id, credentials.code)
          if (!ok) return null
          return { id: user.id, email: user.email, name: user.username }
        }

        // ===== Camino 2: contraseña clásica =====
        if (!credentials.password) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.username,
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        ;(session.user as any).id = token.uid as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'devplay-secret-change-in-production',
}
