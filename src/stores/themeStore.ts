import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'vista' | 'codex'

const VALID_THEMES: Theme[] = ['light', 'dark', 'vista', 'codex']

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
      version: 1,
      // v0 → v1：win95 主题已移除，迁移到浅色
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
  // Remove all theme attributes first
  root.removeAttribute('data-theme')
  root.removeAttribute('data-theme-vista')

  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else if (theme === 'vista') {
    root.setAttribute('data-theme', 'vista')
  } else if (theme === 'codex') {
    root.setAttribute('data-theme', 'codex')
  }
  // light = no attribute (default)
}
