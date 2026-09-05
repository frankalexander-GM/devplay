'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { X, Send, Sparkles } from 'lucide-react'
import { useUIStore } from '@/lib/stores'
import { useCurrentUser } from '@/hooks/use-current-user'
import { userService } from '@/services/devplay-service'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

/**
 * Pixel 🤖 — mascota de IA de DevPlay.
 * - Pequeño, visible en todas las secciones
 * - Camina/flota por la pantalla con animación
 * - Habla con burbujas contextuales ("no has publicado nada", tips...)
 * - Al tocarlo: pregúntale lo que quieras y responde con IA
 */

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  '¿Cómo subo una beta?',
  '¿Qué es el Chat Mundial?',
  '¿Cómo gano nivel?',
  'Dame ideas para mi juego',
]

export function PixelBuddy() {
  const { user, isAuthed, isGuest } = useCurrentUser()
  const currentView = useUIStore((s) => s.currentView)
  const profileUserId = useUIStore((s) => s.profileUserId)

  const [collapsed, setCollapsed] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [bubbleVisible, setBubbleVisible] = useState(true)
  const [tip, setTip] = useState('¡Hola! Soy Pixel, tu ayudante de DevPlay 🤖')
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [facing, setFacing] = useState(1)
  const [mounted, setMounted] = useState(false)

  const rootRef = useRef<HTMLButtonElement>(null)

  // ===== Posición inicial + deambular =====
  const pickSpot = useCallback(() => {
    if (typeof window === 'undefined') return { x: 40, y: 24 }
    const w = window.innerWidth
    const isDesktop = w >= 1024
    const chatVisible = isDesktop && currentView !== 'chat'
    const minX = isDesktop ? 250 : 14
    const maxX = chatVisible ? w - 400 : w - 92
    const x = minX + Math.random() * Math.max(maxX - minX, 40)
    const y = 18 + Math.random() * 70 // px desde abajo
    return { x, y }
  }, [currentView])

  useEffect(() => {
    setMounted(true)
    const initial = pickSpot()
    setPos(initial)
  }, [pickSpot])

  useEffect(() => {
    if (!mounted) return
    const interval = setInterval(() => {
      if (chatOpen) return
      setPos((prev) => {
        const next = pickSpot()
        setFacing(next.x > prev.x ? 1 : -1)
        return next
      })
    }, 26000)
    return () => clearInterval(interval)
  }, [mounted, chatOpen, pickSpot])

  // ===== Tips contextuales =====
  const isOwnProfile = currentView === 'profile' && profileUserId && user?.id === profileUserId
  const profileTarget = isOwnProfile ? user?.id : currentView === 'profile' ? profileUserId : null

  const { data: profileData } = useQuery({
    queryKey: ['user-profile', profileTarget],
    queryFn: () => userService.get(profileTarget!),
    enabled: currentView === 'profile' && !!profileTarget,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (collapsed) return
    if (isAuthed && isGuest) {
      setTip('Truco: crea una cuenta gratis para dar like, seguir devs y publicar 😉')
      return
    }
    const noPostsYet = isOwnProfile && (profileData?.posts?.length ?? 0) === 0
    const tips: string[] = []
    if (noPostsYet) {
      tips.push('¡Aún no has publicado nada! 🚀 Comparte tu primer devlog o sube tu beta')
    }
    switch (currentView) {
      case 'explore':
        tips.push('¡Bienvenido a la plaza! 👀 Aquí ves lo que crea la comunidad', 'Tip: usa la lupa para encontrar devs y juegos')
        break
      case 'discover':
        tips.push('Descubre devs nuevos y dale a Seguir 🤝')
        break
      case 'betas':
        tips.push('¿Buscas testers para tu juego? Sube tu beta aquí 🎮', 'Descarga betas y deja feedback con cariño ☕')
        break
      case 'chat':
        tips.push('En el Chat Mundial hay 5 segundos entre mensajes, ¡antispam! ⏱️')
        break
      case 'videos':
        tips.push('Streams y gameplays de la comunidad 📺')
        break
      case 'store':
        tips.push('Gasta tus DevCoins en power-ups 🪙')
        break
      case 'about':
        tips.push('Esta es la historia de DevPlay ☕')
        break
      case 'reportes':
        tips.push('Aquí ves tu actividad en números, privado para ti 📊')
        break
      case 'profile':
        if (isOwnProfile) {
          tips.push('Tu perfil 👋 Las pestañas Logros y Estadísticas solo las ves tú', 'Edita tu info con el botón Editar o la rueda ⚙️ del menú')
        } else {
          tips.push('¿Le das a Seguir para no perderte sus betas? 🚀')
        }
        break
    }
    if (tips.length === 0) tips.push('¿Dudas? Tócame y pregúntame lo que quieras 🤖', 'Recuerda guardar tus juegos favoritos ⭐')
    let i = 0
    setBubbleVisible(true)
    setTip(tips[0])
    const rotate = setInterval(() => {
      i = (i + 1) % tips.length
      setBubbleVisible(false)
      setTimeout(() => {
        setTip(tips[i])
        setBubbleVisible(true)
      }, 350)
    }, 13000)
    return () => clearInterval(rotate)
  }, [currentView, isOwnProfile, profileData, isAuthed, isGuest, collapsed])

  // ===== Ojos que siguen el cursor =====
  const pupilX = useSpring(useMotionValue(0), { stiffness: 300, damping: 22 })
  const pupilY = useSpring(useMotionValue(0), { stiffness: 300, damping: 22 })

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const el = rootRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.hypot(dx, dy) || 1
      const strength = Math.min(dist / 220, 1)
      pupilX.set((dx / dist) * 2.4 * strength)
      pupilY.set((dy / dist) * 2 * strength)
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [pupilX, pupilY])

  // ===== Chat con IA =====
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking, chatOpen])

  async function ask(text: string) {
    const content = text.trim()
    if (!content || thinking) return
    const next: ChatMsg[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setThinking(true)
    try {
      const res = await fetch('/api/devplay/buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || data.error || 'Ay, se me nublaban los circuitos 🤖' }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'No conecté con mi cerebro 🤖 revisa tu conexión e inténtalo otra vez' }])
    } finally {
      setThinking(false)
    }
  }

  if (!mounted) return null

  if (collapsed) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setCollapsed(false)}
        className="fixed bottom-5 z-40 h-11 w-11 rounded-full glass-strong shadow-lg flex items-center justify-center"
        style={{ left: pos.x, bottom: undefined, top: undefined, transform: undefined }}
        data-tour="pixel-buddy"
        title="Abrir a Pixel"
      >
        <MiniPixelFace />
      </motion.button>
    )
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40" data-tour="pixel-buddy">
      {/* ===== Burbuja de mensaje ===== */}
      <AnimatePresence>
        {bubbleVisible && !chatOpen && (
          <motion.div
            key={tip}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            className="pointer-events-auto absolute w-52"
            style={{ left: pos.x - 44, bottom: pos.y + 66 }}
          >
            <div className="glass-strong rounded-lg rounded-bl-none border border-border/60 px-3 py-2 shadow-lg relative">
              <button
                onClick={() => setBubbleVisible(false)}
                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-secondary text-muted-foreground flex items-center justify-center hover:text-foreground transition"
                aria-label="Cerrar mensaje"
              >
                <X className="h-2.5 w-2.5" />
              </button>
              <p className="text-[11px] leading-snug text-foreground/90">{tip}</p>
            </div>
            <div className="mx-auto h-0 w-0 border-l-[7px] border-r-[7px] border-t-[8px] border-l-transparent border-r-transparent border-t-border/60 ml-10" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Panel de preguntas (IA) ===== */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="pointer-events-auto absolute w-[290px] glass-strong rounded-lg border border-border/60 shadow-xl overflow-hidden"
            style={{ left: Math.min(Math.max(pos.x - 100, 10), (typeof window !== 'undefined' ? window.innerWidth : 800) - 300), bottom: pos.y + 66 }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50 bg-gradient-to-r from-primary/15 via-accent/10 to-transparent">
              <PixelIcon size={28} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-none">Pixel</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-olive-400 live-pulse" />
                  Asistente con IA · pregúntame
                </p>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary/60 transition"
                aria-label="Cerrar chat"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Mensajes */}
            <div ref={listRef} className="h-64 overflow-y-auto custom-scroll px-3 py-2.5 space-y-2">
              {messages.length === 0 && (
                <div className="text-center py-3">
                  <PixelIcon size={40} className="mx-auto mb-1.5" />
                  <p className="text-[11px] text-muted-foreground leading-snug px-2">
                    ¡Holi! Soy Pixel 🤖 Pregúntame cómo usar DevPlay, ideas para tu juego o lo que necesites
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] leading-snug',
                      m.role === 'user'
                        ? 'btn-gradient-primary text-white rounded-br-sm'
                        : 'glass border border-border/50 rounded-bl-sm'
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div className="glass border border-border/50 rounded-lg rounded-bl-sm px-2.5 py-2 flex items-center gap-1">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce"
                        style={{ animationDelay: `${d * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sugerencias */}
            {messages.length === 0 && (
              <div className="px-2.5 pb-1.5 flex flex-wrap gap-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="rounded-full border border-border/60 bg-secondary/50 px-2 py-0.5 text-[9px] font-medium hover:bg-secondary transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); ask(input) }}
              className="flex items-center gap-1.5 border-t border-border/50 p-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregúntale a Pixel..."
                maxLength={300}
                className="flex-1 min-w-0 rounded-full border border-input bg-transparent px-3 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={thinking || !input.trim()}
                className="btn-gradient-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-50 transition"
                aria-label="Enviar"
              >
                <Send className="h-3 w-3" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== El muñequito ===== */}
      <motion.button
        ref={rootRef}
        onClick={() => { setChatOpen((v) => !v); setBubbleVisible(false) }}
        onDoubleClick={() => setCollapsed(true)}
        animate={{ x: pos.x, y: 0 }}
        transition={{ type: 'spring', stiffness: 55, damping: 14 }}
        className="pointer-events-auto absolute cursor-pointer select-none"
        style={{ left: 0, bottom: pos.y }}
        title="Pixel · tu asistente de IA (doble clic para minimizar)"
        aria-label="Pixel, asistente de IA"
      >
        <motion.div
          animate={chatOpen ? {} : { y: [0, -5, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
        >
          <motion.div animate={{ scaleX: facing }} transition={{ duration: 0.25 }}>
            <PixelIcon size={54} pupilX={pupilX} pupilY={pupilY} />
          </motion.div>
          {/* Badge IA */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-bronze-500 shadow">
            <Sparkles className="h-2.5 w-2.5 text-white" />
          </span>
        </motion.div>
      </motion.button>
    </div>
  )
}

// ===== Robot SVG =====
export function PixelIcon({
  size = 48,
  pupilX,
  pupilY,
  className,
}: {
  size?: number
  pupilX?: any
  pupilY?: any
  className?: string
}) {
  const hasTracking = !!pupilX && !!pupilY

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className}>
      {/* Sombra */}
      <ellipse cx="32" cy="60" rx="14" ry="2.6" fill="rgba(74,46,33,0.25)" />
      {/* Antena */}
      <line x1="32" y1="8" x2="32" y2="14" stroke="#A9552F" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="6.5" r="3.2" fill="#E8A04C">
        <animate attributeName="r" values="3.2;3.8;3.2" dur="1.6s" repeatCount="indefinite" />
      </circle>
      {/* Cuerpo */}
      <rect x="12" y="14" width="40" height="36" rx="13" fill="#C66E41" />
      <rect x="12" y="14" width="40" height="36" rx="13" fill="url(#pixelBody)" />
      <defs>
        <linearGradient id="pixelBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(255,235,210,0.28)" />
          <stop offset="1" stopColor="rgba(74,46,33,0.18)" />
        </linearGradient>
      </defs>
      {/* Brazos */}
      <circle cx="9" cy="34" r="4" fill="#A9552F" />
      <circle cx="55" cy="34" r="4" fill="#A9552F" />
      {/* Pantalla de cara */}
      <rect x="17" y="19.5" width="30" height="21" rx="9" fill="#F6E8D4" />
      {/* Ojos (siguen el cursor) */}
      <motion.g
        style={hasTracking ? { x: pupilX, y: pupilY } : undefined}
        animate={{ scaleY: [1, 1, 0.12, 1] }}
        transition={{ duration: 0.5, times: [0, 0.72, 0.86, 1], repeat: Infinity, repeatDelay: 3.4 }}
      >
        <circle cx="25.5" cy="29" r="3.4" fill="#4A2E21" />
        <circle cx="38.5" cy="29" r="3.4" fill="#4A2E21" />
        <circle cx="26.6" cy="28" r="1.1" fill="#FFF6E8" />
        <circle cx="39.6" cy="28" r="1.1" fill="#FFF6E8" />
      </motion.g>
      {/* Sonrisa */}
      <path d="M27 35.5 Q32 39.5 37 35.5" stroke="#4A2E21" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      {/* Mejillas */}
      <circle cx="21.5" cy="33.5" r="1.8" fill="#E8A04C" opacity="0.75" />
      <circle cx="42.5" cy="33.5" r="1.8" fill="#E8A04C" opacity="0.75" />
      {/* Panza */}
      <rect x="24" y="43" width="16" height="4" rx="2" fill="#8A4526" opacity="0.55" />
      {/* Pies */}
      <rect x="20" y="50" width="10" height="6" rx="3" fill="#8A4526" />
      <rect x="34" y="50" width="10" height="6" rx="3" fill="#8A4526" />
    </svg>
  )
}

function MiniPixelFace() {
  return (
    <svg width="30" height="30" viewBox="0 0 64 64">
      <rect x="12" y="14" width="40" height="36" rx="13" fill="#C66E41" />
      <rect x="17" y="19.5" width="30" height="21" rx="9" fill="#F6E8D4" />
      <circle cx="25.5" cy="29" r="3.4" fill="#4A2E21" />
      <circle cx="38.5" cy="29" r="3.4" fill="#4A2E21" />
      <path d="M27 35.5 Q32 39.5 37 35.5" stroke="#4A2E21" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <circle cx="21.5" cy="33.5" r="1.8" fill="#E8A04C" opacity="0.75" />
      <circle cx="42.5" cy="33.5" r="1.8" fill="#E8A04C" opacity="0.75" />
    </svg>
  )
}
