import type { ExamPoint, LessonContent, QuizQuestion, ExamQuestion } from '@types/index'
import { useSettingsStore } from '@stores/settingsStore'

const API_URL = 'https://api.deepseek.com/chat/completions'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 调用 DeepSeek API（非流式），带重试和超时
 */
async function callDeepSeek(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; retries?: number }
): Promise<string> {
  const { apiKey, model } = useSettingsStore.getState()
  if (!apiKey) throw new Error('未设置 API Key，请在设置中配置')

  const maxRetries = options?.retries ?? 3
  const timeoutMs = 90000 // 90 秒超时

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`DeepSeek API 错误: ${response.status} - ${error}`)
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (err: any) {
      clearTimeout(timeoutId)

      if (err.name === 'AbortError') {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt))
          continue
        }
        throw new Error('请求超时，请检查网络连接后重试')
      }

      if (err.message?.includes('Failed to fetch')) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1500 * attempt))
          continue
        }
        throw new Error('网络连接失败，请检查网络后重试')
      }

      throw err
    }
  }

  throw new Error('请求失败，已重试 ' + maxRetries + ' 次')
}

/**
 * 流式调用 DeepSeek API
 */
export async function* callDeepSeekStream(
  messages: ChatMessage[],
  options?: { temperature?: number }
): AsyncGenerator<string> {
  const { apiKey, model } = useSettingsStore.getState()
  if (!apiKey) throw new Error('未设置 API Key，请在设置中配置')

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      stream: true,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API 错误: ${response.status} - ${error}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices[0]?.delta?.content
          if (content) yield content
        } catch {
          // 忽略解析错误
        }
      }
    }
  }
}

/**
 * 将文本按段落边界分块
 */
function chunkText(text: string, chunkSize: number = 8000): string[] {
  if (text.length <= chunkSize) return [text]

  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length)
    // 在段落边界切分
    if (end < text.length) {
      const lastParagraph = text.lastIndexOf('\n\n', end)
      const lastNewline = text.lastIndexOf('\n', end)
      const lastPeriod = text.lastIndexOf('。', end)
      if (lastParagraph > start + chunkSize * 0.5) {
        end = lastParagraph
      } else if (lastNewline > start + chunkSize * 0.5) {
        end = lastNewline
      } else if (lastPeriod > start + chunkSize * 0.5) {
        end = lastPeriod + 1
      }
    }
    chunks.push(text.slice(start, end))
    start = end
  }
  return chunks
}

/**
 * 标题相似度检查（>60% 相同字符视为重复）
 */
function isTitleDuplicate(title1: string, title2: string): boolean {
  const t1 = title1.replace(/[（）()【】\[\]""''""''：:，,。.!！？?]/g, '').trim()
  const t2 = title2.replace(/[（）()【】\[\]""''""''：:，,。.!！？?]/g, '').trim()
  if (t1 === t2) return true
  // 检查一个是否包含另一个
  if (t1.length > 3 && t2.length > 3 && (t1.includes(t2) || t2.includes(t1))) return true
  // 计算字符重叠率
  const set1 = new Set(t1.split(''))
  const set2 = new Set(t2.split(''))
  let common = 0
  for (const c of set1) if (set2.has(c)) common++
  const overlapRate = common / Math.min(set1.size, set2.size)
  return overlapRate > 0.7
}

/**
 * 从课件文本中提炼考点
 * 支持大文本分块提取、去重与合并
 * @param sourceFile 来源文件名，用于标注考点来源
 */
export async function extractExamPoints(
  courseText: string,
  courseName: string,
  sourceFile?: string
): Promise<ExamPoint[]> {
  const chunks = chunkText(courseText, 8000)

  // 如果只有一块，直接提取
  if (chunks.length === 1) {
    return extractFromSingleChunk(chunks[0], courseName, sourceFile, '3-20 个')
  }

  // 多块：逐块提取
  const allPoints: any[] = []
  for (let i = 0; i < chunks.length; i++) {
    const points = await extractFromSingleChunk(
      chunks[i],
      courseName,
      sourceFile,
      '3-8 个',
      `（第 ${i + 1}/${chunks.length} 部分）`
    )
    allPoints.push(...points)
  }

  // 去重
  const deduped: any[] = []
  for (const p of allPoints) {
    const isDup = deduped.some(existing => isTitleDuplicate(existing.title, p.title))
    if (!isDup) deduped.push(p)
  }

  // 如果去重后超过 30 个考点，请求 AI 合并
  if (deduped.length > 30) {
    return await consolidatePoints(deduped, courseName, sourceFile)
  }

  // 分配 ID
  return deduped.map((p, index) => ({
    id: `point-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    title: p.title,
    priority: p.priority,
    description: p.description,
    keyFormulas: p.keyFormulas || [],
    pageRefs: p.pageRefs || [],
    sourceFile: sourceFile,
  }))
}

/**
 * 从单个文本块提取考点
 */
async function extractFromSingleChunk(
  text: string,
  courseName: string,
  sourceFile: string | undefined,
  pointRange: string,
  chunkLabel?: string
): Promise<ExamPoint[]> {
  const systemPrompt = `你是一位经验丰富的大学考试辅导专家。你的任务是分析课件内容，提炼出考试考点。

请按以下 JSON 格式返回考点列表，不要包含任何其他文字：
[
  {
    "title": "考点名称（简洁，10字以内）",
    "priority": "must" | "high" | "know",
    "description": "考点详细描述（50-100字）",
    "keyFormulas": ["关键公式或概念（可选）"],
    "pageRefs": ["相关章节或页码引用（可选）"]
  }
]

优先级说明：
- must: 必考，核心重点，几乎每年都考
- high: 高频，经常出现，需要掌握
- know: 了解，可能考但不是重点

考点数量控制在 ${pointRange} 之间。按重要性排序。${chunkLabel ? `\n这是课件的${chunkLabel}，请专注于这部分内容中的考点。` : ''}`

  const userPrompt = `课程名称：${courseName}\n${sourceFile ? `来源文件：${sourceFile}\n` : ''}\n课件内容：\n${text}`

  const result = await callDeepSeek(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 4096 }
  )

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/)
    const json = jsonMatch ? jsonMatch[0] : result
    return JSON.parse(json)
  } catch {
    return []
  }
}

/**
 * 将过多的考点合并整理为 15-25 个核心考点
 */
async function consolidatePoints(
  points: any[],
  courseName: string,
  sourceFile?: string
): Promise<ExamPoint[]> {
  const pointsSummary = points.map((p, i) =>
    `${i + 1}. [${p.priority}] ${p.title}: ${p.description}`
  ).join('\n')

  const systemPrompt = `你是一位经验丰富的大学考试辅导专家。以下是从课件中提取的多个考点，请将它们合并整理为 15-25 个核心考点。

合并规则：
- 相似考点合并为一个
- 保留所有重要考点
- 重新评估优先级

返回 JSON 格式：
[
  {
    "title": "考点名称（简洁，10字以内）",
    "priority": "must" | "high" | "know",
    "description": "考点详细描述（50-100字）",
    "keyFormulas": ["关键公式或概念（可选）"],
    "pageRefs": ["相关章节或页码引用（可选）"]
  }
]`

  const result = await callDeepSeek(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `课程名称：${courseName}\n\n待合并考点：\n${pointsSummary}` },
    ],
    { temperature: 0.3, maxTokens: 4096 }
  )

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/)
    const json = jsonMatch ? jsonMatch[0] : result
    const consolidated = JSON.parse(json)
    return consolidated.map((p: any, index: number) => ({
      id: `point-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      title: p.title,
      priority: p.priority,
      description: p.description,
      keyFormulas: p.keyFormulas || [],
      pageRefs: p.pageRefs || [],
      sourceFile: sourceFile,
    }))
  } catch {
    // 合并失败，返回前 25 个
    return points.slice(0, 25).map((p, index) => ({
      id: `point-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      title: p.title,
      priority: p.priority,
      description: p.description,
      keyFormulas: p.keyFormulas || [],
      pageRefs: p.pageRefs || [],
      sourceFile: sourceFile,
    }))
  }
}

/**
 * 根据考点优先级决定小测题目数量
 * - must（必考）：4-5 题，核心重点需要充分练习
 * - high（高频）：3 题，需要巩固
 * - know（了解）：2 题，基础检验即可
 */
function getQuizCount(priority: string): { min: number; max: number } {
  switch (priority) {
    case 'must':
      return { min: 4, max: 5 }
    case 'high':
      return { min: 3, max: 3 }
    case 'know':
      return { min: 2, max: 2 }
    default:
      return { min: 2, max: 3 }
  }
}

/**
 * 为单个考点生成关卡内容
 */
export async function generateLessonContent(
  examPoint: ExamPoint,
  courseText: string
): Promise<LessonContent> {
  const quizCount = getQuizCount(examPoint.priority)
  const exampleCount = examPoint.priority === 'must' ? '2-3' : examPoint.priority === 'high' ? '1-2' : '1'

  const systemPrompt = `你是一位大学考试辅导老师，正在为学生准备冲刺复习内容。

请为给定考点生成一个 5-10 分钟的闯关学习内容，包含：
1. 核心知识点（3-5 个要点）
2. 详细解释（通俗易懂，200-400字）
3. 例题（${exampleCount} 道，含详细步骤）
4. 小测题（${quizCount.min}-${quizCount.max} 道，含解析）

重要格式要求：
- 数学公式必须使用 LaTeX 语法，行内公式用 $...$ 包裹，块级公式用 $$...$$ 包裹
- 例如：$E=mc^2$、$\\\\frac{a}{b}$、$$\\\\int_0^1 x^2 dx$$

小测题要求：
- 题目难度递进，从基础到进阶
- 题目类型混合：单选题（type="choice"，4个选项，correctIndex为正确选项索引）、多选题（type="multi"，4-6个选项，correctIndices为正确选项索引数组）、填空题（type="fill"）、简答题（type="short"）
- 多选题至少有2个正确选项
- 选择题的干扰项要有迷惑性但明确错误
- 选择题的options数组只写选项内容本身，不要包含A. B. C. D.等前缀
- 填空题提供 answer（标准答案）和 acceptableAnswers（可接受的其他答案数组）
- 简答题提供 answer（参考答案）和 acceptableAnswers（关键词数组，只要答案包含这些关键词即可算正确）
- 每题解析要说明为什么对、为什么错

返回 JSON 格式：
{
  "keyPoints": ["知识点1", "知识点2", ...],
  "explanation": "详细解释...",
  "examples": [
    {
      "question": "题目",
      "answer": "答案",
      "steps": ["步骤1", "步骤2", ...]
    }
  ],
  "quiz": [
    {
      "type": "choice",
      "question": "单选题",
      "options": ["选项内容A", "选项内容B", "选项内容C", "选项内容D"],
      "correctIndex": 0,
      "explanation": "解析"
    },
    {
      "type": "multi",
      "question": "多选题",
      "options": ["选项内容A", "选项内容B", "选项内容C", "选项内容D"],
      "correctIndices": [0, 2],
      "explanation": "解析"
    },
    {
      "type": "fill",
      "question": "填空题：____是...",
      "answer": "标准答案",
      "acceptableAnswers": ["其他可接受答案1", "其他可接受答案2"],
      "explanation": "解析"
    },
    {
      "type": "short",
      "question": "简答题：请简述...",
      "answer": "参考答案",
      "acceptableAnswers": ["关键词1", "关键词2"],
      "explanation": "解析"
    }
  ]
}`

  const userPrompt = `考点：${examPoint.title}
优先级：${examPoint.priority}
描述：${examPoint.description}

课件相关内容：
${courseText.slice(0, 6000)}`

  const result = await callDeepSeek(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.5, maxTokens: 6144 }
  )

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    const json = jsonMatch ? jsonMatch[0] : result
    const parsed = JSON.parse(json)
    // 为每道小测题生成唯一 ID，确保答题状态独立
    if (parsed.quiz && Array.isArray(parsed.quiz)) {
      parsed.quiz = parsed.quiz.map((q: any, i: number) => ({
        ...q,
        type: q.type || 'choice', // 默认为选择题（兼容旧数据）
        id: `quiz-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        examPointTitle: examPoint.title,
      }))
    }
    return parsed
  } catch {
    throw new Error('关卡内容生成失败，请重试')
  }
}

/**
 * AI 评阅填空/简答题
 * @param question 题目
 * @param userAnswer 用户答案
 * @param correctAnswer 标准答案
 * @param acceptableAnswers 可接受的关键词/答案
 * @returns { correct: boolean, feedback: string }
 */
export async function gradeAnswer(
  question: string,
  userAnswer: string,
  correctAnswer: string,
  acceptableAnswers: string[] = []
): Promise<{ correct: boolean; feedback: string }> {
  // 先做本地快速判断：完全匹配或包含关键词
  const normalizedUser = userAnswer.trim().toLowerCase()
  const normalizedCorrect = correctAnswer.trim().toLowerCase()

  if (normalizedUser === normalizedCorrect) {
    return { correct: true, feedback: '回答完全正确！' }
  }

  // 检查是否包含所有关键词
  if (acceptableAnswers.length > 0) {
    const allKeywordsPresent = acceptableAnswers.every(
      kw => normalizedUser.includes(kw.trim().toLowerCase())
    )
    if (allKeywordsPresent) {
      return { correct: true, feedback: '回答正确，包含了所有关键点！' }
    }
    // 检查是否包含部分关键词（至少50%）
    const matchedCount = acceptableAnswers.filter(
      kw => normalizedUser.includes(kw.trim().toLowerCase())
    ).length
    if (matchedCount >= Math.ceil(acceptableAnswers.length * 0.5)) {
      return {
        correct: false,
        feedback: `部分正确（命中 ${matchedCount}/${acceptableAnswers.length} 个关键点），但还不够完整。参考答案：${correctAnswer}`,
      }
    }
  }

  // 本地无法确定时，调用 AI 评阅
  try {
    const systemPrompt = `你是一位严格的阅卷老师。请判断学生的答案是否正确。

题目：${question}
标准答案：${correctAnswer}
可接受的关键词：${acceptableAnswers.join('、')}
学生答案：${userAnswer}

请返回 JSON 格式：
{
  "correct": true/false,
  "feedback": "评语（简短，说明对错原因）"
}

判断标准：
- 答案意思正确即可，不要求字面完全一致
- 关键概念/公式必须正确
- 计算结果必须正确
- 如果答案有明显错误，correct 为 false`

    const result = await callDeepSeek(
      [{ role: 'system', content: systemPrompt }],
      { temperature: 0.1, maxTokens: 512 }
    )

    const jsonMatch = result.match(/\{[\s\S]*\}/)
    const json = jsonMatch ? jsonMatch[0] : result
    const parsed = JSON.parse(json)
    return {
      correct: !!parsed.correct,
      feedback: parsed.feedback || (parsed.correct ? '回答正确！' : '回答不正确'),
    }
  } catch {
    // AI 评阅失败时，保守判断为错误
    return {
      correct: false,
      feedback: `无法自动评阅，参考答案：${correctAnswer}`,
    }
  }
}

/**
 * 重新生成一道考察相同知识点的小测题
 */
export async function regenerateQuizQuestion(
  examPointTitle: string,
  previousQuestion: string,
  courseText: string
): Promise<QuizQuestion> {
  const systemPrompt = `你是一位大学考试辅导老师。请生成一道新的小测题，考察与以下题目相同的知识点。

之前的题目：${previousQuestion}
考点：${examPointTitle}

要求：
- 新题目必须考察相同的知识点，但题目内容和表述不同
- 数学公式使用 LaTeX 语法（$...$ 或 $$...$$）
- 选择题的options数组只写选项内容本身，不要包含A. B. C. D.等前缀
- 返回 JSON 格式，包含 type、question、options/correctIndex（选择题）或 answer/acceptableAnswers（填空/简答题）、explanation

返回 JSON：
{
  "type": "choice",
  "question": "新题目",
  "options": ["选项内容A", "选项内容B", "选项内容C", "选项内容D"],
  "correctIndex": 0,
  "explanation": "解析"
}`

  const result = await callDeepSeek(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `课件相关内容：\n${courseText.slice(0, 3000)}` },
    ],
    { temperature: 0.7, maxTokens: 2048 }
  )

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    const json = jsonMatch ? jsonMatch[0] : result
    const parsed = JSON.parse(json)
    return {
      ...parsed,
      type: parsed.type || 'choice',
      id: `quiz-regen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      examPointTitle,
    }
  } catch {
    throw new Error('题目重新生成失败，请重试')
  }
}

/**
 * Athena 智能学伴对话
 * 具备技能（ability）感知与记忆（charter/flow）感知能力
 */
export async function* chatWithAthena(
  userMessage: string,
  courseContext: string,
  history: ChatMessage[],
  abilities?: { name: string; description: string }[],
  charterMemories?: string[],
  flowMemories?: string[],
): AsyncGenerator<string> {
  const abilitiesText = abilities && abilities.length > 0
    ? `\n\n你已掌握的技能：\n${abilities.map(a => `- ${a.name}: ${a.description}`).join('\n')}`
    : ''

  const charterText = charterMemories && charterMemories.length > 0
    ? `\n\n【宪章记忆 - 必须遵守】\n${charterMemories.join('\n')}`
    : ''

  const flowText = flowMemories && flowMemories.length > 0
    ? `\n\n【流动记忆 - 参考信息】\n${flowMemories.join('\n')}`
    : ''

  const systemPrompt = `你是 Athena，ChillPass 应用的智能学习助手。你的名字来源于希腊神话中的智慧女神雅典娜。你不仅是一个答疑工具，更是一个有温度、有思想的学伴。

你的特点：
1. 回答简洁明了，用大白话解释复杂概念
2. 结合学生的课件内容回答问题
3. 如果学生问"这个会考吗"，根据课件内容分析重要性
4. 鼓励学生，保持积极正面的态度
5. 适当使用 Markdown 格式（加粗、列表）让回答更清晰
6. 数学公式使用 LaTeX 语法（$...$ 或 $$...$$）
${charterText}${flowText}${abilitiesText}

${courseContext ? `学生当前课件内容摘要：\n${courseContext.slice(0, 3000)}` : ''}`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10), // 保留最近 10 条历史
    { role: 'user', content: userMessage },
  ]

  yield* callDeepSeekStream(messages, { temperature: 0.7 })
}

/**
 * Athena 对话后自动总结 ability 和记忆
 * 返回新发现的技能和记忆
 */
export async function summarizeAthenaInsights(
  userMessage: string,
  athenaReply: string,
  existingAbilities: string[],
): Promise<{ newAbilities: { name: string; description: string }[]; newMemories: string[] }> {
  const systemPrompt = `你是一个分析器。分析以下 Athena（AI助手）与用户的对话，提取：
1. 新发现的技能（ability）：Athena 在对话中展现出的能力，例如"论文写作"、"知识点总结"、"解题指导"等。排除已存在的技能。
2. 需要记住的信息（memory）：用户的偏好、学习习惯、重要事实等。

已存在的技能（不要重复）：${existingAbilities.join('、')}

返回 JSON 格式：
{
  "newAbilities": [
    { "name": "技能名（简洁，2-6字）", "description": "技能描述（一句话）" }
  ],
  "newMemories": [
    "需要记住的信息1",
    "需要记住的信息2"
  ]
}

如果没有新发现，返回空数组。`

  try {
    const result = await callDeepSeek(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `用户消息：${userMessage}\n\nAthena回复：${athenaReply}` },
      ],
      { temperature: 0.3, maxTokens: 1024 }
    )

    const jsonMatch = result.match(/\{[\s\S]*\}/)
    const json = jsonMatch ? jsonMatch[0] : result
    const parsed = JSON.parse(json)
    return {
      newAbilities: parsed.newAbilities || [],
      newMemories: parsed.newMemories || [],
    }
  } catch {
    return { newAbilities: [], newMemories: [] }
  }
}

/**
 * 执行 Athena 任务（论文代写、报告代写等）
 */
export async function* executeTask(
  taskType: 'paper' | 'report' | 'summary' | 'plan',
  taskInput: string,
  courseContext: string,
  history: ChatMessage[],
  charterMemories?: string[],
): AsyncGenerator<string> {
  const taskConfig = {
    paper: {
      title: '论文代写',
      prompt: '你正在帮助用户撰写一篇学术论文。请根据用户的要求，结合课件知识，撰写结构完整、论证严密的学术论文。包含：标题、摘要、关键词、引言、正文（分章节）、结论、参考文献。使用学术语言，适当引用课件中的知识点。',
    },
    report: {
      title: '报告代写',
      prompt: '你正在帮助用户撰写一份报告。请根据用户的要求，结合课件知识，撰写格式规范、内容详实的报告。包含：标题、背景/目的、正文（分章节分析）、结论与建议。语言正式但不晦涩。',
    },
    summary: {
      title: '知识总结',
      prompt: '你正在帮助用户总结知识点。请根据用户的要求，系统性地梳理课件中的核心概念、公式、定理，形成结构化的知识网络。使用表格、列表等格式让总结更清晰。',
    },
    plan: {
      title: '复习计划',
      prompt: '你正在帮助用户制定复习计划。请根据用户的考试日期和课件内容，制定详细的、可执行的复习计划。按天分配任务，标注重点和难点。',
    },
  }

  const config = taskConfig[taskType]
  const charterText = charterMemories && charterMemories.length > 0
    ? `\n\n【宪章记忆 - 必须遵守】\n${charterMemories.join('\n')}`
    : ''

  const systemPrompt = `你是 Athena，现在执行「${config.title}」任务。

${config.prompt}
${charterText}

${courseContext ? `课件参考内容：\n${courseContext.slice(0, 4000)}` : ''}`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-5), // 任务场景保留最近 5 条历史
    { role: 'user', content: taskInput },
  ]

  // 与 chatWithAthena 相同的流式实现
  yield* callDeepSeekStream(messages, { temperature: 0.7 })
}

/**
 * AI 助教对话（向后兼容包装，内部委托给 chatWithAthena）
 */
export async function* chatWithTutor(
  userMessage: string,
  courseContext: string,
  history: ChatMessage[]
): AsyncGenerator<string> {
  yield* chatWithAthena(userMessage, courseContext, history)
}

/**
 * 生成试题（教师工作台）— 智能组卷模式
 *
 * AI 像老练的出卷老师一样：
 * 1. 分析课件内容，识别考点
 * 2. 判别每个考点适合什么题型
 * 3. 同类题目覆盖不同考点
 * 4. 选择题中混合概念题和计算题
 * 5. 考虑已有题目，避免重复
 */
export async function generateExamQuestions(
  courseText: string,
  courseName: string,
  questionType: 'choice' | 'multi' | 'fill' | 'short' | 'essay' | 'calculation',
  count: number,
  difficulty: 'easy' | 'medium' | 'hard',
  existingQuestions: ExamQuestion[] = [],
): Promise<ExamQuestion[]> {
  const typeNames = {
    choice: '单选题',
    multi: '多选题',
    fill: '填空题',
    short: '简答题',
    essay: '论述题',
    calculation: '计算题',
  }
  const difficultyText = { easy: '简单', medium: '中等', hard: '困难' }

  const pointsMap: Record<string, number> = {
    essay: 20,
    short: 10,
    calculation: 15,
    choice: 5,
    multi: 5,
    fill: 5,
  }

  const maxTokens = Math.min(8192, 1024 * count + 3072)

  // 构建已有题目的摘要（供 AI 参考，避免重复）
  const existingSummary = existingQuestions.length > 0
    ? existingQuestions.map((q, i) => `${i + 1}. [${typeNames[q.type] || q.type}] ${q.question.slice(0, 80)}`).join('\n')
    : '（暂无已有题目）'

  const typeSpecificRules: Record<string, string> = {
    choice: `- 单选题：4个选项，1个正确答案
- 选项内容不要包含A. B. C. D.等前缀，只写选项内容本身
- 选择题不要全是概念考察，至少有30%的题目需要通过计算或推导才能得出答案
- 计算型选择题：给出具体数据或公式，要求计算结果，选项为不同的数值或表达式`,
    multi: `- 多选题：4-6个选项，至少2个正确答案
- 选项内容不要包含A. B. C. D.等前缀，只写选项内容本身
- 多选题应考察综合理解，选项之间要有逻辑关联`,
    fill: `- 填空题：提供标准答案和可接受答案
- 不要提供options字段
- 填空题可以考察公式、术语、数值等`,
    short: `- 简答题：提供参考答案和关键词
- 不要提供options字段
- 简答题要求答案精炼，3-5个要点`,
    essay: `- 论述题：提供参考答案要点和关键词
- 不要提供options字段
- 论述题要求结构化作答，有论点论据`,
    calculation: `- 计算题：提供完整解题步骤（steps数组，每步一个字符串）、最终答案和解析
- 计算题不要提供options字段
- 计算题需要有明确的已知条件和求解目标`,
  }

  const systemPrompt = `你是一位经验丰富的大学教师，正在为${courseName}课程出考试题。

你的任务：生成 ${count} 道${typeNames[questionType]}，难度为${difficultyText[difficulty]}。

## 出题原则（像老练的出卷老师一样思考）

1. **考点分析**：先仔细阅读课件内容，识别出最重要的考点
2. **题型匹配**：判别每个考点适合什么类型的题目
   - 概念性强的考点 → 选择题、填空题
   - 需要推导计算的考点 → 计算题、计算型选择题
   - 需要综合理解的考点 → 多选题、简答题
   - 需要论述分析的考点 → 论述题、简答题
3. **考点覆盖**：同一类型的题目尽量覆盖不同的考点，不要在同一个考点上出多道题
4. **难度梯度**：即使是同一难度等级，也要有梯度变化，从基础到进阶
5. **避免重复**：参考已有题目，不要出相同或高度相似的题目
6. **计算与概念混合**：选择题中不要全是概念题，至少30%需要通过计算或推导才能得出答案

## 已有题目（避免重复）
${existingSummary}

## 格式要求
- 题目必须基于课件内容，不能编造
- 数学公式使用 LaTeX 语法（$...$ 或 $$...$$）
${typeSpecificRules[questionType]}

## 返回 JSON 数组：
[
  {
    "type": "${questionType}",
    "question": "题目内容",
    "options": ["选项内容1", "选项内容2", "选项内容3", "选项内容4"],
    "correctIndex": 0,
    "answer": "标准答案",
    "steps": ["步骤1：...", "步骤2：..."],
    "acceptableAnswers": ["关键词1"],
    "explanation": "解析",
    "difficulty": "${difficulty}",
    "points": ${pointsMap[questionType] || 5},
    "examPoint": "考察的考点名称"
  }
]

注意：只有单选题和多选题才需要options、correctIndex或correctIndices字段，其他题型不要包含这些字段。`

  const result = await callDeepSeek(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `课程名称：${courseName}\n\n课件内容：\n${courseText.slice(0, 6000)}` },
    ],
    { temperature: 0.6, maxTokens, retries: 3 }
  )

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/)
    const json = jsonMatch ? jsonMatch[0] : result
    const parsed = JSON.parse(json)
    return parsed.map((q: any, i: number) => {
      const cleaned: any = {
        id: `exam-q-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        type: q.type || questionType,
        question: q.question || '',
        explanation: q.explanation || '',
        difficulty: q.difficulty || difficulty,
        points: q.points || pointsMap[questionType] || 5,
      }

      // 只有选择题才保留 options
      if (cleaned.type === 'choice' || cleaned.type === 'multi') {
        if (q.options && Array.isArray(q.options)) {
          cleaned.options = q.options.map((opt: string) =>
            typeof opt === 'string' ? opt.replace(/^[A-Z][.、．)]\s*/i, '').trim() : String(opt)
          )
        }
        if (cleaned.type === 'choice' && q.correctIndex !== undefined) {
          cleaned.correctIndex = q.correctIndex
        }
        if (cleaned.type === 'multi' && q.correctIndices) {
          cleaned.correctIndices = q.correctIndices
        }
      }

      // 填空/简答/论述/计算题保留答案
      if (q.answer) cleaned.answer = q.answer
      if (q.acceptableAnswers) cleaned.acceptableAnswers = q.acceptableAnswers
      if (q.steps) cleaned.steps = q.steps

      return cleaned as ExamQuestion
    })
  } catch {
    return []
  }
}

/**
 * 翻译试题内容到目标语言（用于导出试卷）
 */
export async function translateExamQuestions(
  questions: ExamQuestion[],
  targetLanguage: string,
): Promise<ExamQuestion[]> {
  if (!questions || questions.length === 0) return questions

  const langNames: Record<string, string> = {
    en: '英文',
    ja: '日文',
    ko: '韩文',
    ru: '俄文',
  }

  const targetLang = langNames[targetLanguage]
  if (!targetLang) return questions

  // 将题目内容序列化为紧凑 JSON
  const compactQuestions = questions.map((q, i) => ({
    id: q.id,
    type: q.type,
    question: q.question,
    options: q.options,
    answer: q.answer,
    steps: q.steps,
    acceptableAnswers: q.acceptableAnswers,
    explanation: q.explanation,
  }))

  const systemPrompt = `你是一位专业翻译。请将以下试题内容翻译为${targetLang}。
要求：
- 保持原有 JSON 结构不变
- 只翻译文本内容，不改变字段名
- 数学公式保持 LaTeX 原样不翻译
- 翻译要准确、专业，符合学术用语习惯
- 返回纯 JSON 数组，不要包含其他内容

原始试题：
${JSON.stringify(compactQuestions, null, 2)}`

  const result = await callDeepSeek(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请翻译为${targetLang}并返回 JSON 数组` },
    ],
    { temperature: 0.3, maxTokens: 8192, retries: 2 }
  )

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/)
    const json = jsonMatch ? jsonMatch[0] : result
    const translated = JSON.parse(json)

    // 合并翻译结果到原题目，保留非文本字段
    return questions.map((origQ, i) => {
      const trans = translated[i]
      if (!trans) return origQ
      return {
        ...origQ,
        question: trans.question || origQ.question,
        options: trans.options || origQ.options,
        answer: trans.answer || origQ.answer,
        steps: trans.steps || origQ.steps,
        acceptableAnswers: trans.acceptableAnswers || origQ.acceptableAnswers,
        explanation: trans.explanation || origQ.explanation,
      }
    })
  } catch {
    // 翻译失败，返回原题目
    return questions
  }
}
