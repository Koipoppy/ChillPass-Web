import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 界面风格
 * - classic：左侧边栏 + 全幅页面（旧版，默认，保持原样）
 * - dock：中间大区域展示课程关卡，导航 / 页面 / 通知中心统一收纳到底部 dock（新版）
 */
export type UiStyle = 'classic' | 'dock'

interface UiStyleState {
  uiStyle: UiStyle
  /** 底部 dock 高度（px）；null 表示用 CSS 默认的 clamp(300px, 42vh, 520px) */
  dockHeight: number | null
  setUiStyle: (style: UiStyle) => void
  setDockHeight: (height: number | null) => void
}

/** 把风格写到根元素上，供全局样式表（主题覆盖等）挂接 */
function applyUiStyle(style: UiStyle) {
  document.documentElement.setAttribute('data-ui-style', style)
}

export const useUiStyleStore = create<UiStyleState>()(
  persist(
    (set) => ({
      uiStyle: 'classic',
      dockHeight: null,
      setUiStyle: (uiStyle) => {
        applyUiStyle(uiStyle)
        set({ uiStyle })
      },
      setDockHeight: (dockHeight) => set({ dockHeight }),
    }),
    {
      name: 'chillpass-ui-style',
      onRehydrateStorage: () => (state) => {
        if (state) applyUiStyle(state.uiStyle)
      },
    }
  )
)
