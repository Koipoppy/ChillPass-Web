import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 单日 token 用量 */
export interface DailyUsage {
  prompt: number
  completion: number
  total: number
  calls: number
}

interface TokenStatsState {
  /** 累计用量 */
  total: { prompt: number; completion: number; total: number }
  /** 累计成功调用次数 */
  callCount: number
  /** 按本地日期（YYYY-MM-DD）记录的每日用量 */
  daily: Record<string, DailyUsage>
  /** 记一次成功调用的 token 消耗 */
  recordUsage: (usage: { prompt: number; completion: number; total: number }) => void
  /** 清零所有统计 */
  resetStats: () => void
}

/** 本地日期键 YYYY-MM-DD */
export function dateKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export const useTokenStore = create<TokenStatsState>()(
  persist(
    (set) => ({
      total: { prompt: 0, completion: 0, total: 0 },
      callCount: 0,
      daily: {},
      recordUsage: (usage) =>
        set((state) => {
          const key = dateKey()
          const day = state.daily[key] ?? { prompt: 0, completion: 0, total: 0, calls: 0 }
          return {
            total: {
              prompt: state.total.prompt + usage.prompt,
              completion: state.total.completion + usage.completion,
              total: state.total.total + usage.total,
            },
            callCount: state.callCount + 1,
            daily: {
              ...state.daily,
              [key]: {
                prompt: day.prompt + usage.prompt,
                completion: day.completion + usage.completion,
                total: day.total + usage.total,
                calls: day.calls + 1,
              },
            },
          }
        }),
      resetStats: () =>
        set({ total: { prompt: 0, completion: 0, total: 0 }, callCount: 0, daily: {} }),
    }),
    {
      name: 'chillpass-token-stats',
    }
  )
)
