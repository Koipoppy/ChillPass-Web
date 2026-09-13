import { useState, useEffect, useRef } from 'react'
import { Clock, Maximize2, Minimize2, HelpCircle } from 'lucide-react'
import { useStudyTimeStore, formatStudyTime } from '@stores/studyTimeStore'
import { useT } from '../../i18n'
import styles from './TitleBar.module.css'

/**
 * macOS 风格窗口标题栏
 * 红黄绿三个圆点：关闭、最小化、最大化
 * 中间显示学习时长，右侧专注模式按钮
 */
export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [, setTick] = useState(0)
  const t = useT()

  // 浏览器模式下隐藏窗口控制按钮
  const isBrowser = window.electronAPI?.platform === 'browser'

  const totalSeconds = useStudyTimeStore(s => s.totalSeconds)
  const sessionStart = useStudyTimeStore(s => s.sessionStart)
  const startSession = useStudyTimeStore(s => s.startSession)
  const endSession = useStudyTimeStore(s => s.endSession)

  const secondTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const persistTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // 获取初始最大化状态
    window.electronAPI?.windowIsMaximized().then(setIsMaximized)
    // 监听最大化状态变化
    const maxCleanup = window.electronAPI?.onWindowMaximizeChange(setIsMaximized)

    // 获取初始全屏（专注）状态
    window.electronAPI?.isFullScreen().then(setIsFocusMode)
    // 监听专注模式退出回调
    const focusCleanup = window.electronAPI?.onFocusExited(() => {
      setIsFocusMode(false)
    })

    // 学习时长：开始会话
    startSession()

    // 每秒更新显示
    secondTimerRef.current = setInterval(() => {
      setTick(t => t + 1)
    }, 1000)

    // 每 60 秒持久化一次
    persistTimerRef.current = setInterval(() => {
      endSession()
      startSession()
    }, 60 * 1000)

    return () => {
      maxCleanup?.()
      focusCleanup?.()
      if (secondTimerRef.current) clearInterval(secondTimerRef.current)
      if (persistTimerRef.current) clearInterval(persistTimerRef.current)
      // 卸载时结束会话以累计时间
      endSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 计算当前显示的学习时长（累计 + 本次会话已过时间）
  const sessionElapsed = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0
  const displaySeconds = totalSeconds + sessionElapsed

  const handleClose = () => {
    window.electronAPI?.windowClose()
  }

  const handleMinimize = () => {
    window.electronAPI?.windowMinimize()
  }

  const handleMaximize = () => {
    window.electronAPI?.windowMaximize()
  }

  const handleFocusToggle = () => {
    if (isFocusMode) {
      // 退出专注：弹出原生确认对话框
      window.electronAPI?.focusExitConfirm()
    } else {
      // 进入专注
      window.electronAPI?.enterFocusMode()
      setIsFocusMode(true)
    }
  }

  return (
    <div className={styles.titleBar}>
      {!isBrowser && (
        <div className={styles.trafficLights}>
          <button
            className={styles.light}
            style={{ '--light-color': '#ff5f57' } as React.CSSProperties}
            onClick={handleClose}
            title={t('titlebar.close')}
            aria-label={t('titlebar.close')}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="#000" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
            </svg>
          </button>
          <button
            className={styles.light}
            style={{ '--light-color': '#febc2e' } as React.CSSProperties}
            onClick={handleMinimize}
            title={t('titlebar.minimize')}
            aria-label={t('titlebar.minimize')}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4H6.5" stroke="#000" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
            </svg>
          </button>
          <button
            className={styles.light}
            style={{ '--light-color': '#28c840' } as React.CSSProperties}
            onClick={handleMaximize}
            title={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
            aria-label={t('titlebar.maximize')}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M2 2L6 2L6 6M6 2L2 6" stroke="#000" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
            </svg>
          </button>
        </div>
      )}
      {isBrowser && <div style={{ width: 14 }} />}

      <div className={styles.centerArea}>
        <div className={styles.studyTime}>
          <Clock size={12} strokeWidth={2} />
          <span>{formatStudyTime(displaySeconds)}</span>
        </div>
      </div>

      <div className={styles.rightArea}>
        {/* 帮助按钮 — 圆形问号 */}
        <button
          className={styles.helpBtn}
          onClick={() => setShowHelp(true)}
          title={t('titlebar.help')}
          aria-label={t('titlebar.help')}
        >
          <HelpCircle size={16} strokeWidth={2} />
        </button>

        <button
          className={`${styles.focusBtn} ${isFocusMode ? styles.focusBtnActive : ''}`}
          onClick={handleFocusToggle}
          title={isFocusMode ? t('titlebar.exitFocus') : t('titlebar.focusMode')}
        >
          {isFocusMode ? (
            <>
              <Minimize2 size={13} strokeWidth={2} />
              <span>{t('titlebar.exitFocus')}</span>
            </>
          ) : (
            <>
              <Maximize2 size={13} strokeWidth={2} />
              <span>{t('titlebar.focusMode')}</span>
            </>
          )}
        </button>
      </div>

      {/* 帮助弹窗 */}
      {showHelp && (
        <div className={styles.helpOverlay} onClick={() => setShowHelp(false)}>
          <div
            className={`${styles.helpModal} liquid-glass`}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.helpHeader}>
              <HelpCircle size={28} strokeWidth={1.8} />
              <h2 className={styles.helpTitle}>{t('titlebar.helpTitle')}</h2>
            </div>

            <div className={styles.helpBody}>
              <section className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>{t('titlebar.helpIntroTitle')}</h3>
                <p className={styles.helpText}>
                  {t('titlebar.helpIntroBody')}
                </p>
              </section>

              <section className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>{t('titlebar.helpQuickTitle')}</h3>
                <ul className={styles.helpList}>
                  <li><b>{t('titlebar.helpItem1T')}</b>：{t('titlebar.helpItem1D')}</li>
                  <li><b>{t('titlebar.helpItem2T')}</b>：{t('titlebar.helpItem2D')}</li>
                  <li><b>{t('titlebar.helpItem3T')}</b>：{t('titlebar.helpItem3D')}</li>
                  <li><b>{t('titlebar.helpItem4T')}</b>：{t('titlebar.helpItem4D')}</li>
                  <li><b>{t('titlebar.helpItem5T')}</b>：{t('titlebar.helpItem5D')}</li>
                  <li><b>{t('titlebar.helpItem6T')}</b>：{t('titlebar.helpItem6D')}</li>
                  <li><b>{t('titlebar.helpItem7T')}</b>：{t('titlebar.helpItem7D')}</li>
                  <li><b>{t('titlebar.helpItem8T')}</b>：{t('titlebar.helpItem8D')}</li>
                  <li><b>{t('titlebar.helpItem9T')}</b>：{t('titlebar.helpItem9D')}</li>
                  <li><b>{t('titlebar.helpItem10T')}</b>：{t('titlebar.helpItem10D')}</li>
                </ul>
              </section>

              <section className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>{t('titlebar.helpContactTitle')}</h3>
                <div className={styles.helpContact}>
                  <div className={styles.helpContactRow}>
                    <span className={styles.helpContactLabel}>GitHub</span>
                    <span className={styles.helpContactValue}>github.com/Koipoppy/ChillPass-Web</span>
                  </div>
                  <div className={styles.helpContactRow}>
                    <span className={styles.helpContactLabel}>{t('titlebar.helpWechat')}</span>
                    <span className={styles.helpContactValue}>Eikawa_Koi</span>
                  </div>
                  <div className={styles.helpContactRow}>
                    <span className={styles.helpContactLabel}>{t('titlebar.helpVersionLabel')}</span>
                    <span className={styles.helpContactValue}>v0.1.1</span>
                  </div>
                </div>
                <div className={styles.helpQr}>
                  <img src="qrcode.jpg" alt={t('titlebar.helpQrAlt')} />
                  <span>{t('titlebar.helpQrText')}</span>
                </div>
              </section>
            </div>

            <button
              className={styles.helpConfirmBtn}
              onClick={() => setShowHelp(false)}
            >
              {t('titlebar.helpGotIt')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
