import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CampusAccount } from '@types/index'

interface AuthState {
  account: CampusAccount | null
  login: (account: CampusAccount) => void
  logout: () => void
  updateAccount: (partial: Partial<CampusAccount>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      account: null,

      login: (account) => set({ account }),

      logout: () => set({ account: null }),

      updateAccount: (partial) =>
        set((state) => ({
          account: state.account ? { ...state.account, ...partial } : null,
        })),
    }),
    {
      name: 'chillpass-auth',
    }
  )
)
