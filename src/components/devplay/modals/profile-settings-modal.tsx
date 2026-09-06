'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { securityService } from '@/services/security-service'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useUIStore } from '@/lib/stores'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  X, Settings, Lock, Globe, Cookie, Trash2, Loader2, ShieldCheck, Eye,
} from 'lucide-react'
import { DeleteAccountModal } from '@/components/devplay/modals/delete-account-modal'

/**
 * Rueda de configuración de perfil ⚙️
 * - Privacidad (perfil privado/público)
 * - Cookies (esenciales / preferencias / analíticas)
 * - Zona de peligro: eliminar cuenta (código al correo + contraseña)
 */

type CookieConsent = { preferences: boolean; analytics: boolean; updatedAt: string }
const COOKIE_KEY = 'devplay-cookie-consent'

function loadConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(COOKIE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function ProfileSettingsModal() {
  const { settingsOpen, closeSettings } = useUIStore()
  const { user, refresh } = useCurrentUser()
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [consent, setConsent] = useState<CookieConsent | null>(null)

  useEffect(() => {
    if (settingsOpen) setConsent(loadConsent())
  }, [settingsOpen])

  if (!settingsOpen) return null

  const isGuest = !!user?.isGuest

  async function togglePrivacy() {
    if (!user) return
    setPrivacyLoading(true)
    try {
      await securityService.setPrivacy(!user.isPrivate)
      await refresh()
      toast.success(user.isPrivate ? 'Perfil ahora público' : 'Perfil ahora privado (solo seguidores)')
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setPrivacyLoading(false)
    }
  }

  function saveConsent(next: { preferences: boolean; analytics: boolean }) {
    const value: CookieConsent = { ...next, updatedAt: new Date().toISOString() }
    localStorage.setItem(COOKIE_KEY, JSON.stringify(value))
    setConsent(value)
    toast.success('Preferencias de cookies guardadas')
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
        onClick={closeSettings}
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          className="glass-strong w-full max-w-md rounded-lg border border-border/50 shadow-xl max-h-[85vh] overflow-y-auto custom-scroll"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50 sticky top-0 glass-strong z-10">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-wine-400 to-bronze-500 text-white">
                <Settings className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-bold text-sm leading-none">Configuración del perfil</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">@{user?.username ?? 'invitado'}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={closeSettings}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            {isGuest ? (
              <div className="rounded-md glass p-3 text-xs text-muted-foreground">
                Estás en modo invitado. Crea una cuenta para acceder a la privacidad, cookies y más ajustes.
              </div>
            ) : (
              <>
                {/* ===== Privacidad ===== */}
                <section>
                  <h3 className="label-caps mb-2">Privacidad</h3>
                  <div className="rounded-md glass divide-y divide-border/40">
                    <button
                      onClick={togglePrivacy}
                      disabled={privacyLoading}
                      className="flex w-full items-center gap-3 p-3 text-left hover:bg-secondary/40 transition disabled:opacity-60"
                    >
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white', user?.isPrivate ? 'from-wine-500 to-wine-700' : 'from-olive-400 to-sepia-500')}>
                        {user?.isPrivate ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold">Perfil privado</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {user?.isPrivate ? 'Solo tus seguidores pueden ver tu contenido' : 'Cualquiera puede ver tu perfil'}
                        </span>
                      </span>
                      <span className={cn('relative h-5 w-9 rounded-full transition shrink-0', user?.isPrivate ? 'bg-primary' : 'bg-secondary')}>
                        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', user?.isPrivate ? 'left-[1.15rem]' : 'left-0.5')} />
                      </span>
                    </button>
                    <div className="flex items-center gap-3 p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-bronze-500 text-white">
                        <Eye className="h-4 w-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold">Logros y estadísticas</span>
                        <span className="block text-[11px] text-muted-foreground">Siempre privados: solo tú los ves</span>
                      </span>
                      <ShieldCheck className="h-4 w-4 text-olive-500 shrink-0" />
                    </div>
                  </div>
                </section>

                {/* ===== Cookies ===== */}
                <section>
                  <h3 className="label-caps mb-2 flex items-center gap-1.5">
                    <Cookie className="h-3.5 w-3.5 text-amber-500" />
                    Cookies
                  </h3>
                  <div className="rounded-md glass divide-y divide-border/40">
                    <CookieRow
                      title="Esenciales"
                      desc="Necesarias para iniciar sesión y mantener tu tema"
                      checked
                      locked
                    />
                    <CookieRow
                      title="Preferencias"
                      desc="Recuerdan tu sidebar, chat y ajustes de vista"
                      checked={consent?.preferences ?? true}
                      onChange={(v) => saveConsent({ ...{ analytics: consent?.analytics ?? true, preferences: v } })}
                    />
                    <CookieRow
                      title="Analíticas"
                      desc="Nos ayudan a saber qué funciones se usan más"
                      checked={consent?.analytics ?? false}
                      onChange={(v) => saveConsent({ ...{ preferences: consent?.preferences ?? true, analytics: v } })}
                    />
                  </div>
                </section>

                {/* ===== Zona de peligro ===== */}
                <section>
                  <h3 className="label-caps mb-2 text-red-500">Zona de peligro</h3>
                  <button
                    onClick={() => setShowDelete(true)}
                    className="flex w-full items-center gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-left hover:bg-red-500/10 transition"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white">
                      <Trash2 className="h-4 w-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-red-500">Eliminar mi cuenta</span>
                      <span className="block text-[11px] text-muted-foreground">
                        Código al correo + contraseña para confirmar
                      </span>
                    </span>
                  </button>
                </section>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>

      {showDelete && (
        <DeleteAccountModal
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            setShowDelete(false)
            closeSettings()
          }}
        />
      )}
    </>
  )
}

function CookieRow({
  title, desc, checked, onChange, locked,
}: {
  title: string
  desc: string
  checked: boolean
  onChange?: (v: boolean) => void
  locked?: boolean
}) {
  return (
    <div className="flex items-center gap-3 p-3">
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-[11px] text-muted-foreground">{desc}</span>
      </span>
      {locked ? (
        <span className="text-[10px] font-bold text-olive-600 dark:text-olive-400 shrink-0">SIEMPRE</span>
      ) : (
        <button
          onClick={() => onChange?.(!checked)}
          className={cn('relative h-5 w-9 rounded-full transition shrink-0', checked ? 'bg-primary' : 'bg-secondary')}
          aria-label={title}
        >
          <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[1.15rem]' : 'left-0.5')} />
        </button>
      )}
    </div>
  )
}
