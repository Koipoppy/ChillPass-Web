import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

const VALID_THEMES: Theme[] = ['light', 'dark']

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light'
          applyTheme(newTheme)
          return { theme: newTheme }
        })
      },
    }),
    {
      name: 'chillpass-theme',
      // v1 → v2：vista / codex 主题已移除，历史选择回落到浅色
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<ThemeState>
        if (!state.theme || !VALID_THEMES.includes(state.theme as Theme)) {
          state.theme = 'light'
        }
        return state as ThemeState
      },
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    }
  )
)

function applyTheme(theme: Theme) {
  const root = document.documentElement
  // Remove the attribute first, then set it for dark; light is the default (no attribute)
  root.removeAttribute('data-theme')
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
  }
}
