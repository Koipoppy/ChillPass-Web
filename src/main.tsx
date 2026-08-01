import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import 'katex/dist/katex.min.css'
import './styles/global.css'
import { setupElectronMock } from './utils/electronMock'
import { useAuthStore } from './stores/authStore'
import { useCourseStore } from './stores/courseStore'

// 非 Electron 环境下注入 Mock API
setupElectronMock()

// 初始化认证状态
useAuthStore.getState().initialize()

// 如果已登录则加载课程数据
const unsub = useAuthStore.subscribe((state) => {
  if (state.isLoggedIn) {
    useCourseStore.getState().fetchCourses()
    unsub()
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
