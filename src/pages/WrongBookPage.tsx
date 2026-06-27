import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookX,
  MessageCircle,
  Check,
  Folder,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { useWrongQuestionStore } from '@stores/wrongQuestionStore'
import { useCourseStore } from '@stores/courseStore'
import type { Priority, WrongQuestion } from '@types/index'
import { renderMarkdown, renderInlineMarkdown } from '../utils/markdown'
import styles from './WrongBookPage.module.css'

const priorityLabel: Record<Priority, string> = {
  must: '必考',
  high: '高频',
  know: '了解',
}

const priorityClass: Record<Priority, string> = {
  must: styles.priorityMust,
  high: styles.priorityHigh,
  know: styles.priorityKnow,
}

interface CourseGroup {
  courseName: string
  items: WrongQuestion[]
}

export default function WrongBookPage() {
  const navigate = useNavigate()
  const questions = useWrongQuestionStore(s => s.questions)
  const resolveQuestion = useWrongQuestionStore(s => s.resolveQuestion)
  const clearByCourse = useWrongQuestionStore(s => s.clearByCourse)
  const courses = useCourseStore(s => s.courses)

  // 折叠状态：Set 中存放被折叠的 courseId，空集合 = 全部展开
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // 仅展示未解决的错题
  const unresolvedQuestions = useMemo(
    () => questions.filter(q => !q.resolved),
    [questions]
  )

  // 按课程分组，课程名优先从 courseStore 获取（处理重命名），回退到错题自带记录
  const courseGroups = useMemo(() => {
    const groups: Record<string, CourseGroup> = {}
    for (const q of unresolvedQuestions) {
      if (!groups[q.courseId]) {
        const course = courses.find(c => c.course.id === q.courseId)
        groups[q.courseId] = {
          courseName: course?.course.name ?? q.courseName,
          items: [],
        }
      }
      groups[q.courseId].items.push(q)
    }
    return groups
  }, [unresolvedQuestions, courses])

  const toggleCollapse = (courseId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(courseId)) {
        next.delete(courseId)
      } else {
        next.add(courseId)
      }
      return next
    })
  }

  const handleClear = (courseId: string, courseName: string) => {
    if (
      window.confirm(`确定要清空「${courseName}」的所有错题吗？此操作不可撤销。`)
    ) {
      clearByCourse(courseId)
    }
  }

  const handleAsk = (q: WrongQuestion) => {
    let prefill: string
    if (q.quizType === 'choice' && q.options && q.correctIndex !== undefined) {
      const myAnswer = q.selectedIndex !== undefined ? q.options[q.selectedIndex] : '未作答'
      const correctAnswer = q.options[q.correctIndex]
      prefill = `我在「${q.lessonTitle}」这关遇到了一道错题：\n题目：${q.question}\n我选了：${myAnswer}\n正确答案：${correctAnswer}\n请帮我理解这个知识点。`
    } else {
      const myAnswer = q.userAnswer ?? '未作答'
      const correctAnswer = q.correctAnswer ?? '未知'
      prefill = `我在「${q.lessonTitle}」这关遇到了一道错题：\n题目：${q.question}\n我的答案：${myAnswer}\n参考答案：${correctAnswer}\n请帮我理解这个知识点。`
    }
    navigate('/chat', { state: { prefill } })
  }

  const handleResolve = (id: string) => {
    resolveQuestion(id)
  }

  // ===== 空状态 =====
  if (unresolvedQuestions.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>错题本</h1>
          <p className={styles.subtitle}>按课程归类，逐个击破</p>
        </header>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <BookX size={48} strokeWidth={1.4} />
          </div>
          <h2 className={styles.emptyTitle}>暂无错题</h2>
          <p className={styles.emptyText}>继续保持！</p>
        </div>
      </div>
    )
  }

  // ===== 错题列表 =====
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>错题本</h1>
        <p className={styles.subtitle}>按课程归类，逐个击破</p>
      </header>

      {Object.entries(courseGroups).map(([courseId, group]) => {
        const isCollapsed = collapsed.has(courseId)
        return (
          <div key={courseId} className={styles.courseGroup}>
            {/* 课程分组标题（可折叠） */}
            <div
              className={styles.courseHeader}
              onClick={() => toggleCollapse(courseId)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleCollapse(courseId)
                }
              }}
            >
              <div className={styles.courseHeaderLeft}>
                {isCollapsed ? (
                  <ChevronRight size={18} strokeWidth={2} className={styles.chevron} />
                ) : (
                  <ChevronDown size={18} strokeWidth={2} className={styles.chevron} />
                )}
                <Folder size={18} strokeWidth={1.8} className={styles.folderIcon} />
                <span className={styles.courseName}>{group.courseName}</span>
                <span className={styles.courseCount}>{group.items.length}</span>
              </div>
              <div className={styles.courseActions}>
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={e => {
                    e.stopPropagation()
                    handleClear(courseId, group.courseName)
                  }}
                >
                  <Trash2 size={13} strokeWidth={2} />
                  <span>清空</span>
                </button>
              </div>
            </div>

            {/* 该课程的错题列表 */}
            <div
              className={`${styles.questionList} ${
                isCollapsed ? styles.questionListCollapsed : ''
              }`}
            >
              {group.items.map(q => (
                <div
                  key={q.id}
                  className={`liquid-glass ${styles.questionCard} fade-in`}
                >
                  {/* 卡片头部：优先级标签 + 关卡标题 */}
                  <div className={styles.cardHeader}>
                    <span
                      className={`${styles.priorityTag} ${priorityClass[q.priority]}`}
                    >
                      {priorityLabel[q.priority]}
                    </span>
                    <span className={styles.lessonTitle}>{q.lessonTitle}</span>
                  </div>

                  {/* 题目 */}
                  <div
                    className={`${styles.questionText} ${styles.markdownContent}`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question) }}
                  />

                  {/* 答案对比 */}
                  <div className={styles.answers}>
                    <div className={`${styles.answerRow} ${styles.answerWrong}`}>
                      <span className={styles.answerLabel}>你的答案</span>
                      <span
                        className={styles.answerValue}
                        dangerouslySetInnerHTML={{
                          __html: renderInlineMarkdown(
                            q.quizType === 'choice'
                              ? (q.options && q.selectedIndex !== undefined ? q.options[q.selectedIndex] : '—')
                              : (q.userAnswer ?? '—')
                          ),
                        }}
                      />
                    </div>
                    <div className={`${styles.answerRow} ${styles.answerCorrect}`}>
                      <span className={styles.answerLabel}>正确答案</span>
                      <span
                        className={styles.answerValue}
                        dangerouslySetInnerHTML={{
                          __html: renderInlineMarkdown(
                            q.quizType === 'choice'
                              ? (q.options && q.correctIndex !== undefined ? q.options[q.correctIndex] : '—')
                              : (q.correctAnswer ?? '—')
                          ),
                        }}
                      />
                    </div>
                  </div>

                  {/* 解析 */}
                  <div
                    className={`${styles.explanation} ${styles.markdownContent}`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(q.explanation) }}
                  />

                  {/* 操作按钮 */}
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.askBtn}
                      onClick={() => handleAsk(q)}
                    >
                      <MessageCircle size={15} strokeWidth={2} />
                      <span>去问助教</span>
                    </button>
                    <button
                      type="button"
                      className={styles.resolveBtn}
                      onClick={() => handleResolve(q.id)}
                    >
                      <Check size={15} strokeWidth={2.4} />
                      <span>已掌握</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
