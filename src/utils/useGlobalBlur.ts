import { useEffect } from 'react'
import { create } from 'zustand'

/**
 * 全局模糊层开关（计数式：多个弹窗同时存在时也能正确关闭）
 * 用状态驱动 App 层模糊层的内联 opacity，避免依赖 body 类名切换的层叠不确定性
 */
interface UiEffectsState {
  blurCount: number
  openBlur: () => void
  closeBlur: () => void
}

export const useUiEffects = create<UiEffectsState>((set) => ({
  blurCount: 0,
  openBlur: () => set(s => ({ blurCount: s.blurCount + 1 })),
  closeBlur: () => set(s => ({ blurCount: Math.max(0, s.blurCount - 1) })),
}))

/** 当前是否应显示全局模糊层 */
export function useGlobalBlurActive(): boolean {
  return useUiEffects(s => s.blurCount > 0)
}

/**
 * 弹窗打开时启用「全局高斯模糊层」
 *
 * 该模糊层渲染在 App 层级（不在带动画的页面容器内），因此 `position: fixed`
 * 覆盖整个视口，不会出现被父级裁切导致的锐利边缘；同时它位于侧边栏与弹窗
 * 卡片之下，所以导航栏与卡片本身保持清晰。
 */
export function useGlobalBlur(active: boolean): void {
  const openBlur = useUiEffects(s => s.openBlur)
  const closeBlur = useUiEffects(s => s.closeBlur)

  useEffect(() => {
    if (!active) return
    openBlur()
    return () => closeBlur()
  }, [active, openBlur, closeBlur])
}
