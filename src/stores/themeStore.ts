import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'vista' | 'win95' | 'codex'

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
  root.removeAttribute('data-theme-win95')

  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else if (theme === 'vista') {
    root.setAttribute('data-theme', 'vista')
  } else if (theme === 'win95') {
    root.setAttribute('data-theme', 'win95')
  } else if (theme === 'codex') {
    root.setAttribute('data-theme', 'codex')
  }
  // light = no attribute (default)
}
