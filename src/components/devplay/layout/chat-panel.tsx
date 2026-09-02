'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, Users, X, Sparkles, Heart, MoreVertical, Copy, Check, Flag } from 'lucide-react'
import { useUIStore } from '@/lib/stores'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useWorldChat, type ChatMessage } from '@/hooks/use-socket'
import { UserAvatar, TimeAgo } from '@/components/devplay/shared/shared'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ChatPanelProps {
  variant?: 'sidebar' | 'fullview'
}

export function ChatPanel({ variant = 'sidebar' }: ChatPanelProps) {
  const { user, isGuest } = useCurrentUser()
  const { chatOpen, toggleChat } = useUIStore()
  const { messages, onlineCount, sendMessage, isConnected } = useWorldChat(user?.id, user?.username)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

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
      {/* Header */}
      <div className="glass-strong flex items-center justify-between border-b border-border/50 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Chat Mundial</h3>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-olive-400 live-pulse" />
              <span className="text-[10px] text-muted-foreground">{onlineCount} conectados</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={toggleChat}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="custom-scroll flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-amber-200 to-bronze-200 dark:from-amber-500/20 dark:to-bronze-500/20">
              <MessageSquare className="h-8 w-8 text-amber-500" />
            </div>
            <p className="font-medium">Sé el primero en escribir</p>
            <p className="text-xs">en el chat mundial</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} isMine={msg.userId === user?.id} />
          ))
        )}
      </div>

      {/* Input */}
      <div className="glass-strong border-t border-border/50 p-2.5">
        {canChat ? (
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              maxLength={500}
              className="rounded-full glass h-9"
            />
            <Button type="submit" size="icon" disabled={!input.trim()} className="btn-gradient-primary shrink-0 rounded-sm h-9 w-9">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="py-2 text-center">
            <p className="text-xs text-muted-foreground">
              {isGuest ? 'Los invitados no pueden chatear' : 'Inicia sesión para chatear'}
            </p>
          </div>
        )}
      </div>
    </div>
  )

  // Vista completa (página)
  if (isFull) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 text-center">
          <h1 className="text-3xl font-bold gradient-text-peach mb-1">Chat Mundial</h1>
          <p className="text-sm text-muted-foreground">
            Conecta con la comunidad DevPlay en tiempo real
          </p>
        </div>
        <div className="glass-card flex h-[70vh] flex-col overflow-hidden">
          {chatContent}
        </div>
      </div>
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

function FeatureMini({ icon: Icon, title, value, color }: { icon: any; title: string; value: any; color: string }) {
  return (
    <div className="glass-card flex flex-col items-center gap-1 p-3 text-center">
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{title}</div>
    </div>
  )
}

function ChatBubble({ msg, isMine }: { msg: ChatMessage; isMine: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  if (msg.type === 'system') {
    return (
      <div className="text-center text-[11px] text-muted-foreground italic py-1">
        {msg.content}
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
        <p className="text-sm break-words text-foreground/90 leading-relaxed">
          {msg.content}
        </p>
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
        <MoreVertical className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
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
