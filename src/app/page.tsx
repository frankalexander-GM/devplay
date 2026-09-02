'use client'

import { useEffect, useRef, useState } from 'react'
import { useUIStore } from '@/lib/stores'
import { Header } from '@/components/devplay/layout/header'
import { Sidebar } from '@/components/devplay/layout/sidebar'
import { ChatPanel } from '@/components/devplay/layout/chat-panel'
import { ExploreView } from '@/components/devplay/views/explore-view'
import { DiscoverView } from '@/components/devplay/views/discover-view'
import { VideosView } from '@/components/devplay/views/videos-view'
import { BetasView } from '@/components/devplay/views/betas-view'
import { ProfileView } from '@/components/devplay/views/profile-view'
import { StoreView } from '@/components/devplay/views/store-view'
import { AboutView } from '@/components/devplay/views/about-view'
import { AuthModal } from '@/components/devplay/auth-modal'
import { CreatePostModal } from '@/components/devplay/create-post-modal'
import { CreateBetaModal } from '@/components/devplay/create-beta-modal'
import { CreatePollModal } from '@/components/devplay/create-poll-modal'
import { PostDetailModal } from '@/components/devplay/post-detail-modal'
import { ResetPasswordModal } from '@/components/devplay/forgot-password-modal'
import { OnboardingTour } from '@/components/devplay/onboarding-tour'
import { useCurrentUser } from '@/hooks/use-current-user'
import { motion, AnimatePresence } from 'framer-motion'
import type { ViewId } from '@/types/devplay'

const VIEW_TITLES: Record<ViewId, string> = {
  explore: 'Explorar',
  discover: 'Descubrir',
  chat: 'Chat Mundial',
  videos: 'Videos',
  profile: 'Perfil',
  betas: 'Betas',
  store: 'Tienda',
  about: 'Acerca de',
}

export default function Home() {
  const { currentView, profileUserId, openAuth, postDetailId, openPostDetail } = useUIStore()
  const { user, loading } = useCurrentUser()
  const autoOpenTried = useRef(false)
  const [resetToken, setResetToken] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const postId = params.get('post')
    if (postId) openPostDetail(postId)

    const reset = params.get('reset')
    if (reset) {
      queueMicrotask(() => {
        setResetToken(reset)
        window.history.replaceState({}, '', window.location.pathname)
      })
    }
  }, [openPostDetail])

  useEffect(() => {
    if (autoOpenTried.current) return
    if (!loading && !user && !resetToken) {
      autoOpenTried.current = true
      const params = new URLSearchParams(window.location.search)
      if (!params.get('post') && !params.get('reset')) {
        const t = setTimeout(() => openAuth('login'), 800)
        return () => clearTimeout(t)
      }
    }
  }, [loading, user, openAuth, resetToken])

  const isChatView = currentView === 'chat'
  const isProfileView = currentView === 'profile'

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-4xl px-3 sm:px-6 py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={isProfileView ? `profile-${profileUserId}` : currentView}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {isProfileView && profileUserId ? (
                  <ProfileView userId={profileUserId} />
                ) : currentView === 'explore' ? (
                  <ExploreView />
                ) : currentView === 'discover' ? (
                  <DiscoverView />
                ) : currentView === 'chat' ? (
                  <ChatPanel variant="fullview" />
                ) : currentView === 'videos' ? (
                  <VideosView />
                ) : currentView === 'betas' ? (
                  <BetasView />
                ) : currentView === 'store' ? (
                  <StoreView />
                ) : currentView === 'about' ? (
                  <AboutView />
                ) : (
                  <ExploreView />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {!isChatView && <ChatPanel variant="sidebar" />}
      </div>

      <footer className="glass-strong border-t-[3px] border-double border-border mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="label-caps">© 2025 DevPlay — Gaceta de devs indie</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-olive-400 live-pulse" />
              Servicio en línea
            </span>
            <span className="label-caps">MVP v1.0</span>
          </div>
        </div>
      </footer>

      <AuthModal />
      <CreatePostModal />
      <CreateBetaModal />
      <CreatePollModal />
      <PostDetailModal />

      {resetToken && (
        <ResetPasswordModal
          open={!!resetToken}
          token={resetToken}
          onClose={() => { setResetToken(null); openAuth('login') }}
        />
      )}

      <OnboardingTour />
    </div>
  )
}
