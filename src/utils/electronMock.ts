/**
 * 浏览器环境下的 Electron API 替代实现
 * 使用 IndexedDB 存储文件，Fullscreen API 实现专注模式
 * 直接 fetch GitHub API 检查更新
 */
import {
  storeFile,
  readFileBuffer,
  readTextFile,
  fileExists,
  getFileSize,
  getStorageSize as getIDBStorageSize,
} from '@services/browserFileStore'

/** 生成唯一文件 ID */
function generateFileId(): string {
  return 'file_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
}

/** 从 tag 字符串中提取语义化版本号 */
function extractSemver(tag: string): string {
  const match = tag.match(/(\d+\.\d+\.\d+)/)
  return match ? match[1] : '0.0.0'
}

/** 比较语义化版本号 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = extractSemver(v1).split('.').map(Number)
  const parts2 = extractSemver(v2).split('.').map(Number)
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0
    const b = parts2[i] || 0
    if (a > b) return 1
    if (a < b) return -1
  }
  return 0
}

const APP_VERSION = '0.0.7'
const UPDATE_CHECK_URL =
  'https://api.github.com/repos/Koipoppy/ChillPass-Web/releases/latest'

export function setupElectronMock() {
  if (window.electronAPI) return

  const mockAPI = {
    // ===== 文件对话框 =====
    openFileDialog: async () => {
      return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = '.pdf,.pptx,.ppt,.txt,.md'
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files
          if (!files || files.length === 0) {
            resolve(null)
            return
          }
          // 逐个读取文件并存入 IndexedDB
          const results = []
          for (const file of Array.from(files)) {
            const id = generateFileId()
            const meta = await storeFile(id, file)
            results.push(meta)
          }
          resolve(results)
        }
        input.click()
      })
    },

    openImageDialog: async () => {
      return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files
          if (!files || files.length === 0) {
            resolve(null)
            return
          }
          const results = []
          for (const file of Array.from(files)) {
            const id = generateFileId()
            const meta = await storeFile(id, file)
            results.push(meta)
          }
          resolve(results)
        }
        input.click()
      })
    },

    openDirectoryDialog: async () => {
      // 浏览器无法选择目录，返回提示性路径
      window.prompt('浏览器模式下不支持选择目录，文件将存储在浏览器 IndexedDB 中')
      return null
    },

    // ===== 文件读取（从 IndexedDB） =====
    readFileBuffer: async (filePath: string) => {
      return readFileBuffer(filePath)
    },

    readTextFile: async (filePath: string) => {
      return readTextFile(filePath)
    },

    // ===== 用户数据路径 =====
    getUserDataPath: async () => {
      return '浏览器 IndexedDB 存储'
    },

    // ===== 窗口控制（浏览器中为空操作） =====
    windowMinimize: () => {
      // 浏览器无法最小化窗口
    },
    windowMaximize: () => {
      // 浏览器无法最大化窗口
    },
    windowClose: () => {
      // 浏览器中不关闭窗口，可以提示用户
      if (window.confirm('确定要关闭应用吗？')) {
        window.close()
      }
    },
    windowIsMaximized: async () => false,
    onWindowMaximizeChange: (_callback: (isMaximized: boolean) => void) => {
      return () => {}
    },

    // ===== 专注模式（使用 Fullscreen API） =====
    enterFocusMode: () => {
      document.documentElement.requestFullscreen?.().catch(() => {})
    },
    exitFocusMode: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    },
    focusExitConfirm: () => {
      if (window.confirm('退出专注模式？')) {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {})
        }
      }
    },
    isFullScreen: async () => !!document.fullscreenElement,
    onFocusExited: (callback: () => void) => {
      const handler = () => {
        if (!document.fullscreenElement) callback()
      }
      document.addEventListener('fullscreenchange', handler)
      return () => document.removeEventListener('fullscreenchange', handler)
    },

    // ===== 平台信息 =====
    platform: 'browser',

    // ===== 应用版本 =====
    getAppVersion: async () => APP_VERSION,

    // ===== 应用路径与存储占用 =====
    getAppPaths: async () => {
      // 安装版（SEA）由 app.cjs 提供真实路径；网页预览模式回退到提示信息
      try {
        const res = await fetch('/api/getAppPaths')
        if (res.ok) return await res.json()
      } catch {
        // 忽略，走回退
      }
      return {
        installPath: '未安装（网页预览模式）',
        userDataPath: '浏览器 IndexedDB / localStorage',
        tempPath: '浏览器内存',
      }
    },

    // ===== 定位安装位置（安装版在资源管理器中选中 exe） =====
    openInstallPath: async () => {
      try {
        const res = await fetch('/api/openInstallPath', { method: 'POST' })
        if (res.ok) return
      } catch {
        // 忽略，走回退
      }
      window.alert('当前为网页预览模式，未安装应用，无法定位安装位置')
    },

    getStorageSize: async () => {
      try {
        return await getIDBStorageSize()
      } catch {
        return 0
      }
    },

    // ===== 更新检查（优先走后端 API，避免浏览器直连 GitHub 被限制） =====
    checkForUpdates: async () => {
      // 安装版：由 app.cjs 后端请求 GitHub API（带代理 fallback）
      try {
        const res = await fetch('/api/checkForUpdates')
        if (res.ok) {
          const data = await res.json()
          if (!data.updateAvailable) return null
          return {
            version: data.latestVersion,
            releaseNotes: data.releaseNotes || '暂无更新说明',
            downloadUrl: data.downloadUrl || '',
            releaseDate: data.releaseDate || '',
            currentVersion: data.currentVersion || APP_VERSION,
          }
        }
        throw new Error(`HTTP ${res.status}`)
      } catch {
        // 回退：直接请求 GitHub API（网页预览模式）
        try {
          const response = await fetch(UPDATE_CHECK_URL, {
            headers: {
              'User-Agent': 'ChillPass-Update-Checker',
              Accept: 'application/vnd.github+json',
            },
          })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const release = await response.json()

          const latestVersion = release.tag_name || '0.0.0'
          const exeAsset = release.assets?.find(
            (a: any) => a.name.endsWith('.exe') && !a.name.endsWith('.blockmap'),
          )
          const downloadUrl =
            exeAsset?.browser_download_url || release.html_url || ''
          const releaseNotes = release.body || '暂无更新说明'
          const releaseDate = release.published_at || new Date().toISOString()

          if (compareVersions(latestVersion, APP_VERSION) > 0) {
            return {
              version: latestVersion,
              releaseNotes,
              downloadUrl,
              releaseDate,
              currentVersion: APP_VERSION,
            }
          }
          return null
        } catch (err) {
          throw new Error(
            `无法连接更新服务器，请检查网络后重试（${err instanceof Error ? err.message : '未知错误'}）`,
          )
        }
      }
    },

    // ===== 自动更新：下载安装包并启动更新程序 =====
    startUpdate: async () => {
      const res = await fetch('/api/startUpdate', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    },

    openExternalUrl: async (url: string) => {
      window.open(url, '_blank')
    },

    // ===== 资源迁移（浏览器中为空操作） =====
    migrateFiles: async (_filePaths: string[], _targetDir: string, _move?: boolean) => {
      // 浏览器中文件存储在 IndexedDB，无需迁移
      return {
        success: true,
        migratedFiles: 0,
        totalSize: 0,
        errors: [],
        pathMap: {},
      }
    },

    getFileSize: async (filePath: string) => {
      try {
        return await getFileSize(filePath)
      } catch {
        return 0
      }
    },

    fileExists: async (filePath: string) => {
      try {
        return await fileExists(filePath)
      } catch {
        return false
      }
    },
  }

  Object.defineProperty(window, 'electronAPI', {
    value: mockAPI,
    writable: false,
    configurable: true,
  })
}
