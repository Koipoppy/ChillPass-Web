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
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n'
import type { Priority, WrongQuestion } from '@types/index'
import { renderMarkdown, renderInlineMarkdown } from '../utils/markdown'
import styles from './WrongBookPage.module.css'

const priorityLabel: Record<Priority, TranslationKey> = {
  must: 'dashboard.priorityMust',
  high: 'dashboard.priorityHigh',
  know: 'dashboard.priorityKnow',
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
  const t = useT()
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
      window.confirm(t('wrongbook.clearConfirm').replace('{name}', courseName))
    ) {
      clearByCourse(courseId)
    }
  }

  const handleAsk = (q: WrongQuestion) => {
    let prefill: string
    if (q.quizType === 'choice' && q.options && q.correctIndex !== undefined) {
      const myAnswer = q.selectedIndex !== undefined ? q.options[q.selectedIndex] : t('wrongbook.noAnswer')
      const correctAnswer = q.options[q.correctIndex]
      prefill = t('wrongbook.prefillChoice')
        .replace('{lesson}', q.lessonTitle)
        .replace('{question}', q.question)
        .replace('{my}', myAnswer)
        .replace('{correct}', correctAnswer)
    } else {
      const myAnswer = q.userAnswer ?? t('wrongbook.noAnswer')
      const correctAnswer = q.correctAnswer ?? t('wrongbook.unknown')
      prefill = t('wrongbook.prefillText')
        .replace('{lesson}', q.lessonTitle)
        .replace('{question}', q.question)
        .replace('{my}', myAnswer)
        .replace('{correct}', correctAnswer)
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
        <div className={`liquid-glass ${styles.empty}`}>
          <div className={styles.emptyIcon}>
            <BookX size={48} strokeWidth={1.4} />
          </div>
          <h2 className={styles.emptyTitle}>{t('wrongbook.empty')}</h2>
          <p className={styles.emptyText}>{t('wrongbook.keepGoing')}</p>
        </div>
      </div>
    )
  }

  // ===== 错题列表 =====
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('wrongbook.title')}</h1>
        <p className={styles.subtitle}>{t('wrongbook.subtitle')}</p>
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
                  <span>{t('wrongbook.clear')}</span>
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
                      {t(priorityLabel[q.priority])}
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
                      <span className={styles.answerLabel}>{t('wrongbook.yourAnswer')}</span>
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
                      <span className={styles.answerLabel}>{t('wrongbook.correctAnswer')}</span>
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
                      <span>{t('wrongbook.askAthena')}</span>
                    </button>
                    <button
                      type="button"
                      className={styles.resolveBtn}
                      onClick={() => handleResolve(q.id)}
                    >
                      <Check size={15} strokeWidth={2.4} />
                      <span>{t('wrongbook.mastered')}</span>
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
