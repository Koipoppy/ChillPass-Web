import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import TitleBar from './components/layout/TitleBar'
import DockLayout from './components/layout/dock/DockLayout'
import GlassFilter from './components/common/GlassFilter'
import Background from './components/layout/Background'
import WelcomeModal from './components/onboarding/WelcomeModal'
import GuideCard from './components/onboarding/GuideCard'
import { useAuthStore } from './stores/authStore'
import { useUiStyleStore } from './stores/uiStyleStore'
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

/**
 * 带动画的页面包装器
 * dock 版布局里页面收在底部 dock 中，内边距相应收紧
 */
function AnimatedPage({ children, dock }: { children: React.ReactNode; dock?: boolean }) {
  return (
    <motion.div
      className={`${styles.pageWrapper} ${dock ? styles.pageWrapperDock : ''}`}
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
  const uiStyle = useUiStyleStore(s => s.uiStyle)
  const t = useT()
  // 弹窗打开时显示全局高斯模糊层（内联样式，行为确定）
  const blurActive = useGlobalBlurActive()
  const dock = uiStyle === 'dock'

  useEffect(() => {
    document.title = t('app.docTitle')
    // 首次使用自动创建本地账号
    ensureAccount()
  }, [t])

  const routes = (
    <AnimatePresence initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedPage dock={dock}><Dashboard /></AnimatedPage>} />
        <Route path="/upload" element={<AnimatedPage dock={dock}><UploadPage /></AnimatedPage>} />
        <Route path="/lessons" element={<AnimatedPage dock={dock}><LessonPathPage /></AnimatedPage>} />
        <Route path="/lessons/:lessonId" element={<AnimatedPage dock={dock}><LessonDetailPage /></AnimatedPage>} />
        <Route path="/chat" element={<AnimatedPage dock={dock}><AIChatPage /></AnimatedPage>} />
        <Route path="/teacher" element={<AnimatedPage dock={dock}><TeacherWorkspace /></AnimatedPage>} />
        <Route path="/wrongbook" element={<AnimatedPage dock={dock}><WrongBookPage /></AnimatedPage>} />
        <Route path="/settings" element={<AnimatedPage dock={dock}><SettingsPage /></AnimatedPage>} />
        <Route path="/settings/api" element={<AnimatedPage dock={dock}><ApiSettings /></AnimatedPage>} />
        <Route path="/settings/storage" element={<AnimatedPage dock={dock}><StorageSettings /></AnimatedPage>} />
        <Route path="/settings/data" element={<AnimatedPage dock={dock}><DataSettings /></AnimatedPage>} />
        <Route path="/settings/about" element={<AnimatedPage dock={dock}><AboutSettings /></AnimatedPage>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )

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
      {dock ? (
        /* 新版布局：关卡区在上，导航 / 页面 / 通知中心收纳到底部 dock */
        <DockLayout>{routes}</DockLayout>
      ) : (
        /* 旧版布局：左侧边栏 + 全幅页面（保持不变） */
        <div className={styles.app}>
          <Sidebar />
          <main className={styles.main}>{routes}</main>
        </div>
      )}
      {/* 新手引导：欢迎向导（两种布局共用）*/}
      <WelcomeModal />
      {/* 悬浮任务卡只在旧版布局出现；新版布局中其职责由底部通知中心承担 */}
      {!dock && <GuideCard />}
    </>
  )
}
