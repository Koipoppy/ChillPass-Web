import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { normalizeModelId } from '../services/modelCatalog'

/** AI 服务提供商 */
export type AIProvider = 'deepseek' | 'zhipu'

/**
 * 各提供商的默认模型
 * 注意：deepseek-chat / deepseek-reasoner 已于 2026-07-24 退役（调用返回 404），
 * 现行可用模型为 deepseek-flash 与 deepseek-v4-pro
 */
export const PROVIDER_DEFAULT_MODEL: Record<AIProvider, string> = {
  deepseek: 'deepseek-flash',
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
      model: PROVIDER_DEFAULT_MODEL.deepseek,
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
      // v1：旧版本存的模型 ID 可能已退役（如 deepseek-chat），迁移为当前可用模型
      version: 1,
      migrate: (persisted) => {
        const state = persisted as Partial<SettingsState> | undefined
        if (state && typeof state.model === 'string') {
          state.model = normalizeModelId(state.model)
        }
        return state as SettingsState
      },
    }
  )
)
