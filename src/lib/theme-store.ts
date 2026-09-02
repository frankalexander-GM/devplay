'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Solo un tema: Prensa Vintage — marfil & tinta, serif editorial
export type ColorTheme = 'vintage'

export interface ThemeInfo {
  id: ColorTheme
  label: string
  emoji: string
  description: string
  primary: string
  secondary: string
  background: string
  preview: { primary: string; accent: string; bg: string }
}

export const COLOR_THEMES: ThemeInfo[] = [
  {
    id: 'vintage',
    label: 'Vintage',
    emoji: '🎩',
    description: 'Prensa Vintage · Marfil y tinta, serif clásica',
    primary: 'Tinta',
    secondary: 'Vino',
    background: 'Tinta de noche / Marfil',
    preview: { primary: 'oklch(0.52 0.125 20)', accent: 'oklch(0.55 0.08 72)', bg: 'oklch(0.955 0.018 90)' },
  },
]

interface ThemeState {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

export const useColorThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colorTheme: 'vintage',
      setColorTheme: (theme) => set({ colorTheme: theme }),
    }),
    { name: 'devplay-color-theme' }
  )
)
