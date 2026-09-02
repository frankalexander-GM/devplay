'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { postService } from '@/services/devplay-service'
import { PostCard } from '@/components/devplay/post/post-card'
import { useUIStore } from '@/lib/stores'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  Radio, Sparkles, FileText, Gamepad2, Compass, Flame, TrendingUp, Users, Home,
  Video, ImagePlus, BarChart3, ArrowRight, Eye,
} from 'lucide-react'
import { UserAvatar } from '@/components/devplay/shared/shared'
import { cn } from '@/lib/utils'

type FeedFilter = 'foryou' | 'following' | 'all' | 'devlogs' | 'news'

export function ExploreView() {
  const qc = useQueryClient()
  const { openAuth, openCreatePost, openCreateBeta, openCreatePoll } = useUIStore()
  const { user, isGuest } = useCurrentUser()
  const [filter, setFilter] = useState<FeedFilter>('foryou')

  const { data, isLoading } = useQuery({
    queryKey: ['posts', filter],
    queryFn: async () => {
      if (filter === 'all') return postService.list()
      if (filter === 'devlogs') return postService.list({ type: 'BETA' })
      if (filter === 'following') return postService.list({ feed: 'following' })
      if (filter === 'news') return postService.list({ feed: 'news' })
      return postService.list({ feed: 'foryou' })
    },
    refetchInterval: false,
  })

  const { data: discoverData } = useQuery({
    queryKey: ['discover'],
    queryFn: () => postService.list({ type: 'BETA' }),
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['posts'] })

  const posts = data?.posts ?? []
  const sorted = [...posts].sort((a, b) => {
    const aLive = a.type === 'STREAM' && a.stream?.isLive
    const bLive = b.type === 'STREAM' && b.stream?.isLive
    if (aLive && !bLive) return -1
    if (bLive && !aLive) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const discoverBetas = (discoverData?.posts ?? []).slice(0, 4)

  const filters: { id: FeedFilter; label: string }[] = [
    { id: 'foryou', label: 'Para ti' },
    { id: 'following', label: 'Siguiendo' },
    { id: 'all', label: 'Todos' },
    { id: 'devlogs', label: 'Devlogs' },
    { id: 'news', label: 'Noticias' },
  ]

  return (
    <div className="space-y-4">
      {/* ===== HERO BANNER ===== */}
      <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden">
        {/* Background image */}
        <img
          src="/uploads/hero-banner.jpg"
          alt="DevPlay"
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-end h-full px-4 pb-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl sm:text-4xl font-bold text-white drop-shadow-lg">
              Bienvenido a <span className="text-primary">DevPlay</span>
            </h1>
            <p className="text-sm sm:text-base text-white/80 mt-1">
              Descubre, comparte y crea todo sobre videojuegos
            </p>
            <div className="flex items-center gap-2 mt-4 justify-center">
              <Button
                size="sm"
                className="btn-gradient-primary rounded-full gap-1.5"
                onClick={() => useUIStore.getState().setView('discover')}
              >
                <Sparkles className="h-4 w-4" />
                Descubrir juegos
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => useUIStore.getState().setView('betas')}
              >
                <Gamepad2 className="h-4 w-4" />
                Explorar betas
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== POST COMPOSER ===== */}
      {user && (
        <div className="glass-card p-3 flex items-center gap-3">
          <UserAvatar username={user.username} avatar={user.avatar} size="md" className="shrink-0" />
          <button
            onClick={openCreatePost}
            className="flex-1 text-left text-sm text-muted-foreground rounded-full bg-secondary/50 px-4 py-2.5 hover:bg-secondary transition"
          >
            Que estas desarrollando hoy?
          </button>
          <div className="flex items-center gap-0.5 shrink-0">
            <ComposerBtn icon={FileText} label="Publicar" onClick={openCreatePost} />
            <ComposerBtn icon={Video} label="Video" onClick={openCreatePost} />
            <ComposerBtn icon={Gamepad2} label="Beta" onClick={openCreateBeta} />
            <ComposerBtn icon={BarChart3} label="Encuesta" onClick={openCreatePoll} />
            <ComposerBtn icon={ImagePlus} label="Imagen" onClick={openCreatePost} />
          </div>
        </div>
      )}

      {/* ===== DESCUBRIR JUEGOS ===== */}
      {discoverBetas.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-primary" />
              Descubrir juegos
            </h2>
            <button
              onClick={() => useUIStore.getState().setView('betas')}
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {discoverBetas.map((post, i) => {
              const beta = post.beta
              if (!beta) return null
              return (
                <motion.button
                  key={post.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => useUIStore.getState().openPostDetail(post.id)}
                  className="glass-card overflow-hidden text-left"
                >
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/30 relative overflow-hidden">
                    {beta.coverImage ? (
                      <img src={beta.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-black text-primary/40 select-none">
                          {beta.title.charAt(0).toUpperCase()}
                        </span>
                        <Gamepad2 className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-primary/30" />
                      </div>
                    )}
                    {beta.version && (
                      <span className="absolute top-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white">
                        {beta.version}
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-bold truncate">{beta.title}</p>
                    <p className="text-[9px] text-muted-foreground truncate">@{post.author.username}</p>
                    <div className="flex items-center gap-2 mt-1 text-[8px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> {beta.downloads}</span>
                      {beta.genre && <span className="truncate">{beta.genre}</span>}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== FILTER TABS ===== */}
      <div id="devplay-feed" className="flex gap-1 border-b border-border/40 sticky top-16 z-10 bg-background/80">
        {filters.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-2 text-xs font-medium transition relative',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
              {active && (
                <motion.div
                  layoutId="feed-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* ===== FEED ===== */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : sorted.length > 0 ? (
        <div className="space-y-4">
          {sorted.map((post) => (
            <PostCard key={post.id} post={post} onChange={refresh} />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <Gamepad2 className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-semibold text-lg">Aun no hay publicaciones</p>
          <p className="text-sm text-muted-foreground mt-1">
            Se el primero en compartir algo con la comunidad
          </p>
          {isGuest && (
            <Button className="btn-gradient-primary mt-4 rounded-full" onClick={() => openAuth('register')}>
              Crear cuenta para publicar
            </Button>
          )}
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}

function ComposerBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
