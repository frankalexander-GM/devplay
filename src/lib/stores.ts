'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ViewId } from '@/types/devplay'

// ===== UI Store (view state, modals, sidebar) =====

interface UIState {
  // Navigation — 5 vistas principales
  currentView: ViewId
  profileUserId: string | null
  profileTab: string | null
  setView: (v: ViewId) => void
  openProfile: (userId: string, tab?: string) => void

  // Modals
  authModalOpen: boolean
  authMode: 'login' | 'register'
  createPostOpen: boolean
  createBetaOpen: boolean
  createPollOpen: boolean
  goLiveOpen: boolean
  postDetailId: string | null

  openAuth: (mode?: 'login' | 'register') => void
  closeAuth: () => void
  openCreatePost: () => void
  closeCreatePost: () => void
  openCreateBeta: () => void
  closeCreateBeta: () => void
  openCreatePoll: () => void
  closeCreatePoll: () => void
  openGoLive: () => void
  closeGoLive: () => void
  openPostDetail: (id: string) => void
  closePostDetail: () => void

  // World chat sidebar (mobile)
  chatOpen: boolean
  toggleChat: () => void

  // Sidebar móvil
  mobileSidebarOpen: boolean
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void

  // Onboarding
  onboardingDone: boolean
  setOnboardingDone: (v: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currentView: 'explore',
      profileUserId: null,
      setView: (v) => set({ currentView: v, mobileSidebarOpen: false }),
      openProfile: (userId, tab) => set({ currentView: 'profile', profileUserId: userId, profileTab: tab ?? null, mobileSidebarOpen: false }),

      authModalOpen: false,
      authMode: 'login',
      createPostOpen: false,
      createBetaOpen: false,
      createPollOpen: false,
      goLiveOpen: false,
      postDetailId: null,

      openAuth: (mode = 'login') => set({ authModalOpen: true, authMode: mode }),
      closeAuth: () => set({ authModalOpen: false }),
      openCreatePost: () => set({ createPostOpen: true }),
      closeCreatePost: () => set({ createPostOpen: false }),
      openCreateBeta: () => set({ createBetaOpen: true }),
      closeCreateBeta: () => set({ createBetaOpen: false }),
      openCreatePoll: () => set({ createPollOpen: true }),
      closeCreatePoll: () => set({ createPollOpen: false }),
      openGoLive: () => set({ goLiveOpen: true }),
      closeGoLive: () => set({ goLiveOpen: false }),
      openPostDetail: (id) => set({ postDetailId: id }),
      closePostDetail: () => set({ postDetailId: null }),

      chatOpen: false,
      toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),

      mobileSidebarOpen: false,
      toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

      onboardingDone: false,
      setOnboardingDone: (v) => set({ onboardingDone: v }),
    }),
    {
      name: 'devplay-ui',
      partialize: (s) => ({ onboardingDone: s.onboardingDone }),
    }
  )
)

// ===== Guest store (for guest sessions) =====
interface GuestState {
  guestUser: { id: string; username: string; isGuest: true } | null
  setGuest: (u: { id: string; username: string } | null) => void
  clearGuest: () => void
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      guestUser: null,
      setGuest: (u) =>
        set({
          guestUser: u ? { ...u, isGuest: true as const } : null,
        }),
      clearGuest: () => set({ guestUser: null }),
    }),
    { name: 'devplay-guest' }
  )
)
