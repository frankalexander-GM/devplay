import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user || user.isGuest) return null
        if (!user.passwordHash) return null // OAuth user without password

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.username,
        }
      },
    }),
    // Google OAuth — requiere GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/',
  },
  callbacks: {
    async signIn({ user, account }) {
      // Si es login con Google
      if (account?.provider === 'google' && user.email) {
        const existingUser = await db.user.findUnique({
          where: { email: user.email.toLowerCase() },
        })

        // Si no existe, crear usuario automáticamente
        if (!existingUser) {
          const username = (user.name || user.email.split('@')[0] || 'user')
            .replace(/[^a-zA-Z0-9_]/g, '')
            .slice(0, 20)
          let finalUsername = username
          let counter = 1
          while (await db.user.findUnique({ where: { username: finalUsername } })) {
            finalUsername = `${username}${counter}`
            counter++
          }

          await db.user.create({
            data: {
              email: user.email.toLowerCase(),
              username: finalUsername,
              passwordHash: null, // OAuth users don't have password
              provider: 'google',
              providerAccountId: account.providerAccountId,
              avatar: user.image || null,
              fullName: user.name || null,
            },
          })
        } else if (!existingUser.provider) {
          // Si existe pero no tiene provider, vincular Google
          await db.user.update({
            where: { id: existingUser.id },
            data: {
              provider: 'google',
              providerAccountId: account.providerAccountId,
              ...(user.image && !existingUser.avatar ? { avatar: user.image } : {}),
            },
          })
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Para OAuth, buscar el usuario en DB por email
        if (account?.provider === 'google' && user.email) {
          const dbUser = await db.user.findUnique({
            where: { email: user.email.toLowerCase() },
            select: { id: true },
          })
          if (dbUser) {
            token.uid = dbUser.id
          }
        } else {
          token.uid = user.id
        }
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
