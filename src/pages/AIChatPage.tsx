import { useState, useRef, useEffect, useCallback } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ChangeEvent as ReactChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, Trash2, Sparkles, ImageIcon, X, Brain, Zap, Download, Upload, Plus, FileText, BookOpen, Calendar, MessageCircle, Shield, Waves, ChevronDown } from 'lucide-react'
import { useChatStore } from '@stores/chatStore'
import { useCurrentBundle } from '@stores/courseStore'
import { useAthenaStore } from '@stores/athenaStore'
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n'
import { chatWithAthena, executeTask, summarizeAthenaInsights } from '@services/deepseek'
import { prepareImageForModel, mimeFromExtension } from '@services/imageService'
import { modelVisionSupport } from '@services/modelCatalog'
import { useSettingsStore } from '@stores/settingsStore'
import type { ChatMessage, AthenaAbility, AthenaMemory, AthenaTaskType } from '@types/index'
import { renderMarkdown } from '../utils/markdown'
import styles from './AIChatPage.module.css'

// Athena 任务定义
const TASKS: { type: AthenaTaskType; icon: typeof MessageCircle; titleKey: TranslationKey; descKey: TranslationKey; color: string }[] = [
  { type: 'qa' as AthenaTaskType, icon: MessageCircle, titleKey: 'athena.taskQa', descKey: 'athena.taskQaDesc', color: '#0078D4' },
  { type: 'paper' as AthenaTaskType, icon: FileText, titleKey: 'athena.taskPaper', descKey: 'athena.taskPaperDesc', color: '#8B5CF6' },
  { type: 'report' as AthenaTaskType, icon: BookOpen, titleKey: 'athena.taskReport', descKey: 'athena.taskReportDesc', color: '#10B981' },
  { type: 'summary' as AthenaTaskType, icon: Sparkles, titleKey: 'athena.taskSummary', descKey: 'athena.taskSummaryDesc', color: '#F59E0B' },
  { type: 'plan' as AthenaTaskType, icon: Calendar, titleKey: 'athena.taskPlan', descKey: 'athena.taskPlanDesc', color: '#EF4444' },
]

// Athena 任务信息收集表单定义
const TASK_FORMS: Record<string, { labelKey: string; placeholderKey: string; required: boolean }[]> = {
  paper: [
    { labelKey: 'athena.fTopic', placeholderKey: 'athena.fTopicPh', required: true },
    { labelKey: 'athena.fWords', placeholderKey: 'athena.fWordsPh', required: true },
    { labelKey: 'athena.fLevel', placeholderKey: 'athena.fLevelPh', required: false },
    { labelKey: 'athena.fSpecial', placeholderKey: 'athena.fSpecialPh', required: false },
  ],
  report: [
    { labelKey: 'athena.fReportTopic', placeholderKey: 'athena.fReportTopicPh', required: true },
    { labelKey: 'athena.fReportType', placeholderKey: 'athena.fReportTypePh', required: true },
    { labelKey: 'athena.fWords', placeholderKey: 'athena.fWordsReportPh', required: false },
    { labelKey: 'athena.fSpecial', placeholderKey: 'athena.fSpecialReportPh', required: false },
  ],
  summary: [
    { labelKey: 'athena.fSummaryScope', placeholderKey: 'athena.fSummaryScopePh', required: true },
    { labelKey: 'athena.fSummaryFocus', placeholderKey: 'athena.fSummaryFocusPh', required: false },
    { labelKey: 'athena.fOutputFormat', placeholderKey: 'athena.fOutputFormatPh', required: false },
  ],
  plan: [
    { labelKey: 'athena.fExamDate', placeholderKey: 'athena.fExamDatePh', required: true },
    { labelKey: 'athena.fDailyTime', placeholderKey: 'athena.fDailyTimePh', required: true },
    { labelKey: 'athena.fWeakAreas', placeholderKey: 'athena.fWeakAreasPh', required: false },
    { labelKey: 'athena.fMastered', placeholderKey: 'athena.fMasteredPh', required: false },
  ],
}

/** 空消息数组常量：选择器返回稳定引用 */
const EMPTY_CHAT_MESSAGES: ChatMessage[] = []

/** 单条消息气泡 */
function MessageBubble({
  message,
  isTyping,
}: {
  message: ChatMessage
  isTyping: boolean
}) {
  const t = useT()
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className={`${styles.messageRow} ${styles.messageRowUser} fade-in`}>
        <div className={`${styles.bubble} ${styles.bubbleUser}`}>
          {message.images && message.images.length > 0 && (
            <div className={styles.bubbleImages}>
              {message.images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={t('athena.attachedImage')}
                  className={styles.bubbleImage}
                />
              ))}
            </div>
          )}
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
  const t = useT()
  // 会话：消息从当前会话读取（引用稳定，避免重渲染抖动）
  const conversations = useChatStore(s => s.conversations)
  const currentId = useChatStore(s => s.currentId)
  const messages = useChatStore(s =>
    s.conversations.find(c => c.id === s.currentId)?.messages ?? EMPTY_CHAT_MESSAGES,
  )
  const isStreaming = useChatStore(s => s.isStreaming)
  const addMessage = useChatStore(s => s.addMessage)
  const updateMessage = useChatStore(s => s.updateMessage)
  const setStreaming = useChatStore(s => s.setStreaming)
  const clearMessages = useChatStore(s => s.clearMessages)
  const createConversation = useChatStore(s => s.createConversation)
  const switchConversation = useChatStore(s => s.switchConversation)
  const deleteConversation = useChatStore(s => s.deleteConversation)

  // 会话下拉开关
  const [convMenuOpen, setConvMenuOpen] = useState(false)
  const convMenuRef = useRef<HTMLDivElement>(null)
  const currentConversation = conversations.find(c => c.id === currentId)

  const bundle = useCurrentBundle()
  const rawText = bundle?.rawText ?? ''
  const currentCourse = bundle?.course

  // Athena store
  const abilities = useAthenaStore(s => s.abilities)
  const memories = useAthenaStore(s => s.memories)
  const addAutoAbility = useAthenaStore(s => s.addAutoAbility)
  const addAutoMemory = useAthenaStore(s => s.addAutoMemory)

  const [input, setInput] = useState('')
  // 待发送的图片（data URL）：作为多模态内容直接交给模型读图，无需本地 OCR
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
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
  const [taskFormFields, setTaskFormFields] = useState<{ labelKey: TranslationKey; placeholderKey: TranslationKey; required: boolean }[]>([])
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

  // 会话下拉：点击外部或 Esc 关闭
  useEffect(() => {
    if (!convMenuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (convMenuRef.current && !convMenuRef.current.contains(e.target as Node)) {
        setConvMenuOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConvMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [convMenuOpen])

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
      let mimeHint: string | undefined

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
        mimeHint = mimeFromExtension(filePath)
        if (window.electronAPI?.readFileBuffer) {
          imageBuffer = await window.electronAPI.readFileBuffer(filePath)
        }
      } else {
        return
      }

      try {
        // 规范化为模型支持的格式（PNG/JPEG）：BMP/TIFF/HEIC 或缺少 MIME 的
        // ArrayBuffer 直接发送会被接口以 400 拒绝
        const dataUrl = file
          ? await prepareImageForModel(file)
          : await prepareImageForModel(imageBuffer!, mimeHint)
        setAttachedImage(dataUrl)
      } catch (err) {
        console.error('图片读取失败', err)
        alert(err instanceof Error ? err.message : t('img.apiUnavailable'))
      }
    },
    [t]
  )

  // 移除已附加的图片
  const handleRemoveImage = useCallback(() => {
    setAttachedImage(null)
  }, [])

  // 发送消息
  const handleSend = useCallback(
    async (text?: string) => {
      const rawContent = (text ?? input).trim()
      if (!rawContent || isStreaming) return

      // 图片随消息一并发送给多模态模型
      const content = rawContent
      const images = attachedImage ? [attachedImage] : undefined

      setInput('')
      setAttachedImage(null)

      // 构建对话历史（不包含当前消息，chatWithTutor 会自行追加）
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const courseId = currentCourse?.id

      // 添加用户消息
      addMessage('user', content, courseId, images)

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
          for await (const chunk of executeTask(activeTask, content, rawText, history, charterMemories, images)) {
            accumulated += chunk
            updateMessage(assistantId, accumulated)
          }
        } else {
          for await (const chunk of chatWithAthena(content, rawText, history, abilityList, charterMemories, flowMemories, images)) {
            accumulated += chunk
            updateMessage(assistantId, accumulated)
          }
        }

        // 没有收到任何内容时给出提示
        if (!accumulated) {
          updateMessage(assistantId, t('athena.noReply'))
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
        const errorMsg = err instanceof Error ? err.message : t('athena.unknownError')
        updateMessage(assistantId, t('athena.errorPrefix').replace('{msg}', errorMsg))
      } finally {
        setStreaming(false)
        setAthenaStatus('idle')
      }
    },
    [input, isStreaming, messages, rawText, currentCourse, attachedImage, activeTask, memories, abilities, addMessage, updateMessage, setStreaming, addAutoAbility, addAutoMemory, t]
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

  // 当前模型是否支持图片理解（未知则不提示，交给接口返回真实错误）
  const currentModel = useSettingsStore(s => s.model)
  const visionUnsupported = modelVisionSupport(currentModel) === 'no'

  const canSend = input.trim().length > 0 && !isStreaming
  const canClear = messages.length > 0 && !isStreaming
  const canAttachImage = !isStreaming

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
            {/* 会话管理：切换 / 新建 / 删除 */}
            <div className={styles.convSelect} ref={convMenuRef}>
              <button
                type="button"
                className={styles.convTrigger}
                onClick={() => setConvMenuOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={convMenuOpen}
                title={t('athena.conversation')}
              >
                <MessageCircle size={13} strokeWidth={2} />
                <span className={styles.convTriggerText}>
                  {currentConversation?.title || t('athena.newChat')}
                </span>
                <ChevronDown size={13} strokeWidth={2} />
              </button>

              {convMenuOpen && (
                <div className={styles.convMenu} role="listbox">
                  <button
                    type="button"
                    className={styles.convNew}
                    onClick={() => {
                      createConversation()
                      setConvMenuOpen(false)
                    }}
                  >
                    <Plus size={14} strokeWidth={2.2} />
                    <span>{t('athena.newChat')}</span>
                  </button>
                  <div className={styles.convList}>
                    {conversations.map(conv => (
                      <div
                        key={conv.id}
                        className={`${styles.convItem} ${conv.id === currentId ? styles.convItemActive : ''}`}
                      >
                        <button
                          type="button"
                          className={styles.convItemMain}
                          onClick={() => {
                            switchConversation(conv.id)
                            setConvMenuOpen(false)
                          }}
                        >
                          <span className={styles.convItemTitle}>
                            {conv.title || t('athena.newChat')}
                          </span>
                          <span className={styles.convItemMeta}>
                            {t('athena.messageCount').replace('{count}', String(conv.messages.length))}
                          </span>
                        </button>
                        <button
                          type="button"
                          className={styles.convDelete}
                          title={t('athena.deleteChat')}
                          onClick={() => deleteConversation(conv.id)}
                        >
                          <Trash2 size={13} strokeWidth={1.9} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className={styles.subtitle}>
              {isStreaming
                ? t('athena.thinking')
                : currentCourse
                  ? t('athena.basedOn').replace('{course}', currentCourse.name)
                  : t('athena.subtitle')}
            </p>
          </div>
        </div>
        <div className={styles.statusIndicator}>
          <span className={`${styles.statusDot} ${styles[`status_${athenaStatus}`]}`} />
          <span className={styles.statusText}>
            {athenaStatus === 'thinking' ? t('athena.statusThinking') : athenaStatus === 'tasking' ? t('athena.statusTasking') : t('athena.idle')}
          </span>
        </div>
        <div className={styles.headerActions}>
          {messages.length > 0 && activeTask !== 'qa' && (
            <div className={styles.headerTaskBadge}>
              {t(TASKS.find(tk => tk.type === activeTask)?.titleKey || 'athena.taskQa' as TranslationKey)}
              <button onClick={() => setActiveTask('qa')}>
                <X size={10} strokeWidth={2.5} />
              </button>
            </div>
          )}
          <button className={styles.headerBtn} onClick={() => setShowAbilityPanel(true)} title={t('athena.abilities')}>
            <Zap size={16} strokeWidth={1.8} />
            <span className={styles.headerBtnLabel}>{abilities.length}</span>
          </button>
          <button className={styles.headerBtn} onClick={() => setShowMemoryPanel(true)} title={t('athena.memories')}>
            <Brain size={16} strokeWidth={1.8} />
            <span className={styles.headerBtnLabel}>{memories.length}</span>
          </button>
          <button
            className={`${styles.clearBtn} ${!canClear ? styles.clearBtnDisabled : ''}`}
            onClick={handleClear}
            disabled={!canClear}
            title={t('athena.clearChat')}
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
                {t('athena.welcomeMsg')}
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
                          setTaskFormFields(TASK_FORMS[task.type] as { labelKey: TranslationKey; placeholderKey: TranslationKey; required: boolean }[])
                          setTaskFormValues({})
                          setShowTaskForm(true)
                        }
                      }}
                    >
                      <div className={styles.taskIcon} style={{ color: task.color }}>
                        <Icon size={20} strokeWidth={1.8} />
                      </div>
                      <div className={styles.taskInfo}>
                        <span className={styles.taskTitle}>{t(task.titleKey)}</span>
                        <span className={styles.taskDesc}>{t(task.descKey)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
              {activeTask !== 'qa' && (
                <div className={styles.activeTaskBadge}>
                  {t('athena.currentTask').replace('{task}', t(TASKS.find(tk => tk.type === activeTask)?.titleKey || 'athena.taskQa' as TranslationKey))}
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
                alt={t('athena.attachedImage')}
                className={styles.imageThumb}
              />
              <div className={styles.imagePreviewInfo}>
                <div className={styles.imagePreviewHint}>
                  {visionUnsupported
                    ? t('athena.visionUnsupported').replace('{model}', currentModel)
                    : t('athena.imageDirectSend')}
                </div>
              </div>
              <button
                className={styles.removeImageBtn}
                onClick={handleRemoveImage}
                title={t('athena.removeImage')}
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
            title={t('athena.insertImage')}
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
                ? t('athena.thinkingPlaceholder')
                : activeTask !== 'qa'
                  ? t('athena.taskInputHint').replace('{task}', t(TASKS.find(tk => tk.type === activeTask)?.titleKey || 'athena.taskQa' as TranslationKey))
                  : t('athena.chatInputHint')
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
            title={t('athena.send')}
          >
            <Send size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Ability Panel */}
      {showAbilityPanel && (
        <div className={styles.modalOverlay} onClick={() => setShowAbilityPanel(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Zap size={18} strokeWidth={2} />
                <h3>{t('athena.abilities')}</h3>
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
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Brain size={18} strokeWidth={2} />
                <h3>{t('athena.memories')}</h3>
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
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                {(() => { const Icon = TASKS.find(t => t.type === activeTask)?.icon || Sparkles; return <Icon size={18} strokeWidth={2} /> })()}
                <h3>{t(TASKS.find(tk => tk.type === activeTask)?.titleKey || 'athena.taskQa' as TranslationKey)} - {t('athena.infoCollect')}</h3>
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
                      {t(field.labelKey)}
                      {field.required && <span className={styles.requiredMark}>*</span>}
                    </label>
                    <input
                      className={styles.panelInput}
                      placeholder={t(field.placeholderKey)}
                      value={taskFormValues[field.labelKey] || ''}
                      onChange={e => setTaskFormValues(prev => ({ ...prev, [field.labelKey]: e.target.value }))}
                    />
                  </div>
                ))}
                <button
                  className={styles.panelAddBtn}
                  onClick={() => {
                    // Build the prompt from form values
                    const prompt = taskFormFields
                      .map(f => `${t(f.labelKey)}：${taskFormValues[t(f.labelKey)] || t('athena.unspecified')}`)
                      .join('\n')
                    setInput(`${t('athena.taskPromptPrefix')}\n${prompt}`)
                    setShowTaskForm(false)
                    setTimeout(() => textareaRef.current?.focus(), 100)
                  }}
                >
                  <Sparkles size={16} strokeWidth={2} />
                  {t('athena.startTask')}
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
  const t = useT()
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
          placeholder={t('athena.abilityNamePlaceholder')}
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className={styles.panelInput}
          placeholder={t('athena.abilityDescPlaceholder')}
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
          {t('athena.add')}
        </button>
      </div>
      <div className={styles.itemList}>
        {abilities.length === 0 ? (
          <p className={styles.emptyHint}>{t('athena.noAbilitiesHint')}</p>
        ) : (
          abilities.map(a => (
            <div key={a.id} className={styles.abilityItem}>
              <div className={styles.abilityInfo}>
                <span className={styles.abilityName}>{a.name}</span>
                <span className={styles.abilityDesc}>{a.description}</span>
                {a.autoGenerated && <span className={styles.autoTag}>{t('athena.autoTag')}</span>}
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
  const t = useT()
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
        alert(t('athena.importSuccess'))
      } catch {
        alert(t('dashboard.importFailedFormat'))
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
          {t('athena.export')}
        </button>
        <button className={styles.dataBtn} onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} strokeWidth={2} />
          {t('athena.import')}
        </button>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>

      {/* Charter Memories */}
      <div className={styles.memorySection}>
        <div className={styles.memorySectionHeader}>
          <Shield size={14} strokeWidth={2} />
          <h4>{t('athena.charterMemory')}</h4>
          <span className={styles.memoryCount}>{charterMemories.length}</span>
        </div>
        <p className={styles.memoryHint}>{t('athena.charterMemoryHint')}</p>
        <div className={styles.addForm}>
          <textarea
            className={styles.panelTextarea}
            placeholder={t('athena.addCharterMemory')}
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
            {t('athena.add')}
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
                    <button onClick={() => { updateMemory(m.id, editText); setEditingId(null) }}>{t('common.save')}</button>
                    <button onClick={() => setEditingId(null)}>{t('common.cancel')}</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className={styles.memoryCategory}>{m.category || t('athena.memCategoryCustom')}</span>
                  <p className={styles.memoryContent}>{m.content}</p>
                  <div className={styles.memoryActions}>
                    <button onClick={() => { setEditingId(m.id); setEditText(m.content) }}>
                      {t('athena.edit')}
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
          <h4>{t('athena.flowMemory')}</h4>
          <span className={styles.memoryCount}>{flowMemories.length}</span>
          {flowMemories.length > 0 && (
            <button className={styles.clearFlowBtn} onClick={clearFlowMemories}>
              {t('wrongbook.clear')}
            </button>
          )}
        </div>
        <p className={styles.memoryHint}>{t('athena.flowMemoryHint')}</p>
        <div className={styles.itemList}>
          {flowMemories.length === 0 ? (
            <p className={styles.emptyHint}>{t('athena.noFlowMemoriesHint')}</p>
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
