'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useUIStore } from '@/lib/stores'
import { useCurrentUser } from '@/hooks/use-current-user'
import { authService, userService } from '@/services/devplay-service'
import { toast } from 'sonner'
import {
  Eye, EyeOff, Loader2, Mail, Lock, AtSign, Shield,
  Check, AlertCircle, Users, ArrowRight, ArrowBigUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ForgotPasswordModal } from '@/components/devplay/forgot-password-modal'

type FieldError = { field: string; message: string }

export function AuthModal() {
  const { authModalOpen, authMode, closeAuth, setView } = useUIStore()
  const { refreshAfterLogin, loginAsGuest } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(authMode)

  useEffect(() => {
    if (authModalOpen) setActiveTab(authMode)
  }, [authModalOpen, authMode])

  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  // Botón de Google SOLO cuando las llaves OAuth estén configuradas en el
  // servidor real (NEXT_PUBLIC_GOOGLE_ENABLED=1). Mientras tanto, oculto para
  // no mostrar un botón roto.
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === '1'
  const [errors, setErrors] = useState<FieldError[]>([])
  const [showForgot, setShowForgot] = useState(false)

  // login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPass, setShowLoginPass] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [capsLockOn, setCapsLockOn] = useState(false)

  // register state
  const [regEmail, setRegEmail] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPass, setShowRegPass] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [usernameTaken, setUsernameTaken] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)

  // ===== Validaciones en tiempo real =====
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail || regEmail)
  const usernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(regUsername)
  const usernameFree = usernameValid && !checkingUsername && !usernameTaken // disponible de verdad
  const passwordStrength = getPasswordStrength(regPassword)

  // ===== Disponibilidad real del nombre de usuario (con espera) =====
  useEffect(() => {
    setUsernameTaken(false)
    if (!usernameValid) {
      setCheckingUsername(false)
      return
    }
    setCheckingUsername(true)
    const t = setTimeout(async () => {
      try {
        const res = await userService.getByUsername(regUsername)
        setUsernameTaken(!!res?.user)
      } catch {
        setUsernameTaken(false)
      } finally {
        setCheckingUsername(false)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [regUsername, usernameValid])

  // Sugerencia amable: proponer usuario a partir del correo
  function suggestUsername() {
    if (!regUsername && regEmail.includes('@')) {
      const base = regEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16)
      if (base.length >= 3) setRegUsername(base)
    }
  }

  // (validaciones definidas arriba)

  function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
    let score = 0
    if (pwd.length >= 6) score++
    if (pwd.length >= 10) score++
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    const labels = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte', 'Muy fuerte']
    const colors = ['bg-red-500', 'bg-bronze-500', 'bg-amber-500', 'bg-lime-500', 'bg-olive-500', 'bg-olive-600']
    return { score, label: labels[score] || 'Muy débil', color: colors[score] || 'bg-red-500' }
  }

  function getFieldError(field: string): string | undefined {
    return errors.find(e => e.field === field)?.message
  }

  function clearFieldError(field: string) {
    setErrors(prev => prev.filter(e => e.field !== field))
  }

  function detectCapsLock(e: React.KeyboardEvent) {
    setCapsLockOn(!!e.getModifierState('CapsLock'))
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: FieldError[] = []
    if (!emailValid) newErrors.push({ field: 'loginEmail', message: 'Email inválido' })
    if (loginPassword.length < 1) newErrors.push({ field: 'loginPassword', message: 'Contraseña requerida' })
    if (newErrors.length) { setErrors(newErrors); return }

    setLoading(true)
    setErrors([])
    try {
      const res = await signIn('credentials', {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      })
      if (res?.error) {
        setErrors([{ field: 'loginPassword', message: 'Email o contraseña incorrectos' }])
      } else {
        toast.success('¡Bienvenido de vuelta!')
        setLoginEmail('')
        setLoginPassword('')
        await refreshAfterLogin()
        closeAuth()
      }
    } catch {
      setErrors([{ field: 'loginEmail', message: 'Error de conexión. Intenta de nuevo.' }])
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: FieldError[] = []
    if (!emailValid) newErrors.push({ field: 'regEmail', message: 'Email inválido' })
    if (!usernameValid) newErrors.push({ field: 'regUsername', message: '3-20 caracteres: letras, números y _' })
    else if (usernameTaken) newErrors.push({ field: 'regUsername', message: 'Ese nombre ya está en uso, prueba otro' })
    if (regPassword.length < 6) newErrors.push({ field: 'regPassword', message: 'Mínimo 6 caracteres' })
    if (!agreeTerms) newErrors.push({ field: 'terms', message: 'Debes aceptar los términos' })
    if (newErrors.length) { setErrors(newErrors); return }

    setLoading(true)
    setErrors([])
    try {
      await authService.register({ email: regEmail, username: regUsername, password: regPassword })
      await signIn('credentials', { email: regEmail, password: regPassword, redirect: false })
      toast.success('¡Cuenta creada! Bienvenido a DevPlay')
      setRegEmail(''); setRegUsername(''); setRegPassword(''); setAgreeTerms(false)
      await refreshAfterLogin()
      closeAuth()
    } catch (err: any) {
      setErrors([{ field: 'regEmail', message: err.message || 'Error al registrarse' }])
    } finally {
      setLoading(false)
    }
  }

  async function handleGuest() {
    setGuestLoading(true)
    try {
      await loginAsGuest()
      toast.success('Explorando como invitado')
      closeAuth()
    } catch {
      toast.error('Error al entrar como invitado')
    } finally {
      setGuestLoading(false)
    }
  }

  return (
    <Dialog open={authModalOpen} onOpenChange={(o) => !o && closeAuth()}>
      <DialogContent className="glass-strong max-w-md rounded-lg p-0 overflow-hidden border-border/60">
        {/* Título oculto: solo para lectores de pantalla */}
        <DialogTitle className="sr-only">{activeTab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</DialogTitle>
        {/* ===== Header con branding ===== */}
        <div className="relative px-6 pt-6 pb-4 text-center border-b border-border/40">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
          <div className="relative">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg">
              <img src="/logo-devplay.png" alt="DevPlay" className="h-10 w-10 rounded-md object-cover" />
            </div>
            <h2 className="font-display text-3xl font-black tracking-tight text-foreground">DevPlay</h2>
            <p className="label-caps mt-1">
              Comunidad para devs de videojuegos indie
            </p>
          </div>
        </div>

        {/* ===== Tab switcher ===== */}
        <div className="px-6 pt-4">
          <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-secondary/50 p-1">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrors([]) }}
              className={cn(
                'rounded-md py-2 text-sm font-semibold transition-all',
                activeTab === 'login'
                  ? 'btn-gradient-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setErrors([]) }}
              className={cn(
                'rounded-md py-2 text-sm font-semibold transition-all',
                activeTab === 'register'
                  ? 'btn-gradient-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Crear cuenta
            </button>
          </div>
        </div>

        {/* ===== Formularios ===== */}
        <div className="px-6 pb-6 pt-4">
          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                {/* Email */}
                <FormField
                  label="Email"
                  icon={Mail}
                  error={getFieldError('loginEmail')}
                >
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => { setLoginEmail(e.target.value); clearFieldError('loginEmail') }}
                    placeholder="tu@email.com"
                    required
                    autoComplete="email"
                    className={cn(
                      'rounded-md pl-10 pr-4 h-11',
                      getFieldError('loginEmail') && 'border-red-500/50 focus-visible:ring-red-500/30'
                    )}
                  />
                </FormField>

                {/* Password */}
                <FormField
                  label="Contraseña"
                  icon={Lock}
                  error={getFieldError('loginPassword')}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    >
                      {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                >
                  <Input
                    type={showLoginPass ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); clearFieldError('loginPassword') }}
                    onKeyDown={detectCapsLock}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className={cn(
                      'rounded-md pl-10 pr-10 h-11',
                      getFieldError('loginPassword') && 'border-red-500/50 focus-visible:ring-red-500/30'
                    )}
                  />
                  {capsLockOn && (
                    <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                      <ArrowBigUp className="h-3 w-3" /> Bloq Mayús activado
                    </p>
                  )}
                </FormField>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)} />
                    <span className="text-muted-foreground">Recuérdame</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-primary hover:underline font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-gradient-primary rounded-md h-11 font-semibold"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                  ) : (
                    <>Entrar <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                {/* Beneficios */}
                <div className="flex items-center justify-center gap-3 text-[10px] font-medium text-muted-foreground bg-secondary/40 rounded-md py-2 px-3">
                  <span className="flex items-center gap-1"><Check className="h-3 w-3 text-olive-500" /> Gratis</span>
                  <span className="flex items-center gap-1"><Check className="h-3 w-3 text-olive-500" /> Publica y comparte</span>
                  <span className="flex items-center gap-1"><Check className="h-3 w-3 text-olive-500" /> Habla con Pixel 🤖</span>
                </div>

                {/* Email */}
                <FormField
                  label="Email"
                  icon={Mail}
                  error={getFieldError('regEmail')}
                  success={emailValid && regEmail.length > 0 ? 'Email válido' : undefined}
                >
                  <Input
                    type="email"
                    value={regEmail}
                    onChange={(e) => { setRegEmail(e.target.value); clearFieldError('regEmail') }}
                    placeholder="tu@email.com"
                    required
                    autoComplete="email"
                    className={cn(
                      'rounded-md pl-10 pr-10 h-11',
                      getFieldError('regEmail') && 'border-red-500/50 focus-visible:ring-red-500/30',
                      emailValid && regEmail.length > 0 && 'border-olive-500/50 focus-visible:ring-olive-500/30'
                    )}
                  />
                  {emailValid && regEmail.length > 0 && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-olive-500" />
                  )}
                </FormField>

                {/* Username */}
                <FormField
                  label="Nombre de usuario"
                  icon={AtSign}
                  error={getFieldError('regUsername') || (usernameTaken ? 'Ya en uso, prueba otro' : undefined)}
                  success={usernameFree ? 'Disponible' : undefined}
                >
                  <Input
                    value={regUsername}
                    onChange={(e) => { setRegUsername(e.target.value); clearFieldError('regUsername') }}
                    onBlur={suggestUsername}
                    placeholder="SuperCreador99"
                    pattern="[a-zA-Z0-9_]{3,20}"
                    required
                    autoComplete="username"
                    className={cn(
                      'rounded-md pl-10 pr-10 h-11',
                      (getFieldError('regUsername') || usernameTaken) && 'border-red-500/50 focus-visible:ring-red-500/30',
                      usernameFree && 'border-olive-500/50 focus-visible:ring-olive-500/30'
                    )}
                  />
                  {checkingUsername ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                  ) : usernameFree ? (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-olive-500" />
                  ) : null}
                </FormField>

                {/* Password */}
                <FormField
                  label="Contraseña"
                  icon={Lock}
                  error={getFieldError('regPassword')}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowRegPass(!showRegPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    >
                      {showRegPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                >
                  <Input
                    type={showRegPass ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => { setRegPassword(e.target.value); clearFieldError('regPassword') }}
                    onKeyDown={detectCapsLock}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                    autoComplete="new-password"
                    className={cn(
                      'rounded-md pl-10 pr-10 h-11',
                      getFieldError('regPassword') && 'border-red-500/50 focus-visible:ring-red-500/30'
                    )}
                  />
                  {capsLockOn && (
                    <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                      <ArrowBigUp className="h-3 w-3" /> Bloq Mayús activado
                    </p>
                  )}
                  {/* Strength meter */}
                  {regPassword.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => (
                          <div
                            key={i}
                            className={cn(
                              'h-1 flex-1 rounded-full transition-colors',
                              i <= passwordStrength.score ? passwordStrength.color : 'bg-secondary'
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Fortaleza: <span className="font-medium">{passwordStrength.label}</span>
                      </p>
                    </div>
                  )}
                </FormField>

                {/* Terms */}
                <div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={agreeTerms}
                      onCheckedChange={(v) => { setAgreeTerms(!!v); clearFieldError('terms') }}
                      className="mt-0.5"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Acepto los <button type="button" onClick={() => { closeAuth(); setView('about') }} className="text-primary hover:underline">Términos de servicio</button> y la{' '}
                      <button type="button" onClick={() => { closeAuth(); setView('about') }} className="text-primary hover:underline">Política de privacidad</button>
                    </span>
                  </label>
                  {getFieldError('terms') && (
                    <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {getFieldError('terms')}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading || !agreeTerms}
                  className="w-full btn-gradient-primary rounded-md h-11 font-semibold"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</>
                  ) : (
                    <>Crear cuenta <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* ===== Divider + Social login (solo con OAuth configurado) ===== */}
          {googleEnabled && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="glass-strong px-3 text-muted-foreground rounded-sm label-caps">o continúa con</span>
                </div>
              </div>
              <div>
                <SocialButton
                  provider="google"
                  loading={googleLoading}
                  onClick={async () => {
                    setGoogleLoading(true)
                    try {
                      await signIn('google', { callbackUrl: '/' })
                    } catch {
                      toast.error('Error al conectar con Google')
                      setGoogleLoading(false)
                    }
                  }}
                />
              </div>
            </>
          )}

          {/* ===== Guest ===== */}
          <Button
            variant="outline"
            onClick={handleGuest}
            disabled={guestLoading}
            className="w-full rounded-md h-11 mt-3 gap-2"
          >
            {guestLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            Explorar como invitado
          </Button>

          {/* ===== Security badge ===== */}
          <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-muted-foreground">
            <Shield className="h-3 w-3 text-olive-500" />
            <span>Tus datos están protegidos con cifrado</span>
          </div>
        </div>
      </DialogContent>

      {/* Modal de recuperar contraseña */}
      <ForgotPasswordModal open={showForgot} onClose={() => setShowForgot(false)} />
    </Dialog>
  )
}

// ===== FormField wrapper =====
function FormField({
  label,
  icon: Icon,
  error,
  success,
  trailing,
  children,
}: {
  label: string
  icon: any
  error?: string
  success?: string
  trailing?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold flex items-center justify-between">
        <span>{label}</span>
        {success && (
          <span className="text-[10px] text-olive-500 flex items-center gap-0.5">
            <Check className="h-3 w-3" /> {success}
          </span>
        )}
      </Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {children}
        {trailing}
      </div>
      {error && (
        <p className="text-[10px] text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  )
}

// ===== Social login button =====
function SocialButton({ provider, onClick, loading }: { provider: 'google' | 'github'; onClick: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-sm border border-border/60 py-2.5 text-sm font-medium hover:bg-secondary/50 transition disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : provider === 'google' ? (
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
      )}
      <span className="capitalize">{provider === 'google' ? 'Google' : 'GitHub'}</span>
    </button>
  )
}
