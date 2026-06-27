import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import 'katex/dist/katex.min.css'
import './styles/global.css'
import { setupElectronMock } from './utils/electronMock'

// 非 Electron 环境下注入 Mock API
setupElectronMock()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
