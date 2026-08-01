import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { ChatMessage } from '@types/index'

interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean

  addMessage: (role: 'user' | 'assistant', content: string, courseId?: string) => string
  updateMessage: (id: string, content: string) => void
  setStreaming: (streaming: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      isStreaming: false,

      addMessage: (role, content, courseId) => {
        const id = nanoid()
        const message: ChatMessage = {
          id,
          role,
          content,
          timestamp: Date.now(),
          courseId,
        }
        set(state => ({ messages: [...state.messages, message] }))
        return id
      },

      updateMessage: (id, content) => {
        set(state => ({
          messages: state.messages.map(m =>
            m.id === id ? { ...m, content } : m
          )
        }))
      },

      setStreaming: (streaming) => set({ isStreaming: streaming }),

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chillpass-chat',
      // isStreaming 不需要持久化，刷新后总是 false
      partialize: (state) => ({ messages: state.messages }),
    }
  )
)
