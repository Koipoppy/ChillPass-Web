import { useState, useMemo } from 'react'
import {
  Briefcase,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Download,
  AlertCircle,
  Globe,
} from 'lucide-react'
import { useCourseStore } from '@stores/courseStore'
import { generateExamQuestions, translateExamQuestions } from '@services/deepseek'
import { renderInlineMarkdown } from '../utils/markdown'
import type { ExamQuestion } from '@types/index'
import styles from './TeacherWorkspace.module.css'

type QuestionType = 'choice' | 'multi' | 'fill' | 'short' | 'calculation' | 'essay'
type Difficulty = 'easy' | 'medium' | 'hard'
type PaperLanguage = 'zh' | 'en' | 'ja' | 'ko' | 'ru'

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  choice: '单选题',
  multi: '多选题',
  fill: '填空题',
  short: '简答题',
  calculation: '计算题',
  essay: '论述题',
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const QUESTION_TYPE_ORDER: QuestionType[] = ['choice', 'multi', 'fill', 'short', 'calculation', 'essay']

const PAPER_LANG_LABELS: Record<PaperLanguage, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  ru: 'Русский',
}

/** 试卷语言文案 */
const PAPER_LANG_TEXTS: Record<PaperLanguage, {
  course: string
  duration: string
  minutes: string
  totalPoints: string
  name: string
  studentId: string
  className: string
  answerKey: string
  explanation: string
  steps: string
  points: string
  sections: Record<QuestionType, string>
}> = {
  zh: {
    course: '课程', duration: '考试时间', minutes: '分钟', totalPoints: '满分',
    name: '姓名', studentId: '学号', className: '班级',
    answerKey: '参考答案及评分标准', explanation: '解析', steps: '解题步骤', points: '分',
    sections: { choice: '一、单选题', multi: '二、多选题', fill: '三、填空题', short: '四、简答题', calculation: '五、计算题', essay: '六、论述题' },
  },
  en: {
    course: 'Course', duration: 'Duration', minutes: 'minutes', totalPoints: 'Total Points',
    name: 'Name', studentId: 'Student ID', className: 'Class',
    answerKey: 'Answer Key & Grading Criteria', explanation: 'Explanation', steps: 'Solution Steps', points: 'pts',
    sections: { choice: 'I. Multiple Choice', multi: 'II. Multiple Response', fill: 'III. Fill in the Blanks', short: 'IV. Short Answer', calculation: 'V. Calculation Problems', essay: 'VI. Essay Questions' },
  },
  ja: {
    course: '科目', duration: '試験時間', minutes: '分', totalPoints: '満点',
    name: '氏名', studentId: '学籍番号', className: 'クラス',
    answerKey: '解答及び採点基準', explanation: '解説', steps: '解答手順', points: '点',
    sections: { choice: '一、選択題', multi: '二、複数選択題', fill: '三、穴埋め問題', short: '四、簡答題', calculation: '五、計算問題', essay: '六、論述問題' },
  },
  ko: {
    course: '과목', duration: '시험 시간', minutes: '분', totalPoints: '만점',
    name: '이름', studentId: '학번', className: '반',
    answerKey: '정답 및 채점 기준', explanation: '해설', steps: '풀이 단계', points: '점',
    sections: { choice: '1. 객관식', multi: '2. 다중 선택', fill: '3. 빈칸 채우기', short: '4. 단답형', calculation: '5. 계산 문제', essay: '6. 논술 문제' },
  },
  ru: {
    course: 'Предмет', duration: 'Время', minutes: 'мин', totalPoints: 'Максимум',
    name: 'Имя', studentId: '№ студента', className: 'Группа',
    answerKey: 'Ключи и критерии оценки', explanation: 'Объяснение', steps: 'Этапы решения', points: 'балл',
    sections: { choice: 'I. Выбор ответа', multi: 'II. Множественный выбор', fill: 'III. Заполните пропуски', short: 'IV. Краткий ответ', calculation: 'V. Расчётные задачи', essay: 'VI. Эссе' },
  },
}

/** 去除选项文本中已有的 A. B. C. D. 前缀 */
function cleanOptionText(opt: string): string {
  if (!opt) return ''
  return opt.replace(/^[A-Z][.、．)]\s*/i, '').trim()
}

/** 转义 HTML 特殊字符（用于非公式文本） */
function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 生成试卷 HTML（预渲染 KaTeX 公式，无需加载 KaTeX JS） */
function generateExamHTML(paper: {
  title: string
  courseName: string
  duration: number
  questions: ExamQuestion[]
  language: PaperLanguage
}): string {
  const t = PAPER_LANG_TEXTS[paper.language]
  const renderText = (text: string) => renderInlineMarkdown(text || '')

  const questionsByType: Record<QuestionType, ExamQuestion[]> = {
    choice: paper.questions.filter(q => q.type === 'choice'),
    multi: paper.questions.filter(q => q.type === 'multi'),
    fill: paper.questions.filter(q => q.type === 'fill'),
    short: paper.questions.filter(q => q.type === 'short'),
    calculation: paper.questions.filter(q => q.type === 'calculation'),
    essay: paper.questions.filter(q => q.type === 'essay'),
  }

  const totalPoints = paper.questions.reduce((s, q) => s + (q.points || 0), 0)

  // 生成题目部分
  let questionsHtml = ''
  let questionNum = 1
  QUESTION_TYPE_ORDER.forEach(type => {
    const questions = questionsByType[type]
    if (questions.length === 0) return
    const sectionPoints = questions.reduce((s, q) => s + (q.points || 0), 0)
    questionsHtml += `<div class="section">`
    questionsHtml += `<div class="section-title">${t.sections[type]}（${t.totalPoints}：${sectionPoints}${t.points}）</div>`
    questions.forEach(q => {
      questionsHtml += `<div class="question">`
      questionsHtml += `<div class="question-text">${questionNum}. ${renderText(q.question)} <span class="pts">(${q.points || 5}${t.points})</span></div>`
      // 只有选择题才显示选项
      if ((type === 'choice' || type === 'multi') && q.options && q.options.length > 0) {
        questionsHtml += '<div class="options">'
        q.options.forEach((opt, i) => {
          questionsHtml += `<div class="option">${String.fromCharCode(65 + i)}. ${renderText(cleanOptionText(opt))}</div>`
        })
        questionsHtml += '</div>'
      }
      // 主观题留答题空间
      if (type === 'short' || type === 'essay' || type === 'calculation') {
        const lineCount = type === 'essay' ? 8 : type === 'calculation' ? 10 : 4
        questionsHtml += '<div class="answer-lines">'
        for (let i = 0; i < lineCount; i++) {
          questionsHtml += '<div class="answer-line"></div>'
        }
        questionsHtml += '</div>'
      }
      questionsHtml += '</div>'
      questionNum++
    })
    questionsHtml += '</div>'
  })

  // 生成答案部分
  let answerHtml = ''
  questionNum = 1
  QUESTION_TYPE_ORDER.forEach(type => {
    const questions = questionsByType[type]
    if (questions.length === 0) return
    questions.forEach(q => {
      let answer = ''
      if (q.type === 'choice' && q.correctIndex !== undefined && q.options) {
        answer = String.fromCharCode(65 + q.correctIndex)
      } else if (q.type === 'multi' && q.correctIndices && q.options) {
        answer = q.correctIndices.map(i => String.fromCharCode(65 + i)).join('、')
      } else {
        answer = q.answer || ''
      }
      answerHtml += `<div class="answer-item">`
      answerHtml += `<div class="answer-num">${questionNum}. <span class="answer-text">${renderText(answer)}</span></div>`
      if (q.steps && q.steps.length > 0) {
        answerHtml += `<div class="answer-steps">`
        answerHtml += `<div class="steps-label">${t.steps}：</div>`
        q.steps.forEach((step, i) => {
          answerHtml += `<div class="answer-step">${i + 1}. ${renderText(step)}</div>`
        })
        answerHtml += '</div>'
      }
      if (q.explanation) {
        answerHtml += `<div class="answer-explanation">${t.explanation}：${renderText(q.explanation)}</div>`
      }
      answerHtml += '</div>'
      questionNum++
    })
  })

  return `<!DOCTYPE html>
<html lang="${paper.language}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(paper.title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>
  @page { margin: 1.5cm 2cm; size: A4; }
  * { box-sizing: border-box; }
  body {
    font-family: "Times New Roman", "SimSun", "宋体", "Noto Serif CJK SC", serif;
    font-size: 12pt;
    line-height: 1.9;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
  }
  .paper-frame {
    border: 2px solid #1a1a1a;
    margin-bottom: 24px;
  }
  .header {
    text-align: center;
    padding: 16px 16px 12px;
    border-bottom: 2px solid #1a1a1a;
  }
  .header h1 {
    font-size: 20pt;
    font-weight: 700;
    margin: 0 0 6px;
    letter-spacing: 2px;
  }
  .header .subtitle {
    font-size: 11pt;
    color: #555;
    margin: 0;
  }
  .info-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 28px;
    padding: 10px 16px;
    font-size: 10.5pt;
    border-bottom: 1px solid #1a1a1a;
  }
  .info-bar:last-child { border-bottom: none; }
  .info-item { white-space: nowrap; }
  .info-item .blank {
    display: inline-block;
    border-bottom: 1px solid #1a1a1a;
    min-width: 90px;
    height: 1em;
  }
  .section { margin-top: 24px; }
  .section-title {
    font-size: 13pt;
    font-weight: 700;
    margin-bottom: 12px;
    padding-bottom: 4px;
    border-bottom: 1px solid #999;
  }
  .question { margin-bottom: 18px; page-break-inside: avoid; }
  .question-text { font-weight: 400; }
  .pts { font-size: 10.5pt; color: #666; font-weight: 400; }
  .options { margin-left: 2.5em; margin-top: 6px; }
  .option { margin-bottom: 4px; }
  .answer-lines { margin-top: 10px; margin-left: 1em; }
  .answer-line {
    border-bottom: 1px dashed #aaa;
    height: 30px;
    margin-bottom: 2px;
  }
  .answer-key { page-break-before: always; }
  .answer-key-title {
    font-size: 16pt;
    font-weight: 700;
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 8px;
    border-bottom: 2px solid #1a1a1a;
  }
  .answer-item { margin-bottom: 12px; page-break-inside: avoid; }
  .answer-num { font-weight: 600; }
  .answer-text { font-weight: 400; color: #c0392b; }
  .answer-steps { margin-left: 2em; margin-top: 4px; }
  .steps-label { font-weight: 600; font-size: 11pt; }
  .answer-step { font-size: 11pt; margin-bottom: 3px; }
  .answer-explanation {
    color: #555;
    font-size: 10.5pt;
    margin-left: 2em;
    margin-top: 4px;
  }
  .footer {
    text-align: center;
    font-size: 9pt;
    color: #999;
    margin-top: 40px;
    padding-top: 10px;
    border-top: 1px solid #ddd;
  }
  .katex { font-size: 1.1em; }
  @media print {
    body { margin: 0; }
  }
</style>
</head>
<body>
  <div class="paper-frame">
    <div class="header">
      <h1>${escapeHtml(paper.title)}</h1>
      <p class="subtitle">${escapeHtml(paper.courseName)}</p>
    </div>
    <div class="info-bar">
      <span class="info-item">${t.course}：${escapeHtml(paper.courseName)}</span>
      <span class="info-item">${t.name}：<span class="blank"></span></span>
      <span class="info-item">${t.studentId}：<span class="blank"></span></span>
      <span class="info-item">${t.className}：<span class="blank"></span></span>
    </div>
    <div class="info-bar">
      <span class="info-item">${t.duration}：${paper.duration} ${t.minutes}</span>
      <span class="info-item">${t.totalPoints}：${totalPoints} ${t.points}</span>
    </div>
  </div>

  ${questionsHtml}

  <div class="answer-key">
    <div class="answer-key-title">${t.answerKey}</div>
    ${answerHtml}
  </div>

  <div class="footer">
    ${escapeHtml(paper.title)} — ${escapeHtml(paper.courseName)}
  </div>
</body>
</html>`
}

/** 通过隐藏 iframe 导出试卷为 PDF（打印） */
function exportToPDF(paper: {
  title: string
  courseName: string
  duration: number
  questions: ExamQuestion[]
  language: PaperLanguage
}) {
  const html = generateExamHTML(paper)

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    alert('无法创建打印窗口')
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  // 等待 KaTeX CSS 和字体完全加载后再打印
  const tryPrint = async (attempts: number) => {
    const win = iframe.contentWindow
    if (!win) return

    // 检查 CSS 是否已加载
    const linkEl = doc.querySelector('link[rel="stylesheet"]')
    const cssLoaded = linkEl ? (linkEl as HTMLLinkElement).sheet !== null : true

    if (!cssLoaded && attempts > 0) {
      setTimeout(() => tryPrint(attempts - 1), 300)
      return
    }

    // 等待所有字体加载完成（KaTeX 字体文件通过 @font-face 加载）
    try {
      if (win.document.fonts && win.document.fonts.ready) {
        await win.document.fonts.ready
      }
    } catch {
      // 字体加载 API 不可用时忽略
    }

    // 额外等待确保渲染完成
    setTimeout(() => {
      win.focus()
      win.print()
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe)
      }, 1000)
    }, 500)
  }

  setTimeout(() => tryPrint(15), 500)
}

export default function TeacherWorkspace() {
  const courses = useCourseStore(s => s.courses)
  const switchCourse = useCourseStore(s => s.switchCourse)

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    courses[0]?.course.id ?? ''
  )

  const [questionType, setQuestionType] = useState<QuestionType>('choice')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [count, setCount] = useState(5)

  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [generating, setGenerating] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<QuestionType>>(new Set())

  // 试卷配置
  const [paperTitle, setPaperTitle] = useState('')
  const [paperDuration, setPaperDuration] = useState(120)
  const [paperLanguage, setPaperLanguage] = useState<PaperLanguage>('zh')

  const currentBundle = useMemo(
    () => courses.find(b => b.course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  )

  const courseText = currentBundle?.rawText ?? ''
  const courseName = currentBundle?.course.name ?? ''

  const handleGenerate = async () => {
    if (!currentBundle) {
      setError('请先选择一个课程')
      return
    }
    if (!courseText.trim()) {
      setError('该课程没有课件文本，请先导入并分析课件')
      return
    }

    setGenerating(true)
    setError('')
    try {
      const newQuestions = await generateExamQuestions(
        courseText,
        courseName,
        questionType,
        count,
        difficulty,
        questions, // 传入已有题目，让 AI 避免重复
      )
      if (newQuestions.length === 0) {
        setError('生成失败，请重试（可能是网络问题或课件内容不足）')
      } else {
        setQuestions(prev => [...prev, ...newQuestions])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const handleClearAll = () => {
    if (questions.length === 0) return
    if (window.confirm('确定要清空所有已生成的题目吗？')) {
      setQuestions([])
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleGroup = (type: QuestionType) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleExportPDF = async () => {
    if (questions.length === 0) {
      setError('请先生成题目再导出')
      return
    }

    let questionsToExport = questions

    // 非中文需要先翻译所有内容
    if (paperLanguage !== 'zh') {
      setTranslating(true)
      setError('')
      try {
        questionsToExport = await translateExamQuestions(questions, paperLanguage)
      } catch {
        setError('翻译失败，将使用中文内容导出')
        questionsToExport = questions
      } finally {
        setTranslating(false)
      }
    }

    const title = paperTitle.trim() || `${courseName}期末考试试卷`
    exportToPDF({
      title,
      courseName,
      duration: paperDuration,
      questions: questionsToExport,
      language: paperLanguage,
    })
  }

  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0)

  // 预计算全局题号
  const numberedQuestions = useMemo(() => {
    let num = 0
    return questions.map(q => ({ ...q, _num: ++num }))
  }, [questions])

  // 按类型分组
  const groupedQuestions = useMemo(() => {
    return QUESTION_TYPE_ORDER.map(type => ({
      type,
      questions: numberedQuestions.filter(q => q.type === type),
    })).filter(g => g.questions.length > 0)
  }, [numberedQuestions])

  return (
    <div className={`${styles.container} fade-in`}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Briefcase size={24} strokeWidth={1.8} />
          </div>
          <div>
            <h1 className={styles.title}>教师工作台</h1>
            <p className={styles.subtitle}>从课件生成试题，组装试卷并导出 PDF</p>
          </div>
        </div>
      </header>

      {/* 课程选择 */}
      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>选择课程</h2>
          <p className={styles.cardDesc}>选择已导入课件内容的课程作为出题来源</p>
        </div>
        {courses.length === 0 ? (
          <div className={styles.emptyHint}>
            <AlertCircle size={20} strokeWidth={2} />
            <span>暂无课程，请先导入课件</span>
          </div>
        ) : (
          <div className={styles.courseList}>
            {courses.map(b => (
              <button
                key={b.course.id}
                className={`${styles.courseChip} ${
                  selectedCourseId === b.course.id ? styles.courseChipActive : ''
                }`}
                onClick={() => {
                  setSelectedCourseId(b.course.id)
                  switchCourse(b.course.id)
                }}
              >
                {b.course.name}
                <span className={styles.courseChipMeta}>
                  {b.rawText ? `${b.rawText.length} 字` : '无文本'}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 题目生成 */}
      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>生成题目</h2>
          <p className={styles.cardDesc}>选择题型、难度和数量，AI 根据课件内容生成试题</p>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>题型</label>
          <div className={styles.optionRow}>
            {QUESTION_TYPE_ORDER.map(type => (
              <button
                key={type}
                className={`${styles.optionBtn} ${
                  questionType === type ? styles.optionBtnActive : ''
                }`}
                onClick={() => setQuestionType(type)}
              >
                {QUESTION_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>难度</label>
          <div className={styles.optionRow}>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                className={`${styles.optionBtn} ${
                  difficulty === d ? styles.optionBtnActive : ''
                }`}
                onClick={() => setDifficulty(d)}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>数量</label>
          <div className={styles.countRow}>
            <button
              type="button"
              className={styles.countBtn}
              onClick={() => setCount(Math.max(1, count - 1))}
              disabled={count <= 1}
            >
              −
            </button>
            <input
              type="number"
              className={styles.countInput}
              min={1}
              max={50}
              value={count}
              onChange={e => {
                const v = Number(e.target.value)
                if (Number.isFinite(v) && v >= 1 && v <= 50) setCount(v)
              }}
            />
            <button
              type="button"
              className={styles.countBtn}
              onClick={() => setCount(Math.min(50, count + 1))}
              disabled={count >= 50}
            >
              +
            </button>
            <span className={styles.countHint}>题（1-50）</span>
          </div>
        </div>

        {error && (
          <div className={styles.errorBox}>
            <AlertCircle size={16} strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        <button
          className={styles.generateBtn}
          onClick={handleGenerate}
          disabled={generating || !courseText.trim()}
        >
          {generating ? (
            <>
              <Loader2 size={18} strokeWidth={2} className={styles.spinIcon} />
              正在生成...
            </>
          ) : (
            <>
              <Plus size={18} strokeWidth={2} />
              生成题目
            </>
          )}
        </button>
      </section>

      {/* 已生成题目列表 - 按类型分组 */}
      {questions.length > 0 && (
        <section className={`liquid-glass ${styles.card}`}>
          <div className={styles.listHeader}>
            <div>
              <h2 className={styles.cardTitle}>题目列表</h2>
              <p className={styles.cardDesc}>
                共 {questions.length} 题，合计 {totalPoints} 分
              </p>
            </div>
            <button className={styles.clearBtn} onClick={handleClearAll}>
              <Trash2 size={15} strokeWidth={2} />
              清空
            </button>
          </div>

          <div className={styles.questionList}>
            {groupedQuestions.map(group => {
              const isCollapsed = collapsedGroups.has(group.type)
              const groupPoints = group.questions.reduce((s, q) => s + (q.points || 0), 0)

              return (
                <div key={group.type} className={styles.questionGroup}>
                  <div
                    className={styles.groupHeader}
                    onClick={() => toggleGroup(group.type)}
                  >
                    <div className={styles.groupHeaderLeft}>
                      {isCollapsed ? (
                        <ChevronRight size={16} strokeWidth={2} />
                      ) : (
                        <ChevronDown size={16} strokeWidth={2} />
                      )}
                      <span className={styles.groupTitle}>
                        {QUESTION_TYPE_LABELS[group.type]}
                      </span>
                    </div>
                    <span className={styles.groupMeta}>
                      {group.questions.length} 题 · {groupPoints} 分
                    </span>
                  </div>

                  {!isCollapsed && (
                    <div className={styles.groupBody}>
                      {group.questions.map(q => {
                        const isExpanded = expandedIds.has(q.id)
                        return (
                          <div key={q.id} className={styles.questionCard}>
                            <div className={styles.questionCardHeader}>
                              <div
                                className={styles.questionCardLeft}
                                onClick={() => toggleExpand(q.id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown size={15} strokeWidth={2} />
                                ) : (
                                  <ChevronRight size={15} strokeWidth={2} />
                                )}
                                <span className={styles.questionIndex}>{q._num}</span>
                                <span className={styles.questionTypeBadge}>
                                  {QUESTION_TYPE_LABELS[q.type]}
                                </span>
                                <span className={styles.questionDifficulty}>
                                  {DIFFICULTY_LABELS[q.difficulty]}
                                </span>
                                <span className={styles.questionPoints}>{q.points}分</span>
                              </div>
                              <button
                                className={styles.deleteBtn}
                                onClick={() => handleDelete(q.id)}
                              >
                                <Trash2 size={15} strokeWidth={2} />
                              </button>
                            </div>

                            {/* 题目内容 - 完整显示，支持公式渲染 */}
                            <div
                              className={styles.questionContent}
                              onClick={() => !isExpanded && toggleExpand(q.id)}
                              dangerouslySetInnerHTML={{
                                __html: renderInlineMarkdown(q.question)
                              }}
                            />

                            {/* 展开后的详情 */}
                            {isExpanded && (
                              <div className={styles.questionDetail}>
                                {/* 只有选择题才显示选项 */}
                                {(q.type === 'choice' || q.type === 'multi') &&
                                  q.options && q.options.length > 0 && (
                                  <div className={styles.detailSection}>
                                    <span className={styles.detailLabel}>选项：</span>
                                    <div className={styles.optionsList}>
                                      {q.options.map((opt, i) => {
                                        const isCorrect =
                                          (q.type === 'choice' && q.correctIndex === i) ||
                                          (q.type === 'multi' && q.correctIndices?.includes(i))
                                        return (
                                          <div
                                            key={i}
                                            className={`${styles.optionItem} ${
                                              isCorrect ? styles.optionItemCorrect : ''
                                            }`}
                                          >
                                            <span className={styles.optionLabel}>
                                              {String.fromCharCode(65 + i)}.
                                            </span>
                                            <span
                                              dangerouslySetInnerHTML={{
                                                __html: renderInlineMarkdown(cleanOptionText(opt))
                                              }}
                                            />
                                            {isCorrect && (
                                              <span className={styles.correctTag}>正确</span>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {q.answer && (
                                  <div className={styles.detailSection}>
                                    <span className={styles.detailLabel}>答案：</span>
                                    <span
                                      className={styles.detailValue}
                                      dangerouslySetInnerHTML={{
                                        __html: renderInlineMarkdown(q.answer)
                                      }}
                                    />
                                  </div>
                                )}

                                {q.steps && q.steps.length > 0 && (
                                  <div className={styles.detailSection}>
                                    <span className={styles.detailLabel}>解题步骤：</span>
                                    <div className={styles.stepsList}>
                                      {q.steps.map((step, i) => (
                                        <div key={i} className={styles.stepItem}>
                                          <span className={styles.stepNum}>{i + 1}.</span>
                                          <span
                                            dangerouslySetInnerHTML={{
                                              __html: renderInlineMarkdown(step)
                                            }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {q.acceptableAnswers && q.acceptableAnswers.length > 0 && (
                                  <div className={styles.detailSection}>
                                    <span className={styles.detailLabel}>可接受答案：</span>
                                    <span
                                      className={styles.detailValue}
                                      dangerouslySetInnerHTML={{
                                        __html: renderInlineMarkdown(q.acceptableAnswers.join('、'))
                                      }}
                                    />
                                  </div>
                                )}

                                {q.explanation && (
                                  <div className={styles.detailSection}>
                                    <span className={styles.detailLabel}>解析：</span>
                                    <span
                                      className={styles.detailValue}
                                      dangerouslySetInnerHTML={{
                                        __html: renderInlineMarkdown(q.explanation)
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 试卷组装与导出 */}
      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>组装试卷并导出</h2>
          <p className={styles.cardDesc}>
            设置试卷标题、考试时长和出题语言，导出为 PDF 打印
            {paperLanguage !== 'zh' && '（非中文将自动翻译全部内容后导出）'}
          </p>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>试卷标题</label>
          <input
            type="text"
            className={styles.textInput}
            placeholder={`${courseName || '课程'}期末考试试卷`}
            value={paperTitle}
            onChange={e => setPaperTitle(e.target.value)}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>考试时长（分钟）</label>
            <input
              type="number"
              className={styles.textInput}
              min={10}
              max={300}
              value={paperDuration}
              onChange={e => setPaperDuration(Number(e.target.value) || 120)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              <Globe size={13} strokeWidth={2} style={{ display: 'inline', marginRight: 4 }} />
              出题语言
            </label>
            <select
              className={styles.textInput}
              value={paperLanguage}
              onChange={e => setPaperLanguage(e.target.value as PaperLanguage)}
            >
              {(Object.keys(PAPER_LANG_LABELS) as PaperLanguage[]).map(lang => (
                <option key={lang} value={lang}>
                  {PAPER_LANG_LABELS[lang]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.exportSummary}>
          <div className={styles.summaryItem}>
            <span>{questions.length} 道题目</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryDot} />
            <span>{totalPoints} 分</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryDot} />
            <span>{paperDuration} 分钟</span>
          </div>
          <div className={styles.summaryItem}>
            <Globe size={14} strokeWidth={2} />
            <span>{PAPER_LANG_LABELS[paperLanguage]}</span>
          </div>
        </div>

        <button
          className={styles.exportBtn}
          onClick={handleExportPDF}
          disabled={questions.length === 0 || translating}
        >
          {translating ? (
            <>
              <Loader2 size={18} strokeWidth={2} className={styles.spinIcon} />
              正在翻译并导出...
            </>
          ) : (
            <>
              <Download size={18} strokeWidth={2} />
              导出为 PDF
            </>
          )}
        </button>
      </section>
    </div>
  )
}
