'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { postService } from '@/services/devplay-service'
import { useUIStore } from '@/lib/stores'
import { useCurrentUser } from '@/hooks/use-current-user'
import { UserAvatar, TimeAgo } from '@/components/devplay/shared/shared'
import {
  Video, Play, Eye, Heart, MessageCircle, Share2, Bookmark,
  Flame, Clock, TrendingUp, Film, X, Volume2, VolumeX, Maximize2, Pause,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Post } from '@/types/devplay'

type VideoFilter = 'recent' | 'popular' | 'trending'

export function VideosView() {
  const { openPostDetail, openProfile, openAuth, openCreatePost } = useUIStore()
  const { user, isAuthed, isGuest } = useCurrentUser()
  const [filter, setFilter] = useState<VideoFilter>('recent')
  const [selectedVideo, setSelectedVideo] = useState<Post | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['videos-view', filter],
    queryFn: () => postService.list({ media: 'video' }),
    staleTime: 2 * 60 * 1000,
    refetchInterval: false,
  })

  const allVideos = data?.posts ?? []

  const filtered = [...allVideos].sort((a, b) => {
    switch (filter) {
      case 'popular': return b.likesCount - a.likesCount
      case 'trending': return (b.repostsCount + b.commentsCount) - (a.repostsCount + a.commentsCount)
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  const featured = filtered[0]
  const rest = filtered.slice(1)

  const filters: { id: VideoFilter; label: string; icon: typeof Clock }[] = [
    { id: 'recent', label: 'Recientes', icon: Clock },
    { id: 'popular', label: 'Populares', icon: Heart },
    { id: 'trending', label: 'Tendencia', icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text flex items-center justify-center gap-2">
          <Video className="h-7 w-7" />
          Videos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gameplays, trailers, devlogs y contenido de la comunidad
        </p>
      </div>

      {/* CTA */}
      {isAuthed && !isGuest && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card card-rose p-5 text-center"
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-white">
            <Film className="h-7 w-7" />
          </div>
          <h3 className="font-bold text-lg">Comparte tu contenido</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Sube gameplays, trailers o devlogs de tus proyectos
          </p>
          <Button onClick={openCreatePost} className="btn-gradient-primary rounded-full gap-2">
            <Video className="h-4 w-4" />
            Subir video
          </Button>
        </motion.div>
      )}

      {!isAuthed && (
        <div className="glass-card card-rose p-5 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Inicia sesión para subir tus propios videos y gameplays
          </p>
          <Button onClick={() => openAuth('login')} className="btn-gradient-primary rounded-full">
            Entrar
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1 border-b border-border/40 sticky top-16 z-10 bg-background/80">
        {filters.map((f) => {
          const active = filter === f.id
          const Icon = f.icon
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition relative flex items-center gap-1.5',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {f.label}
              {active && (
                <motion.div
                  layoutId="video-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-300 to-pink-400 text-white">
            <Video className="h-8 w-8" />
          </div>
          <p className="font-semibold text-lg">Aún no hay videos</p>
          <p className="text-sm text-muted-foreground mt-1">
            Sé el primero en compartir un gameplay, trailer o devlog
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Featured video */}
          {featured && (
            <FeaturedVideoCard
              post={featured}
              onPlay={() => setSelectedVideo(featured)}
              onProfile={() => openProfile(featured.author.id)}
            />
          )}

          {/* Grid of rest */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rest.map((post, i) => (
                <VideoCard
                  key={post.id}
                  post={post}
                  onPlay={() => setSelectedVideo(post)}
                  onOpen={() => openPostDetail(post.id)}
                  onProfile={() => openProfile(post.author.id)}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="h-8" />

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayerModal post={selectedVideo} onClose={() => setSelectedVideo(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== Featured (large) video card =====
function FeaturedVideoCard({ post, onPlay, onProfile }: { post: Post; onPlay: () => void; onProfile: () => void }) {
  const videoMedia = post.mediaUrls?.find(m => m.kind === 'video')
  if (!videoMedia) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div className="relative aspect-video bg-black cursor-pointer group" onClick={onPlay}>
        <video
          src={videoMedia.url}
          className="h-full w-full object-cover"
          preload="metadata"
          muted
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm group-hover:scale-110 group-hover:bg-primary/80 transition-all">
            <Play className="h-7 w-7 text-white ml-1" fill="white" />
          </div>
        </div>
        <span className="absolute top-3 left-3 rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-bold text-white flex items-center gap-1">
          <Flame className="h-3 w-3" />
          Destacado
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={onProfile}>
            <UserAvatar username={post.author.username} avatar={post.author.avatar} size="md" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-base line-clamp-2">{post.content || 'Sin título'}</h2>
            <button onClick={onProfile} className="text-xs text-muted-foreground hover:underline mt-0.5">
              @{post.author.username}
            </button>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {post.likesCount * 3 + 12}</span>
              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {post.likesCount}</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {post.commentsCount}</span>
              <TimeAgo date={post.createdAt} className="ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ===== Regular video card =====
function VideoCard({ post, onPlay, onOpen, onProfile, index }: {
  post: Post
  onPlay: () => void
  onOpen: () => void
  onProfile: () => void
  index: number
}) {
  const videoMedia = post.mediaUrls?.find(m => m.kind === 'video')
  if (!videoMedia) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="glass-card overflow-hidden"
    >
      <div className="relative aspect-video bg-black cursor-pointer group" onClick={onPlay}>
        <video
          src={videoMedia.url}
          className="h-full w-full object-cover"
          preload="metadata"
          muted
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm group-hover:bg-primary/80 transition-colors">
            <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <button onClick={onProfile} className="shrink-0">
            <UserAvatar username={post.author.username} avatar={post.author.avatar} size="sm" />
          </button>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpen}>
            <h3 className="font-semibold text-sm line-clamp-2 hover:text-primary transition">
              {post.content || 'Sin título'}
            </h3>
            <button onClick={onProfile} className="text-[11px] text-muted-foreground hover:underline">
              @{post.author.username}
            </button>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {post.likesCount * 3 + 12}</span>
              <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {post.likesCount}</span>
              <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {post.commentsCount}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ===== Video Player Modal =====
function VideoPlayerModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const videoMedia = post.mediaUrls?.find(m => m.kind === 'video')
  const { openProfile, openPostDetail } = useUIStore()
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)

  if (!videoMedia) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Video */}
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
          <video
            src={videoMedia.url}
            className="h-full w-full"
            controls
            autoPlay
            playsInline
            ref={(el) => {
              if (el) {
                el.muted = muted
                if (playing) el.play().catch(() => {})
                else el.pause()
              }
            }}
          />
        </div>

        {/* Info bar */}
        <div className="mt-4 flex items-start gap-3">
          <button onClick={() => { openProfile(post.author.id); onClose() }}>
            <UserAvatar username={post.author.username} avatar={post.author.avatar} size="md" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-white text-lg line-clamp-2">{post.content || 'Sin título'}</h2>
            <button
              onClick={() => { openProfile(post.author.id); onClose() }}
              className="text-sm text-white/60 hover:text-white transition"
            >
              @{post.author.username}
            </button>
            <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {post.likesCount * 3 + 12}</span>
              <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {post.likesCount}</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {post.commentsCount}</span>
              <TimeAgo date={post.createdAt} />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white"
            onClick={() => { openPostDetail(post.id); onClose() }}
          >
            Ver publicación
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
