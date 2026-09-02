'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Solo un tema: Violeta Gaming — estilo Discord/Twitch
export type ColorTheme = 'violeta'

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
    id: 'violeta',
    label: 'Violeta',
    emoji: '🟣',
    description: 'Violeta Gaming · Moderno y elegante',
    primary: 'Violeta',
    secondary: 'Fucsia',
    background: 'Oscuro profundo / Lavanda claro',
    preview: { primary: 'oklch(0.53 0.24 293)', accent: 'oklch(0.6 0.22 320)', bg: 'oklch(0.985 0.005 300)' },
  },
]

interface ThemeState {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

export const useColorThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colorTheme: 'violeta',
      setColorTheme: (theme) => set({ colorTheme: theme }),
    }),
    { name: 'devplay-color-theme' }
  )
)
