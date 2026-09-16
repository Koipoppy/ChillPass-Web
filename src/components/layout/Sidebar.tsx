import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Download,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import styles from './Sidebar.module.css'
import { NAV_ITEMS, WORKSPACE_ITEM } from './navItems'
import { useCourseStore, useCurrentBundle } from '@stores/courseStore'
import { useSettingsStore } from '@stores/settingsStore'
import { useT } from '../../i18n'

interface SidebarProps {
  /**
   * classic：旧版左侧栏，占满整个高度
   * rail：新版底部 dock 左区，宽度收窄、可竖向展开（同一张卡片长高，不额外覆盖）
   */
  variant?: 'classic' | 'rail'
  /** rail 专用的展开态 */
  expanded?: boolean
  onToggleExpand?: () => void
}

export default function Sidebar({
  variant = 'classic',
  expanded = false,
  onToggleExpand,
}: SidebarProps = {}) {
  const navigate = useNavigate()
  const isRail = variant === 'rail'
  const bundle = useCurrentBundle()

  const course = bundle?.course
  const progress = bundle?.progress
  const isTeacher = useSettingsStore(s => s.isTeacher)
  const t = useT()

  // ── 课程管理（由首页迁移至此：切换 / 重命名 / 导出 / 删除 / 新建 / 导入）──
  const courses = useCourseStore(s => s.courses)
  const currentCourseId = useCourseStore(s => s.currentCourseId)
  const switchCourse = useCourseStore(s => s.switchCourse)
  const renameCourse = useCourseStore(s => s.renameCourse)
  const deleteCourse = useCourseStore(s => s.deleteCourse)
  const exportCourse = useCourseStore(s => s.exportCourse)
  const importCourse = useCourseStore(s => s.importCourse)

  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const prevCoinsRef = useRef(progress?.chillCoins ?? 0)
  const [coinBounce, setCoinBounce] = useState(false)
  const currentCoins = typeof progress?.chillCoins === 'number' ? progress.chillCoins : 0

  useEffect(() => {
    if (currentCoins > prevCoinsRef.current) {
      setCoinBounce(true)
      const timer = setTimeout(() => setCoinBounce(false), 600)
      prevCoinsRef.current = currentCoins
      return () => clearTimeout(timer)
    }
    prevCoinsRef.current = currentCoins
  }, [currentCoins])

  // 点击外部或 Esc 关闭课程菜单
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const handleSwitch = (id: string) => {
    switchCourse(id)
    setMenuOpen(false)
  }

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(t('dashboard.deleteConfirm').replace('{name}', name))) {
      deleteCourse(id)
      setMenuOpen(false)
    }
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (!data.course?.name) {
          window.alert(t('dashboard.importFailedFormat'))
          return
        }
        const success = importCourse(data)
        if (success) {
          window.alert(t('dashboard.importSuccess'))
          setMenuOpen(false)
        } else {
          const hasValidData =
            data.course && Array.isArray(data.examPoints) && Array.isArray(data.lessons)
          window.alert(hasValidData ? t('dashboard.importDuplicate') : t('dashboard.importFailedFormat'))
        }
      } catch (err) {
        console.error('导入课程解析失败', err)
        window.alert(t('dashboard.importFailedParse'))
      }
    }
    reader.onerror = () => window.alert(t('dashboard.importFailedRead'))
    reader.readAsText(file)
    e.target.value = ''
  }

  const readyCourses = courses.filter(b => b.course.status === 'ready')

  /** 提交重命名（currentCourseId 可能为 null，做一次收窄） */
  const commitRename = () => {
    if (currentCourseId && renameValue.trim()) {
      renameCourse(currentCourseId, renameValue)
    }
    setRenaming(false)
  }

  /**
   * rail 变体下把课程卡片包进一个 0fr→1fr 的网格行：
   * 折叠时高度真实为 0，展开时随卡片长高一起铺开（同一张卡片内的内容展开）
   */
  const railSection = (children: React.ReactNode) =>
    isRail ? (
      <div className={`${styles.railCourses} ${expanded ? styles.railCoursesOpen : ''}`}>
        <div className={styles.railCoursesInner}>{children}</div>
      </div>
    ) : (
      <>{children}</>
    )

  // rail 变体去掉「闯关冲刺」：关卡入口改由关卡区承担
  const navItems = [
    ...NAV_ITEMS.filter(item => !(isRail && item.path === '/lessons')),
    ...(isTeacher ? [WORKSPACE_ITEM] : []),
  ]

  const location = useLocation()
  /**
   * 当前页在导航里的序号；-1 表示不在导航中。
   * 用 startsWith 而非全等：设置子页（/settings/api 等）应当继续高亮「设置」，
   * 关卡详情（/lessons/:id）同理。
   */
  const activeIndex = navItems.findIndex(item =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
  )

  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  /** 指示器上一次的落点，作为下一次位移的起点 */
  const indicatorPosRef = useRef<{ x: number; y: number } | null>(null)
  const indicatorAnimRef = useRef<Animation | null>(null)

  /*
   * 当前页高亮的滑动指示器。
   *
   * 切换时不是从一格瞬移到另一格，而是分三段：
   *   1) 原地鼓起（带回弹，快）
   *   2) 保持鼓起状态滑向目标（平滑的加速—减速）
   *   3) 到位后回落（收尾）
   * 三段各自有曲线，整段 460ms 左右——比"到位后再抖一下"更像一个实体在移动。
   *
   * 每次只改 transform，走合成器，不触发布局。
   */
  useLayoutEffect(() => {
    const nav = navRef.current
    const indicator = indicatorRef.current
    if (!nav || !indicator) return

    const place = (animate: boolean) => {
      const items = nav.querySelectorAll<HTMLElement>('[data-nav-item]')
      const item = items[activeIndex]
      if (!item) return

      // 条目尺寸可能随变体（classic / rail / 手机底栏）变化，每次都重新量
      const navRect = nav.getBoundingClientRect()
      const itemRect = item.getBoundingClientRect()
      const to = { x: itemRect.left - navRect.left, y: itemRect.top - navRect.top }
      indicator.style.width = `${itemRect.width}px`
      indicator.style.height = `${itemRect.height}px`

      const from = indicatorPosRef.current
      indicatorPosRef.current = to

      // 把终点先写进内联样式：动画被取消或尚未结束时，元素也停在正确位置
      indicator.style.transform = `translate(${to.x}px, ${to.y}px)`

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!animate || !from || reduceMotion) return
      if (from.x === to.x && from.y === to.y) return

      indicatorAnimRef.current?.cancel()
      indicatorAnimRef.current = indicator.animate(
        [
          {
            transform: `translate(${from.x}px, ${from.y}px) scale(1)`,
            offset: 0,
            easing: 'cubic-bezier(0.34, 1.38, 0.64, 1)',
          },
          {
            transform: `translate(${from.x}px, ${from.y}px) scale(1.16)`,
            offset: 0.26,
            easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
          },
          {
            transform: `translate(${to.x}px, ${to.y}px) scale(1.16)`,
            offset: 0.78,
            easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
          },
          { transform: `translate(${to.x}px, ${to.y}px) scale(1)`, offset: 1 },
        ],
        { duration: 460, fill: 'forwards' },
      )
    }

    place(true)

    // 窗口尺寸变化后条目位置会变，重新量取并直接落位（不做动画）
    const onResize = () => place(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // expanded 影响 rail 变体的条目布局，也要重新量
  }, [activeIndex, expanded])

  return (
    <aside
      /* 手机端这里是底部标签栏，高度需要被浮动元素量取（见 GuideCard） */
      data-mobile-tabbar=""
      className={[
        styles.sidebar,
        isRail ? styles.rail : '',
        isRail && expanded ? styles.railExpanded : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          styles.sidebarInner,
          'liquid-glass',
          isRail ? styles.railInner : '',
          menuOpen ? styles.menuOpen : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Logo（rail 变体附带竖向展开开关） */}
        <div className={styles.logo}>
          <span className={styles.logoText}>ChillPass</span>
          {isRail && (
            <button
              type="button"
              className={`${styles.railToggle} ${expanded ? styles.railToggleOpen : ''}`}
              onClick={onToggleExpand}
              title={expanded ? t('dock.collapseSidebar') : t('dock.expandSidebar')}
              aria-label={expanded ? t('dock.collapseSidebar') : t('dock.expandSidebar')}
              aria-expanded={expanded}
            >
              <ChevronUp size={14} strokeWidth={2.2} />
            </button>
          )}
        </div>

        {/* 导航 */}
        <nav className={styles.nav} ref={navRef}>
          {/* 当前页高亮的滑动指示器；位置与尺寸由上面的 layout effect 量取 */}
          <span className={styles.navIndicator} ref={indicatorRef} aria-hidden="true" />
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                data-nav-item=""
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                <Icon size={20} strokeWidth={1.8} />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* 课程管理 + 进度卡片
            rail 变体下折进一个 0fr→1fr 的网格行，卡片长高时顺势铺开 */}
        {railSection(
          course && course.status === 'ready' && (
            <div className={styles.progressCard} ref={menuRef}>
            {/* 课程名：点击展开课程列表 */}
            {renaming ? (
              <div className={styles.renameBar}>
                <input
                  ref={renameInputRef}
                  className={styles.renameInput}
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      commitRename()
                    } else if (e.key === 'Escape') {
                      setRenaming(false)
                    }
                  }}
                  onBlur={commitRename}
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.renameConfirm}
                  onClick={commitRename}
                  aria-label={t('common.confirm')}
                >
                  <Check size={13} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className={styles.renameCancel}
                  onClick={() => setRenaming(false)}
                  aria-label={t('common.cancel')}
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <div className={styles.courseRow}>
                <button
                  type="button"
                  className={styles.courseTrigger}
                  onClick={() => setMenuOpen(o => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={menuOpen}
                  title={t('sidebar.courseManage')}
                >
                  <span className={styles.progressCourseName}>{course.name}</span>
                  {menuOpen ? (
                    <ChevronDown size={14} strokeWidth={2.2} />
                  ) : (
                    <ChevronUp size={14} strokeWidth={2.2} />
                  )}
                </button>
                <button
                  type="button"
                  className={styles.courseIconBtn}
                  onClick={() => {
                    setRenameValue(course.name)
                    setRenaming(true)
                    setTimeout(() => renameInputRef.current?.focus(), 0)
                  }}
                  title={t('dashboard.renameCourse')}
                >
                  <Pencil size={12} strokeWidth={2} />
                </button>
              </div>
            )}

            <div className={styles.progressStats}>
              <span className={styles.progressNumber}>
                {progress!.completedLessons}/{progress!.totalLessons}
              </span>
              <span className={styles.progressLabel}>{t('nav.levelUnit')}</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${progress!.totalLessons > 0
                    ? (progress!.completedLessons / progress!.totalLessons) * 100
                    : 0}%`
                }}
              />
            </div>
            <div className={`${styles.progressCoins} ${coinBounce ? styles.coinBounce : ''}`}>
              <span style={{ color: 'var(--success-text)' }}>{progress!.chillCoins ?? 0} {t('dashboard.coins')}</span>
              {bundle!.generatingLessons && (
                <span className={styles.generatingBadge}>{t('nav.generating')}</span>
              )}
            </div>

            {/* 课程列表与管理操作 */}
            {menuOpen && (
              <div className={styles.courseMenu} role="listbox">
                <div className={styles.courseMenuList}>
                  {readyCourses.map(b => (
                    <div
                      key={b.course.id}
                      className={`${styles.courseMenuItem} ${
                        b.course.id === currentCourseId ? styles.courseMenuItemActive : ''
                      }`}
                    >
                      <button
                        type="button"
                        className={styles.courseMenuItemMain}
                        onClick={() => handleSwitch(b.course.id)}
                      >
                        <span className={styles.courseMenuItemName}>{b.course.name}</span>
                      </button>
                      <button
                        type="button"
                        className={styles.courseIconBtn}
                        onClick={e => {
                          e.stopPropagation()
                          exportCourse(b.course.id)
                        }}
                        title={t('dashboard.exportCourse')}
                      >
                        <Download size={12} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.courseIconBtn} ${styles.courseIconBtnDanger}`}
                        onClick={e => {
                          e.stopPropagation()
                          handleDelete(b.course.id, b.course.name)
                        }}
                        title={t('dashboard.deleteCourse')}
                      >
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className={styles.courseMenuActions}>
                  <button
                    type="button"
                    className={styles.courseMenuBtn}
                    onClick={() => {
                      setMenuOpen(false)
                      // 新建课程的入口收敛到课程管理里；带上 mode 让导入页直接进入新建流程
                      navigate('/upload?mode=create')
                    }}
                  >
                    <Plus size={13} strokeWidth={2.2} />
                    <span>{t('dashboard.newCourse')}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.courseMenuBtn}
                    onClick={() => fileInputRef.current?.click()}
                    title={t('dashboard.importCourseTip')}
                  >
                    <Download size={13} strokeWidth={2.2} />
                    <span>{t('dashboard.importCourse')}</span>
                  </button>
                </div>
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileImport}
                />
              </div>
            )}
          </div>
          )
        )}
      </div>
    </aside>
  )
}
