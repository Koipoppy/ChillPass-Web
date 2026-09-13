import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { WrongQuestion } from '@types/index'

interface WrongQuestionState {
  questions: WrongQuestion[]
  /** 添加错题，返回记录 id（已存在同样题目时返回既有 id） */
  addWrongQuestion: (q: Omit<WrongQuestion, 'id' | 'createdAt' | 'resolved'>) => string | null
  /** 标记为已掌握（移除） */
  resolveQuestion: (id: string) => void
  /** 删除错题 */
  removeQuestion: (id: string) => void
  /** 清空某课程的错题 */
  clearByCourse: (courseId: string) => void
  /** 获取某课程的错题 */
  getByCourse: (courseId: string) => WrongQuestion[]
}

export const useWrongQuestionStore = create<WrongQuestionState>()(
  persist(
    (set, get) => ({
      questions: [],

      addWrongQuestion: (q) => {
        // 去重：同课程同题目不重复添加，直接复用既有记录
        const existing = get().questions.find(
          item => item.courseId === q.courseId && item.question === q.question
        )
        if (existing) return existing.id

        const wrongQ: WrongQuestion = {
          ...q,
          id: nanoid(),
          createdAt: Date.now(),
          resolved: false,
        }
        set(state => ({ questions: [wrongQ, ...state.questions] }))
        return wrongQ.id
      },

      resolveQuestion: (id) => {
        set(state => ({
          questions: state.questions.map(q =>
            q.id === id ? { ...q, resolved: true } : q
          ),
        }))
      },

      removeQuestion: (id) => {
        set(state => ({
          questions: state.questions.filter(q => q.id !== id),
        }))
      },

      clearByCourse: (courseId) => {
        set(state => ({
          questions: state.questions.filter(q => q.courseId !== courseId),
        }))
      },

      getByCourse: (courseId) => {
        return get().questions.filter(q => q.courseId === courseId && !q.resolved)
      },
    }),
    {
      name: 'chillpass-wrong-questions',
    }
  )
)
