import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import TitleBar from './components/layout/TitleBar'
import GlassFilter from './components/common/GlassFilter'
import Background from './components/layout/Background'
import { useAuthStore } from './stores/authStore'
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

/**
 * 页面切换动画变体
 * 纯挤入挤出效果：新页面从右侧推入，旧页面向左被挤出
 * 新旧页面同时运动，不使用渐隐
 */
const pageVariants = {
  initial: {
    x: '100%',
  },
  enter: {
    x: 0,
    transition: {
      type: 'tween',
      ease: [0.32, 0.72, 0, 1],
      duration: 0.4,
    },
  },
  exit: {
    x: '-100%',
    transition: {
      type: 'tween',
      ease: [0.32, 0.72, 0, 1],
      duration: 0.4,
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

  useEffect(() => {
    document.title = 'ChillPass — 期末冲刺助手'
    // 首次使用自动创建本地账号
    ensureAccount()
  }, [])

  return (
    <>
      <GlassFilter />
      <Background />
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
    </>
  )
}
