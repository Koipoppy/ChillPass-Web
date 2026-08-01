import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useCourseStore } from './courseStore'

interface StudyTimeState {
  /** 累计学习时间（秒） */
  totalSeconds: number
  /** 本次会话开始时间戳 */
  sessionStart: number | null
  /** 已发放 Chill币 的分钟数（用于计算增量） */
  coinsAwardedForMinutes: number
  /** 增加学习时间 */
  addTime: (seconds: number) => void
  /** 开始会话 */
  startSession: () => void
  /** 结束会话并累计时间 */
  endSession: () => void
  /** 重置 */
  reset: () => void
}

export const useStudyTimeStore = create<StudyTimeState>()(
  persist(
    (set, get) => ({
      totalSeconds: 0,
      sessionStart: null,
      coinsAwardedForMinutes: 0,

      addTime: (seconds) => {
        const state = get()
        const newTotal = state.totalSeconds + seconds
        const totalMinutes = Math.floor(newTotal / 60)
        const awardedMinutes = state.coinsAwardedForMinutes
        const newCoins = totalMinutes - awardedMinutes
        set({ totalSeconds: newTotal, coinsAwardedForMinutes: totalMinutes })
        // 每累计 1 分钟发放 1 枚 Chill币，仅在有当前课程时发放
        if (newCoins > 0 && useCourseStore.getState().currentCourseId) {
          useCourseStore.getState().addStudyCoins(newCoins)
        }
      },

      startSession: () => {
        set({ sessionStart: Date.now() })
      },

      endSession: () => {
        const { sessionStart, totalSeconds, coinsAwardedForMinutes } = get()
        if (sessionStart) {
          const elapsed = Math.floor((Date.now() - sessionStart) / 1000)
          const newTotal = totalSeconds + elapsed
          const totalMinutes = Math.floor(newTotal / 60)
          const newCoins = totalMinutes - coinsAwardedForMinutes
          set({
            totalSeconds: newTotal,
            coinsAwardedForMinutes: totalMinutes,
            sessionStart: null,
          })
          // 每累计 1 分钟发放 1 枚 Chill币，仅在有当前课程时发放
          if (newCoins > 0 && useCourseStore.getState().currentCourseId) {
            useCourseStore.getState().addStudyCoins(newCoins)
          }
        }
      },

      reset: () => set({ totalSeconds: 0, sessionStart: null, coinsAwardedForMinutes: 0 }),
    }),
    {
      name: 'chillpass-study-time',
    }
  )
)

/** 格式化学习时间为简短显示 */
export function formatStudyTime(seconds: number): string {
  if (seconds < 60) return '0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h${minutes > 0 ? minutes + 'm' : ''}`
  return `${minutes}m`
}
