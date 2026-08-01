import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Lock, PlayCircle, Upload, Loader, FileText, FastForward, Coins, ChevronDown, ChevronRight } from 'lucide-react'
import { useCourseStore, useCurrentBundle } from '@stores/courseStore'
import type { Lesson, Priority } from '@types/index'
import styles from './LessonPathPage.module.css'

const priorityLabel: Record<Priority, string> = {
  must: '必考',
  high: '高频',
  know: '了解',
}

export default function LessonPathPage() {
  const navigate = useNavigate()
  const bundle = useCurrentBundle()
  const skipLesson = useCourseStore(s => s.skipLesson)
  const course = bundle?.course
  const lessons = bundle?.lessons ?? []
  const progress = bundle?.progress
  const generatingLessons = bundle?.generatingLessons ?? false
  const generationProgress = bundle?.generationProgress ?? { current: 0, total: 0 }

  // 找到"接下来做"的关卡：用户最后一次完成（按 completedAt 时间戳）的关卡的下一关
  const nextLessonId = useMemo(() => {
    const sorted = [...lessons].sort((a, b) => a.order - b.order)
    const completed = lessons.filter(l => l.status === 'completed')
    if (completed.length === 0) {
      // 还没有完成任何关卡，指向第一关
      return sorted[0]?.id ?? null
    }
    // 找到最近完成的关卡（按 completedAt 时间戳，而非 order）
    // 如果 completedAt 缺失（旧数据），回退到 order 最大者
    const lastCompleted = completed.reduce((max, l) => {
      const lTime = l.completedAt ?? 0
      const maxTime = max.completedAt ?? 0
      if (lTime === maxTime) {
        // 时间戳相同或都缺失，取 order 更大的
        return l.order > max.order ? l : max
      }
      return lTime > maxTime ? l : max
    })
    // 找它后面一关（按 order 顺序）
    const nextLesson = sorted.find(l => l.order === lastCompleted.order + 1)
    // 如果有下一关就指向它，没有（全部完成）就指向最后一关
    return nextLesson?.id ?? lastCompleted.id
  }, [lessons])

  // "接下来做"高亮5秒后渐隐
  const [showNextBadge, setShowNextBadge] = useState(true)
  useEffect(() => {
    setShowNextBadge(true)
    const timer = setTimeout(() => setShowNextBadge(false), 5000)
    return () => clearTimeout(timer)
  }, [nextLessonId])

  const nextLessonRef = useRef<HTMLDivElement | HTMLButtonElement>(null)
  const shouldScrollRef = useRef(true)

  // 按来源文件分组关卡
  const groupedLessons = useMemo(() => {
    return lessons.reduce((acc, lesson) => {
      const key = lesson.sourceFile || '默认分组'
      if (!acc[key]) acc[key] = []
      acc[key].push(lesson)
      return acc
    }, {} as Record<string, Lesson[]>)
  }, [lessons])

  const groupKeys = Object.keys(groupedLessons)

  // 分组收起状态：全通关的分组自动收起
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // 自动收起全通关的分组
  useEffect(() => {
    const fullyCompleted = new Set<string>()
    Object.entries(groupedLessons).forEach(([key, groupLessons]) => {
      const allDone = groupLessons.every(l => l.status === 'completed')
      if (allDone && groupLessons.length > 0) {
        fullyCompleted.add(key)
      }
    })
    // 只自动收起新完成的全通关分组，不展开用户手动收起的
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      fullyCompleted.forEach(key => next.add(key))
      return next
    })
  }, [groupedLessons])

  // 确保"接下来做"的关卡所在分组是展开的（防止自动收起后 ref 为 null 导致滚动失败）
  useEffect(() => {
    if (!nextLessonId) return
    shouldScrollRef.current = true
    const targetLesson = lessons.find(l => l.id === nextLessonId)
    if (!targetLesson) return
    const targetGroup = targetLesson.sourceFile || '默认分组'
    setCollapsedGroups(prev => {
      if (!prev.has(targetGroup)) return prev
      const next = new Set(prev)
      next.delete(targetGroup)
      return next
    })
  }, [nextLessonId, lessons])

  // 自动滚动到"接下来做"的关卡（等分组展开、DOM 渲染完成后再滚动）
  useEffect(() => {
    if (!shouldScrollRef.current || !nextLessonId) return
    const timer = setTimeout(() => {
      nextLessonRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      shouldScrollRef.current = false
    }, 600)
    return () => clearTimeout(timer)
  }, [nextLessonId, collapsedGroups])

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // 空状态：没有课程或没有关卡
  if (!course || !progress || lessons.length === 0) {
    return (
      <div className={styles.page}>
        <div className={`${styles.empty} liquid-glass`}>
          <div className={styles.emptyIcon}>
            <PlayCircle size={48} strokeWidth={1.4} />
          </div>
          <h2 className={styles.emptyTitle}>还没有闯关路径</h2>
          <p className={styles.emptyText}>
            先导入课件，AI 会自动为你生成考点闯关路径
          </p>
          <button
            className={styles.emptyButton}
            onClick={() => navigate('/upload')}
          >
            <Upload size={18} strokeWidth={2} />
            <span>去导入课件</span>
          </button>
        </div>
      </div>
    )
  }

  const percent =
    progress.totalLessons > 0
      ? Math.round((progress.completedLessons / progress.totalLessons) * 100)
      : 0

  const handleLessonClick = (lesson: Lesson) => {
    if (lesson.status === 'locked') return
    navigate(`/lessons/${lesson.id}`)
  }

  return (
    <div className={styles.page}>
      {/* 后台生成进度提示 */}
      {generatingLessons && (
        <div
          className="liquid-glass fade-in"
          style={{
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: 'var(--text-secondary)',
            }}
          >
            <Loader
              size={16}
              strokeWidth={2}
              style={{ animation: 'spin 0.8s linear infinite' }}
            />
            <span>
              正在后台生成关卡内容... ({generationProgress.current}/
              {generationProgress.total})
            </span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${
                  generationProgress.total > 0
                    ? (generationProgress.current / generationProgress.total) * 100
                    : 0
                }%`,
                background: 'var(--accent-text)',
              }}
            />
          </div>
        </div>
      )}

      {/* 头部：课程名 + 进度 */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>{course.name}</h1>
          <div className={styles.coinsBadge}>
            <Coins size={16} strokeWidth={2} />
            <span className={styles.coinsValue}>{progress.chillCoins ?? 0}</span>
            <span className={styles.coinsLabel}>Chill币</span>
          </div>
        </div>
        <div className={styles.progressRow}>
          <div className={styles.progressInfo}>
            <span className={styles.progressCount}>
              {progress.completedLessons}/{progress.totalLessons} 关卡
            </span>
            <span className={styles.progressPercent}>{percent}%</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </header>

      {/* 按来源文件分组的闯关路径 */}
      {groupKeys.map((groupKey) => {
        const groupLessons = groupedLessons[groupKey]
        const isCollapsed = collapsedGroups.has(groupKey)
        const completedCount = groupLessons.filter(l => l.status === 'completed').length
        const allDone = completedCount === groupLessons.length

        return (
          <div key={groupKey} style={{ marginBottom: '20px' }}>
            {/* 分组标题 - 可点击收起/展开 */}
            <div
              className={styles.groupHeader}
              onClick={() => toggleGroup(groupKey)}
              role="button"
              tabIndex={0}
            >
              {isCollapsed ? (
                <ChevronRight size={16} strokeWidth={2} />
              ) : (
                <ChevronDown size={16} strokeWidth={2} />
              )}
              <FileText size={16} strokeWidth={2} />
              <span className={styles.groupTitle}>{groupKey}</span>
              <span className={styles.groupCount}>
                {completedCount}/{groupLessons.length} 关
                {allDone && <span className={styles.groupDoneTag}>已完成</span>}
              </span>
            </div>

            {/* 该分组的关卡列表 */}
            {!isCollapsed && (
              <div className={`${styles.pathCard} liquid-glass`}>
                <div className={styles.path}>
                  {groupLessons.map((lesson, index) => {
                    const prevCompleted =
                      index > 0 && groupLessons[index - 1].status === 'completed'
                    const isLocked = lesson.status === 'locked'
                    const isNext = lesson.id === nextLessonId

                    const handleSkip = (e: React.MouseEvent) => {
                      e.stopPropagation()
                      const currentCoins = typeof progress?.chillCoins === 'number' ? progress.chillCoins : 0
                      const cost = typeof lesson.coins === 'number' ? lesson.coins : 30
                      if (currentCoins < cost) {
                        alert(`Chill币不足，需要 ${cost} 枚`)
                        return
                      }
                      try {
                        skipLesson(lesson.id)
                      } catch (err) {
                        alert(err instanceof Error ? err.message : '解锁失败')
                      }
                    }

                    const nodeColumn = (
                      <div className={styles.nodeColumn}>
                        {index > 0 && (
                          <div className={styles.connector}>
                            <div
                              className={`${styles.connectorLine} ${
                                prevCompleted ? styles.connectorActive : ''
                              }`}
                            />
                          </div>
                        )}
                        <div
                          className={`${styles.nodeCircle} ${styles[`node_${lesson.status}`]}`}
                        >
                          {lesson.status === 'completed' ? (
                            <CheckCircle size={28} strokeWidth={2.2} />
                          ) : isLocked ? (
                            <Lock size={20} strokeWidth={2} />
                          ) : (
                            <span className={styles.nodeNumber}>{lesson.order}</span>
                          )}
                        </div>
                      </div>
                    )

                    const lessonInfo = (
                      <div
                        className={`${styles.lessonInfo} ${
                          isLocked ? styles.lessonInfoLocked : ''
                        }`}
                      >
                        <div className={styles.lessonMeta}>
                          <span
                            className={`${styles.priorityTag} ${styles[`priority_${lesson.priority}`]}`}
                          >
                            {priorityLabel[lesson.priority]}
                          </span>
                          <span className={styles.lessonCoins}>{lesson.coins} Chill币</span>
                          {isNext && (
                            <span
                              className={`${styles.nextBadge} ${showNextBadge ? styles.nextBadgeVisible : styles.nextBadgeHidden}`}
                            >
                              接下来做
                            </span>
                          )}
                        </div>
                        <div className={styles.lessonTitle}>{lesson.title}</div>
                        {lesson.status === 'completed' ? (
                          <div className={styles.lessonStatusDone}>已完成</div>
                        ) : isLocked ? (
                          <div className={styles.lessonStatusLocked}>
                            <span>未解锁</span>
                            <button
                              type="button"
                              className={styles.skipBtn}
                              onClick={handleSkip}
                            >
                              <FastForward size={12} strokeWidth={2} />
                              <span>解锁 ({lesson.coins} Chill币)</span>
                            </button>
                          </div>
                        ) : (
                          <div className={styles.lessonStatusActive}>点击开始</div>
                        )}
                      </div>
                    )

                    if (isLocked) {
                      return (
                        <div
                          key={lesson.id}
                          ref={isNext ? nextLessonRef as React.RefObject<HTMLDivElement> : undefined}
                          className={`${styles.lessonRow} ${styles.row_locked} ${isNext && showNextBadge ? styles.lessonRowNext : ''}`}
                        >
                          {nodeColumn}
                          {lessonInfo}
                        </div>
                      )
                    }

                    return (
                      <button
                        key={lesson.id}
                        ref={isNext ? nextLessonRef as React.RefObject<HTMLButtonElement> : undefined}
                        type="button"
                        className={`${styles.lessonRow} ${isNext && showNextBadge ? styles.lessonRowNext : ''}`}
                        onClick={() => handleLessonClick(lesson)}
                      >
                        {nodeColumn}
                        {lessonInfo}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
