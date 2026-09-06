import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TranslationKey } from '../i18n/translations'

/** AI 服务提供商 */
export type AIProvider = 'deepseek' | 'zhipu'

/** 各提供商的可用模型 */
export const PROVIDER_MODELS: Record<AIProvider, { id: string; labelKey: TranslationKey }[]> = {
  deepseek: [
    { id: 'deepseek-chat', labelKey: 'model.deepseekChat' },
    { id: 'deepseek-reasoner', labelKey: 'model.deepseekReasoner' },
  ],
  zhipu: [
    { id: 'glm-5.3-flash', labelKey: 'model.glmFlash' },
    { id: 'glm-5.3', labelKey: 'model.glm53' },
  ],
}

/** 各提供商的默认模型 */
export const PROVIDER_DEFAULT_MODEL: Record<AIProvider, string> = {
  deepseek: 'deepseek-chat',
  zhipu: 'glm-5.3-flash',
}

interface SettingsState {
  provider: AIProvider
  apiKey: string
  zhipuApiKey: string
  model: string
  storagePath: string
  githubToken: string
  isTeacher: boolean
  setProvider: (provider: AIProvider) => void
  setApiKey: (key: string) => void
  setZhipuApiKey: (key: string) => void
  setModel: (model: string) => void
  setStoragePath: (path: string) => void
  setGithubToken: (token: string) => void
  setIsTeacher: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      provider: 'deepseek',
      apiKey: '',
      zhipuApiKey: '',
      model: 'deepseek-chat',
      storagePath: '',
      githubToken: '',
      isTeacher: false,
      setProvider: (provider) => set({ provider }),
      setApiKey: (key) => set({ apiKey: key }),
      setZhipuApiKey: (key) => set({ zhipuApiKey: key }),
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
