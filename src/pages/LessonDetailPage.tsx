import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Lightbulb,
  PenTool,
  HelpCircle,
  Check,
  X,
  Loader,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  SkipForward,
} from 'lucide-react'
import { useCourseStore, useCurrentBundle } from '@stores/courseStore'
import { useWrongQuestionStore } from '@stores/wrongQuestionStore'
import {
  adjudicateAnswer,
  generateLessonContent,
  gradeAnswer,
  regenerateQuizQuestion,
} from '@services/deepseek'
import type { Priority, QuizQuestion, QuizType } from '@types/index'
import { renderMarkdown, renderInlineMarkdown } from '../utils/markdown'
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n'
import styles from './LessonDetailPage.module.css'

const priorityLabel: Record<Priority, TranslationKey> = {
  must: 'dashboard.priorityMust',
  high: 'dashboard.priorityHigh',
  know: 'dashboard.priorityKnow',
}

/** 去除选项文本中已有的 A. B. C. D. 前缀，避免重复 */
function cleanOptionText(opt: string): string {
  if (!opt) return ''
  return opt.replace(/^[A-Z][.、．)]\s*/i, '').trim()
}

/** 打乱选择题选项顺序，返回新 correctIndex/correctIndices */
function shuffleOptions(q: QuizQuestion): QuizQuestion {
  if (!q.options) return q

  // 多选题
  if (q.type === 'multi' && q.correctIndices) {
    const correctOptions = q.correctIndices.map(i => q.options![i])
    const shuffled = [...q.options].sort(() => Math.random() - 0.5)
    const newCorrectIndices = correctOptions.map(opt => shuffled.indexOf(opt)).filter(i => i >= 0)
    return { ...q, options: shuffled, correctIndices: newCorrectIndices }
  }

  // 单选题
  if (q.correctIndex !== undefined) {
    const correctOption = q.options[q.correctIndex]
    const shuffled = [...q.options].sort(() => Math.random() - 0.5)
    const newCorrectIndex = shuffled.indexOf(correctOption)
    return { ...q, options: shuffled, correctIndex: newCorrectIndex }
  }

  return q
}

type Tab = 'points' | 'examples' | 'quiz'

export default function LessonDetailPage() {
  const t = useT()
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()

  const bundle = useCurrentBundle()
  const lessons = bundle?.lessons ?? []
  const examPoints = bundle?.examPoints ?? []
  const rawText = bundle?.rawText ?? ''
  const generatingLessons = bundle?.generatingLessons ?? false

  const completeLesson = useCourseStore(s => s.completeLesson)
  const setLessonContent = useCourseStore(s => s.setLessonContent)
  const spendCoins = useCourseStore(s => s.spendCoins)
  const addWrongQuestion = useWrongQuestionStore(s => s.addWrongQuestion)

  const lesson = lessons.find(l => l.id === lessonId)
  const content = lesson?.content ?? null

  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('points')
  // 小测状态：一题一页
  const [quizPage, setQuizPage] = useState(0)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [pageSolved, setPageSolved] = useState<Set<number>>(new Set())
  const [textAnswer, setTextAnswer] = useState('')
  const [grading, setGrading] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null)
  const [choiceSelected, setChoiceSelected] = useState<number | null>(null)
  const [multiSelected, setMultiSelected] = useState<Set<number>>(new Set())
  const [multiSubmitted, setMultiSubmitted] = useState(false)
  const [revealed, setRevealed] = useState(false)
  // AI 复核进行中（学生答案与参考答案不一致时触发）
  const [adjudicating, setAdjudicating] = useState(false)

  // 切换关卡时重置本地状态
  useEffect(() => {
    setRegenerating(false)
    setError(null)
    setTab('points')
    setQuizPage(0)
    setPageSolved(new Set())
    setTextAnswer('')
    setGrading(false)
    setFeedback(null)
    setChoiceSelected(null)
    setRevealed(false)
    setAdjudicating(false)
  }, [lessonId])

  // 同步小测题目（内容加载或重新生成时）
  // 注意：AI 复核修正答案也会更新 content，此时跳过重置，避免清掉复核反馈与解题进度
  const skipQuizSyncRef = useRef(false)
  useEffect(() => {
    if (skipQuizSyncRef.current) {
      skipQuizSyncRef.current = false
      return
    }
    if (content?.quiz) {
      setQuizQuestions(content.quiz)
      setQuizPage(0)
      setPageSolved(new Set())
      setTextAnswer('')
      setFeedback(null)
      setChoiceSelected(null)
      setRevealed(false)
      setAdjudicating(false)
    }
  }, [content])

  // 关卡不存在
  if (!lesson) {
    return (
      <div className={styles.page}>
        <div className={`${styles.notFound} liquid-glass`}>
          <p className={styles.notFoundText}>{t('lesson.notFound')}</p>
          <button
            className={styles.backButton}
            onClick={() => navigate('/lessons')}
          >
            <ArrowLeft size={16} strokeWidth={2} />
            <span>{t('lesson.backToList')}</span>
          </button>
        </div>
      </div>
    )
  }

  const examPoint = examPoints.find(p => p.id === lesson.examPointId)
  const isCompleted = lesson.status === 'completed'

  /** 手动重新生成关卡内容 */
  const handleRegenerate = async () => {
    if (!examPoint) {
      setError(t('lesson.noExamPoint'))
      return
    }
    setRegenerating(true)
    setError(null)
    try {
      const c = await generateLessonContent(examPoint, rawText)
      setLessonContent(lesson.id, c)
      setTab('points')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lesson.genFailedRetry'))
    } finally {
      setRegenerating(false)
    }
  }

  const handleComplete = () => {
    completeLesson(lesson.id)
    navigate('/lessons')
  }

  /** 多选题：切换选项选择 */
  const handleMultiToggle = (optionIndex: number) => {
    if (multiSubmitted || adjudicating) return
    setMultiSelected(prev => {
      const next = new Set(prev)
      if (next.has(optionIndex)) {
        next.delete(optionIndex)
      } else {
        next.add(optionIndex)
      }
      return next
    })
  }

  /** 把（可能被复核修正的）小测题写回本地状态与课程存储 */
  const patchQuizQuestion = (patched: QuizQuestion) => {
    skipQuizSyncRef.current = true
    setQuizQuestions(prev => prev.map((item, i) => (i === quizPage ? patched : item)))
    if (content) {
      setLessonContent(lesson.id, {
        ...content,
        quiz: content.quiz.map(item => (item.id === patched.id ? patched : item)),
      })
    }
  }

  /**
   * AI 复核：学生答案与参考答案不一致时，独立裁定真正正确的选项。
   * 参考答案可能是生成出题时就标错了（如混淆最大项/最小项），不能盲判学生错误。
   */
  const adjudicateMismatch = async (
    q: QuizQuestion,
    userSelectedIndex?: number,
    userSelectedIndices?: number[],
  ): Promise<void> => {
    setAdjudicating(true)
    try {
      const result = await adjudicateAnswer({
        questionType: q.type === 'multi' ? 'multi' : 'choice',
        question: q.question,
        options: q.options ?? [],
        storedCorrectIndex: q.correctIndex,
        storedCorrectIndices: q.correctIndices,
        userSelectedIndex,
        userSelectedIndices,
      })

      // 用复核结果修正题目的参考答案（本地状态 + 课程存储）
      const patched: QuizQuestion = { ...q }
      if (q.type === 'multi' && result.correctIndices) {
        patched.correctIndices = result.correctIndices
      } else if (q.type !== 'multi' && result.correctIndex !== undefined) {
        patched.correctIndex = result.correctIndex
      }
      const hasCorrection =
        q.type === 'multi' ? !!result.correctIndices : result.correctIndex !== undefined
      if (hasCorrection) patchQuizQuestion(patched)
      if (q.type === 'multi') setMultiSubmitted(true)
      setRevealed(true)

      if (result.userCorrect) {
        // 参考答案标错、学生答对了：改判为正确，不计入错题本
        setPageSolved(prev => new Set(prev).add(quizPage))
        setFeedback({
          correct: true,
          text: `${t('lesson.keyFixedNote')}

${result.feedback}`,
        })
      } else {
        // 学生确实答错（参考答案无误，或正确选项另有其他）
        setFeedback({ correct: false, text: result.feedback })
        if (examPoint && bundle) {
          addWrongQuestion({
            courseId: bundle.course.id,
            courseName: bundle.course.name,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            question: q.question,
            quizType: q.type,
            options: q.options,
            correctIndex: patched.correctIndex,
            correctIndices: patched.correctIndices,
            selectedIndex: userSelectedIndex,
            selectedIndices: userSelectedIndices,
            explanation: result.feedback,
            examPointTitle: examPoint.title,
            priority: lesson.priority,
          })
        }
      }
    } catch {
      // 复核失败（网络/接口异常）：按参考答案判定，保持原有行为
      setRevealed(true)
      if (examPoint && bundle) {
        addWrongQuestion({
          courseId: bundle.course.id,
          courseName: bundle.course.name,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          question: q.question,
          quizType: q.type,
          options: q.options,
          correctIndex: q.correctIndex,
          correctIndices: q.correctIndices,
          selectedIndex: userSelectedIndex,
          selectedIndices: userSelectedIndices,
          explanation: q.explanation,
          examPointTitle: examPoint.title,
          priority: lesson.priority,
        })
      }
    } finally {
      setAdjudicating(false)
    }
  }

  /** 多选题：提交答案 */
  const handleMultiSubmit = () => {
    const q = quizQuestions[quizPage]
    if (!q || !q.correctIndices || multiSelected.size === 0) return

    const correctSet = new Set(q.correctIndices)
    const isCorrect =
      multiSelected.size === correctSet.size &&
      [...multiSelected].every(i => correctSet.has(i))

    if (isCorrect) {
      setMultiSubmitted(true)
      setPageSolved(prev => new Set(prev).add(quizPage))
    } else {
      // 与参考答案不一致：先复核再判定
      adjudicateMismatch(q, undefined, [...multiSelected])
    }
  }

  /** 多选题：再试一次（打乱选项） */
  const handleRetryMulti = () => {
    const q = quizQuestions[quizPage]
    if (!q) return
    const shuffled = shuffleOptions(q)
    // 打乱后需要更新 correctIndices
    setQuizQuestions(prev => prev.map((item, i) => (i === quizPage ? shuffled : item)))
    setMultiSelected(new Set())
    setMultiSubmitted(false)
  }

  /** 选择题：点击选项 */
  const handleChoiceAnswer = (optionIndex: number) => {
    if (revealed || adjudicating) return
    const q = quizQuestions[quizPage]
    if (!q || q.correctIndex === undefined) return

    setChoiceSelected(optionIndex)

    if (optionIndex === q.correctIndex) {
      // 与参考答案一致，直接判定正确
      setRevealed(true)
      setPageSolved(prev => new Set(prev).add(quizPage))
    } else {
      // 与参考答案不一致：先 AI 复核再判定
      adjudicateMismatch(q, optionIndex)
    }
  }

  /** 选择题：再试一次（打乱选项） */
  const handleRetryChoice = () => {
    const q = quizQuestions[quizPage]
    if (!q) return
    const shuffled = shuffleOptions(q)
    setQuizQuestions(prev => prev.map((item, i) => (i === quizPage ? shuffled : item)))
    setChoiceSelected(null)
    setRevealed(false)
  }

  /** 填空/简答题：提交答案 */
  const handleSubmitText = async () => {
    const q = quizQuestions[quizPage]
    if (!q || !textAnswer.trim()) return

    setGrading(true)
    try {
      const result = await gradeAnswer(
        q.question,
        textAnswer,
        q.answer || '',
        q.acceptableAnswers || []
      )
      setFeedback({ correct: result.correct, text: result.feedback })
      if (result.correct) {
        setPageSolved(prev => new Set(prev).add(quizPage))
      } else if (examPoint && bundle) {
        addWrongQuestion({
          courseId: bundle.course.id,
          courseName: bundle.course.name,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          question: q.question,
          quizType: q.type,
          userAnswer: textAnswer,
          correctAnswer: q.answer,
          explanation: q.explanation,
          examPointTitle: examPoint.title,
          priority: lesson.priority,
        })
      }
    } catch {
      setFeedback({ correct: false, text: t('lesson.gradeFailed') })
    } finally {
      setGrading(false)
    }
  }

  /** 重新生成当前题（同知识点，不耗 Chill币） */
  const handleRegenerateQuestion = async () => {
    const q = quizQuestions[quizPage]
    if (!q || !examPoint) return

    setGrading(true)
    try {
      const newQ = await regenerateQuizQuestion(
        q.examPointTitle || examPoint.title,
        q.question,
        rawText
      )
      setQuizQuestions(prev => prev.map((item, i) => (i === quizPage ? newQ : item)))
      // 重置所有答题状态
      setTextAnswer('')
      setFeedback(null)
      setChoiceSelected(null)
      setMultiSelected(new Set())
      setMultiSubmitted(false)
      setRevealed(false)
    } catch {
      setFeedback({ correct: false, text: t('lesson.regenerateFailed') })
    } finally {
      setGrading(false)
    }
  }

  /** 跳过当前题（消耗 10 Chill币，直接进入下一题） */
  const handleSkipQuestion = () => {
    const SKIP_COST = 10
    const ok = spendCoins(SKIP_COST)
    if (!ok) {
      setError(t('lesson.coinsInsufficientSkip'))
      return
    }
    setError(null)
    // 标记当前题为已解决（允许后续完成关卡）
    setPageSolved(prev => new Set(prev).add(quizPage))
    // 如果不是最后一题，进入下一题
    if (quizPage < quizQuestions.length - 1) {
      setQuizPage(prev => prev + 1)
      setTextAnswer('')
      setFeedback(null)
      setChoiceSelected(null)
      setMultiSelected(new Set())
      setMultiSubmitted(false)
      setRevealed(false)
    }
  }

  /** 下一题 */
  const handleNextPage = () => {
    if (quizPage < quizQuestions.length - 1) {
      setQuizPage(prev => prev + 1)
      setTextAnswer('')
      setFeedback(null)
      setChoiceSelected(null)
      setMultiSelected(new Set())
      setMultiSubmitted(false)
      setRevealed(false)
    }
  }

  /** 跳转到已完成的题目 */
  const handleNavigateToPage = (pageIndex: number) => {
    if (pageSolved.has(pageIndex)) {
      setQuizPage(pageIndex)
      setTextAnswer('')
      setFeedback(null)
      setChoiceSelected(null)
      setMultiSelected(new Set())
      setMultiSubmitted(false)
      setRevealed(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* 顶部返回栏 */}
      <div className={styles.topbar}>
        <button
          className={styles.backButton}
          onClick={() => navigate('/lessons')}
        >
          <ArrowLeft size={18} strokeWidth={2} />
          <span>{t('lesson.backToList')}</span>
        </button>
      </div>

      {/* 标题区 */}
      <div className={`${styles.header} liquid-glass`}>
        <div className={styles.headerMeta}>
          <span
            className={`${styles.priorityTag} ${styles[`priority_${lesson.priority}`]}`}
          >
            {t(priorityLabel[lesson.priority])}
          </span>
          <span className={styles.order}>{t('lesson.orderLabel').replace('{n}', String(lesson.order))}</span>
          <span className={styles.coins}>{lesson.coins} {t('dashboard.coins')}</span>
          {isCompleted && (
            <span className={styles.completedBadge}>
              <CheckCircle size={14} strokeWidth={2.2} />
              {t('lessons.statusDone')}
            </span>
          )}
        </div>
        <h1 className={styles.title}>{lesson.title}</h1>
      </div>

      {/* 手动重新生成中 */}
      {regenerating && (
        <div className={`${styles.loadingCard} liquid-glass`}>
          <Loader size={32} className={styles.spinnerIcon} />
          <p className={styles.loadingText}>{t('lesson.regenerating')}</p>
        </div>
      )}

      {/* 内容已存在：直接显示 */}
      {!regenerating && content && (
        <>
          {/* Tab 切换 */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'points' ? styles.tabActive : ''}`}
              onClick={() => setTab('points')}
            >
              <Lightbulb size={16} strokeWidth={2} />
              <span>{t('lesson.tabPoints')}</span>
            </button>
            <button
              className={`${styles.tab} ${tab === 'examples' ? styles.tabActive : ''}`}
              onClick={() => setTab('examples')}
            >
              <PenTool size={16} strokeWidth={2} />
              <span>{t('lesson.examples')}</span>
            </button>
            {content.quiz.length > 0 && (
              <button
                className={`${styles.tab} ${tab === 'quiz' ? styles.tabActive : ''}`}
                onClick={() => setTab('quiz')}
              >
                <HelpCircle size={16} strokeWidth={2} />
                <span>{t('lesson.quiz')}</span>
              </button>
            )}
          </div>

          {/* 知识点 */}
          {tab === 'points' && (
            <div className={`${styles.contentCard} liquid-glass`}>
              <h2 className={styles.sectionTitle}>
                <Lightbulb size={18} strokeWidth={2} />
                {t('lesson.keyPoints')}
              </h2>
              <ul className={styles.keyPoints}>
                {content.keyPoints.map((point, i) => (
                  <li key={i} className={styles.keyPoint}>
                    <span className={styles.keyPointDot} />
                    <span
                      className={styles.markdownContent}
                      dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(point) }}
                    />
                  </li>
                ))}
              </ul>

              <h2 className={styles.sectionTitle}>
                <PenTool size={18} strokeWidth={2} />
                {t('lesson.explanationTitle')}
              </h2>
              <div
                className={`${styles.explanation} ${styles.markdownContent}`}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content.explanation) }}
              />
            </div>
          )}

          {/* 例题 */}
          {tab === 'examples' && (
            <div className={styles.contentList}>
              {content.examples.length === 0 && (
                <div className={`${styles.emptyHint} liquid-glass`}>
                  {t('lesson.noExamples')}
                </div>
              )}
              {content.examples.map((ex, i) => (
                <div key={i} className={`${styles.exampleCard} liquid-glass`}>
                  <div className={styles.exampleHeader}>{t('lesson.exampleN').replace('{n}', String(i + 1))}</div>
                  <div
                    className={`${styles.exampleQuestion} ${styles.markdownContent}`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(ex.question) }}
                  />
                  {ex.steps && ex.steps.length > 0 && (
                    <div className={styles.exampleSteps}>
                      <div className={styles.stepsLabel}>{t('lesson.stepsLabel')}</div>
                      {ex.steps.map((step, j) => (
                        <div key={j} className={styles.step}>
                          <span className={styles.stepIndex}>{j + 1}</span>
                          <span
                            className={styles.markdownContent}
                            dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(step) }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={styles.exampleAnswer}>
                    <span className={styles.answerLabel}>{t('lesson.answerLabel')}</span>
                    <span
                      className={`${styles.answerText} ${styles.markdownContent}`}
                      dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(ex.answer) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 小测 */}
          {tab === 'quiz' && (
            <div className={styles.contentList}>
              {quizQuestions.length === 0 ? (
                <div className={`${styles.emptyHint} liquid-glass`}>
                  {t('lesson.noQuiz')}
                </div>
              ) : (
                <>
                  {/* 进度点 */}
                  <div className={styles.quizProgress}>
                    {quizQuestions.map((_, i) => {
                      const isCompleted = pageSolved.has(i)
                      const isCurrent = i === quizPage
                      let dotClass = styles.progressDot
                      if (isCompleted) {
                        dotClass += ` ${styles.progressDotCompleted}`
                      } else if (isCurrent) {
                        dotClass += ` ${styles.progressDotCurrent}`
                      } else {
                        dotClass += ` ${styles.progressDotLocked}`
                      }
                      return (
                        <div
                          key={i}
                          className={dotClass}
                          onClick={() => isCompleted && handleNavigateToPage(i)}
                        >
                          {isCompleted && <Check size={10} strokeWidth={3} />}
                        </div>
                      )
                    })}
                  </div>

                  {/* 当前题目 */}
                  {(() => {
                    const q = quizQuestions[quizPage]
                    if (!q) return null
                    const qType: QuizType = q.type || 'choice'
                    const isSolved = pageSolved.has(quizPage)
                    const isLastPage = quizPage === quizQuestions.length - 1
                    const allSolved = pageSolved.size === quizQuestions.length

                    return (
                      <div className={`${styles.quizPageCard} liquid-glass`}>
                        <div className={styles.quizHeader}>
                          <span>{t('lesson.questionN').replace('{cur}', String(quizPage + 1)).replace('{total}', String(quizQuestions.length))}</span>
                          <span className={styles.quizTypeTag}>
                            {qType === 'choice' ? t('lesson.qTypeChoice') : qType === 'multi' ? t('lesson.qTypeMulti') : qType === 'fill' ? t('lesson.qTypeFill') : t('lesson.qTypeShort')}
                          </span>
                        </div>
                        <div
                          className={`${styles.quizQuestion} ${styles.markdownContent}`}
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(q.question) }}
                        />

                        {/* 单选题 */}
                        {qType === 'choice' && q.options && (
                          <div className={styles.quizOptions}>
                            {q.options.map((opt, oi) => {
                              const isCorrect = oi === q.correctIndex
                              const isSelected = choiceSelected === oi
                              let cls = styles.quizOption
                              if (revealed) {
                                if (isCorrect) {
                                  cls = `${styles.quizOption} ${styles.quizOptionCorrect}`
                                } else if (isSelected) {
                                  cls = `${styles.quizOption} ${styles.quizOptionWrong}`
                                } else {
                                  cls = `${styles.quizOption} ${styles.quizOptionDim}`
                                }
                              }
                              return (
                                <button
                                  key={oi}
                                  className={cls}
                                  onClick={() => handleChoiceAnswer(oi)}
                                  disabled={revealed || adjudicating}
                                >
                                  <span className={styles.optionLabel}>
                                    {String.fromCharCode(65 + oi)}
                                  </span>
                                  <span
                                    className={`${styles.optionText} ${styles.markdownContent}`}
                                    dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(cleanOptionText(opt)) }}
                                  />
                                  {revealed && isCorrect && (
                                    <Check size={16} className={styles.optionIcon} />
                                  )}
                                  {revealed && isSelected && !isCorrect && (
                                    <X size={16} className={styles.optionIcon} />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {/* 多选题 */}
                        {qType === 'multi' && q.options && (
                          <>
                            <div className={styles.quizOptions}>
                              {q.options.map((opt, oi) => {
                                const isCorrect = q.correctIndices?.includes(oi)
                                const isSelected = multiSelected.has(oi)
                                let cls = styles.quizOption
                                if (multiSubmitted) {
                                  if (isCorrect) {
                                    cls = `${styles.quizOption} ${styles.quizOptionCorrect}`
                                  } else if (isSelected) {
                                    cls = `${styles.quizOption} ${styles.quizOptionWrong}`
                                  } else {
                                    cls = `${styles.quizOption} ${styles.quizOptionDim}`
                                  }
                                } else if (isSelected) {
                                  cls = `${styles.quizOption} ${styles.quizOptionSelected}`
                                }
                                return (
                                  <button
                                    key={oi}
                                    className={cls}
                                    onClick={() => handleMultiToggle(oi)}
                                    disabled={multiSubmitted || adjudicating}
                                  >
                                    <span className={styles.optionLabel}>
                                      {String.fromCharCode(65 + oi)}
                                    </span>
                                    <span
                                      className={`${styles.optionText} ${styles.markdownContent}`}
                                      dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(cleanOptionText(opt)) }}
                                    />
                                    {multiSubmitted && isCorrect && (
                                      <Check size={16} className={styles.optionIcon} />
                                    )}
                                    {multiSubmitted && isSelected && !isCorrect && (
                                      <X size={16} className={styles.optionIcon} />
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                            {/* 多选题解析 */}
                            {multiSubmitted && (
                              <div
                                className={`${styles.quizExplanation} ${
                                  multiSelected.size === q.correctIndices?.length &&
                                  [...multiSelected].every(i => q.correctIndices?.includes(i))
                                    ? styles.quizExplanationCorrect
                                    : styles.quizExplanationWrong
                                }`}
                              >
                                <span className={styles.explanationLabel}>
                                  {multiSelected.size === q.correctIndices?.length &&
                                  [...multiSelected].every(i => q.correctIndices?.includes(i))
                                    ? t('lesson.answerCorrect')
                                    : t('lesson.answerWrong')}
                                </span>
                                <span
                                  className={styles.markdownContent}
                                  dangerouslySetInnerHTML={{
                                    __html: renderInlineMarkdown(q.explanation),
                                  }}
                                />
                              </div>
                            )}
                          </>
                        )}

                        {/* 填空题 */}
                        {qType === 'fill' && (
                          <input
                            type="text"
                            className={styles.textInput}
                            value={textAnswer}
                            onChange={e => setTextAnswer(e.target.value)}
                            placeholder={t('lesson.yourAnswerPlaceholder')}
                            disabled={feedback?.correct === true}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !grading && feedback?.correct !== true) {
                                handleSubmitText()
                              }
                            }}
                          />
                        )}

                        {/* 简答题 */}
                        {qType === 'short' && (
                          <textarea
                            className={styles.textareaInput}
                            value={textAnswer}
                            onChange={e => setTextAnswer(e.target.value)}
                            placeholder={t('lesson.yourAnswerPlaceholder')}
                            disabled={feedback?.correct === true}
                            rows={4}
                          />
                        )}

                        {/* AI 复核进行中（学生答案与参考答案不一致时） */}
                        {adjudicating && (
                          <div className={styles.adjudicating}>
                            <Loader size={14} className={styles.submitSpinner} />
                            <span>{t('lesson.adjudicating')}</span>
                          </div>
                        )}

                        {/* 操作行：左侧重新生成+跳过，右侧提交答案 */}
                        <div className={styles.quizActionRow}>
                          <div className={styles.quizNavLeft}>
                            {/* 重新生成：同知识点新题，不耗 Chill币 */}
                            <button
                              className={styles.regenerateBtn}
                              onClick={handleRegenerateQuestion}
                              disabled={grading || adjudicating}
                              title={t('lesson.regenerateTitle')}
                            >
                              {grading ? (
                                <Loader size={14} className={styles.submitSpinner} />
                              ) : (
                                <RefreshCw size={14} strokeWidth={2} />
                              )}
                              <span>{t('lesson.regenerate')}</span>
                            </button>
                            {/* 跳过：消耗 10 Chill币 直接进入下一题 */}
                            <button
                              className={styles.skipBtn}
                              onClick={handleSkipQuestion}
                              disabled={grading || adjudicating}
                              title={t('lesson.skipTitle')}
                            >
                              <SkipForward size={14} strokeWidth={2} />
                              <span>{t('lesson.skipCost')}</span>
                            </button>
                            {/* 答错后的再试一次 */}
                            {qType === 'choice' &&
                              revealed &&
                              choiceSelected !== q.correctIndex && (
                                <button
                                  className={styles.retryBtn}
                                  onClick={handleRetryChoice}
                                >
                                  <RefreshCw size={14} strokeWidth={2} />
                                  <span>{t('lesson.tryAgain')}</span>
                                </button>
                              )}
                            {qType === 'multi' &&
                              multiSubmitted && (
                                <button
                                  className={styles.retryBtn}
                                  onClick={handleRetryMulti}
                                >
                                  <RefreshCw size={14} strokeWidth={2} />
                                  <span>{t('lesson.tryAgain')}</span>
                                </button>
                              )}
                          </div>
                          <div className={styles.quizActionRight}>
                            {/* 多选提交 */}
                            {qType === 'multi' && !multiSubmitted && (
                              <button
                                className={styles.submitBtn}
                                onClick={handleMultiSubmit}
                                disabled={multiSelected.size === 0}
                              >
                                {t('lesson.submitWithCount').replace('{count}', String(multiSelected.size))}
                              </button>
                            )}
                            {/* 填空/简答提交 */}
                            {(qType === 'fill' || qType === 'short') &&
                              feedback?.correct !== true && (
                                <button
                                  className={styles.submitBtn}
                                  onClick={handleSubmitText}
                                  disabled={grading || !textAnswer.trim()}
                                >
                                  {grading && (
                                    <Loader size={16} className={styles.submitSpinner} />
                                  )}
                                  {grading ? t('lesson.grading') : t('lesson.submit')}
                                </button>
                              )}
                          </div>
                        </div>

                        {/* 反馈（填空/简答） */}
                        {feedback && (
                          <div
                            className={`${styles.feedback} ${
                              feedback.correct
                                ? styles.feedbackCorrect
                                : styles.feedbackWrong
                            }`}
                          >
                            <span className={styles.explanationLabel}>
                              {feedback.correct ? t('lesson.answerCorrect') : t('lesson.answerWrong')}
                            </span>
                            <span>{feedback.text}</span>
                          </div>
                        )}

                        {/* 标准答案（填空/简答题判定后始终显示） */}
                        {feedback && q.answer && (
                          <div className={styles.feedback}>
                            <span className={styles.explanationLabel}>{t('lesson.standardAnswer')}</span>
                            <span
                              className={styles.markdownContent}
                              dangerouslySetInnerHTML={{
                                __html: renderInlineMarkdown(q.answer),
                              }}
                            />
                          </div>
                        )}

                        {/* 解析（选择题） */}
                        {qType === 'choice' && revealed && (
                          <div
                            className={`${styles.quizExplanation} ${
                              choiceSelected === q.correctIndex
                                ? styles.quizExplanationCorrect
                                : styles.quizExplanationWrong
                            }`}
                          >
                            <span className={styles.explanationLabel}>
                              {choiceSelected === q.correctIndex ? t('lesson.answerCorrect') : t('lesson.answerWrong')}
                            </span>
                            <span
                              className={styles.markdownContent}
                              dangerouslySetInnerHTML={{
                                __html: renderInlineMarkdown(q.explanation),
                              }}
                            />
                          </div>
                        )}

                        {/* 导航：下一题 / 完成关卡 */}
                        <div className={styles.quizNav}>
                          <div />
                          <div>
                            {isSolved && !isLastPage && (
                              <button
                                className={styles.quizNavBtn}
                                onClick={handleNextPage}
                              >
                                <span>{t('lesson.nextPage')}</span>
                              </button>
                            )}
                            {isSolved && isLastPage && allSolved && !isCompleted && (
                              <button
                                className={styles.quizNavBtn}
                                onClick={handleComplete}
                              >
                                <CheckCircle size={16} strokeWidth={2} />
                                <span>{t('lesson.finish')}</span>
                              </button>
                            )}
                            {isSolved && isLastPage && allSolved && isCompleted && (
                              <div className={styles.alreadyCompleted}>
                                <CheckCircle size={16} strokeWidth={2} />
                                <span>{t('lesson.completed')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* 内容正在后台生成中 */}
      {!regenerating && !content && generatingLessons && (
        <div className={`${styles.loadingCard} liquid-glass`}>
          <Loader size={32} className={styles.spinnerIcon} />
          <p className={styles.loadingText}>{t('lesson.generatingWait')}</p>
        </div>
      )}

      {/* 生成失败：显示重新生成按钮 */}
      {!regenerating && !content && !generatingLessons && (
        <div className={`${styles.startCard} liquid-glass`}>
          {error && (
            <div className={styles.error}>
              <X size={16} strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}
          <div className={styles.startIcon}>
            <AlertCircle size={40} strokeWidth={1.5} />
          </div>
          <p className={styles.startText}>
            {t('lesson.genFailedManual')}
          </p>
          <button className={styles.startButton} onClick={handleRegenerate}>
            <RefreshCw size={18} strokeWidth={2} />
            <span>{t('lesson.regenerate')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
