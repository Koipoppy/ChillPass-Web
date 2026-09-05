import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

/** 应用通知（悬浮任务卡作为通知中心展示） */
export interface AppNotification {
  id: string
  title: string
  body: string
  createdAt: number
  /** 是否已读：已读通知不再以"新通知"形式提示 */
  read: boolean
}

interface NotificationState {
  notifications: AppNotification[]
  /** 推送一条新通知 */
  addNotification: (notification: { title: string; body: string }) => void
  /** 全部标记已读（展开任务卡时调用） */
  markAllRead: () => void
}

/** 当前未读通知 */
export function selectUnread(state: NotificationState): AppNotification[] {
  return state.notifications.filter(n => !n.read)
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      addNotification: ({ title, body }) =>
        set((state) => ({
          // 最多保留 20 条，避免无限膨胀
          notifications: [
            { id: nanoid(), title, body, createdAt: Date.now(), read: false },
            ...state.notifications,
          ].slice(0, 20),
        })),
      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map(n => (n.read ? n : { ...n, read: true })),
        })),
    }),
    {
      name: 'chillpass-notifications',
    }
  )
)
