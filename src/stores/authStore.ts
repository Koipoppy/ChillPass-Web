import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LocalAccount } from '@types/index'

/** 导出的账号数据包（用于跨设备迁移） */
export interface AccountExportBundle {
  version: string
  exportedAt: number
  account: LocalAccount
}

interface AuthState {
  account: LocalAccount | null
  /** 确保 account 存在（首次使用自动创建默认账号） */
  ensureAccount: () => void
  /** 更新账号信息 */
  updateAccount: (partial: Partial<LocalAccount>) => void
  /** 重置为默认账号 */
  resetAccount: () => void
  /** 导入账号数据（替换当前账号），返回是否成功 */
  importAccount: (bundle: AccountExportBundle) => boolean
}

/** 创建默认本地账号 */
function createDefaultAccount(): LocalAccount {
  const now = Date.now()
  return {
    name: '学习者',
    avatar: '🦊',
    createdAt: now,
    lastActiveAt: now,
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      account: null,

      ensureAccount: () => {
        if (!get().account) {
          set({ account: createDefaultAccount() })
        }
      },

      updateAccount: (partial) =>
        set((state) => ({
          account: state.account
            ? { ...state.account, ...partial, lastActiveAt: Date.now() }
            : createDefaultAccount(),
        })),

      resetAccount: () => set({ account: createDefaultAccount() }),

      importAccount: (bundle) => {
        if (!bundle?.account?.name) return false
        set({
          account: {
            ...bundle.account,
            lastActiveAt: Date.now(),
          },
        })
        return true
      },
    }),
    {
      name: 'chillpass-auth',
      onRehydrateStorage: () => (state) => {
        // 从 localStorage 恢复后，如果没有账号则自动创建
        if (state && !state.account) {
          state.ensureAccount()
        }
      },
    }
  )
)

/** 导出当前账号为 JSON 文件并触发下载 */
export function exportAccountToFile(): void {
  const account = useAuthStore.getState().account
  if (!account) return

  const bundle: AccountExportBundle = {
    version: '1.0',
    exportedAt: Date.now(),
    account,
  }

  const json = JSON.stringify(bundle, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const date = new Date()
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const fileName = `ChillPass-Account-${dateStr}.json`

  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
