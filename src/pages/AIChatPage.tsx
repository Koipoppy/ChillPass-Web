import { useState, useRef, useEffect, useCallback } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ChangeEvent as ReactChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, Trash2, Sparkles, ImageIcon, Loader, X, Brain, Zap, Download, Upload, Plus, FileText, BookOpen, Calendar, MessageCircle, Shield, Waves } from 'lucide-react'
import { useChatStore } from '@stores/chatStore'
import { useCurrentBundle } from '@stores/courseStore'
import { useAthenaStore } from '@stores/athenaStore'
import { chatWithAthena, executeTask, summarizeAthenaInsights } from '@services/deepseek'
import { recognizeImageText, fileToDataURL } from '@services/imageService'
import type { ChatMessage, AthenaAbility, AthenaMemory, AthenaTaskType } from '@types/index'
import { renderMarkdown } from '../utils/markdown'
import styles from './AIChatPage.module.css'

// Athena 任务定义
const TASKS = [
  { type: 'qa' as AthenaTaskType, icon: MessageCircle, title: '自由提问', desc: '随时问任何问题', color: '#0078D4' },
  { type: 'paper' as AthenaTaskType, icon: FileText, title: '论文代写', desc: '学术论文结构化撰写', color: '#8B5CF6' },
  { type: 'report' as AthenaTaskType, icon: BookOpen, title: '报告代写', desc: '格式规范的报告撰写', color: '#10B981' },
  { type: 'summary' as AthenaTaskType, icon: Sparkles, title: '知识总结', desc: '系统梳理核心知识点', color: '#F59E0B' },
  { type: 'plan' as AthenaTaskType, icon: Calendar, title: '复习计划', desc: '制定可执行的复习安排', color: '#EF4444' },
]

// Athena 任务信息收集表单定义
const TASK_FORMS: Record<string, { label: string; placeholder: string; required: boolean }[]> = {
  paper: [
    { label: '论文主题', placeholder: '例如：论人工智能对高等教育的影响', required: true },
    { label: '字数要求', placeholder: '例如：3000字', required: true },
    { label: '学术级别', placeholder: '例如：本科 / 硕士 / 课程论文', required: false },
    { label: '特殊要求', placeholder: '例如：需要参考文献、特定格式等', required: false },
  ],
  report: [
    { label: '报告主题', placeholder: '例如：实验报告 / 调研报告', required: true },
    { label: '报告类型', placeholder: '例如：实验报告 / 调研报告 / 读书报告', required: true },
    { label: '字数要求', placeholder: '例如：2000字', required: false },
    { label: '特殊要求', placeholder: '例如：需要数据图表等', required: false },
  ],
  summary: [
    { label: '总结范围', placeholder: '例如：第一章到第三章 / 全部课件', required: true },
    { label: '总结重点', placeholder: '例如：重点公式、核心概念', required: false },
    { label: '输出格式', placeholder: '例如：表格 / 思维导图 / 列表', required: false },
  ],
  plan: [
    { label: '考试日期', placeholder: '例如：2026-07-01', required: true },
    { label: '每日可学习时间', placeholder: '例如：3小时', required: true },
    { label: '薄弱环节', placeholder: '例如：第3-5章比较难', required: false },
    { label: '已掌握内容', placeholder: '例如：第1-2章已复习完', required: false },
  ],
}

/** 单条消息气泡 */
function MessageBubble({
  message,
  isTyping,
}: {
  message: ChatMessage
  isTyping: boolean
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className={`${styles.messageRow} ${styles.messageRowUser} fade-in`}>
        <div className={`${styles.bubble} ${styles.bubbleUser}`}>
          <p className={styles.bubbleText}>{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.messageRow} ${styles.messageRowAssistant} fade-in`}>
      <div className={`${styles.bubble} ${styles.bubbleAssistant} liquid-glass`}>
        {isTyping ? (
          <div className={styles.typingIndicator}>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
          </div>
        ) : (
          <div
            className={styles.markdownContent}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}
      </div>
    </div>
  )
}

/** AI 助教聊天页面 */
export default function AIChatPage() {
  const messages = useChatStore(s => s.messages)
  const isStreaming = useChatStore(s => s.isStreaming)
  const addMessage = useChatStore(s => s.addMessage)
  const updateMessage = useChatStore(s => s.updateMessage)
  const setStreaming = useChatStore(s => s.setStreaming)
  const clearMessages = useChatStore(s => s.clearMessages)

  const bundle = useCurrentBundle()
  const rawText = bundle?.rawText ?? ''
  const currentCourse = bundle?.course

  // Athena store
  const abilities = useAthenaStore(s => s.abilities)
  const memories = useAthenaStore(s => s.memories)
  const addAutoAbility = useAthenaStore(s => s.addAutoAbility)
  const addAutoMemory = useAthenaStore(s => s.addAutoMemory)

  const [input, setInput] = useState('')
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [imageRecognizing, setImageRecognizing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState('')
  const [recognizedText, setRecognizedText] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevLengthRef = useRef(0)

  // 自定义滚动手柄相关状态
  const [showScrollHandle, setShowScrollHandle] = useState(false)
  const [handleOffset, setHandleOffset] = useState(0)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const scrollStart = useRef(0)

  const location = useLocation()

  // Athena 任务与面板状态
  const [activeTask, setActiveTask] = useState<AthenaTaskType>('qa')
  const [showAbilityPanel, setShowAbilityPanel] = useState(false)
  const [showMemoryPanel, setShowMemoryPanel] = useState(false)
  const [athenaStatus, setAthenaStatus] = useState<'idle' | 'thinking' | 'tasking'>('idle')
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskFormFields, setTaskFormFields] = useState<{ label: string; placeholder: string; required: boolean }[]>([])
  const [taskFormValues, setTaskFormValues] = useState<Record<string, string>>({})

  // 从错题本跳转过来时，预填内容并自动聚焦
  useEffect(() => {
    const prefill = (location.state as any)?.prefill
    if (prefill) {
      setInput(prefill)
      textareaRef.current?.focus()
    }
  }, [location.state])

  // 自动滚动到底部：新消息用平滑滚动，流式更新用即时滚动
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const isNewMessage = messages.length > prevLengthRef.current
    prevLengthRef.current = messages.length

    container.scrollTo({
      top: container.scrollHeight,
      behavior: isNewMessage ? 'smooth' : 'auto',
    })
  }, [messages])

  // 输入框自适应高度 + 检测是否溢出
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    // 内容超出可视区域时显示自定义滚动手柄
    setShowScrollHandle(textarea.scrollHeight > textarea.clientHeight)
  }, [input])

  // 选择图片：Electron 环境用文件对话框获取路径，浏览器环境用 input
  const handleImagePick = useCallback(
    async (e?: ReactChangeEvent<HTMLInputElement>) => {
      let imageBuffer: ArrayBuffer | null = null
      let file: File | null = null

      if (e) {
        // 浏览器环境：从 input 获取 File
        file = e.target.files?.[0] ?? null
        e.target.value = ''
        if (!file) return
      } else if (window.electronAPI?.openImageDialog) {
        // Electron 环境：用文件对话框获取路径，再读取为 ArrayBuffer
        const result = await window.electronAPI.openImageDialog()
        if (!result || result.length === 0) return
        const filePath = result[0].path
        if (window.electronAPI?.readFileBuffer) {
          imageBuffer = await window.electronAPI.readFileBuffer(filePath)
        }
      } else {
        return
      }

      try {
        // 先生成预览
        if (file) {
          const dataUrl = await fileToDataURL(file)
          setAttachedImage(dataUrl)
        } else if (imageBuffer) {
          const dataUrl = await fileToDataURL(imageBuffer)
          setAttachedImage(dataUrl)
        }

        setRecognizedText(null)
        setImageRecognizing(true)
        setOcrProgress('正在加载识别引擎...')

        // OCR 识别：在渲染进程中使用 tesseract.js（CDN 加载资源）
        const text = await recognizeImageText(imageBuffer ?? file!, (status, progress) => {
          const statusMap: Record<string, string> = {
            'loading tesseract core': '加载识别核心...',
            'initializing tesseract': '初始化引擎...',
            'loading language traineddata': '加载语言包...',
            'initializing api': '准备识别...',
            'recognizing text': `识别中... ${Math.round(progress * 100)}%`,
          }
          setOcrProgress(statusMap[status] || status)
        })
        setRecognizedText(text)
      } catch (err) {
        console.error('图片识别失败', err)
        setRecognizedText(null)
        alert(err instanceof Error ? err.message : '图片识别失败，请重试')
      } finally {
        setImageRecognizing(false)
      }
    },
    []
  )

  // 移除已附加的图片
  const handleRemoveImage = useCallback(() => {
    setAttachedImage(null)
    setRecognizedText(null)
    setImageRecognizing(false)
  }, [])

  // 发送消息
  const handleSend = useCallback(
    async (text?: string) => {
      const rawContent = (text ?? input).trim()
      if (!rawContent || isStreaming) return

      // 若有图片识别结果，将其拼接到消息前面
      const content = recognizedText
        ? `[图片识别内容]\n${recognizedText}\n\n${rawContent}`
        : rawContent

      setInput('')
      setAttachedImage(null)
      setRecognizedText(null)

      // 构建对话历史（不包含当前消息，chatWithTutor 会自行追加）
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const courseId = currentCourse?.id

      // 添加用户消息
      addMessage('user', content, courseId)

      // 添加空的 AI 消息，准备接收流式内容
      const assistantId = addMessage('assistant', '', courseId)
      setStreaming(true)
      setAthenaStatus(activeTask !== 'qa' ? 'tasking' : 'thinking')

      try {
        let accumulated = ''
        const charterMemories = memories.filter(m => m.type === 'charter').map(m => m.content)
        const flowMemories = memories.filter(m => m.type === 'flow').map(m => m.content)
        const abilityList = abilities.map(a => ({ name: a.name, description: a.description }))

        // For task types other than 'qa', use executeTask
        if (activeTask !== 'qa') {
          for await (const chunk of executeTask(activeTask, content, rawText, history, charterMemories)) {
            accumulated += chunk
            updateMessage(assistantId, accumulated)
          }
        } else {
          for await (const chunk of chatWithAthena(content, rawText, history, abilityList, charterMemories, flowMemories)) {
            accumulated += chunk
            updateMessage(assistantId, accumulated)
          }
        }

        // 没有收到任何内容时给出提示
        if (!accumulated) {
          updateMessage(assistantId, '抱歉，我没有收到回复内容，请重试。')
        } else {
          // After receiving the full reply, auto-summarize insights (non-blocking)
          summarizeAthenaInsights(content, accumulated, abilities.map(a => a.name))
            .then(insights => {
              insights.newAbilities.forEach(a => addAutoAbility(a.name, a.description))
              insights.newMemories.forEach(m => addAutoMemory(m))
            })
            .catch(() => {})
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '发生未知错误'
        updateMessage(assistantId, `出错了：${errorMsg}`)
      } finally {
        setStreaming(false)
        setAthenaStatus('idle')
      }
    },
    [input, isStreaming, messages, rawText, currentCourse, recognizedText, activeTask, memories, abilities, addMessage, updateMessage, setStreaming, addAutoAbility, addAutoMemory]
  )

  // 键盘事件：Enter 发送，Shift+Enter 换行
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 清空对话
  const handleClear = () => {
    if (isStreaming || messages.length === 0) return
    clearMessages()
  }

  // 自定义滚动手柄：拖拽控制 textarea 滚动
  // 逻辑：手柄跟随光标移动，光标往下 → 手柄往下 → 内容往下滚（显示下侧内容）
  const handleScrollStart = (e: ReactPointerEvent) => {
    isDragging.current = true
    dragStartY.current = e.clientY
    scrollStart.current = textareaRef.current?.scrollTop ?? 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleScrollMove = (e: ReactPointerEvent) => {
    if (!isDragging.current || !textareaRef.current) return
    const deltaY = e.clientY - dragStartY.current
    const maxScroll = textareaRef.current.scrollHeight - textareaRef.current.clientHeight
    // 光标往下（deltaY 正）→ 往下滚动（scrollTop 增大）→ 显示下侧内容
    if (maxScroll > 0) {
      textareaRef.current.scrollTop = Math.max(0, Math.min(maxScroll, scrollStart.current + deltaY))
    }
    // 手柄跟随光标移动（限制范围）
    const maxOffset = 30
    setHandleOffset(Math.max(-maxOffset, Math.min(maxOffset, deltaY)))
  }

  const handleScrollEnd = () => {
    isDragging.current = false
    // 弹回中心
    setHandleOffset(0)
  }

  const canSend = input.trim().length > 0 && !isStreaming
  const canClear = messages.length > 0 && !isStreaming
  const canAttachImage = !isStreaming && !imageRecognizing

  return (
    <div className={styles.container}>
      {/* 顶部操作栏 */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Sparkles size={20} strokeWidth={1.8} />
          </div>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Athena</h1>
            <p className={styles.subtitle}>
              {isStreaming
                ? '正在思考...'
                : currentCourse
                  ? `基于「${currentCourse.name}」课件`
                  : '你的智能学伴'}
            </p>
          </div>
        </div>
        <div className={styles.statusIndicator}>
          <span className={`${styles.statusDot} ${styles[`status_${athenaStatus}`]}`} />
          <span className={styles.statusText}>
            {athenaStatus === 'thinking' ? '思考中' : athenaStatus === 'tasking' ? '执行任务中' : '待命'}
          </span>
        </div>
        <div className={styles.headerActions}>
          {messages.length > 0 && activeTask !== 'qa' && (
            <div className={styles.headerTaskBadge}>
              {TASKS.find(t => t.type === activeTask)?.title}
              <button onClick={() => setActiveTask('qa')}>
                <X size={10} strokeWidth={2.5} />
              </button>
            </div>
          )}
          <button className={styles.headerBtn} onClick={() => setShowAbilityPanel(true)} title="技能管理">
            <Zap size={16} strokeWidth={1.8} />
            <span className={styles.headerBtnLabel}>{abilities.length}</span>
          </button>
          <button className={styles.headerBtn} onClick={() => setShowMemoryPanel(true)} title="记忆管理">
            <Brain size={16} strokeWidth={1.8} />
            <span className={styles.headerBtnLabel}>{memories.length}</span>
          </button>
          <button
            className={`${styles.clearBtn} ${!canClear ? styles.clearBtnDisabled : ''}`}
            onClick={handleClear}
            disabled={!canClear}
            title="清空对话"
          >
            <Trash2 size={18} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* 消息区域 */}
      <div className={styles.messagesArea} ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={`${styles.welcomeCard} liquid-glass`}>
              <div className={styles.welcomeIcon}>
                <Sparkles size={32} strokeWidth={1.6} />
              </div>
              <h2 className={styles.welcomeTitle}>Athena</h2>
              <p className={styles.welcomeSubtitle}>
                我是你的智能学伴，选择一个任务开始吧
              </p>
              <div className={styles.taskGrid}>
                {TASKS.map(task => {
                  const Icon = task.icon
                  return (
                    <button
                      key={task.type}
                      className={`${styles.taskCard} ${activeTask === task.type ? styles.taskCardActive : ''}`}
                      onClick={() => {
                        setActiveTask(task.type)
                        if (task.type === 'qa') {
                          textareaRef.current?.focus()
                        } else {
                          setTaskFormFields(TASK_FORMS[task.type] || [])
                          setTaskFormValues({})
                          setShowTaskForm(true)
                        }
                      }}
                    >
                      <div className={styles.taskIcon} style={{ color: task.color }}>
                        <Icon size={20} strokeWidth={1.8} />
                      </div>
                      <div className={styles.taskInfo}>
                        <span className={styles.taskTitle}>{task.title}</span>
                        <span className={styles.taskDesc}>{task.desc}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
              {activeTask !== 'qa' && (
                <div className={styles.activeTaskBadge}>
                  当前任务：{TASKS.find(t => t.type === activeTask)?.title}
                  <button onClick={() => setActiveTask('qa')}>
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {messages.map((msg, index) => {
              const isLast = index === messages.length - 1
              const isTyping =
                isStreaming &&
                msg.role === 'assistant' &&
                msg.content.length === 0 &&
                isLast
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isTyping={isTyping}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className={styles.inputArea}>
        {/* 图片预览 */}
        {attachedImage && (
          <div className={`${styles.imagePreview} liquid-glass`}>
            <div className={styles.imagePreviewInner}>
              <img
                src={attachedImage}
                alt="附加图片"
                className={styles.imageThumb}
              />
              <div className={styles.imagePreviewInfo}>
                {imageRecognizing ? (
                  <div className={styles.imageRecognizing}>
                    <Loader size={14} className={styles.spin} />
                    <span>{ocrProgress || '识别中...'}</span>
                  </div>
                ) : recognizedText ? (
                  <div className={styles.imagePreviewHint}>
                    已识别图片文字
                  </div>
                ) : (
                  <div className={styles.imagePreviewHint}>
                    识别失败，可移除后重试
                  </div>
                )}
              </div>
              <button
                className={styles.removeImageBtn}
                onClick={handleRemoveImage}
                title="移除图片"
              >
                <X size={14} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        )}

        <div className={`${styles.inputWrapper} liquid-glass`}>
          {/* 图片上传按钮 */}
          <button
            className={`${styles.imageBtn} ${!canAttachImage ? styles.imageBtnDisabled : ''}`}
            onClick={() => {
              if (window.electronAPI?.openImageDialog) {
                handleImagePick()
              } else {
                fileInputRef.current?.click()
              }
            }}
            disabled={!canAttachImage}
            title="插入图片"
          >
            <ImageIcon size={18} strokeWidth={1.8} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImagePick}
          />
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? 'Athena 正在思考...'
                : activeTask !== 'qa'
                  ? `${TASKS.find(t => t.type === activeTask)?.title} - 输入内容，Enter 发送`
                  : '输入你的问题，Enter 发送，Shift+Enter 换行'
            }
            disabled={isStreaming}
            rows={1}
          />
          {/* 自定义滚动条手柄：仅当内容溢出时显示 */}
          {showScrollHandle && (
            <div
              className={styles.scrollHandle}
              onPointerDown={handleScrollStart}
              onPointerMove={handleScrollMove}
              onPointerUp={handleScrollEnd}
              onPointerLeave={handleScrollEnd}
              style={{ '--handle-offset': `${handleOffset}px` } as React.CSSProperties}
            >
              <div className={styles.scrollHandleThumb} />
            </div>
          )}
          <button
            className={`${styles.sendBtn} ${!canSend ? styles.sendBtnDisabled : ''}`}
            onClick={() => handleSend()}
            disabled={!canSend}
            title="发送"
          >
            <Send size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Ability Panel */}
      {showAbilityPanel && (
        <div className={styles.modalOverlay} onClick={() => setShowAbilityPanel(false)}>
          <div className={`${styles.modal} liquid-glass`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Zap size={18} strokeWidth={2} />
                <h3>技能管理</h3>
              </div>
              <button className={styles.modalClose} onClick={() => setShowAbilityPanel(false)}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <AbilityPanel />
            </div>
          </div>
        </div>
      )}

      {/* Memory Panel */}
      {showMemoryPanel && (
        <div className={styles.modalOverlay} onClick={() => setShowMemoryPanel(false)}>
          <div className={`${styles.modal} liquid-glass`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Brain size={18} strokeWidth={2} />
                <h3>记忆管理</h3>
              </div>
              <button className={styles.modalClose} onClick={() => setShowMemoryPanel(false)}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <MemoryPanel />
            </div>
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className={styles.modalOverlay} onClick={() => setShowTaskForm(false)}>
          <div className={`${styles.modal} liquid-glass`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                {(() => { const Icon = TASKS.find(t => t.type === activeTask)?.icon || Sparkles; return <Icon size={18} strokeWidth={2} /> })()}
                <h3>{TASKS.find(t => t.type === activeTask)?.title} - 信息收集</h3>
              </div>
              <button className={styles.modalClose} onClick={() => setShowTaskForm(false)}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.taskForm}>
                {taskFormFields.map((field, i) => (
                  <div key={i} className={styles.formField}>
                    <label className={styles.formLabel}>
                      {field.label}
                      {field.required && <span className={styles.requiredMark}>*</span>}
                    </label>
                    <input
                      className={styles.panelInput}
                      placeholder={field.placeholder}
                      value={taskFormValues[field.label] || ''}
                      onChange={e => setTaskFormValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                    />
                  </div>
                ))}
                <button
                  className={styles.panelAddBtn}
                  onClick={() => {
                    // Build the prompt from form values
                    const prompt = taskFormFields
                      .map(f => `${f.label}：${taskFormValues[f.label] || '未指定'}`)
                      .join('\n')
                    setInput(`请根据以下信息执行任务：\n${prompt}`)
                    setShowTaskForm(false)
                    setTimeout(() => textareaRef.current?.focus(), 100)
                  }}
                >
                  <Sparkles size={16} strokeWidth={2} />
                  开始执行
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** 技能管理面板 */
function AbilityPanel() {
  const abilities = useAthenaStore(s => s.abilities)
  const addAbility = useAthenaStore(s => s.addAbility)
  const removeAbility = useAthenaStore(s => s.removeAbility)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  return (
    <div className={styles.panelContent}>
      <div className={styles.addForm}>
        <input
          className={styles.panelInput}
          placeholder="技能名称（如：论文写作）"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className={styles.panelInput}
          placeholder="技能描述"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        <button
          className={styles.panelAddBtn}
          onClick={() => {
            if (name.trim() && desc.trim()) {
              addAbility(name.trim(), desc.trim())
              setName('')
              setDesc('')
            }
          }}
        >
          <Plus size={16} strokeWidth={2} />
          添加
        </button>
      </div>
      <div className={styles.itemList}>
        {abilities.length === 0 ? (
          <p className={styles.emptyHint}>暂无技能，Athena 会在对话中自动发现新技能</p>
        ) : (
          abilities.map(a => (
            <div key={a.id} className={styles.abilityItem}>
              <div className={styles.abilityInfo}>
                <span className={styles.abilityName}>{a.name}</span>
                <span className={styles.abilityDesc}>{a.description}</span>
                {a.autoGenerated && <span className={styles.autoTag}>自动发现</span>}
              </div>
              <button className={styles.itemRemoveBtn} onClick={() => removeAbility(a.id)}>
                <Trash2 size={14} strokeWidth={1.8} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/** 记忆管理面板 */
function MemoryPanel() {
  const memories = useAthenaStore(s => s.memories)
  const addMemory = useAthenaStore(s => s.addMemory)
  const removeMemory = useAthenaStore(s => s.removeMemory)
  const updateMemory = useAthenaStore(s => s.updateMemory)
  const clearFlowMemories = useAthenaStore(s => s.clearFlowMemories)
  const exportAthena = useAthenaStore(s => s.exportAthena)
  const importAthena = useAthenaStore(s => s.importAthena)
  const [newCharter, setNewCharter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const charterMemories = memories.filter(m => m.type === 'charter')
  const flowMemories = memories.filter(m => m.type === 'flow')

  const handleExport = () => {
    const data = exportAthena()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `athena-config-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: ReactChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        importAthena(data)
        alert('Athena 配置导入成功！')
      } catch {
        alert('导入失败：文件格式不正确')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className={styles.panelContent}>
      {/* Export / Import */}
      <div className={styles.dataActions}>
        <button className={styles.dataBtn} onClick={handleExport}>
          <Download size={14} strokeWidth={2} />
          导出 Athena
        </button>
        <button className={styles.dataBtn} onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} strokeWidth={2} />
          导入 Athena
        </button>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>

      {/* Charter Memories */}
      <div className={styles.memorySection}>
        <div className={styles.memorySectionHeader}>
          <Shield size={14} strokeWidth={2} />
          <h4>宪章记忆</h4>
          <span className={styles.memoryCount}>{charterMemories.length}</span>
        </div>
        <p className={styles.memoryHint}>用户管理，Athena 必须遵守，不能自行修改</p>
        <div className={styles.addForm}>
          <textarea
            className={styles.panelTextarea}
            placeholder="添加新的宪章记忆..."
            value={newCharter}
            onChange={e => setNewCharter(e.target.value)}
            rows={2}
          />
          <button
            className={styles.panelAddBtn}
            onClick={() => {
              if (newCharter.trim()) {
                addMemory('charter', newCharter.trim(), 'custom')
                setNewCharter('')
              }
            }}
          >
            <Plus size={16} strokeWidth={2} />
            添加
          </button>
        </div>
        <div className={styles.itemList}>
          {charterMemories.map(m => (
            <div key={m.id} className={styles.memoryItem}>
              {editingId === m.id ? (
                <div className={styles.editForm}>
                  <textarea
                    className={styles.panelTextarea}
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={3}
                  />
                  <div className={styles.editActions}>
                    <button onClick={() => { updateMemory(m.id, editText); setEditingId(null) }}>保存</button>
                    <button onClick={() => setEditingId(null)}>取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className={styles.memoryCategory}>{m.category || '自定义'}</span>
                  <p className={styles.memoryContent}>{m.content}</p>
                  <div className={styles.memoryActions}>
                    <button onClick={() => { setEditingId(m.id); setEditText(m.content) }}>
                      编辑
                    </button>
                    <button onClick={() => removeMemory(m.id)}>
                      <Trash2 size={12} strokeWidth={1.8} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Flow Memories */}
      <div className={styles.memorySection}>
        <div className={styles.memorySectionHeader}>
          <Waves size={14} strokeWidth={2} />
          <h4>流动记忆</h4>
          <span className={styles.memoryCount}>{flowMemories.length}</span>
          {flowMemories.length > 0 && (
            <button className={styles.clearFlowBtn} onClick={clearFlowMemories}>
              清空
            </button>
          )}
        </div>
        <p className={styles.memoryHint}>Athena 自动管理，记录用户偏好和学习习惯</p>
        <div className={styles.itemList}>
          {flowMemories.length === 0 ? (
            <p className={styles.emptyHint}>暂无流动记忆，Athena 会在对话中自动积累</p>
          ) : (
            flowMemories.map(m => (
              <div key={m.id} className={styles.memoryItem}>
                <p className={styles.memoryContent}>{m.content}</p>
                <div className={styles.memoryActions}>
                  <button onClick={() => removeMemory(m.id)}>
                    <Trash2 size={12} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
