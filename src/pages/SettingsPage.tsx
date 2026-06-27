import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  LogIn,
  LogOut,
  Key,
  HardDrive,
  Database,
  Info,
  ChevronRight,
  RefreshCw,
  Download,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Terminal,
  Globe,
  Check,
  Briefcase,
} from 'lucide-react'
import { useAuthStore } from '@stores/authStore'
import { useCourseStore } from '@stores/courseStore'
import { useThemeStore } from '@stores/themeStore'
import { useLanguageStore, LANGUAGES } from '@stores/languageStore'
import { useSettingsStore } from '@stores/settingsStore'
import type { Language } from '@stores/languageStore'
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n'
import type { UpdateInfo, UpdateStatus } from '@types/index'
import AccountLogin from '@components/AccountLogin'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const account = useAuthStore(s => s.account)
  const logout = useAuthStore(s => s.logout)
  const courses = useCourseStore(s => s.courses)

  const theme = useThemeStore(s => s.theme)
  const setTheme = useThemeStore(s => s.setTheme)
  const language = useLanguageStore(s => s.language)
  const setLanguage = useLanguageStore(s => s.setLanguage)
  const isTeacher = useSettingsStore(s => s.isTeacher)
  const setIsTeacher = useSettingsStore(s => s.setIsTeacher)
  const t = useT()

  const [showLogin, setShowLogin] = useState(false)
  const [appVersion, setAppVersion] = useState('1.0.0')
  const [pendingLang, setPendingLang] = useState<Language>(language)
  const [langApplied, setLangApplied] = useState(false)

  // 更新检查状态
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [updateError, setUpdateError] = useState('')

  useEffect(() => {
    window.electronAPI
      .getAppVersion()
      .then(setAppVersion)
      .catch(() => {})
  }, [])

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking')
    setUpdateError('')
    try {
      const info = await window.electronAPI.checkForUpdates()
      if (info) {
        setUpdateInfo(info)
        setUpdateStatus('available')
      } else {
        setUpdateStatus('not-available')
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : t('about.checkFailed'))
      setUpdateStatus('error')
    }
  }

  const handleLogout = () => {
    if (window.confirm(t('settings.logoutConfirm'))) {
      logout()
    }
  }

  const handleApplyLanguage = () => {
    setLanguage(pendingLang)
    setLangApplied(true)
    window.setTimeout(() => setLangApplied(false), 2000)
  }

  // 统计数据
  const totalCourses = courses.length
  const totalFiles = courses.reduce((sum, b) => sum + b.course.files.length, 0)

  // 账号头像首字
  const avatarChar = account?.name?.charAt(0)?.toUpperCase() || '?'

  const navCards: { path: string; icon: typeof Key; titleKey: TranslationKey; descKey: TranslationKey }[] = [
    {
      path: '/settings/api',
      icon: Key,
      titleKey: 'settings.api',
      descKey: 'settings.apiDesc',
    },
    {
      path: '/settings/storage',
      icon: HardDrive,
      titleKey: 'settings.storage',
      descKey: 'settings.storageDesc',
    },
    {
      path: '/settings/data',
      icon: Database,
      titleKey: 'settings.data',
      descKey: 'settings.dataDesc',
    },
    {
      path: '/settings/about',
      icon: Info,
      titleKey: 'settings.about',
      descKey: 'settings.aboutDesc',
    },
  ]

  return (
    <div className={`${styles.container} fade-in`}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('settings.title')}</h1>
        <p className={styles.subtitle}>{t('settings.subtitle')}</p>
      </header>

      {/* 1. 应用信息卡片 */}
      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.appInfoTop}>
          <div className={styles.appLogo}>
            <Sparkles size={24} strokeWidth={1.8} />
          </div>
          <div className={styles.appInfoText}>
            <h2 className={styles.appName}>ChillPass</h2>
            <p className={styles.appDesc}>{t('settings.appDesc')}</p>
          </div>
          <div className={styles.versionBadge}>v{appVersion}</div>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{totalCourses}</span>
            <span className={styles.statLabel}>{t('settings.statsCourses')}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{totalFiles}</span>
            <span className={styles.statLabel}>{t('settings.statsFiles')}</span>
          </div>
        </div>

        {/* 快速检查更新 */}
        <div className={styles.updateSection}>
          {updateStatus === 'idle' && (
            <button className={styles.updateBtn} onClick={handleCheckUpdate}>
              <RefreshCw size={15} strokeWidth={2} />
              {t('settings.checkUpdate')}
            </button>
          )}
          {updateStatus === 'checking' && (
            <div className={styles.updateChecking}>
              <RefreshCw size={15} strokeWidth={2} className={styles.spinIcon} />
              <span>{t('settings.checkingUpdate')}</span>
            </div>
          )}
          {updateStatus === 'not-available' && (
            <div className={styles.updateToDate}>
              <span>{t('settings.upToDate').replace('{version}', appVersion)}</span>
              <button className={styles.recheckBtn} onClick={handleCheckUpdate}>
                {t('settings.recheck')}
              </button>
            </div>
          )}
          {updateStatus === 'available' && updateInfo && (
            <div className={styles.updateAvailable}>
              <div className={styles.updateAvailableText}>
                {t('settings.newVersionFound').replace('{version}', updateInfo.version)}
                <span className={styles.updateCurrentVer}>
                  {t('settings.currentVersion').replace('{version}', updateInfo.currentVersion)}
                </span>
              </div>
              <button
                className={styles.downloadBtn}
                onClick={() => window.electronAPI.openExternalUrl(updateInfo.downloadUrl)}
              >
                <Download size={15} strokeWidth={2} />
                {t('settings.downloadUpdate')}
              </button>
            </div>
          )}
          {updateStatus === 'error' && (
            <div className={styles.updateError}>
              <span>{updateError}</span>
              <button className={styles.recheckBtn} onClick={handleCheckUpdate}>
                {t('settings.retry')}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 2. 账户信息卡片 */}
      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{t('settings.account')}</h2>
          <p className={styles.cardDesc}>{t('settings.accountDesc')}</p>
        </div>

        {account ? (
          <div className={styles.accountCard}>
            <div className={styles.avatar}>{avatarChar}</div>
            <div className={styles.accountInfo}>
              <span className={styles.accountName}>{account.name}</span>
              <span className={styles.accountMeta}>
                {account.school} · {account.studentId}
              </span>
              <span className={styles.accountMeta}>
                {account.college} · {account.major} · {account.grade}
              </span>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <LogOut size={16} strokeWidth={2} />
              {t('settings.logout')}
            </button>
          </div>
        ) : (
          <div className={styles.loginPrompt}>
            <div className={styles.loginPromptIcon}>
              <GraduationCap size={28} strokeWidth={1.6} />
            </div>
            <div className={styles.loginPromptText}>
              <span className={styles.loginPromptTitle}>{t('settings.notLoggedIn')}</span>
              <span className={styles.loginPromptDesc}>
                {t('settings.notLoggedInDesc')}
              </span>
            </div>
            <button className={styles.loginBtn} onClick={() => setShowLogin(true)}>
              <LogIn size={16} strokeWidth={2} />
              {t('settings.login')}
            </button>
          </div>
        )}
      </section>

      {/* 3. 外观与语言 */}
      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{t('settings.appearance')}</h2>
          <p className={styles.cardDesc}>{t('settings.appearanceDesc')}</p>
        </div>

        <div className={styles.appearanceRow}>
          <span className={styles.appearanceLabel}>
            <Sun size={16} strokeWidth={2} />
            {t('settings.theme')}
          </span>
          <div className={styles.themeToggle}>
            <button
              type="button"
              className={`${styles.themeOption} ${theme === 'light' ? styles.themeOptionActive : ''}`}
              onClick={() => setTheme('light')}
            >
              <Sun size={14} strokeWidth={2} />
              {t('settings.themeLight')}
            </button>
            <button
              type="button"
              className={`${styles.themeOption} ${theme === 'dark' ? styles.themeOptionActive : ''}`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={14} strokeWidth={2} />
              {t('settings.themeDark')}
            </button>
            <button
              type="button"
              className={`${styles.themeOption} ${theme === 'vista' ? styles.themeOptionActive : ''}`}
              onClick={() => setTheme('vista')}
            >
              <Sparkles size={14} strokeWidth={2} />
              Vista
            </button>
            <button
              type="button"
              className={`${styles.themeOption} ${theme === 'win95' ? styles.themeOptionActive : ''}`}
              onClick={() => setTheme('win95')}
            >
              <Monitor size={14} strokeWidth={2} />
              Win95
            </button>
            <button
              type="button"
              className={`${styles.themeOption} ${theme === 'codex' ? styles.themeOptionActive : ''}`}
              onClick={() => setTheme('codex')}
            >
              <Terminal size={14} strokeWidth={2} />
              Codex
            </button>
          </div>
        </div>

        <div className={styles.appearanceRow}>
          <span className={styles.appearanceLabel}>
            <Globe size={16} strokeWidth={2} />
            {t('settings.language')}
          </span>
          <div className={styles.langGrid}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                type="button"
                className={`${styles.langOption} ${pendingLang === lang.code ? styles.langOptionActive : ''}`}
                onClick={() => setPendingLang(lang.code)}
              >
                <span className={styles.langFlag}>{lang.flag}</span>
                <span className={styles.langLabel}>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        {pendingLang !== language && (
          <div className={styles.langApplyRow}>
            {langApplied && (
              <span className={styles.langAppliedHint}>{t('settings.applied')}</span>
            )}
            <button
              type="button"
              className={styles.langApplyBtn}
              onClick={handleApplyLanguage}
            >
              <Check size={15} strokeWidth={2.4} />
              {t('settings.applyLanguage')}
            </button>
          </div>
        )}

        <div className={styles.appearanceRow}>
          <span className={styles.appearanceLabel}>
            <Briefcase size={16} strokeWidth={2} />
            我是教师
          </span>
          <button
            type="button"
            className={`${styles.teacherToggle} ${isTeacher ? styles.teacherToggleActive : ''}`}
            onClick={() => setIsTeacher(!isTeacher)}
          >
            <span className={styles.teacherToggleThumb} />
          </button>
        </div>
      </section>

      {/* 4. 导航卡片网格 */}
      <section className={styles.navGrid}>
        {navCards.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.path}
              className={`liquid-glass ${styles.navCard}`}
              onClick={() => navigate(item.path)}
            >
              <div className={styles.navCardIcon}>
                <Icon size={20} strokeWidth={1.8} />
              </div>
              <div className={styles.navCardText}>
                <span className={styles.navCardTitle}>{t(item.titleKey)}</span>
                <span className={styles.navCardDesc}>{t(item.descKey)}</span>
              </div>
              <ChevronRight size={18} strokeWidth={2} className={styles.navCardArrow} />
            </button>
          )
        })}
      </section>

      {/* 登录弹窗 */}
      {showLogin && <AccountLogin onClose={() => setShowLogin(false)} />}
    </div>
  )
}
