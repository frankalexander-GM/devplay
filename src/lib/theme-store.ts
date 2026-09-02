'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Solo un tema: Mono (blanco y negro) — limpio y profesional
export type ColorTheme = 'mono'

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
    id: 'mono',
    label: 'Mono',
    emoji: 'B/N',
    description: 'Blanco y negro · Limpio y profesional',
    primary: 'Negro',
    secondary: 'Gris',
    background: 'Blanco/Negro',
    preview: { primary: 'oklch(0.2 0 0)', accent: 'oklch(0.5 0 0)', bg: 'oklch(0.98 0 0)' },
  },
]

interface ThemeState {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

export const useColorThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colorTheme: 'mono',
      setColorTheme: (theme) => set({ colorTheme: theme }),
    }),
    { name: 'devplay-color-theme' }
  )
)
