import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 引导阶段：
 * - welcome  尚未开始（满足"新用户"条件时显示欢迎弹窗）
 * - active   欢迎弹窗已关闭，悬浮任务卡引导中
 * - done     引导完成
 * - skipped  用户跳过了引导
 */
export type OnboardingStage = 'welcome' | 'active' | 'done' | 'skipped'

interface OnboardingState {
  stage: OnboardingStage
  /** 从设置页"重新查看新手引导"进入时强制弹出欢迎弹窗（忽略"已有数据"的拦截） */
  forceWelcome: boolean
  /** 欢迎弹窗点击"去配置 API"后进入任务卡引导 */
  startGuide: () => void
  /** 完成全部引导步骤 */
  completeGuide: () => void
  /** 跳过引导 */
  skipGuide: () => void
  /** 从设置页重新查看引导（完整重播欢迎弹窗） */
  restartGuide: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      stage: 'welcome',
      forceWelcome: false,
      startGuide: () => set({ stage: 'active', forceWelcome: false }),
      completeGuide: () => set({ stage: 'done', forceWelcome: false }),
      skipGuide: () => set({ stage: 'skipped', forceWelcome: false }),
      restartGuide: () => set({ stage: 'welcome', forceWelcome: true }),
    }),
    {
      name: 'chillpass-onboarding',
    }
  )
)
