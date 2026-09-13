import { Home, Upload, BookOpen, BookX, MessageCircle, Settings, Briefcase } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TranslationKey } from '../../i18n'

export interface NavItem {
  path: string
  labelKey: TranslationKey
  icon: LucideIcon
}

/** 主导航项（左侧栏与底部 dock 折叠侧边栏共用一份定义） */
export const NAV_ITEMS: NavItem[] = [
  { path: '/', labelKey: 'nav.dashboard', icon: Home },
  { path: '/upload', labelKey: 'nav.upload', icon: Upload },
  { path: '/lessons', labelKey: 'nav.lessons', icon: BookOpen },
  { path: '/wrongbook', labelKey: 'nav.wrongbook', icon: BookX },
  { path: '/chat', labelKey: 'nav.chat', icon: MessageCircle },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
]

/** 教师身份下额外的「工作台」入口 */
export const WORKSPACE_ITEM: NavItem = {
  path: '/teacher',
  labelKey: 'sidebar.workspace',
  icon: Briefcase,
}
