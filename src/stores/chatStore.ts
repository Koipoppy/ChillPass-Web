import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { ChatMessage } from '@types/index'

/** 一次会话（一组消息） */
export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

/** 空数组常量：保证选择器返回稳定引用，避免无谓重渲染 */
const EMPTY_MESSAGES: ChatMessage[] = []

/** 由首条用户消息推导会话标题 */
function deriveTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  return clean.length > 24 ? `${clean.slice(0, 24)}…` : clean
}

/** 创建空会话 */
function makeConversation(): Conversation {
  const now = Date.now()
  return { id: nanoid(), title: '', messages: [], createdAt: now, updatedAt: now }
}

interface ChatState {
  conversations: Conversation[]
  currentId: string
  isStreaming: boolean

  /** 当前会话的消息（组件通过选择器读取，引用稳定） */
  getMessages: () => ChatMessage[]
  addMessage: (role: 'user' | 'assistant', content: string, courseId?: string, images?: string[]) => string
  updateMessage: (id: string, content: string) => void
  setStreaming: (streaming: boolean) => void
  /** 清空当前会话的消息 */
  clearMessages: () => void
  /** 新建会话并切换过去，返回新会话 id */
  createConversation: () => string
  /** 切换会话 */
  switchConversation: (id: string) => void
  /** 删除会话（删空后自动补一个空会话） */
  deleteConversation: (id: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentId: '',
      isStreaming: false,

      getMessages: () => {
        const { conversations, currentId } = get()
        return conversations.find(c => c.id === currentId)?.messages ?? EMPTY_MESSAGES
      },

      addMessage: (role, content, courseId, images) => {
        const id = nanoid()
        const message: ChatMessage = {
          id,
          role,
          content,
          timestamp: Date.now(),
          courseId,
          ...(images && images.length > 0 ? { images } : {}),
        }
        set(state => {
          // 兜底：尚无任何会话时自动建立一个
          const conversations = state.conversations.length > 0
            ? state.conversations
            : [makeConversation()]
          const currentId = state.currentId || conversations[0].id

          return {
            conversations: conversations.map(c => {
              if (c.id !== currentId) return c
              // 首条用户消息作为会话标题
              const title = c.title || (role === 'user' ? deriveTitle(content) : '')
              return {
                ...c,
                title,
                messages: [...c.messages, message],
                updatedAt: Date.now(),
              }
            }),
            currentId,
          }
        })
        return id
      },

      updateMessage: (id, content) => {
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === state.currentId
              ? {
                  ...c,
                  messages: c.messages.map(m => (m.id === id ? { ...m, content } : m)),
                  updatedAt: Date.now(),
                }
              : c,
          ),
        }))
      },

      setStreaming: (streaming) => set({ isStreaming: streaming }),

      clearMessages: () => {
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === state.currentId ? { ...c, messages: [], updatedAt: Date.now() } : c,
          ),
        }))
      },

      createConversation: () => {
        const conv = makeConversation()
        set(state => ({
          conversations: [conv, ...state.conversations],
          currentId: conv.id,
        }))
        return conv.id
      },

      switchConversation: (id) => {
        if (!get().conversations.some(c => c.id === id)) return
        set({ currentId: id })
      },

      deleteConversation: (id) => {
        set(state => {
          const remaining = state.conversations.filter(c => c.id !== id)
          if (remaining.length === 0) {
            const fresh = makeConversation()
            return { conversations: [fresh], currentId: fresh.id }
          }
          const currentId = state.currentId === id ? remaining[0].id : state.currentId
          return { conversations: remaining, currentId }
        })
      },
    }),
    {
      name: 'chillpass-chat',
      // v1：旧数据只有单个 messages 数组，迁移为「一个会话」
      version: 1,
      migrate: (persisted) => {
        const legacy = (persisted as { messages?: ChatMessage[] } | undefined)?.messages ?? []
        const conv = makeConversation()
        conv.messages = legacy
        conv.title = deriveTitle(legacy.find(m => m.role === 'user')?.content ?? '')
        return { conversations: [conv], currentId: conv.id }
      },
      // 只持久化会话与当前会话 id（isStreaming 刷新后总是 false）
      partialize: (state) => ({ conversations: state.conversations, currentId: state.currentId }),
    },
  ),
)
