import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Flame,
  Trophy,
  Coins,
  ArrowRight,
  ChevronDown,
  Plus,
  Trash2,
  BookOpen,
  BookX,
  MessageCircle,
  Loader,
  Upload,
  Download,
  Sparkles,
  FileText,
  Check,
  X,
  Pencil,
} from 'lucide-react'
import { useCourseStore, useCurrentBundle } from '@stores/courseStore'
import { useWrongQuestionStore } from '@stores/wrongQuestionStore'
import type { Priority, CourseStatus } from '@types/index'
import styles from './Dashboard.module.css'

const statusText: Record<CourseStatus, string> = {
  empty: '未导入',
  uploaded: '已导入',
  analyzing: '分析中',
  ready: '已就绪',
}

const statusColor: Record<CourseStatus, string> = {
  empty: 'var(--text-tertiary)',
  uploaded: 'var(--accent-text)',
  analyzing: 'var(--warning-text)',
  ready: 'var(--success-text)',
}

const priorityLabel: Record<Priority, string> = {
  must: '必考',
  high: '高频',
  know: '了解',
}

const priorityColor: Record<Priority, string> = {
  must: 'var(--danger-text)',
  high: 'var(--warning-text)',
  know: 'var(--accent-text)',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const bundle = useCurrentBundle()
  const courses = useCourseStore(s => s.courses)
  const currentCourseId = useCourseStore(s => s.currentCourseId)
  const switchCourse = useCourseStore(s => s.switchCourse)
  const renameCourse = useCourseStore(s => s.renameCourse)
  const deleteCourse = useCourseStore(s => s.deleteCourse)
  const exportCourse = useCourseStore(s => s.exportCourse)
  const importCourse = useCourseStore(s => s.importCourse)

  const wrongQuestions = useWrongQuestionStore(s => s.questions)
  const resolveQuestion = useWrongQuestionStore(s => s.resolveQuestion)

  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const switcherRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const welcomeFileInputRef = useRef<HTMLInputElement>(null)

  // 考试日期设置
  const setExamDate = useCourseStore(s => s.setExamDate)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempDate, setTempDate] = useState('')

  // 点击外部关闭下拉
  useEffect(() => {
    if (!switcherOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [switcherOpen])

  // 倒计时：距考试还有多少天
  const daysLeft = useMemo(() => {
    if (!bundle?.course.examDate) return null
    const exam = new Date(bundle.course.examDate).getTime()
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return Math.ceil((exam - now.getTime()) / (1000 * 60 * 60 * 24))
  }, [bundle?.course.examDate])

  // 考点统计：按优先级分组
  const pointStats = useMemo(() => {
    const stats: Record<Priority, number> = { must: 0, high: 0, know: 0 }
    bundle?.examPoints.forEach(p => {
      stats[p.priority]++
    })
    return stats
  }, [bundle?.examPoints])

  // 当前课程的未解决错题
  const courseWrongQuestions = useMemo(
    () =>
      bundle
        ? wrongQuestions.filter(
            q => q.courseId === bundle.course.id && !q.resolved
          )
        : [],
    [wrongQuestions, bundle?.course.id]
  )

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`确定要删除课程「${name}」吗？此操作不可撤销。`)) {
      deleteCourse(id)
    }
  }

  const handleSwitch = (id: string) => {
    switchCourse(id)
    setSwitcherOpen(false)
  }

  // 导出课程
  const handleExport = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    exportCourse(id)
  }

  // 导入课程：触发隐藏 file input
  const handleImportClick = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.click()
  }

  // 读取并解析 JSON 文件，调用 importCourse
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (!data.course?.name) {
          window.alert('导入失败：文件格式不正确')
          return
        }
        // 课程管理系统：importCourse 内部会基于内容检测重复
        // 如果检测到重复课程，返回 false 并自动切换到已有课程
        const success = importCourse(data)
        if (success) {
          window.alert('课程导入成功！')
          setSwitcherOpen(false)
        } else {
          // 可能是重复课程或格式错误
          // 检查是否因为重复（课程名或考点重叠）
          const hasValidData = data.course && Array.isArray(data.examPoints) && Array.isArray(data.lessons)
          if (hasValidData) {
            window.alert('该课程已存在（名称或考点重复），已自动切换到已有课程')
            setSwitcherOpen(false)
          } else {
            window.alert('导入失败：文件格式不正确')
          }
        }
      } catch (err) {
        console.error('导入课程解析失败', err)
        window.alert('导入失败：无法解析 JSON 文件')
      }
    }
    reader.onerror = () => {
      window.alert('导入失败：读取文件出错')
    }
    reader.readAsText(file)
    // 重置 value 以便可以重复选择同一文件
    e.target.value = ''
  }

  // ===== 状态 1：无课程 —— 欢迎引导 =====
  if (!bundle) {
    return (
      <div className={`${styles.container} fade-in`}>
        <div className={`liquid-glass ${styles.hero}`}>
          <div className={styles.heroBadge}>
            <Sparkles size={18} strokeWidth={1.8} />
            <span>ChillPass · 期末冲刺助手</span>
          </div>
          <h1 className={styles.heroTitle}>开始你的期末冲刺</h1>
          <p className={styles.heroSubtitle}>
            上传课件，AI 自动提炼考点，生成闯关式冲刺课程
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className={styles.primaryBtn} onClick={() => navigate('/upload')} style={{ marginTop: 0 }}>
              <Upload size={18} strokeWidth={2} />
              <span>导入课件</span>
            </button>
            <button
              onClick={() => handleImportClick(welcomeFileInputRef)}
              style={{
                marginTop: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                borderRadius: 'var(--radius-pill)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
              title="从 JSON 文件导入已导出的课程"
            >
              <Download size={18} strokeWidth={2} />
              <span>导入课程</span>
            </button>
            <input
              type="file"
              accept=".json"
              ref={welcomeFileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileImport}
            />
          </div>
          <div className={styles.heroSteps}>
            <div className={styles.heroStep}>
              <span className={styles.heroStepNum}>1</span>
              <span>导入课件</span>
            </div>
            <div className={styles.heroStep}>
              <span className={styles.heroStepNum}>2</span>
              <span>提炼考点</span>
            </div>
            <div className={styles.heroStep}>
              <span className={styles.heroStepNum}>3</span>
              <span>闯关冲刺</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== 以下 bundle 一定非 null =====
  const course = bundle.course
  const progress = bundle.progress
  const examPoints = bundle.examPoints

  const progressPercent =
    progress.totalLessons > 0
      ? Math.round((progress.completedLessons / progress.totalLessons) * 100)
      : 0

  const genPercent =
    bundle.generationProgress.total > 0
      ? Math.round(
          (bundle.generationProgress.current / bundle.generationProgress.total) * 100
        )
      : 0

  // 考试日期格式化与设置
  const formatExamDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }

  const openDatePicker = () => {
    setTempDate(course.examDate || '')
    setShowDatePicker(true)
  }

  const confirmDate = () => {
    if (tempDate) {
      setExamDate(tempDate)
    }
    setShowDatePicker(false)
  }

  const cancelDate = () => {
    setShowDatePicker(false)
    setTempDate('')
  }

  // 课程切换器（状态 2、3 共用）
  const switcher = (
    <header className={styles.header}>
      <div className={styles.switcherWrap} ref={switcherRef}>
        <p className={styles.greeting}>欢迎回来</p>
        {renaming ? (
          <div className={styles.renameBar}>
            <input
              ref={renameInputRef}
              className={styles.renameInput}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  renameCourse(currentCourseId, renameValue)
                  setRenaming(false)
                } else if (e.key === 'Escape') {
                  setRenaming(false)
                }
              }}
              onBlur={() => {
                if (renameValue.trim()) {
                  renameCourse(currentCourseId, renameValue)
                }
                setRenaming(false)
              }}
              autoFocus
            />
            <button
              className={styles.renameConfirm}
              onClick={() => {
                renameCourse(currentCourseId, renameValue)
                setRenaming(false)
              }}
            >
              <Check size={16} strokeWidth={2.5} />
            </button>
            <button
              className={styles.renameCancel}
              onClick={() => setRenaming(false)}
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className={styles.courseSwitcherRow}>
            <button
              className={styles.courseSwitcher}
              onClick={() => setSwitcherOpen(o => !o)}
            >
              <span className={styles.courseName}>{course.name}</span>
              <ChevronDown
                size={20}
                strokeWidth={2}
                className={`${styles.chevron} ${switcherOpen ? styles.chevronOpen : ''}`}
              />
            </button>
            <button
              className={styles.renameBtn}
              onClick={() => {
                setRenameValue(course.name)
                setRenaming(true)
                setTimeout(() => renameInputRef.current?.focus(), 0)
              }}
              title="重命名课程"
            >
              <Pencil size={14} strokeWidth={2} />
            </button>
          </div>
        )}

        {switcherOpen && (
          <div className={`liquid-glass ${styles.dropdown}`}>
            <div className={styles.dropdownList}>
              {courses
                .filter(b => b.course.status === 'ready')
                .map(b => (
                <div
                  key={b.course.id}
                  className={`${styles.dropdownItem} ${
                    b.course.id === currentCourseId ? styles.dropdownItemActive : ''
                  }`}
                  onClick={() => handleSwitch(b.course.id)}
                >
                  <div className={styles.dropdownItemInfo}>
                    <span className={styles.dropdownItemName}>{b.course.name}</span>
                    <span
                      className={styles.dropdownItemStatus}
                      style={{ color: statusColor[b.course.status] }}
                    >
                      {statusText[b.course.status]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <button
                      className={styles.deleteBtn}
                      onClick={e => handleExport(e, b.course.id)}
                      title="导出课程"
                    >
                      <Download size={16} strokeWidth={1.8} />
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={e => {
                        e.stopPropagation()
                        handleDelete(b.course.id, b.course.name)
                      }}
                      title="删除课程"
                    >
                      <Trash2 size={16} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className={styles.newCourseBtn}
                style={{ flex: 1 }}
                onClick={() => {
                  setSwitcherOpen(false)
                  navigate('/upload')
                }}
              >
                <Plus size={18} strokeWidth={2} />
                <span>新建课程</span>
              </button>
              <button
                className={styles.newCourseBtn}
                style={{ flex: 1 }}
                onClick={() => handleImportClick(fileInputRef)}
                title="从 JSON 文件导入课程"
              >
                <Download size={18} strokeWidth={2} />
                <span>导入课程</span>
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

      {progress.currentStreak > 0 && (
        <div className={`liquid-glass ${styles.streakBadge}`}>
          <Flame size={18} strokeWidth={2} />
          <span>连续 {progress.currentStreak} 天</span>
        </div>
      )}
    </header>
  )

  // ===== 状态 2：课程未就绪 —— 准备中 =====
  if (course.status !== 'ready') {
    return (
      <div className={`${styles.container} fade-in`}>
        {switcher}
        <div className={`liquid-glass ${styles.preparing}`}>
          <div className={styles.spinner} />
          <h2 className={styles.preparingTitle}>正在准备中</h2>
          <p className={styles.preparingDesc}>
            {course.status === 'empty' && '课程已创建，请导入课件开始分析'}
            {course.status === 'uploaded' && '课件已导入，正在等待 AI 提炼考点…'}
            {course.status === 'analyzing' && 'AI 正在分析课件内容，提炼考点…'}
          </p>
          {course.status === 'empty' && (
            <button className={styles.primaryBtn} onClick={() => navigate('/upload')}>
              <Upload size={18} strokeWidth={2} />
              <span>导入课件</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  // ===== 状态 3：课程就绪 —— 概览 =====
  return (
    <div className={`${styles.container} fade-in`}>
      {switcher}

      {/* 后台生成进度提示 */}
      {bundle.generatingLessons && (
        <div className={`liquid-glass ${styles.genBanner}`}>
          <Loader size={18} strokeWidth={2} className={styles.genSpinner} />
          <div className={styles.genContent}>
            <div className={styles.genText}>
              正在后台生成关卡内容... ({bundle.generationProgress.current}/
              {bundle.generationProgress.total})
            </div>
            <div className={styles.genBar}>
              <div
                className={styles.genFill}
                style={{ width: `${genPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {/* 倒计时卡片 */}
        <div className={`liquid-glass ${styles.card} ${styles.countdownCard}`}>
          <div className={styles.cardIcon}>
            <Calendar size={20} strokeWidth={1.8} />
          </div>
          <div className={styles.cardLabel}>距期末考试</div>

          {/* 修改按钮 —— 已设置日期且未展开选择器时显示在右上角 */}
          {daysLeft !== null && !showDatePicker && (
            <button
              onClick={openDatePicker}
              title="修改考试日期"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                transition: 'color 0.2s ease',
                zIndex: 3,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
            >
              修改
            </button>
          )}

          {showDatePicker ? (
            /* 日期选择器 —— 内联展开 */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: '4px',
              }}
            >
              <input
                type="date"
                value={tempDate}
                onChange={e => setTempDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0, 0, 0, 0.03)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  colorScheme: 'light',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={confirmDate}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    background: 'var(--accent-text)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <Check size={14} strokeWidth={2.4} />
                  确认
                </button>
                <button
                  onClick={cancelDate}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={e =>
                    (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.07)')
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)')
                  }
                >
                  <X size={14} strokeWidth={2.4} />
                  取消
                </button>
              </div>
            </div>
          ) : daysLeft === null ? (
            /* 未设置日期 —— 点击设置 */
            <button
              onClick={openDatePicker}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '10px 0',
                marginTop: '4px',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
            >
              <Calendar size={18} strokeWidth={1.8} />
              <span>点击设置考试日期</span>
            </button>
          ) : (
            /* 已设置日期 —— 显示倒计时 */
            <>
              <div
                className={styles.countdownNum}
                style={
                  daysLeft > 0 && daysLeft <= 7
                    ? { color: 'var(--danger-text)' }
                    : undefined
                }
              >
                {daysLeft > 0 ? daysLeft : 0}
                <span className={styles.countdownUnit}>天</span>
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  marginTop: '-4px',
                }}
              >
                {formatExamDate(course.examDate!)}
              </div>
              {daysLeft > 0 && daysLeft <= 7 && (
                <div
                  className={styles.countdownHint}
                  style={{ color: 'var(--danger-text)' }}
                >
                  冲刺关键期，加油！
                </div>
              )}
              {daysLeft <= 0 && (
                <div
                  className={styles.countdownHint}
                  style={{ color: 'var(--success-text)' }}
                >
                  考试进行中
                </div>
              )}
            </>
          )}
        </div>

        {/* 进度卡片 */}
        <div className={`liquid-glass ${styles.card}`}>
          <div className={styles.cardIcon}>
            <Trophy size={20} strokeWidth={1.8} />
          </div>
          <div className={styles.cardLabel}>学习进度</div>
          <div className={styles.progressNum}>
            {progress.completedLessons}
            <span className={styles.progressTotal}>/{progress.totalLessons} 关卡</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className={styles.progressMeta}>
            <span className={styles.coinsItem}>
              <Coins size={14} strokeWidth={2} />
              <span style={{ color: 'var(--success-text)' }}>{progress.chillCoins ?? 0} Chill币</span>
            </span>
            <span className={styles.progressPercent}>{progressPercent}%</span>
          </div>
        </div>

        {/* 考点统计卡片 */}
        <div className={`liquid-glass ${styles.card}`}>
          <div className={styles.cardIcon}>
            <FileText size={20} strokeWidth={1.8} />
          </div>
          <div className={styles.cardLabel}>考点统计</div>
          <div className={styles.pointStats}>
            <div className={styles.pointItem}>
              <span className={styles.pointNum} style={{ color: 'var(--danger-text)' }}>
                {pointStats.must}
              </span>
              <span className={styles.pointName}>必考</span>
            </div>
            <div className={styles.pointItem}>
              <span className={styles.pointNum} style={{ color: 'var(--warning-text)' }}>
                {pointStats.high}
              </span>
              <span className={styles.pointName}>高频</span>
            </div>
            <div className={styles.pointItem}>
              <span className={styles.pointNum} style={{ color: 'var(--accent-text)' }}>
                {pointStats.know}
              </span>
              <span className={styles.pointName}>了解</span>
            </div>
          </div>
          <div className={styles.pointTotal}>共 {examPoints.length} 个考点</div>
        </div>

        {/* 快捷入口卡片 */}
        <div className={`liquid-glass ${styles.card}`}>
          <div className={styles.cardIcon}>
            <Sparkles size={20} strokeWidth={1.8} />
          </div>
          <div className={styles.cardLabel}>快捷入口</div>
          <div className={styles.quickActions}>
            <button
              className={styles.quickBtn}
              onClick={() => navigate('/lessons')}
            >
              <BookOpen size={18} strokeWidth={1.8} />
              <span className={styles.quickBtnText}>继续学习</span>
              <ArrowRight size={16} strokeWidth={2} />
            </button>
            <button
              className={styles.quickBtnGhost}
              onClick={() => navigate('/chat')}
            >
              <MessageCircle size={18} strokeWidth={1.8} />
              <span className={styles.quickBtnText}>问 Athena</span>
              <ArrowRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
