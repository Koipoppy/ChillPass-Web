import { useEffect, useState } from 'react'

/**
 * 移动端布局判定。
 *
 * 断点必须与 CSS 里的 `@media (max-width: 768px)` 保持一致——
 * 两边不一致会出现「JS 认为是移动端、CSS 认为是桌面端」的错配。
 */
export const MOBILE_LAYOUT_QUERY = '(max-width: 768px)'

/** 当前是否按移动端布局渲染 */
export function isMobileLayout(): boolean {
  return window.matchMedia(MOBILE_LAYOUT_QUERY).matches
}

/**
 * 订阅移动端布局状态。
 * 用 matchMedia 而非 window.innerWidth：旋转屏幕、以及 WebView 视口
 * 因其它原因变化时都能如实反映。
 */
export function useIsMobileLayout(): boolean {
  const [mobile, setMobile] = useState(isMobileLayout)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_LAYOUT_QUERY)
    const onChange = () => setMobile(mq.matches)
    // 旧 WebView 只有已废弃的 addListener，新引擎两者都支持
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])

  return mobile
}
