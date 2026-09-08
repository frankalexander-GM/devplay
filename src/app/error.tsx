'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from 'lucide-react'
import { RetroScreen, RetroPrimaryButton, RetroSecondaryButton } from '@/components/devplay/shared/retro-screen'
import { useUIStore } from '@/lib/stores'

/**
 * Página de error de runtime (app/error.tsx) 🌋
 * Cuando un componente explota, esta pantalla bonita lo recoge:
 * "Algo salió mal" + Reintentar + Volver al inicio / atrás.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const setView = useUIStore((s) => s.setView)

  return (
    <RetroScreen
      icon={AlertTriangle}
      badge="Error inesperado"
      title="¡Ups! Algo salió mal"
      message="La plaza dio un tropiezo, pero no pasa nada: dale Reintentar y seguimos jugando. Si el problema sigue, vuelve en un ratito."
      note={error?.digest ? `Código de seguimiento: ${error.digest}` : undefined}
      actions={
        <>
          <RetroPrimaryButton onClick={reset}>
            <RefreshCw className="h-5 w-5" />
            Reintentar
          </RetroPrimaryButton>
          <RetroSecondaryButton
            onClick={() => {
              setView('explore')
              router.push('/')
            }}
          >
            <Home className="h-5 w-5" />
            Volver al inicio
          </RetroSecondaryButton>
          <RetroSecondaryButton onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
            Volver atrás
          </RetroSecondaryButton>
        </>
      }
    />
  )
}
