'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MessageSquare, Send, X, Copy, Check, Flag, ScrollText, Users } from 'lucide-react'
import { useUIStore } from '@/lib/stores'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useWorldChat, type ChatMessage } from '@/hooks/use-socket'
import { UserAvatar, TimeAgo } from '@/components/devplay/shared/shared'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const QUICK_EMOJIS = ['🎮', '🔥', '👀', '❤️', '🚀', '😎']

interface ChatPanelProps {
  variant?: 'sidebar' | 'fullview'
}

export function ChatPanel({ variant = 'sidebar' }: ChatPanelProps) {
  const { user, isGuest } = useCurrentUser()
  const { chatOpen, toggleChat, openAuth } = useUIStore()
  const { messages, onlineCount, sendMessage, isConnected } = useWorldChat(user?.id, user?.username)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Usuarios presentes en la sala (últimos participantes únicos)
  const roomUsers = useMemo(() => {
    const seen = new Map<string, { userId: string; username: string; avatar?: string | null }>()
    for (let i = messages.length - 1; i >= 0 && seen.size < 14; i--) {
      const m = messages[i]
      if (m.type === 'system' || !m.username || seen.has(m.userId)) continue
      seen.set(m.userId, { userId: m.userId, username: m.username, avatar: m.avatar })
    }
    return [...seen.values()]
  }, [messages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    if (!user || isGuest) return
    sendMessage(input)
    setInput('')
  }

  const canChat = user && !isGuest

  const isFull = variant === 'fullview'

  const chatContent = (
    <div className="flex h-full flex-col">
      {/* Header — cabecera editorial */}
      <div className="glass-strong border-b border-border/50 px-3 pt-3 pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm frame-double bg-primary text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base leading-tight">Chat Mundial</h3>
              <div className="flex items-center gap-1.5">
                <span className={cn('h-1.5 w-1.5 rounded-full', onlineCount > 0 ? 'bg-olive-400 live-pulse' : 'bg-muted-foreground/50')} />
                <span className="label-caps !text-[9px] !tracking-[0.12em]">
                  En vivo · {onlineCount} conectados
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={toggleChat}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="rule-ornate mt-2.5 opacity-60">
          <span className="text-[8px] leading-none">◆</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="custom-scroll flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground px-6">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-sm frame-double bg-secondary">
              <MessageSquare className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-display font-bold text-foreground">La plaza está tranquila…</p>
            <p className="text-xs mt-1 italic">rompe el hielo con un ¡hola, devs!</p>
            <div className="rule-ornate w-24 mt-4 opacity-60">
              <span className="text-[8px]">◆</span>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} isMine={msg.userId === user?.id} />
          ))
        )}
      </div>

      {/* Tira "En la sala" — solo sidebar */}
      {!isFull && roomUsers.length > 0 && (
        <div className="border-t border-border/40 px-3 py-2 bg-secondary/30">
          <div className="flex items-center justify-between gap-2">
            <span className="label-caps !text-[9px] shrink-0">En la sala</span>
            <div className="flex -space-x-1.5">
              {roomUsers.slice(0, 6).map((u) => (
                <UserAvatar
                  key={u.userId}
                  username={u.username}
                  avatar={u.avatar}
                  size="xs"
                  className="ring-2 ring-background shrink-0"
                />
              ))}
              {roomUsers.length > 6 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary border border-border text-[9px] font-bold text-muted-foreground ring-2 ring-background">
                  +{roomUsers.length - 6}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Emojis rápidos — solo usuarios logueados */}
      {canChat && (
        <div className="flex items-center gap-1 border-t border-border/40 px-3 py-1.5 bg-secondary/30">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendMessage(emoji)}
              className="flex h-6 w-6 items-center justify-center rounded-sm text-sm transition hover:bg-accent hover:scale-110 active:scale-95"
              title={`Enviar ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input / CTA de invitado */}
      <div className="glass-strong border-t border-border/50 p-2.5">
        {canChat ? (
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              maxLength={500}
              className="rounded-sm glass h-9"
            />
            <Button type="submit" size="icon" disabled={!input.trim()} className="btn-gradient-primary shrink-0 rounded-sm h-9 w-9">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="frame-double bg-secondary/40 p-3 text-center">
            <p className="label-caps !text-[9px] mb-1.5">Únete a la charla</p>
            <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">
              {isGuest
                ? 'Crea una cuenta gratis para escribir en el chat mundial'
                : 'Entra con tu cuenta para escribir en el chat mundial'}
            </p>
            <Button
              size="sm"
              className="btn-gradient-primary w-full rounded-sm gap-1.5"
              onClick={() => openAuth(isGuest ? 'register' : 'login')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {isGuest ? 'Crear cuenta' : 'Iniciar sesión'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  // Vista completa (página) — dos columnas en escritorio
  if (isFull) {
    return (
      <>
      <div className="mx-auto max-w-5xl grid lg:grid-cols-[1fr_16rem] gap-4 items-start">
        <div className="glass-card flex h-[70vh] flex-col overflow-hidden">
          {chatContent}
        </div>

        {/* Columna lateral de la sala */}
        <div className="hidden lg:flex flex-col gap-4">
          {/* En la sala */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-3.5 w-3.5 text-primary" />
              <p className="label-caps">En la sala · {roomUsers.length + onlineCount}</p>
            </div>
            {roomUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Todavía nadie ha escrito hoy. La sala te espera.
              </p>
            ) : (
              <div className="space-y-2">
                {roomUsers.slice(0, 8).map((u) => (
                  <div key={u.userId} className="flex items-center gap-2">
                    <UserAvatar username={u.username} avatar={u.avatar} size="xs" />
                    <span className="text-xs font-medium truncate">{u.username}</span>
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-olive-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reglas del club */}
          <div className="glass-card frame-double p-4">
            <div className="flex items-center gap-2 mb-3">
              <ScrollText className="h-3.5 w-3.5 text-primary" />
              <p className="label-caps">Reglas del club</p>
            </div>
            <ol className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
              <li className="flex gap-2">
                <span className="font-display font-bold text-primary shrink-0">I.</span>
                Sé amable — aquí todos somos devs aprendiendo.
              </li>
              <li className="flex gap-2">
                <span className="font-display font-bold text-primary shrink-0">II.</span>
                Sin spam ni autopromoción compulsiva.
              </li>
              <li className="flex gap-2">
                <span className="font-display font-bold text-primary shrink-0">III.</span>
                Comparte tu devlog y da feedback con cariño.
              </li>
            </ol>
          </div>

          <p className="text-center text-xs text-muted-foreground italic">
            Conecta con la comunidad DevPlay en tiempo real
          </p>
        </div>
      </div>

      {/* Temas de conversación — llena el vacío bajo la sala */}
      <div className="mx-auto max-w-5xl mt-4 text-center">
        <p className="label-caps mb-2.5">Temas de hoy en la plaza</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {['#Devlogs', '#Betas', '#PixelArt', '#GameJams', '#Playtesting', '#Speedruns', '#Audio'].map((topic) => (
            <span
              key={topic}
              className="label-caps !text-[9px] border border-border bg-secondary/50 px-2.5 py-1 rounded-sm"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>
      </>
    )
  }

  // Sidebar lateral (desktop) + drawer (mobile)
  return (
    <>
      <aside className="hidden lg:flex w-80 shrink-0 flex-col sticky top-16 h-[calc(100vh-4rem)] glass border-l border-border/50">
        {chatContent}
      </aside>

      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleChat}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col glass-strong lg:hidden"
            >
              {chatContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function ChatBubble({ msg, isMine }: { msg: ChatMessage; isMine: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  if (msg.type === 'system') {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="label-caps !text-[9px] bg-secondary/60 px-2.5 py-1 rounded-sm">
          {msg.content}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('group relative flex gap-2', isMine && 'flex-row-reverse')}>
      <UserAvatar username={msg.username} avatar={msg.avatar} size="sm" className="mt-0.5 shrink-0" />
      <div className={cn('min-w-0 max-w-[80%]', isMine && 'items-end flex flex-col')}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn('text-xs font-semibold', isMine ? 'text-primary' : '')}>
            {msg.username}
          </span>
          <TimeAgo date={msg.createdAt} className="text-[10px]" />
        </div>
        {/* Burbuja — cuadrada vintage, terracota para mí */}
        <div
          className={cn(
            'inline-block w-fit max-w-full rounded-sm px-2.5 py-1.5 border',
            isMine
              ? 'bg-primary text-primary-foreground border-primary/40'
              : 'bg-secondary/70 border-border/50'
          )}
        >
          <p className="text-sm break-words leading-relaxed">
            {msg.content}
          </p>
        </div>
      </div>

      {/* 3 puntos — solo visibles al hover */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className={cn(
          'absolute top-0 transition-opacity z-10',
          isMine ? 'left-0' : 'right-0',
          menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <MoreVerticalIcon />
      </button>

      {/* Menu desplegable */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                'absolute top-5 z-50 w-36 glass-strong rounded-md border border-border/50 shadow-lg overflow-hidden',
                isMine ? 'left-0' : 'right-0'
              )}
            >
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(msg.content)
                  setCopied(true)
                  setTimeout(() => { setCopied(false); setMenuOpen(false) }, 1000)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-secondary/60 transition"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-olive-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              {!isMine && (
                <div className="border-t border-border/40" />
              )}
              {!isMine && (
                <button
                  onClick={() => {
                    import('@/services/security-service').then(s => {
                      s.securityService.report({
                        type: 'COMMENT',
                        entityId: msg.id,
                        reason: 'spam',
                      }).then(() => {
                        toast.success('Mensaje reportado')
                      }).catch(() => {
                        toast.error('Error al reportar')
                      })
                    })
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-secondary/60 transition"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Reportar
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function MoreVerticalIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  )
}
