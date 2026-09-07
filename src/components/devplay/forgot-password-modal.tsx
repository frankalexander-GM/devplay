'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Loader2, ArrowLeft, CheckCircle2, Copy, ExternalLink, Eye, EyeOff } from 'lucide-react'

export function ForgotPasswordModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resetUrl, setResetUrl] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch('/api/devplay/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (data.ok) {
        setSent(true)
        // En modo demo, el API devuelve el enlace de reset
        if (data.demoResetUrl) {
          setResetUrl(data.demoResetUrl)
        }
        toast.success('Enlace de recuperación enviado')
      } else {
        toast.error(data.error || 'Error')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setEmail('')
    setSent(false)
    setResetUrl(null)
    setLoading(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="glass-strong max-w-md rounded-lg p-0 overflow-hidden border-border/60">
        <div className="px-6 pt-6 pb-6">
          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <button
                  onClick={handleClose}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition mb-4"
                >
                  <ArrowLeft className="h-3 w-3" /> Volver a iniciar sesión
                </button>

                <div className="mb-4">
                  <h2 className="text-xl font-bold">¿Olvidaste tu contraseña?</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        required
                        autoComplete="email"
                        className="rounded-md pl-10 h-11"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full btn-gradient-primary rounded-md h-11 font-semibold"
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                    ) : (
                      'Enviar enlace de recuperación'
                    )}
                  </Button>
                </form>

                <p className="text-[10px] text-muted-foreground mt-4 text-center">
                  Si el email existe en nuestro sistema, recibirás un enlace de recuperación.
                  Por seguridad, no revelamos si un email está registrado.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-olive-100 dark:bg-olive-500/20">
                  <CheckCircle2 className="h-8 w-8 text-olive-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">¡Revisa tu email!</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Si el email <span className="font-semibold text-foreground">{email}</span> está
                  registrado, recibirás un enlace para restablecer tu contraseña.
                </p>

                {resetUrl && (
                  <div className="rounded-md bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 p-3 mb-4 text-left">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mb-1">
                      MODO DEMO — Enlace de recuperación:
                    </p>
                    <p className="text-[10px] text-muted-foreground break-all mb-2">
                      En producción, este enlace se enviaría por email.
                      Para demo, cópialo y ábrelo:
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg text-[10px] h-7 gap-1 flex-1"
                        onClick={() => {
                          navigator.clipboard?.writeText(window.location.origin + resetUrl)
                          toast.success('Enlace copiado')
                        }}
                      >
                        <Copy className="h-3 w-3" /> Copiar
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-lg text-[10px] h-7 gap-1 flex-1 btn-gradient-primary"
                        onClick={() => {
                          window.location.href = resetUrl
                        }}
                      >
                        <ExternalLink className="h-3 w-3" /> Abrir
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="w-full rounded-md h-10"
                >
                  Volver a iniciar sesión
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ===== Modal de Restablecer Contraseña =====
export function ResetPasswordModal({
  open,
  token,
  onClose,
}: {
  open: boolean
  token: string
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('La contraseña debe tener mínimo 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/devplay/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (data.ok) {
        setDone(true)
        toast.success('¡Contraseña actualizada!')
      } else {
        toast.error(data.error || 'Error')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setPassword('')
    setConfirmPassword('')
    setDone(false)
    setLoading(false)
    onClose()
  }

  if (done) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="glass-strong max-w-md rounded-lg p-0 overflow-hidden">
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-olive-100 dark:bg-olive-500/20">
              <CheckCircle2 className="h-8 w-8 text-olive-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">¡Contraseña actualizada!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <Button
              onClick={handleClose}
              className="w-full btn-gradient-primary rounded-md h-11"
            >
              Iniciar sesión
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="glass-strong max-w-md rounded-lg p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Restablecer contraseña</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Ingresa tu nueva contraseña.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="rounded-md pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Confirmar contraseña</Label>
              <Input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                required
                minLength={6}
                className="rounded-md h-11"
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-[10px] text-red-500">Las contraseñas no coinciden</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || password.length < 6 || password !== confirmPassword}
              className="w-full btn-gradient-primary rounded-md h-11 font-semibold"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Actualizando...</>
              ) : (
                'Restablecer contraseña'
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
