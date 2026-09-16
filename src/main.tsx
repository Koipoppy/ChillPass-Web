import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import 'katex/dist/katex.min.css'
import './styles/global.css'
import { setupElectronMock } from './utils/electronMock'
import { notifyAppReady } from './utils/nativeLayer'

// 非 Electron 环境下注入 Mock API
setupElectronMock()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)

// 首屏挂载后再通知热更新插件本次启动成功：
// 调早了「启动失败自动回滚到内置资源」的保护就失效了
requestAnimationFrame(() => {
  void notifyAppReady()
})
