import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Target,
  Key,
  Upload,
  Sparkles,
  Check,
  ChevronDown,
  AlertTriangle,
  ArrowRight,
  PartyPopper,
  BookOpen,
  BookX,
  MessageCircle,
  Download,
} from 'lucide-react'
import { useOnboardingStore } from '@stores/onboardingStore'
import { useSettingsStore } from '@stores/settingsStore'
import { useCourseStore } from '@stores/courseStore'
import { useNotificationStore } from '@stores/notificationStore'
import { useUpdateInfo } from '../../utils/useUpdateInfo'
import { useT } from '../../i18n'
import styles from './GuideCard.module.css'

/**
 * 悬浮任务卡（常驻通知中心）
 * - 引导未完成时展示引导步骤，完成后常驻为通知入口
 * - 有未读通知时，收起态图标变为黄色感叹号
 * - 步骤完成状态从真实数据实时推导
 */
export default function GuideCard() {
  const navigate = useNavigate()
  const t = useT()

  const stage = useOnboardingStore(s => s.stage)
  const completeGuide = useOnboardingStore(s => s.completeGuide)
  const apiKey = useSettingsStore(s => s.apiKey)
  const courses = useCourseStore(s => s.courses)
  const notifications = useNotificationStore(s => s.notifications)
  const markAllRead = useNotificationStore(s => s.markAllRead)

  // ── 新版本检测：启动时检查一次，发现新版本常驻提示并支持一键下载 ──
  const {
    updateInfo,
    downloading: updateDownloading,
    error: updateError,
    download: handleUpdateDownload,
    manualUrl,
  } = useUpdateInfo()

  // ── 步骤完成状态：全部从真实状态推导，任何页面的操作都能实时打勾 ──
  const stepDone = [
    !!apiKey,
    courses.some(b => b.course.files.length > 0 || b.rawText),
    courses.some(b => b.course.status === 'ready'),
  ]
  const allDone = stepDone.every(Boolean)

  // 引导完成后默认收起为小徽章（未读通知会以黄色感叹号提示）；引导中默认展开
  const [collapsed, setCollapsed] = useState(allDone)

  // ── 可拖动定位：默认右下角，位置以「距右边/下边的距离」保存，随窗口自适应 ──
  const POS_KEY = 'chillpass-guidecard-pos'
  const DEFAULT_POS = { right: 24, bottom: 24 }
  const [pos, setPos] = useState<{ right: number; bottom: number }>(() => {
    try {
      const raw = localStorage.getItem(POS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed?.right === 'number' && typeof parsed?.bottom === 'number') return parsed
      }
    } catch {
      // 读取失败时用默认位置
    }
    return DEFAULT_POS
  })
  const anchorRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; startRight: number; startBottom: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  // 拖动过程中置位，用于抑制紧随其后的 click（避免拖动被当成展开/收起）
  const movedRef = useRef(false)
  const captureRef = useRef<HTMLElement | null>(null)
  const capturePointerIdRef = useRef<number>(0)

  /** 把位置钳制在视口内，避免拖出屏幕 */
  const clampPos = useCallback((next: { right: number; bottom: number }) => {
    const el = anchorRef.current
    const margin = 8
    const w = el?.offsetWidth ?? 60
    const h = el?.offsetHeight ?? 60
    const maxRight = Math.max(margin, window.innerWidth - w - margin)
    const maxBottom = Math.max(margin, window.innerHeight - h - margin)
    return {
      right: Math.min(Math.max(next.right, margin), maxRight),
      bottom: Math.min(Math.max(next.bottom, margin), maxBottom),
    }
  }, [])

  // 窗口尺寸变化时重新钳制，防止卡片留在可视区之外
  useEffect(() => {
    const onResize = () => setPos(p => clampPos(p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clampPos])

  /**
   * 按下指针：只记录起点，不立即捕获指针。
   * 若在按下时就 setPointerCapture，后续 click 会被重定向到捕获元素，
   * 导致卡片头部里的「收起」按钮点不动。
   */
  const handleDragStart = (e: React.PointerEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRight: pos.right,
      startBottom: pos.bottom,
    }
    movedRef.current = false
    captureRef.current = e.currentTarget as HTMLElement
    capturePointerIdRef.current = e.pointerId
  }

  const handleDragMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY

    // 超过阈值才算拖动：既区分点击，也在此刻才捕获指针
    if (!movedRef.current) {
      if (Math.abs(dx) + Math.abs(dy) <= 4) return
      movedRef.current = true
      setDragging(true)
      try {
        captureRef.current?.setPointerCapture(capturePointerIdRef.current)
      } catch {
        // 某些环境不支持指针捕获，退化为普通拖动
      }
    }
    setPos(clampPos({ right: drag.startRight - dx, bottom: drag.startBottom - dy }))
  }

  const handleDragEnd = () => {
    if (!dragRef.current) return
    dragRef.current = null
    if (movedRef.current) {
      try {
        captureRef.current?.releasePointerCapture(capturePointerIdRef.current)
      } catch {
        // 未捕获时忽略
      }
    }
    setDragging(false)
    setPos(p => {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(p))
      } catch {
        // 存储不可用时仅本次生效
      }
      return p
    })
  }

  const unreadCount = notifications.filter(n => !n.read).length

  // 收起动作即视为已读：黄色感叹号提示随之消失
  const handleCollapse = () => {
    setCollapsed(true)
    if (unreadCount > 0) markAllRead()
  }

  // ── 显示条件：常驻，仅欢迎弹窗期间隐藏（弹窗为全屏遮罩）──
  const welcomeShowing = stage === 'welcome' && !apiKey && courses.length === 0
  if (welcomeShowing) return null

  const currentStep = stepDone.findIndex(done => !done)
  const doneCount = stepDone.filter(Boolean).length

  const unreadNotifications = notifications.filter(n => !n.read)
  const recentNotifications = notifications.slice(0, 3)

  const generatingBundle = courses.find(b => b.generatingLessons)

  const steps = [
    {
      icon: Key,
      title: t('guide.stepApiTitle'),
      desc: t('guide.stepApiDesc'),
      actionLabel: t('guide.goConfig'),
      action: () => navigate('/settings/api'),
    },
    {
      icon: Upload,
      title: t('guide.stepUploadTitle'),
      desc: t('guide.stepUploadDesc'),
      actionLabel: t('guide.goUpload'),
      action: () => navigate('/upload'),
    },
    {
      icon: Sparkles,
      title: t('guide.stepGenerateTitle'),
      desc: t('guide.stepGenerateDesc'),
      actionLabel: '',
      action: () => {},
    },
  ]

  const features = [
    { icon: BookOpen, label: t('guide.featureLessons') },
    { icon: BookX, label: t('guide.featureWrongbook') },
    { icon: MessageCircle, label: t('guide.featureAthena') },
  ]

  const handleStartQuest = () => {
    completeGuide()
    handleCollapse()
    navigate('/lessons')
  }

  // ── 折叠态：圆形小徽章（与展开卡片通过 AnimatePresence 做形变衔接）──
  if (collapsed) {
    return (
      <div
        className={`${styles.cardAnchor} ${dragging ? styles.dragging : ''}`}
        style={{ right: pos.right, bottom: pos.bottom }}
        ref={anchorRef}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key="badge"
            className={styles.badgeWrap}
            title={t('guide.dragHint')}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              transition: { type: 'spring', stiffness: 480, damping: 28 },
            }}
            exit={{
              scale: 0.4,
              opacity: 0,
              transition: { duration: 0.14, ease: 'easeIn' },
            }}
            style={{ transformOrigin: '85% 85%' }}
          >
            <button
              type="button"
              className={`liquid-glass ${styles.collapsedCard}`}
              onClick={() => {
                if (movedRef.current) return
                setCollapsed(false)
              }}
              aria-label={unreadCount > 0 ? t('notify.newNotice') : t('guide.expand')}
              title={unreadCount > 0 ? t('notify.newNotice') : t('guide.expand')}
            >
              {unreadCount > 0 ? (
                <AlertTriangle size={20} strokeWidth={2.2} className={styles.collapsedIconAlert} />
              ) : allDone ? (
                <Check size={20} strokeWidth={2.2} className={styles.collapsedIconDone} />
              ) : (
                <Target size={20} strokeWidth={2} className={styles.collapsedIcon} />
              )}
            </button>
            <span
              className={`${styles.collapsedCount} ${unreadCount > 0 ? styles.collapsedCountAlert : ''} ${allDone && unreadCount === 0 ? styles.collapsedCountDone : ''}`}
            >
              {unreadCount > 0 ? unreadCount : allDone ? '✓' : `${doneCount}/3`}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div
      className={`${styles.cardAnchor} ${dragging ? styles.dragging : ''}`}
      style={{ right: pos.right, bottom: pos.bottom }}
      ref={anchorRef}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key="card"
          className={`liquid-glass ${styles.card}`}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.34, ease: [0.32, 0.72, 0, 1] },
          }}
          exit={{
            opacity: 0,
            y: 14,
            scale: 0.94,
            transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
          }}
          style={{ transformOrigin: '85% 100%' }}
        >
        <div
          className={styles.header}
          data-drag-handle
          title={t('guide.dragHint')}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <div className={styles.headerTitle}>
            <span className={styles.headerIcon}>
              <Target size={15} strokeWidth={2} />
            </span>
            <span>{t('guide.cardTitle')}</span>
          </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => {
              if (movedRef.current) return
              handleCollapse()
            }}
            aria-label={t('guide.collapse')}
            title={t('guide.collapse')}
          >
            <ChevronDown size={15} strokeWidth={2} />
          </button>
        </div>
        </div>

      {/* 进度条 */}
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${(doneCount / 3) * 100}%` }} />
      </div>

      {/* 新版本提示：发现新版本时常驻展示，支持一键下载 */}
      {updateInfo && (
        <motion.div
          className={styles.updateBanner}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <div className={styles.updateMeta}>
            <Download size={14} strokeWidth={2.2} className={styles.updateMetaIcon} />
            <span className={styles.updateVersion}>
              {t('upd.availableTitle').replace('{version}', updateInfo.version)}
            </span>
          </div>
          {updateDownloading ? (
            <span className={styles.updateDownloading}>{t('upd.downloading')}</span>
          ) : (
            <button type="button" className={styles.updateBtn} onClick={handleUpdateDownload}>
              <Download size={13} strokeWidth={2.2} />
              <span>{t('upd.downloadNow')}</span>
            </button>
          )}
          {/* 自动更新走不通时的兜底入口，始终可点 */}
          <a
            className={styles.updateManual}
            href={manualUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t('upd.manualDownloadTip')}
          </a>
          {updateError && (
            <div className={styles.updateError}>
              {t('upd.autoFailed').replace('{reason}', updateError)}
            </div>
          )}
        </motion.div>
      )}

      {/* 通知列表：有新通知时置顶展示 */}
      {recentNotifications.length > 0 && (
        <div className={styles.notifList}>
          {recentNotifications.map(n => (
            <motion.div
              key={n.id}
              layout
              className={`${styles.notifItem} ${!n.read ? styles.notifItemUnread : ''}`}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <AlertTriangle size={14} strokeWidth={2} className={styles.notifItemIcon} />
              <div className={styles.notifItemText}>
                <span className={styles.notifItemTitle}>{n.title}</span>
                <span className={styles.notifItemBody}>{n.body}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

        <AnimatePresence mode="wait" initial={false}>
        {allDone ? (
          /* ── 完成态 ── */
          <motion.div
            key="done"
            className={styles.donePanel}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className={styles.doneIcon}>
              <PartyPopper size={26} strokeWidth={1.8} />
            </div>
            <div className={styles.doneTitle}>{t('guide.doneTitle')}</div>
            <div className={styles.doneDesc}>{t('guide.doneDesc')}</div>
            {generatingBundle && (
              <div className={styles.genNote}>
                {t('guide.generating')
                  .replace('{current}', String(generatingBundle.generationProgress.current))
                  .replace('{total}', String(generatingBundle.generationProgress.total))}
              </div>
            )}
            <div className={styles.featureList}>
              {features.map(f => {
                const Icon = f.icon
                return (
                  <div key={f.label} className={styles.featureRow}>
                    <Icon size={15} strokeWidth={1.8} />
                    <span>{f.label}</span>
                  </div>
                )
              })}
            </div>
            <button type="button" className={styles.actionBtn} onClick={handleStartQuest}>
              <span>{t('guide.startQuest')}</span>
              <ArrowRight size={16} strokeWidth={2.2} />
            </button>
          </motion.div>
        ) : (
          /* ── 步骤列表 ── */
          <motion.div
            key="steps"
            className={styles.stepList}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {steps.map((step, i) => {
              const Icon = step.icon
              const done = stepDone[i]
              const isCurrent = i === currentStep
              return (
                <div
                  key={step.title}
                  className={`${styles.stepItem} ${isCurrent ? styles.stepItemCurrent : ''} ${done ? styles.stepItemDone : ''}`}
                >
                  <div className={styles.stepHead}>
                    <span className={`${styles.stepStatus} ${done ? styles.stepStatusDone : ''} ${isCurrent ? styles.stepStatusCurrent : ''}`}>
                      {done ? <Check size={13} strokeWidth={2.5} /> : <span>{i + 1}</span>}
                    </span>
                    <Icon size={15} strokeWidth={1.8} className={styles.stepIcon} />
                    <span className={styles.stepTitle}>{step.title}</span>
                  </div>

                  {isCurrent && !done && (
                    <div className={styles.stepBody}>
                      <p className={styles.stepDesc}>{step.desc}</p>
                      {i === 2 && generatingBundle ? (
                        /* 生成中：实时进度 */
                        <div className={styles.genProgress}>
                          <div className={styles.genText}>
                            {t('guide.generating')
                              .replace('{current}', String(generatingBundle.generationProgress.current))
                              .replace('{total}', String(generatingBundle.generationProgress.total))}
                          </div>
                          <div className={styles.genTrack}>
                            <div
                              className={styles.genFill}
                              style={{
                                width: generatingBundle.generationProgress.total > 0
                                  ? `${(generatingBundle.generationProgress.current / generatingBundle.generationProgress.total) * 100}%`
                                  : '0%',
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        step.actionLabel && (
                          <button type="button" className={styles.actionBtn} onClick={step.action}>
                            <span>{step.actionLabel}</span>
                            <ArrowRight size={15} strokeWidth={2.2} />
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
              })}
          </motion.div>
        )}
        </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
