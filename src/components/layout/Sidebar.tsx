import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Home, Upload, BookOpen, BookX, MessageCircle, Settings, Briefcase, LogOut } from 'lucide-react'
import styles from './Sidebar.module.css'
import { useCourseStore, useCurrentBundle } from '@stores/courseStore'
import { useSettingsStore } from '@stores/settingsStore'
import { useAuthStore } from '@stores/authStore'
import { useT } from '../../i18n'
import type { TranslationKey } from '../../i18n'

const navItems = [
  { path: '/', labelKey: 'nav.dashboard' as TranslationKey, icon: Home },
  { path: '/upload', labelKey: 'nav.upload' as TranslationKey, icon: Upload },
  { path: '/lessons', labelKey: 'nav.lessons' as TranslationKey, icon: BookOpen },
  { path: '/wrongbook', labelKey: 'nav.wrongbook' as TranslationKey, icon: BookX },
  { path: '/chat', labelKey: 'nav.chat' as TranslationKey, icon: MessageCircle },
  { path: '/settings', labelKey: 'nav.settings' as TranslationKey, icon: Settings },
]

export default function Sidebar() {
  const bundle = useCurrentBundle()
  const course = bundle?.course
  const progress = bundle?.progress
  const isTeacher = useSettingsStore(s => s.isTeacher)
  const t = useT()
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const prevCoinsRef = useRef(progress?.chillCoins ?? 0)
  const [coinBounce, setCoinBounce] = useState(false)
  const currentCoins = typeof progress?.chillCoins === 'number' ? progress.chillCoins : 0

  useEffect(() => {
    if (currentCoins > prevCoinsRef.current) {
      setCoinBounce(true)
      const timer = setTimeout(() => setCoinBounce(false), 600)
      prevCoinsRef.current = currentCoins
      return () => clearTimeout(timer)
    }
    prevCoinsRef.current = currentCoins
  }, [currentCoins])

  return (
    <aside className={styles.sidebar}>
      <div className={`${styles.sidebarInner} liquid-glass`}>
        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoText}>ChillPass</span>
        </div>

        {/* 导航 */}
        <nav className={styles.nav}>
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                <Icon size={20} strokeWidth={1.8} />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            )
          })}
          {isTeacher && (
            <NavLink
              to="/teacher"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <Briefcase size={20} strokeWidth={1.8} />
              <span>工作台</span>
            </NavLink>
          )}
        </nav>

        {/* 课程进度卡片 */}
        {course && course.status === 'ready' && (
          <div className={styles.progressCard}>
            <div className={styles.progressCourseName}>{course.name}</div>
            <div className={styles.progressStats}>
              <span className={styles.progressNumber}>
                {progress!.completedLessons}/{progress!.totalLessons}
              </span>
              <span className={styles.progressLabel}>{t('nav.levelUnit')}</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${progress!.totalLessons > 0
                    ? (progress!.completedLessons / progress!.totalLessons) * 100
                    : 0}%`
                }}
              />
            </div>
            <div className={`${styles.progressCoins} ${coinBounce ? styles.coinBounce : ''}`}>
              <span style={{ color: 'var(--success-text)' }}>{progress!.chillCoins ?? 0} Chill币</span>
              {bundle!.generatingLessons && (
                <span className={styles.generatingBadge}>{t('nav.generating')}</span>
              )}
            </div>
          </div>
        )}

        {/* 退出登录 */}
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={18} strokeWidth={1.8} />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  )
}
