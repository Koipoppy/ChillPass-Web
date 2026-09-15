import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  X,
  AlertTriangle,
  Download,
  Target,
  Check,
  ArrowRight,
  PartyPopper,
  Key,
  Upload,
  Sparkles,
} from 'lucide-react'
import { useNotificationStore } from '@stores/notificationStore'
import { useOnboardingStore } from '@stores/onboardingStore'
import { useSettingsStore } from '@stores/settingsStore'
import { useCourseStore } from '@stores/courseStore'
import { useUpdateInfo } from '@utils/useUpdateInfo'
import { useT, type TranslationKey } from '../../../i18n'
import styles from './NotificationCenter.module.css'

interface GuideStep {
  icon: LucideIcon
  titleKey: TranslationKey
  actionKey: TranslationKey | null
  action: () => void
}

/**
 * 底部 dock 右区：通知中心
 * 折叠态是一枚铃铛按钮，展开后承载新版本提示、新手引导与通知列表
 * （原右下角悬浮任务卡的角色迁移到这里）
 */
export default function NotificationCenter() {
  const t = useT()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const notifications = useNotificationStore(s => s.notifications)
  const markAllRead = useNotificationStore(s => s.markAllRead)
  const { updateInfo, downloading, error: updateError, download, manualUrl } = useUpdateInfo()

  const stage = useOnboardingStore(s => s.stage)
  const completeGuide = useOnboardingStore(s => s.completeGuide)
  const apiKey = useSettingsStore(s => s.apiKey)
  const courses = useCourseStore(s => s.courses)

  // ── 引导步骤完成状态：从真实数据推导，任何页面的操作都能实时打勾 ──
  const stepDone = [
    !!apiKey,
    courses.some(b => b.course.files.length > 0 || b.rawText),
    courses.some(b => b.course.status === 'ready'),
  ]
  const allDone = stepDone.every(Boolean)
  const doneCount = stepDone.filter(Boolean).length
  const currentStep = stepDone.findIndex(done => !done)
  const generatingBundle = courses.find(b => b.generatingLessons)

  // 未读与历史分开渲染：标记已读后消息落到「历史消息」区，而不是留在原处
  const unreadNotifications = notifications.filter(n => !n.read)
  const readNotifications = notifications.filter(n => n.read)
  const unreadCount = unreadNotifications.length

  // ── 悬停自动展开 ──
  // 轻微延迟，避免鼠标扫过右边缘时误触发；离开卡片即收起（面板本身在卡片内，
  // 所以从铃铛移到面板不会触发离开）
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearHoverTimer = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }
  useEffect(() => clearHoverTimer, [])

  const handleMouseEnter = () => {
    if (open || hoverTimerRef.current) return
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null
      setOpen(true)
    }, 120)
  }

  /** 移开只是「瞄一眼」，不标记已读；显式关闭才标记 */
  const handleMouseLeave = () => {
    clearHoverTimer()
    if (!open) return
    setOpen(false)
  }

  /** 收起面板即视为已读：铃铛上的红点随之消失 */
  const close = () => {
    clearHoverTimer()
    setOpen(false)
    if (unreadCount > 0) markAllRead()
  }

  const steps: GuideStep[] = [
    {
      icon: Key,
      titleKey: 'guide.stepApiTitle',
      actionKey: 'guide.goConfig',
      action: () => navigate('/settings/api'),
    },
    {
      icon: Upload,
      titleKey: 'guide.stepUploadTitle',
      actionKey: 'guide.goUpload',
      action: () => navigate('/upload'),
    },
    {
      icon: Sparkles,
      titleKey: 'guide.stepGenerateTitle',
      actionKey: null,
      action: () => {},
    },
  ]

  // 欢迎弹窗为全屏遮罩期间不渲染
  const welcomeShowing = stage === 'welcome' && !apiKey && courses.length === 0
  if (welcomeShowing) return null

  const handleStartQuest = () => {
    completeGuide()
    close()
    navigate('/lessons')
  }

  return (
    <aside
      className={`${styles.zone} ${open ? styles.zoneOpen : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 点击面板外区域收起 */}
      {open && <div className={styles.clickAway} onClick={close} aria-hidden="true" />}

      {open ? (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <Bell size={15} strokeWidth={2} />
            <span className={styles.panelTitle}>{t('dock.notifications')}</span>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={close}
              title={t('guide.collapse')}
              aria-label={t('guide.collapse')}
            >
              <X size={14} strokeWidth={2.2} />
            </button>
          </div>

          <div className={styles.panelBody}>
            {/* 新版本提示：发现新版本时常驻展示，支持一键下载 */}
            {updateInfo && (
              <div className={styles.updateBanner}>
                <div className={styles.updateMeta}>
                  <Download size={13} strokeWidth={2.2} />
                  <span>
                    {t('upd.availableTitle').replace('{version}', updateInfo.version)}
                  </span>
                </div>
                {downloading ? (
                  <span className={styles.updateDownloading}>{t('upd.downloading')}</span>
                ) : (
                  <button type="button" className={styles.updateBtn} onClick={download}>
                    <Download size={12} strokeWidth={2.2} />
                    <span>{t('upd.downloadNow')}</span>
                  </button>
                )}
                {/* 自动更新走不通（网页预览模式 / 弹窗被拦截 / 网络受限）时的兜底入口，始终可点 */}
                <a
                  className={styles.updateManual}
                  href={manualUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('upd.manualDownloadTip')}
                </a>
              </div>
            )}
            {updateError && (
              <div className={styles.updateError}>
                {t('upd.autoFailed').replace('{reason}', updateError)}
              </div>
            )}

            {/* 新手引导：未完成时展示步骤进度 */}
            {!allDone && (
              <div className={styles.block}>
                <div className={styles.blockHead}>
                  <Target size={14} strokeWidth={2} />
                  <span>{t('guide.cardTitle')}</span>
                  <span className={styles.blockCount}>{doneCount}/3</span>
                </div>
                <div className={styles.guideTrack}>
                  <div
                    className={styles.guideFill}
                    style={{ width: `${(doneCount / 3) * 100}%` }}
                  />
                </div>
                <div className={styles.stepList}>
                  {steps.map((step, i) => {
                    const Icon = step.icon
                    const done = stepDone[i]
                    const isCurrent = i === currentStep
                    return (
                      <div
                        key={step.titleKey}
                        className={`${styles.stepRow} ${isCurrent ? styles.stepRowCurrent : ''}`}
                      >
                        <span
                          className={`${styles.stepStatus} ${done ? styles.stepStatusDone : ''}`}
                        >
                          {done ? <Check size={12} strokeWidth={2.6} /> : <span>{i + 1}</span>}
                        </span>
                        <Icon size={14} strokeWidth={1.8} className={styles.stepIcon} />
                        <span className={styles.stepTitle}>{t(step.titleKey)}</span>
                        {isCurrent && step.actionKey && (
                          <button type="button" className={styles.stepAction} onClick={step.action}>
                            <span>{t(step.actionKey)}</span>
                            <ArrowRight size={12} strokeWidth={2.2} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* 关卡生成中：实时进度 */}
                {currentStep === 2 && generatingBundle && (
                  <div className={styles.genNote}>
                    {t('guide.generating')
                      .replace('{current}', String(generatingBundle.generationProgress.current))
                      .replace('{total}', String(generatingBundle.generationProgress.total))}
                  </div>
                )}
              </div>
            )}

            {/* 引导已完成但尚未进入闯关：给一个入口 */}
            {allDone && stage !== 'done' && (
              <button type="button" className={styles.startBtn} onClick={handleStartQuest}>
                <PartyPopper size={15} strokeWidth={1.9} />
                <span>{t('guide.startQuest')}</span>
                <ArrowRight size={15} strokeWidth={2.2} />
              </button>
            )}

            {/* 通知列表：未读在上，已读的归入历史消息 */}
            <div className={styles.block}>
              <div className={styles.blockHead}>
                <Bell size={14} strokeWidth={2} />
                <span>{t('dock.notifications')}</span>
                {unreadCount > 0 && <span className={styles.blockCount}>{unreadCount}</span>}
              </div>
              {notifications.length === 0 ? (
                <div className={styles.empty}>{t('dock.noNotifications')}</div>
              ) : (
                <>
                  {unreadNotifications.length > 0 && (
                    <>
                      <div className={styles.notifGroupLabel}>{t('dock.unread')}</div>
                      <div className={styles.notifList}>
                        {unreadNotifications.map(n => (
                          <div key={n.id} className={`${styles.notifItem} ${styles.notifItemUnread}`}>
                            <AlertTriangle size={13} strokeWidth={2} className={styles.notifIcon} />
                            <div className={styles.notifText}>
                              <span className={styles.notifTitle}>{n.title}</span>
                              <span className={styles.notifBody}>{n.body}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {readNotifications.length > 0 && (
                    <>
                      <div className={styles.notifGroupLabel}>{t('dock.history')}</div>
                      <div className={`${styles.notifList} ${styles.notifListHistory}`}>
                        {readNotifications.map(n => (
                          <div key={n.id} className={styles.notifItem}>
                            <AlertTriangle size={13} strokeWidth={2} className={styles.notifIcon} />
                            <div className={styles.notifText}>
                              <span className={styles.notifTitle}>{n.title}</span>
                              <span className={styles.notifBody}>{n.body}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {notifications.length > 0 && (
            <button type="button" className={styles.markReadBtn} onClick={markAllRead}>
              {t('dock.markAllRead')}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className={styles.bell}
          onClick={() => setOpen(true)}
          title={t('dock.notifications')}
          aria-label={t('dock.notifications')}
        >
          <Bell size={18} strokeWidth={1.9} />
          {unreadCount > 0 && (
            <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
      )}
    </aside>
  )
}
