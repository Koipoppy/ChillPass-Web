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
            title={isMaximized ? '还原' : '最大化'}
            aria-label="最大化窗口"
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
          title="帮助"
          aria-label="帮助"
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
              <h2 className={styles.helpTitle}>ChillPass 使用帮助</h2>
            </div>

            <div className={styles.helpBody}>
              <section className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>软件介绍</h3>
                <p className={styles.helpText}>
                  ChillPass 是一款 AI 驱动的闯关式备考应用，专为大学生期末复习设计。
                  导入课件后，AI 自动提炼考点、生成闯关路径，每关包含知识点讲解、例题和小测，
                  答错自动加入错题本，完成关卡赚取 Chill 币解锁更多内容。
                </p>
              </section>

              <section className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>快速上手</h3>
                <ul className={styles.helpList}>
                  <li><b>导入课件</b>：在首页点击「导入课件」，上传 PDF / 图片，AI 自动解析考点</li>
                  <li><b>闯关学习</b>：在「闯关冲刺」中按顺序完成关卡，每关需答对小测题才能通关</li>
                  <li><b>小测功能</b>：支持单选、多选、填空、简答四种题型，答错自动记入错题本</li>
                  <li><b>重新生成</b>：小测中可点击「重新生成」获取同知识点的新题目（免费）</li>
                  <li><b>跳过题目</b>：消耗 10 Chill 币跳过当前题目，直接进入下一题</li>
                  <li><b>错题本</b>：在「错题本」中按课程查看错题，可向 AI 助教提问或标记已掌握</li>
                  <li><b>AI 助教</b>：Athena 智能体支持论文写作、知识总结等任务工作流</li>
                  <li><b>教师工作台</b>：在设置中开启「教师模式」，可生成试卷并导出 PDF</li>
                  <li><b>Chill 币</b>：完成关卡获得币，学习时长自动换算（1分钟=1币），用于解锁关卡和跳过题目</li>
                  <li><b>专注模式</b>：点击右上角按钮进入全屏专注模式，屏蔽干扰</li>
                </ul>
              </section>

              <section className={styles.helpSection}>
                <h3 className={styles.helpSectionTitle}>开发者联系方式</h3>
                <div className={styles.helpContact}>
                  <div className={styles.helpContactRow}>
                    <span className={styles.helpContactLabel}>GitHub</span>
                    <span className={styles.helpContactValue}>github.com/Koipoppy/ChillPass-Web</span>
                  </div>
                  <div className={styles.helpContactRow}>
                    <span className={styles.helpContactLabel}>微信</span>
                    <span className={styles.helpContactValue}>Eikawa_Koi</span>
                  </div>
                  <div className={styles.helpContactRow}>
                    <span className={styles.helpContactLabel}>版本</span>
                    <span className={styles.helpContactValue}>v0.0.5</span>
                  </div>
                </div>
              </section>
            </div>

            <button
              className={styles.helpConfirmBtn}
              onClick={() => setShowHelp(false)}
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
