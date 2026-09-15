import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Sidebar from '../Sidebar'
import NotificationCenter from './NotificationCenter'
import { useCurrentBundle } from '@stores/courseStore'
import { useUiStyleStore } from '@stores/uiStyleStore'
import { NAV_ITEMS, WORKSPACE_ITEM } from '../navItems'
import { useT } from '../../../i18n'
import styles from './DockLayout.module.css'

/** dock 高度下限（窗口很矮时按可用空间再收，见下面的 clamp） */
const MIN_DOCK_H = 160
/**
 * 上方必须让出的高度：标题栏 38 + root 底部内边距 20 + 间距 10 + 关卡区最小 64。
 * 这个值决定 dock 能被拖多高——写太大会让矮窗口下的可拖范围被压没。
 * 与 CSS 里的 --dock-above-h（38 + 20）和 .stage 的 min-height 保持一致。
 */
const ABOVE_DOCK_H = 38 + 20 + 10 + 64

/**
 * 新版布局（dock）
 *
 * ┌──────────────────────────────────────────────┐
 * │ 标题栏（含界面风格开关）                        │
 * ├──────────────────────────────────────────────┤
 * │ 课程名                                        │
 * │            课程关卡展示区（预留）                │
 * │ ⇕ 拖动分隔条可调整底部三栏高度（上边界可拖动）      │
 * ├───────────┬──────────────────────┬───────────┤
 * │ 折叠侧边栏 │   导航栏对应的页面      │ 通知中心   │
 * └───────────┴──────────────────────┴───────────┘
 */
export default function DockLayout({ children }: { children: ReactNode }) {
  const t = useT()
  const bundle = useCurrentBundle()
  const course = bundle?.course

  const dockHeight = useUiStyleStore(s => s.dockHeight)
  const setDockHeight = useUiStyleStore(s => s.setDockHeight)

  const dockRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const [resizing, setResizing] = useState(false)
  const [viewportH, setViewportH] = useState(() => window.innerHeight)

  // 窗口尺寸变化时按新高度重新收放（不改动用户保存的偏好值）
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const clamp = useCallback(
    (h: number) => {
      const max = Math.max(MIN_DOCK_H, viewportH - ABOVE_DOCK_H)
      // 窗口矮到连下限都放不下时，下限跟着降到可用空间，避免可拖范围退化成 0
      const min = Math.min(MIN_DOCK_H, max)
      return Math.round(Math.min(Math.max(h, min), max))
    },
    [viewportH]
  )

  // 保存的是用户偏好，渲染时才按当前窗口钳制：窗口变矮收放，变高自动还原
  const effectiveHeight =
    dockHeight === null ? undefined : `${clamp(dockHeight)}px`

  // ── 中间卡片（页面区）的展开态 ──
  // 进入 Athena 时自动展开（与左侧栏一样只向上长高），用户可手动收起
  const location = useLocation()
  const isChat = location.pathname.startsWith('/chat')
  const [pageExpanded, setPageExpanded] = useState(false)
  // 左侧栏的展开态提到这里，便于判断「有没有卡片长到 dock 上边界之上」
  const [railExpanded, setRailExpanded] = useState(false)
  // 通知面板的开合（由 NotificationCenter 上报）：展开时左侧两卡整体左移
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    setPageExpanded(isChat)
  }, [isChat])

  /** 任一卡片展开后都会盖住 dock 的上边界，此时拖动条要让位 */
  const anyCardExpanded = railExpanded || pageExpanded

  /** 只有 Athena 这一页带可展开的头部栏 */
  const canExpandPage = isChat

  /** 头部栏里的页面名 */
  const pageLabel = (() => {
    const item = [...NAV_ITEMS, WORKSPACE_ITEM].find(i => i.path === location.pathname)
    return item ? t(item.labelKey) : null
  })()

  /** 拖动上边界：向上拖高、向下拖矮，三个底边栏高度统一跟随 */
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      startY: e.clientY,
      startHeight: dockRef.current?.offsetHeight ?? MIN_DOCK_H,
    }
    setResizing(true)
    // 供各面板关掉自身的高度过渡，拖动时跟手
    document.documentElement.setAttribute('data-dock-resizing', '')
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // 不支持指针捕获时退化为普通拖动
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    setDockHeight(clamp(drag.startHeight - (e.clientY - drag.startY)))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    setResizing(false)
    document.documentElement.removeAttribute('data-dock-resizing')
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // 未捕获时忽略
    }
  }

  return (
    <div
      className={styles.root}
      style={effectiveHeight !== undefined ? ({ '--dock-h': effectiveHeight } as React.CSSProperties) : undefined}
    >
      {/* 课程关卡区：课程名直接以文字展示在左上角，其余留待布置关卡地图 */}
      <section className={styles.stage} data-slot="course-levels">
        {course && <h1 className={styles.stageTitle}>{course.name}</h1>}
        <div className={styles.stagePlaceholder} aria-hidden="true">
          <span>{t('dock.stage')}</span>
        </div>
      </section>

      <div className={styles.dock} ref={dockRef}>
        {/* 上边界拖动条：统一调整底部三栏高度；
            有卡片展开盖住上边界时隐去，避免压住卡片内容也避免误触 */}
        <div
          className={[
            styles.resizer,
            resizing ? styles.resizerActive : '',
            anyCardExpanded ? styles.resizerHidden : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="separator"
          aria-orientation="horizontal"
          aria-label={t('dock.resizeTip')}
          title={t('dock.resizeTip')}
          aria-hidden={anyCardExpanded}
        >
          <span className={styles.resizerGrip} />
        </div>

        {/* 左侧两卡（侧边栏 + 页面）：通知面板展开时整体左移，避免被面板遮挡 */}
        <div
          className={`${styles.pushGroup} ${panelOpen ? styles.pushGroupPushed : ''}`}
        >
          <Sidebar
            variant="rail"
            expanded={railExpanded}
            onToggleExpand={() => setRailExpanded(v => !v)}
          />
          <main
            className={`${styles.pageArea} ${pageExpanded ? styles.pageAreaExpanded : ''}`}
            data-page-bar={canExpandPage ? '' : undefined}
          >
            {/* 可展开的页面（Athena）常驻一条头部栏：既是页面名，也是展开/收起的开关本身，
                收起后仍留在这里，避免「收起就再也展不开」 */}
            {canExpandPage && (
              <div className={styles.pageBar}>
                <span className={styles.pageBarTitle}>{pageLabel}</span>
                <button
                  type="button"
                  className={styles.pageCollapse}
                  onClick={() => setPageExpanded(v => !v)}
                  title={pageExpanded ? t('guide.collapse') : t('dock.expandPanel')}
                  aria-label={pageExpanded ? t('guide.collapse') : t('dock.expandPanel')}
                  aria-expanded={pageExpanded}
                >
                  {pageExpanded ? (
                    <ChevronDown size={14} strokeWidth={2.2} />
                  ) : (
                    <ChevronUp size={14} strokeWidth={2.2} />
                  )}
                </button>
              </div>
            )}
            {children}
          </main>
        </div>
        <NotificationCenter onOpenChange={setPanelOpen} />
      </div>
    </div>
  )
}
