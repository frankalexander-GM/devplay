'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Solo un tema: Grafito & Carmesí — imprenta clásica, neutro con acento carmesí
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
    description: 'Grafito & Carmesí · Imprenta clásica serif',
    primary: 'Grafito',
    secondary: 'Carmesí',
    background: 'Grafito noche / Porcelana',
    preview: { primary: 'oklch(0.53 0.145 25)', accent: 'oklch(0.40 0.007 240)', bg: 'oklch(0.962 0.003 240)' },
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
