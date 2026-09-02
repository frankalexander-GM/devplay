'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { discoverService, followService } from '@/services/devplay-service'
import { PostCard } from '@/components/devplay/post/post-card'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useUIStore } from '@/lib/stores'
import { toast } from 'sonner'
import { UserAvatar, UserTags } from '@/components/devplay/shared/shared'
import { getTagMeta } from '@/types/devplay'
import {
  Sparkles, TrendingUp, Users, Flame, ArrowRight, Gamepad2,
  Hash, Clock, Heart, MessageCircle, Download, RefreshCw, UserPlus, UserCheck,
  Star, Eye, Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SortFilter = 'recent' | 'popular' | 'commented' | 'shared'

export function DiscoverView() {
  const { user, isAuthed, isGuest } = useCurrentUser()
  const { openProfile, openPostDetail } = useUIStore()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<SortFilters>('popular')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['discover'],
    queryFn: () => discoverService.get(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  })

  const trending = data?.trending ?? []
  const recommendedUsers = data?.recommendedUsers ?? []
  const popularBetas = data?.popularBetas ?? []
  const popularTags = data?.popularTags ?? []
  const recent = data?.recent ?? []

  // Apply filter to recent posts
  const sortedRecent = [...recent].sort((a, b) => {
    switch (filter) {
      case 'popular': return b.likesCount - a.likesCount
      case 'commented': return b.commentsCount - a.commentsCount
      case 'shared': return (b.repostsCount || 0) - (a.repostsCount || 0)
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  const filters: { id: SortFilters; label: string; icon: any }[] = [
    { id: 'recent', label: 'Recientes', icon: Clock },
    { id: 'popular', label: 'Populares', icon: Flame },
    { id: 'commented', label: 'Comentados', icon: MessageCircle },
    { id: 'shared', label: 'Compartidos', icon: Share2 },
  ]

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text flex items-center justify-center gap-2">
          <Sparkles className="h-7 w-7" />
          Descubrir
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explora contenido nuevo, devs talentosos y betas exclusivas
        </p>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-sm gap-1.5 text-xs"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      {isLoading ? (
        <DiscoverSkeleton />
      ) : (
        <>
          {/* Tendencias */}
          {trending.length > 0 && (
            <DiscoverSection
              icon={Flame}
              title="Tendencias"
              gradient="from-wine-400 to-bronze-500"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trending.slice(0, 4).map((post, i) => (
                  <motion.button
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => openPostDetail(post.id)}
                    className="glass-card text-left p-3 transition"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <UserAvatar username={post.author.username} avatar={post.author.avatar} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{post.author.username}</p>
                        <p className="text-[9px] text-muted-foreground">Trending #{i + 1}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-wine-500 font-bold">
                        <Flame className="h-3 w-3" />
                        {post.likesCount + post.commentsCount * 2}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {post.type === 'BETA' && post.beta ? post.beta.title : post.content || '(sin texto)'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {post.likesCount}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {post.commentsCount}</span>
                      {post.type === 'BETA' && post.beta && (
                        <span className="flex items-center gap-0.5"><Download className="h-3 w-3" /> {post.beta.downloads}</span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </DiscoverSection>
          )}

          {/* Personas recomendadas */}
          {recommendedUsers.length > 0 && (
            <DiscoverSection
              icon={Users}
              title="Personas que podrías conocer"
              gradient="from-wine-400 to-wine-500"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {recommendedUsers.map((dev, i) => (
                  <RecommendedUserCard key={dev.id} user={dev} delay={i * 0.05} />
                ))}
              </div>
            </DiscoverSection>
          )}

          {/* Betas populares */}
          {popularBetas.length > 0 && (
            <DiscoverSection
              icon={Gamepad2}
              title="Betas populares"
              gradient="from-amber-400 to-bronze-500"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {popularBetas.map((beta, i) => (
                  <motion.button
                    key={beta.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => openPostDetail(beta.id)}
                    className="glass-card card-peach p-4 text-left transition"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-bronze-500 text-white">
                        <Gamepad2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{beta.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">@{beta.author.username}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{beta.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Download className="h-3 w-3" /> {beta.downloads}</span>
                      <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {beta.likesCount}</span>
                      {beta.genre && (
                        <span className="rounded-sm bg-wine-100 px-1.5 py-0.5 font-medium text-wine-700 dark:bg-wine-500/20 dark:text-wine-300">
                          {beta.genre}
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </DiscoverSection>
          )}

          {/* 🏷️ Tags populares */}
          {popularTags.length > 0 && (
            <DiscoverSection
              icon={Hash}
              title="Tags populares"
              gradient="from-wine-400 to-wine-500"
            >
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag, i) => {
                  const meta = getTagMeta(tag.tag)
                  return (
                    <motion.div
                      key={tag.tag}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-1.5 rounded-sm glass px-3 py-1.5 text-xs font-medium transition cursor-pointer"
                    >
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span>{meta?.label || tag.tag}</span>
                      <span className="text-[10px] text-muted-foreground">{tag.count}</span>
                    </motion.div>
                  )
                })}
              </div>
            </DiscoverSection>
          )}

          {/* 📝 Publicaciones recientes con filtros */}
          <DiscoverSection
            icon={Clock}
            title="Explorar publicaciones"
            gradient="from-olive-400 to-sepia-500"
            action={
              <div className="flex gap-1 glass rounded-sm p-0.5">
                {filters.map(f => {
                  const Icon = f.icon
                  const active = filter === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={cn(
                        'flex items-center gap-1 rounded-sm px-2.5 py-1 text-[10px] font-medium transition',
                        active ? 'btn-gradient-primary text-white' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{f.label}</span>
                    </button>
                  )
                })}
              </div>
            }
          >
            {sortedRecent.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Sparkles className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
                <p className="font-semibold">Aún estamos preparando recomendaciones para ti</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Explora algunas categorías para ayudarnos a conocer tus intereses
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedRecent.map((post) => (
                  <PostCard key={post.id} post={post} onChange={() => qc.invalidateQueries({ queryKey: ['discover'] })} />
                ))}
              </div>
            )}
          </DiscoverSection>
        </>
      )}
    </div>
  )
}

// ===== Section wrapper =====
function DiscoverSection({
  icon: Icon, title, gradient, children, action,
}: {
  icon: any; title: string; gradient: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm', gradient)}>
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="font-bold text-sm">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  )
}

// ===== Recommended user card with follow =====
function RecommendedUserCard({ user, delay }: { user: any; delay: number }) {
  const { openProfile } = useUIStore()
  const { isAuthed, isGuest } = useCurrentUser()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  async function toggleFollow(e: React.MouseEvent) {
    e.stopPropagation()
    if (!isAuthed || isGuest) {
      useUIStore.getState().openAuth('login')
      return
    }
    setLoading(true)
    try {
      if (following) {
        await followService.unfollow(user.id)
        setFollowing(false)
      } else {
        await followService.follow(user.id)
        setFollowing(true)
        toast.success(`Siguiendo a @${user.username}`)
      }
    } catch {}
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="glass-card p-3 text-center"
    >
      <button onClick={() => openProfile(user.id)} className="mx-auto block">
        <UserAvatar username={user.username} avatar={user.avatar} size="lg" className="mx-auto" />
      </button>
      <button onClick={() => openProfile(user.id)} className="mt-2 block w-full">
        <p className="text-sm font-semibold truncate">{user.username}</p>
        {user.bio && <p className="text-[10px] text-muted-foreground line-clamp-1">{user.bio}</p>}
      </button>
      {user.tags && user.tags.length > 0 && (
        <UserTags tags={user.tags} size="xs" max={2} className="mt-1 justify-center" />
      )}
      <div className="flex items-center justify-center gap-2 mt-1 text-[9px] text-muted-foreground">
        <span>{user.followersCount} seguidores</span>
        <span>· {user.postsCount} posts</span>
      </div>
      <Button
        size="sm"
        variant={following ? 'outline' : 'default'}
        onClick={toggleFollow}
        disabled={loading}
        className={cn('mt-2 w-full rounded-sm text-xs h-7', !following && 'btn-gradient-primary')}
      >
        {following ? <><UserCheck className="h-3 w-3" /> Siguiendo</> : <><UserPlus className="h-3 w-3" /> Seguir</>}
      </Button>
    </motion.div>
  )
}

// ===== Skeleton =====
function DiscoverSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32 rounded-full mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-md" />)}
        </div>
      </div>
      <div>
        <Skeleton className="h-8 w-48 rounded-full mb-3" />
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-36 rounded-md" />)}
        </div>
      </div>
      <div>
        <Skeleton className="h-8 w-32 rounded-full mb-3" />
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-md" />)}
        </div>
      </div>
    </div>
  )
}
