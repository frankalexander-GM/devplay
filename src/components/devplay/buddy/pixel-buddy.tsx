'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import {
  X, Send, Sparkles, MoreVertical, MessageSquarePlus, Trash2,
  Copy, Check, VolumeX, Volume2, Minimize2,
} from 'lucide-react'
import { useUIStore } from '@/lib/stores'
import { useCurrentUser } from '@/hooks/use-current-user'
import { userService } from '@/services/devplay-service'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

/**
 * Pixel 🤖 — mascota de IA de DevPlay.
 * - Pequeño, visible en todas las secciones, camina por la pantalla
 * - MUCHA personalidad: humores (feliz, guiño, emocionado, dormilón),
 *   baila, salta, suelta partículas emoji, saluda según la hora y
 *   se queda dormido si nadie lo pela 💤
 * - Habla con burbujas contextuales ("no has publicado nada", tips...)
 * - SOLO los devs registrados pueden hablarle (invitados → panel de registro)
 * - Menú ⋮ en el chat: nuevo chat, eliminar conversación, copiar,
 *   silenciar burbujas, minimizar
 */

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

type Mood = 'idle' | 'happy' | 'excited' | 'wink' | 'sleepy'
type Emote = 'none' | 'jump' | 'dance'

const SUGGESTIONS = [
  '¿Cómo subo una beta?',
  '¿Qué es el Chat Mundial?',
  '¿Cómo gano DevCoins?',
  'Dame ideas para mi juego',
]

const PARTICLE_EMOJIS = ['✨', '🎮', '☕', '🚀', '👾', '💡', '❤️']

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return '¡Buenos días, dev! ☕ ¿Qué bichito cazamos hoy?'
  if (h >= 12 && h < 19) return '¡Buenas tardes! 🎮 Estira las manos, tus muñecas lo valen'
  return '¿Programando de noche? Yo también brillo más en la oscuridad 🌙'
}

function tipsForView(
  currentView: string,
  ctx: { isOwnProfile: boolean; noPostsYet: boolean; canChat: boolean }
): string[] {
  const { isOwnProfile, noPostsYet, canChat } = ctx
  const tips: string[] = []
  if (noPostsYet) {
    tips.push('¡Aún no has publicado nada! 🚀 Anímate: un devlog, un meme de tu juego, lo que sea')
  }
  switch (currentView) {
    case 'explore':
      tips.push(
        '¡Bienvenido a la plaza! 👀 Aquí la comunidad luce sus creaciones',
        'Tip pro: guarda lo que te guste con ⭐ para leerlo luego',
        'Yo me leo TODO el feed... por eso sé tanto chisme jaja 🤖'
      )
      break
    case 'discover':
      tips.push(
        'Dale Seguir a los devs con estilo 🤝',
        'Aquí puede estar tu futuro co-dev 💡',
        'Un seguimiento al día... alegra el DevPlay'
      )
      break
    case 'betas':
      tips.push(
        '¿Buscas testers? Sube tu beta y que llueva feedback 🎮',
        'Prueba betas ajenas y deja feedback con cariño ☕',
        'Las betas con imágenes dan 3x más descargas (fuente: yo) 🤖'
      )
      break
    case 'chat':
      tips.push(
        'En el Chat Mundial hay 5s entre mensajes: ¡antispam oficial! ⏱️',
        'Saluda sin miedo, nadie muerde... yo sí, pero soy de goma 😬',
        '¿Viste algo raro? Reporta. Los mods estamos al tanto 👀'
      )
      break
    case 'videos':
      tips.push(
        'Streams y gameplays de la comunidad 📺 con palomitas mejor',
        '¿Tu gameplay aquí? Publica un video y hazte famoso 🎬'
      )
      break
    case 'store':
      tips.push(
        'DevCoins 🪙 se ganan creando cosas increíbles (y alguna sorpresa)',
        'Los power-ups de la Tienda esconden ventajas secretas 🪙'
      )
      break
    case 'about':
      tips.push(
        'Esta es la historia de DevPlay ☕ yo salgo en el capítulo 7',
        'Spoiler: el fundador también olvida cerrar brackets a veces'
      )
      break
    case 'reportes':
      tips.push('Tus números en privado 📊 como un diario íntimo, pero con gráficas')
      break
    case 'profile':
      if (isOwnProfile) {
        tips.push(
          '¡Tu perfil! 👋 Publica algo, el feed te espera',
          noPostsYet ? '' : 'Las pestañas Logros y Estadísticas son solo tuyas 🤫',
          'La rueda ⚙️ del menú configura todo: privacidad, cookies...'
        )
      } else {
        tips.push(
          '¿Le das a Seguir? Sus betas no se siguen solas 🚀',
          'Comparte su perfil con el botón Compartir 📤'
        )
      }
      break
  }
  if (!canChat) {
    tips.unshift('Psst: solo los devs registrados pueden hablar conmigo 🤖 ¡Crea tu cuenta!')
  }
  const generic = tips.length === 0
  if (generic) {
    tips.push(
      '¿Dudas? Tócame y pregúntame lo que quieras 🤖',
      'Doble clic en mí y me minimizo... es mi modo ahorro de energía 👾',
      'Funciono con café y electricidad ⚡☕',
      'Estuve 3 microsegundos pensando en tu próximo juego... una eternidad 🤯'
    )
  }
  return tips.filter(Boolean)
}

export function PixelBuddy() {
  const { user, isAuthed, isGuest } = useCurrentUser()
  const currentView = useUIStore((s) => s.currentView)
  const profileUserId = useUIStore((s) => s.profileUserId)
  const openAuth = useUIStore((s) => s.openAuth)

  const [collapsed, setCollapsed] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [bubbleVisible, setBubbleVisible] = useState(true)
  const [tip, setTip] = useState('¡Hola! Soy Pixel, tu ayudante de DevPlay 🤖')
  const [pos, setPos] = useState({ x: 40, y: 24 })
  const [facing, setFacing] = useState(1)
  const [mounted, setMounted] = useState(false)
  const [vp, setVp] = useState({ w: 1280, h: 800 })
  const [mood, setMood] = useState<Mood>('idle')
  const [emote, setEmote] = useState<{ kind: Emote; key: number }>({ kind: 'none', key: 0 })
  const [particles, setParticles] = useState<{ id: number; emoji: string; dx: number }[]>([])

  const rootRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isMobile = vp.w < 1024
  const mascotSize = isMobile ? 46 : 54
  const canChat = isAuthed // solo devs registrados; invitados/anónimos solo ven tips

  const clamp = useCallback((v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max)), [])

  // ===== Posición inicial + deambular =====
  const pickSpot = useCallback(
    (wOverride?: number) => {
      const w = wOverride ?? vp.w
      const desktop = w >= 1024
      const chatVisible = desktop && currentView !== 'chat'
      const minX = desktop ? 250 : 14
      const maxX = chatVisible ? w - 400 : w - (mascotSize + 30)
      const x = minX + Math.random() * Math.max(maxX - minX, 40)
      const y = 18 + Math.random() * 66 // px desde abajo
      return { x, y }
    },
    [currentView, vp.w, mascotSize]
  )

  // ===== Viewport (resize) =====
  useEffect(() => {
    setMounted(true)
    const w = window.innerWidth
    const h = window.innerHeight
    setVp({ w, h })
    setPos(pickSpot(w))
    try { setMuted(localStorage.getItem('pixel-tips-muted') === '1') } catch {}
    const onR = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])

  // Mantener dentro de la pantalla al redimensionar
  useEffect(() => {
    if (!mounted) return
    setPos((p) => {
      const maxX = vp.w - mascotSize - 14
      if (p.x > maxX) return { ...p, x: Math.max(14, maxX) }
      return p
    })
  }, [vp.w, mascotSize, mounted])

  useEffect(() => {
    if (!mounted) return
    const interval = setInterval(() => {
      if (chatOpen || registerOpen) return
      setPos((prev) => {
        const next = pickSpot()
        setFacing(next.x > prev.x ? 1 : -1)
        return next
      })
    }, isMobile ? 34000 : 26000)
    return () => clearInterval(interval)
  }, [mounted, chatOpen, registerOpen, pickSpot, isMobile])

  // ===== Personalidad: emotes aleatorios (saltar, bailar, guiñar, chispas) =====
  const doEmote = useCallback((kind: Emote, m: Mood = 'idle') => {
    setEmote((e) => ({ kind, key: e.key + 1 }))
    if (m !== 'idle') {
      setMood(m)
      setTimeout(() => setMood('idle'), 2000)
    }
  }, [])

  const spawnParticles = useCallback((n = 1) => {
    const batch = Array.from({ length: n }, (_, i) => ({
      id: Date.now() + i + Math.random(),
      emoji: PARTICLE_EMOJIS[Math.floor(Math.random() * PARTICLE_EMOJIS.length)],
      dx: Math.random() * 48 - 16,
    }))
    setParticles((p) => [...p.slice(-6), ...batch])
    setTimeout(() => setParticles((p) => p.filter((x) => !batch.some((b) => b.id === x.id))), 1600)
  }, [])

  useEffect(() => {
    if (!mounted || collapsed || chatOpen || registerOpen) return
    const t = setInterval(() => {
      const r = Math.random()
      if (r < 0.3) doEmote('jump', 'happy')
      else if (r < 0.55) doEmote('dance')
      else if (r < 0.8) { doEmote('jump', 'excited'); spawnParticles(2) }
      else doEmote('none', 'wink')
    }, 16000)
    return () => clearInterval(t)
  }, [mounted, collapsed, chatOpen, registerOpen, doEmote, spawnParticles])

  // ===== Dormilón: si nadie lo pela en 100s, se duerme 💤 =====
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetIdle = useCallback(() => {
    setMood((m) => (m === 'sleepy' ? 'idle' : m))
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      setMood('sleepy')
    }, 100000)
  }, [])
  useEffect(() => {
    if (!mounted || collapsed) return
    resetIdle()
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current) }
  }, [mounted, collapsed, resetIdle])

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
    if (collapsed || muted) {
      setBubbleVisible(false)
      return
    }
    const noPostsYet = Boolean(isOwnProfile) && (profileData?.posts?.length ?? 0) === 0
    const tips =
      mood === 'sleepy'
        ? ['Zzz... 💤 (tócame para despertarme)']
        : tipsForView(currentView, { isOwnProfile: !!isOwnProfile, noPostsYet, canChat })
    if (!isAuthed) tips.push('Truco: crea una cuenta gratis para dar like, seguir devs y publicar 😉')
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
    }, 12000)
    return () => clearInterval(rotate)
  }, [currentView, isOwnProfile, profileData, isAuthed, collapsed, muted, mood, canChat])

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

  // ===== Click en Pixel =====
  function handleBuddyClick() {
    resetIdle()
    setBubbleVisible(false)
    if (mood === 'sleepy') {
      setMood('excited')
      setTimeout(() => setMood('idle'), 1500)
      spawnParticles(2)
      setTip('¡Aaah! Me quedé dormido 😴 ¿En qué andamos?')
      setBubbleVisible(true)
      setTimeout(() => setBubbleVisible(false), 4200)
      return
    }
    doEmote('jump', 'happy')
    spawnParticles(1)
    if (canChat) {
      setRegisterOpen(false)
      setChatOpen((v) => !v)
    } else {
      setChatOpen(false)
      setRegisterOpen((v) => !v)
    }
  }

  // ===== Menú ⋮ : cerrar al hacer click fuera =====
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [menuOpen])

  // ===== Chat con IA (solo registrados) =====
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [copied, setCopied] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const storageKey = user && !user.isGuest ? `pixel-chat-${user.id}` : null
  const loadedRef = useRef(false)

  // Cargar historial guardado (por usuario) y guardarlo en cada cambio
  useEffect(() => {
    loadedRef.current = false
    if (!storageKey) {
      setMessages([])
      return
    }
    try {
      const raw = localStorage.getItem(storageKey)
      setMessages(raw ? JSON.parse(raw) : [])
    } catch {
      setMessages([])
    }
    loadedRef.current = true
  }, [storageKey])

  useEffect(() => {
    if (!storageKey || !loadedRef.current) return
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-60))) } catch {}
  }, [messages, storageKey])

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
      if (res.status === 401) {
        // Sesión expiró o cuenta invitada → panel de registro
        setChatOpen(false)
        setRegisterOpen(true)
        return
      }
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || data.error || 'Ay, se me nublaban los circuitos 🤖' }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'No conecté con mi cerebro 🤖 revisa tu conexión e inténtalo otra vez' }])
    } finally {
      setThinking(false)
    }
  }

  // ===== Acciones del menú ⋮ =====
  function newChat() {
    setMessages([])
    setInput('')
    setMenuOpen(false)
  }
  function deleteChat() {
    setMessages([])
    if (storageKey) { try { localStorage.removeItem(storageKey) } catch {} }
    setMenuOpen(false)
    setChatOpen(false)
    setTip('¡Conversación eliminada! 🧹 Fresquita como bug recién resuelto')
    setBubbleVisible(true)
    setTimeout(() => setBubbleVisible(false), 4000)
  }
  function copyChat() {
    if (messages.length === 0) return
    const txt = messages.map((m) => `${m.role === 'user' ? 'Tú' : 'Pixel'}: ${m.content}`).join('\n')
    navigator.clipboard?.writeText(txt).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  function toggleMute() {
    setMuted((v) => {
      const nv = !v
      try { localStorage.setItem('pixel-tips-muted', nv ? '1' : '0') } catch {}
      return nv
    })
    setMenuOpen(false)
  }
  function minimizePixel() {
    setCollapsed(true)
    setChatOpen(false)
    setRegisterOpen(false)
    setMenuOpen(false)
  }

  if (!mounted) return null

  // ===== Geometría responsive (todo dentro de la pantalla) =====
  const bubbleW = isMobile ? 180 : 208
  const bubbleLeft = clamp(pos.x + mascotSize / 2 - bubbleW / 2, 8, vp.w - bubbleW - 8)
  const arrowLeft = clamp(pos.x + mascotSize / 2 - bubbleLeft - 7, 14, bubbleW - 28)
  const panelW = Math.min(300, vp.w - 16)
  const panelLeft = isMobile ? 8 : clamp(pos.x + mascotSize / 2 - panelW / 2, 10, vp.w - panelW - 10)
  const panelBottom = isMobile ? 10 : pos.y + mascotSize + 10

  if (collapsed) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => { setCollapsed(false); resetIdle() }}
        className="fixed bottom-4 right-4 z-40 h-11 w-11 rounded-full glass-strong shadow-lg flex items-center justify-center"
        data-tour="pixel-buddy"
        title="Abrir a Pixel"
      >
        <MiniPixelFace />
      </motion.button>
    )
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40" data-tour="pixel-buddy">
      {/* ===== Partículas emoji ===== */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -46, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="absolute text-sm select-none"
            style={{ left: pos.x + mascotSize / 2 - 8 + p.dx, bottom: pos.y + mascotSize + 4 }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* ===== Burbuja de mensaje ===== */}
      <AnimatePresence>
        {bubbleVisible && !chatOpen && !registerOpen && (
          <motion.div
            key={tip}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            className="pointer-events-auto absolute"
            style={{ left: bubbleLeft, bottom: pos.y + mascotSize + 8, width: bubbleW }}
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
            <div
              className="h-0 w-0 border-l-[7px] border-r-[7px] border-t-[8px] border-l-transparent border-r-transparent border-t-border/60"
              style={{ marginLeft: arrowLeft }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Panel de registro (invitados) ===== */}
      <AnimatePresence>
        {registerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="pointer-events-auto absolute z-10 glass-strong rounded-lg border border-border/60 shadow-xl overflow-hidden"
            style={{ left: panelLeft, width: isMobile ? undefined : panelW, right: isMobile ? 8 : undefined, bottom: panelBottom }}
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50 bg-gradient-to-r from-primary/15 via-accent/10 to-transparent">
              <PixelIcon size={26} mood="wink" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-none">Pixel</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Zona exclusiva de devs registrados</p>
              </div>
              <button
                onClick={() => setRegisterOpen(false)}
                className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary/60 transition"
                aria-label="Cerrar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="px-4 py-4 text-center">
              <PixelIcon size={46} mood="happy" className="mx-auto mb-2" />
              <p className="text-xs font-bold mb-1">¡Hola! Soy Pixel 🤖</p>
              <p className="text-[11px] text-muted-foreground leading-snug mb-3">
                Solo puedo platicar con devs registrados... ¡es mi regla de oro!
                Pero mis tips te los regalo igual 😉
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => { setRegisterOpen(false); openAuth('register') }}
                  className="btn-gradient-primary rounded-full py-2 text-xs font-bold text-white transition hover:opacity-90"
                >
                  Crear cuenta gratis
                </button>
                <button
                  onClick={() => { setRegisterOpen(false); openAuth('login') }}
                  className="rounded-full border border-border py-2 text-xs font-bold hover:bg-secondary/60 transition"
                >
                  Ya tengo cuenta
                </button>
              </div>
            </div>
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
            className="pointer-events-auto absolute z-10 glass-strong rounded-lg border border-border/60 shadow-xl overflow-hidden flex flex-col"
            style={{
              left: panelLeft,
              width: isMobile ? undefined : panelW,
              right: isMobile ? 8 : undefined,
              bottom: panelBottom,
              maxHeight: isMobile ? '58vh' : undefined,
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50 bg-gradient-to-r from-primary/15 via-accent/10 to-transparent">
              <PixelIcon size={28} mood={mood} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-none">Pixel</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-olive-400 live-pulse" />
                  Asistente con IA · pregúntame
                </p>
              </div>
              {/* Menú de 3 puntos */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary/60 transition"
                  aria-label="Opciones del chat"
                  title="Opciones del chat"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-7 z-20 w-48 glass-strong rounded-md border border-border/60 shadow-lg py-1"
                    >
                      <MenuItem icon={MessageSquarePlus} label="Nuevo chat" onClick={newChat} />
                      <MenuItem icon={Trash2} label="Eliminar conversación" onClick={deleteChat} danger />
                      <MenuItem
                        icon={copied ? Check : Copy}
                        label={copied ? '¡Copiado!' : 'Copiar conversación'}
                        onClick={copyChat}
                        disabled={messages.length === 0}
                      />
                      <MenuItem
                        icon={muted ? VolumeX : Volume2}
                        label={muted ? 'Activar burbujas' : 'Silenciar burbujas'}
                        onClick={toggleMute}
                      />
                      <MenuItem icon={Minimize2} label="Minimizar Pixel" onClick={minimizePixel} />
                    </motion.div>
                  )}
                </AnimatePresence>
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
            <div
              ref={listRef}
              className={cn('overflow-y-auto custom-scroll px-3 py-2.5 space-y-2', isMobile ? 'h-44' : 'h-64')}
            >
              {messages.length === 0 && (
                <div className="text-center py-3">
                  <PixelIcon size={40} mood="happy" className="mx-auto mb-1.5" />
                  <p className="text-[11px] text-muted-foreground leading-snug px-2">
                    ¡Holi! Soy Pixel 🤖 Pregúntame cómo usar DevPlay, ideas para tu juego o lo que necesites.
                    ¡Y si publicas algo, celébralo conmigo! ☕
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
        onClick={handleBuddyClick}
        onDoubleClick={() => minimizePixel()}
        animate={{ x: pos.x, y: 0 }}
        transition={{ type: 'spring', stiffness: 55, damping: 14 }}
        className="pointer-events-auto absolute cursor-pointer select-none"
        style={{ left: 0, bottom: pos.y }}
        title="Pixel · tu asistente de IA (doble clic para minimizar)"
        aria-label="Pixel, asistente de IA"
      >
        {/* Flotación suave (siempre) */}
        <motion.div
          animate={mood === 'sleepy' ? { y: [0, -2, 0] } : { y: [0, -5, 0] }}
          transition={{ duration: mood === 'sleepy' ? 4 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
        >
          {/* Emotes de un disparo (salto / baile) */}
          <motion.div
            key={emote.key}
            animate={
              emote.kind === 'jump'
                ? { y: [0, -20, 0, -8, 0] }
                : emote.kind === 'dance'
                  ? { rotate: [0, -8, 8, -6, 6, 0], y: [0, -3, 0, -3, 0, 0] }
                  : { y: 0 }
            }
            transition={{ duration: emote.kind === 'jump' ? 0.9 : 1.4, ease: 'easeInOut' }}
          >
            <motion.div animate={{ scaleX: facing }} transition={{ duration: 0.25 }}>
              <PixelIcon size={mascotSize} pupilX={pupilX} pupilY={pupilY} mood={mood} />
            </motion.div>
            {/* Badge IA */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-bronze-500 shadow">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </span>
          </motion.div>
        </motion.div>
      </motion.button>
    </div>
  )
}

// ===== Ítem del menú ⋮ =====
function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: any
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-left transition',
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : danger
            ? 'text-wine-600 hover:bg-wine-500/10'
            : 'text-foreground/85 hover:bg-secondary/70'
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  )
}

// ===== Robot SVG con humores =====
export function PixelIcon({
  size = 48,
  pupilX,
  pupilY,
  mood = 'idle',
  className,
}: {
  size?: number
  pupilX?: any
  pupilY?: any
  mood?: Mood
  className?: string
}) {
  const hasTracking = !!pupilX && !!pupilY

  const eyes = () => {
    if (mood === 'sleepy') {
      return (
        <g stroke="#4A2E21" strokeWidth="1.8" strokeLinecap="round" fill="none">
          <path d="M22.5 29.5 Q25.5 32.5 28.5 29.5" />
          <path d="M35.5 29.5 Q38.5 32.5 41.5 29.5" />
        </g>
      )
    }
    if (mood === 'happy') {
      return (
        <g stroke="#4A2E21" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M22.5 30 Q25.5 26 28.5 30" />
          <path d="M35.5 30 Q38.5 26 41.5 30" />
        </g>
      )
    }
    if (mood === 'wink') {
      return (
        <g>
          <circle cx="25.5" cy="29" r="3.4" fill="#4A2E21" />
          <circle cx="26.6" cy="28" r="1.1" fill="#FFF6E8" />
          <path d="M35.5 29 Q38.5 32 41.5 29" stroke="#4A2E21" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>
      )
    }
    // idle | excited — ojos redondos (con parpadeo solo en idle)
    return (
      <motion.g
        style={hasTracking ? { x: pupilX, y: pupilY } : undefined}
        animate={mood === 'idle' ? { scaleY: [1, 1, 0.12, 1] } : { scaleY: 1 }}
        transition={mood === 'idle' ? { duration: 0.5, times: [0, 0.72, 0.86, 1], repeat: Infinity, repeatDelay: 3.4 } : undefined}
      >
        <circle cx="25.5" cy="29" r={mood === 'excited' ? 3.9 : 3.4} fill="#4A2E21" />
        <circle cx="38.5" cy="29" r={mood === 'excited' ? 3.9 : 3.4} fill="#4A2E21" />
        <circle cx="26.6" cy="28" r="1.1" fill="#FFF6E8" />
        <circle cx="39.6" cy="28" r="1.1" fill="#FFF6E8" />
      </motion.g>
    )
  }

  const mouth = () => {
    if (mood === 'excited') {
      return <ellipse cx="32" cy="37" rx="2.6" ry="3" fill="#4A2E21" />
    }
    if (mood === 'sleepy') {
      return <path d="M30 37 Q32 38.4 34 37" stroke="#4A2E21" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    }
    if (mood === 'happy') {
      return <path d="M26 34.5 Q32 41 38 34.5" stroke="#4A2E21" strokeWidth="1.9" fill="none" strokeLinecap="round" />
    }
    return <path d="M27 35.5 Q32 39.5 37 35.5" stroke="#4A2E21" strokeWidth="1.7" fill="none" strokeLinecap="round" />
  }

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
      {/* Ojos según humor */}
      {eyes()}
      {/* Boca según humor */}
      {mouth()}
      {/* Mejillas */}
      <circle cx="21.5" cy="33.5" r="1.8" fill="#E8A04C" opacity="0.75" />
      <circle cx="42.5" cy="33.5" r="1.8" fill="#E8A04C" opacity="0.75" />
      {/* Panza */}
      <rect x="24" y="43" width="16" height="4" rx="2" fill="#8A4526" opacity="0.55" />
      {/* Pies */}
      <rect x="20" y="50" width="10" height="6" rx="3" fill="#8A4526" />
      <rect x="34" y="50" width="10" height="6" rx="3" fill="#8A4526" />
      {/* Zzz cuando duerme */}
      {mood === 'sleepy' && (
        <g fill="#4A2E21" fontWeight="bold" fontFamily="monospace">
          <text x="50" y="14" fontSize="8" opacity="0.85">
            Z<animate attributeName="opacity" values="0;0.85;0" dur="2.2s" repeatCount="indefinite" />
          </text>
          <text x="55" y="8" fontSize="6" opacity="0.6">
            Z<animate attributeName="opacity" values="0;0.6;0" dur="2.2s" begin="0.7s" repeatCount="indefinite" />
          </text>
        </g>
      )}
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
