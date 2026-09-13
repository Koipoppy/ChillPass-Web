import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import TitleBar from './components/layout/TitleBar'
import GlassFilter from './components/common/GlassFilter'
import Background from './components/layout/Background'
import WelcomeModal from './components/onboarding/WelcomeModal'
import GuideCard from './components/onboarding/GuideCard'
import { useAuthStore } from './stores/authStore'
import { useGlobalBlurActive } from './utils/useGlobalBlur'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import LessonPathPage from './pages/LessonPathPage'
import LessonDetailPage from './pages/LessonDetailPage'
import AIChatPage from './pages/AIChatPage'
import WrongBookPage from './pages/WrongBookPage'
import SettingsPage from './pages/SettingsPage'
import TeacherWorkspace from './pages/TeacherWorkspace'
import ApiSettings from './pages/settings/ApiSettings'
import StorageSettings from './pages/settings/StorageSettings'
import DataSettings from './pages/settings/DataSettings'
import AboutSettings from './pages/settings/AboutSettings'
import styles from './App.module.css'
import { useT } from './i18n'

/**
 * 页面切换动画变体（同步推移）
 * 新页面从右侧滑入并渐显，旧页面以完全相同的速度与缓动向左滑出——
 * 新旧页面始终并肩运动，旧页面位移永远不落后于新页面，切换过程中不会产生内容重叠
 */
const pageVariants: Variants = {
  initial: {
    x: '100%',
    opacity: 0,
  },
  enter: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'tween',
      ease: [0.32, 0.72, 0, 1],
      duration: 0.42,
    },
  },
  exit: {
    x: '-100%',
    transition: {
      type: 'tween',
      ease: [0.32, 0.72, 0, 1],
      duration: 0.42,
    },
  },
}

/** 带动画的页面包装器 */
function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className={styles.pageWrapper}
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  const ensureAccount = useAuthStore(s => s.ensureAccount)
  const t = useT()
  // 弹窗打开时显示全局高斯模糊层（内联样式，行为确定）
  const blurActive = useGlobalBlurActive()

  useEffect(() => {
    document.title = t('app.docTitle')
    // 首次使用自动创建本地账号
    ensureAccount()
  }, [t])

  return (
    <>
      <GlassFilter />
      <Background />
      {/*
        全局高斯模糊层：位于页面内容之上、侧边栏与弹窗卡片之下。
        必须渲染在 App 层级——页面容器带 transform，会把 fixed 元素限制在容器内，
        导致模糊区域出现锐利边缘。
      */}
      <div
        className={styles.globalBlur}
        style={{ opacity: blurActive ? 1 : 0 }}
        aria-hidden="true"
      />
      <TitleBar />
      <div className={styles.app}>
        <Sidebar />
        <main className={styles.main}>
          <AnimatePresence initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
              <Route path="/upload" element={<AnimatedPage><UploadPage /></AnimatedPage>} />
              <Route path="/lessons" element={<AnimatedPage><LessonPathPage /></AnimatedPage>} />
              <Route path="/lessons/:lessonId" element={<AnimatedPage><LessonDetailPage /></AnimatedPage>} />
              <Route path="/chat" element={<AnimatedPage><AIChatPage /></AnimatedPage>} />
              <Route path="/teacher" element={<AnimatedPage><TeacherWorkspace /></AnimatedPage>} />
              <Route path="/wrongbook" element={<AnimatedPage><WrongBookPage /></AnimatedPage>} />
              <Route path="/settings" element={<AnimatedPage><SettingsPage /></AnimatedPage>} />
              <Route path="/settings/api" element={<AnimatedPage><ApiSettings /></AnimatedPage>} />
              <Route path="/settings/storage" element={<AnimatedPage><StorageSettings /></AnimatedPage>} />
              <Route path="/settings/data" element={<AnimatedPage><DataSettings /></AnimatedPage>} />
              <Route path="/settings/about" element={<AnimatedPage><AboutSettings /></AnimatedPage>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
      {/* 新手引导：欢迎向导 + 悬浮任务卡（组件内部自行判断是否显示） */}
      <WelcomeModal />
      <GuideCard />
    </>
  )
}
