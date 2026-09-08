'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { userService, authService } from '@/services/devplay-service'
import { reconnectSocketWithFreshToken } from '@/hooks/use-socket'
import type { CurrentUser } from '@/types/devplay'
import { useGuestStore } from '@/lib/stores'

const ME_QUERY_KEY = ['devplay', 'me'] as const

/**
 * Hook de usuario actual — usa React Query para DEDUPLICAR requests.
 * Antes cada componente que usaba este hook hacía su propio fetch a /users/me.
 * Ahora React Query cachea y todas las instancias comparten el mismo request.
 */
export function useCurrentUser() {
  const { data: session, status } = useSession()
  const setGuest = useGuestStore((s) => s.setGuest)
  const clearGuest = useGuestStore((s) => s.clearGuest)
  const qc = useQueryClient()

  const sessionReady = status !== 'loading'
  const sessionKey = session?.user?.id ?? 'none'

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: [...ME_QUERY_KEY, sessionReady ? sessionKey : 'loading'],
    queryFn: async () => {
      const { user } = await userService.getMe()
      if (user?.isGuest) setGuest({ id: user.id, username: user.username })
      return user
    },
    enabled: sessionReady,
    staleTime: 5 * 60 * 1000, // 5 minutos — no refetch constante
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  const user = data ?? null
  const loading = !sessionReady || (sessionReady && queryLoading && !user)

  const isAuthed = !!user && !user.isGuest
  const isGuest = !!user?.isGuest

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ME_QUERY_KEY })
    await qc.refetchQueries({ queryKey: ME_QUERY_KEY })
  }, [qc])

  const loginAsGuest = useCallback(async (username?: string) => {
    const g = await authService.createGuest(username)
    setGuest({ id: g.id, username: g.username })
    document.cookie = `devplay-guest-id=${g.id}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
    // Actualizar cache directamente para feedback inmediato
    qc.setQueryData([...ME_QUERY_KEY, 'none'], {
      id: g.id,
      username: g.username,
      email: null,
      bio: null,
      avatar: null,
      banner: null,
      role: 'USER',
      isGuest: true,
    } as CurrentUser)
    return g
  }, [setGuest, qc])

  const logoutGuest = useCallback(() => {
    clearGuest()
    document.cookie = 'devplay-guest-id=; path=/; max-age=0'
    qc.setQueryData([...ME_QUERY_KEY, 'none'], null)
  }, [clearGuest, qc])

  const refreshAfterLogin = useCallback(async () => {
    // Pequeña espera para que la cookie de sesión se propague
    await new Promise((r) => setTimeout(r, 250))
    await refresh()
    // Blindaje 🔐: con la sesión lista, consigue token firmado y conecta el
    // socket (antes del login no hay token y el realtime rechaza el handshake)
    reconnectSocketWithFreshToken()
  }, [refresh])

  return { user, loading, isAuthed, isGuest, refresh, refreshAfterLogin, loginAsGuest, logoutGuest }
}
