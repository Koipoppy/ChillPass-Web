import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { useOnboardingStore } from '@stores/onboardingStore'
import { useSettingsStore } from '@stores/settingsStore'
import { useCourseStore } from '@stores/courseStore'
import { useNotificationStore } from '@stores/notificationStore'
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

  // ── 步骤完成状态：全部从真实状态推导，任何页面的操作都能实时打勾 ──
  const stepDone = [
    !!apiKey,
    courses.some(b => b.course.files.length > 0 || b.rawText),
    courses.some(b => b.course.status === 'ready'),
  ]
  const allDone = stepDone.every(Boolean)

  // 引导完成后默认收起为小徽章（未读通知会以黄色感叹号提示）；引导中默认展开
  const [collapsed, setCollapsed] = useState(allDone)

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

  // ── 折叠态：圆形小徽章 ──
  if (collapsed) {
    return (
      <div className={styles.cardAnchor}>
        <button
          type="button"
          className={`liquid-glass ${styles.collapsedCard}`}
          onClick={() => setCollapsed(false)}
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
      </div>
    )
  }

  return (
    <div className={styles.cardAnchor}>
        <div className={`liquid-glass ${styles.card}`}>
        <div className={styles.header}>
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
            onClick={handleCollapse}
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

      {/* 通知列表：有新通知时置顶展示 */}
      {recentNotifications.length > 0 && (
        <div className={styles.notifList}>
          {recentNotifications.map(n => (
            <div
              key={n.id}
              className={`${styles.notifItem} ${!n.read ? styles.notifItemUnread : ''}`}
            >
              <AlertTriangle size={14} strokeWidth={2} className={styles.notifItemIcon} />
              <div className={styles.notifItemText}>
                <span className={styles.notifItemTitle}>{n.title}</span>
                <span className={styles.notifItemBody}>{n.body}</span>
              </div>
            </div>
          ))}
        </div>
      )}

        {allDone ? (
          /* ── 完成态 ── */
          <div className={styles.donePanel}>
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
          </div>
        ) : (
          /* ── 步骤列表 ── */
          <div className={styles.stepList}>
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
          </div>
        )}
        </div>
    </div>
  )
}
