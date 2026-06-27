import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  apiKey: string
  model: string
  storagePath: string
  githubToken: string
  isTeacher: boolean
  setApiKey: (key: string) => void
  setModel: (model: string) => void
  setStoragePath: (path: string) => void
  setGithubToken: (token: string) => void
  setIsTeacher: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      model: 'deepseek-chat',
      storagePath: '',
      githubToken: '',
      isTeacher: false,
      setApiKey: (key) => set({ apiKey: key }),
      setModel: (model) => set({ model }),
      setStoragePath: (path) => set({ storagePath: path }),
      setGithubToken: (token) => set({ githubToken: token }),
      setIsTeacher: (v) => set({ isTeacher: v }),
    }),
    {
      name: 'chillpass-settings',
    }
  )
)
