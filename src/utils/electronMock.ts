/**
 * 非桌面壳环境下的 Electron API 替代实现
 * 使用 IndexedDB 存储文件，Fullscreen API 实现专注模式
 * 平台判定与更新策略交给 nativeLayer：安卓走热更新，其余走本地服务端或 GitHub
 */
import {
  storeFile,
  readFileBuffer,
  readTextFile,
  fileExists,
  getFileSize,
  getStorageSize as getIDBStorageSize,
} from '@services/browserFileStore'
import { translate, type TranslationKey } from '../i18n'
import { useLanguageStore } from '@stores/languageStore'
import {
  APP_VERSION,
  RELEASE_API_URL,
  applyPendingWebUpdate,
  checkNativeUpdate,
  compareVersions,
  extractSemver,
  isNativeShell,
  openExternal,
  platform,
} from './nativeLayer'

/** 浏览器 Mock 提示文案（当前语言） */
function mockText(key: TranslationKey, map?: Record<string, string>): string {
  let msg = translate(useLanguageStore.getState().language, key)
  for (const [k, v] of Object.entries(map ?? {})) msg = msg.replace(`{${k}}`, v)
  return msg
}

/** 生成唯一文件 ID */
function generateFileId(): string {
  return 'file_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
}

export function setupElectronMock() {
  if (window.electronAPI) return

  const mockAPI = {
    // ===== 文件对话框 =====
    openFileDialog: async () => {
      return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.md'
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
      window.prompt(mockText('mock.dirDialogPrompt'))
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
      return mockText('mock.userDataPath')
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
      if (window.confirm(mockText('mock.closeConfirm'))) {
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
      if (window.confirm(mockText('mock.focusExitConfirm'))) {
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
    platform: platform(),

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
        installPath: mockText('mock.installPath'),
        userDataPath: mockText('mock.userDataBrowser'),
        tempPath: mockText('mock.tempPath'),
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
      window.alert(mockText('mock.installPathAlert'))
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
      // 安卓/iOS：没有本地服务端，直接读 Release，更新对象是 dist.zip
      if (isNativeShell()) return checkNativeUpdate()

      // 安装版：由 app.cjs 后端请求 GitHub API（带代理 fallback）
      try {
        const res = await fetch('/api/checkForUpdates')
        if (res.ok) {
          const data = await res.json()
          if (!data.updateAvailable) return null
          return {
            version: data.latestVersion,
            releaseNotes: data.releaseNotes || mockText('mock.noReleaseNotes'),
            downloadUrl: data.downloadUrl || '',
            releaseDate: data.releaseDate || '',
            currentVersion: data.currentVersion || APP_VERSION,
          }
        }
        throw new Error(`HTTP ${res.status}`)
      } catch {
        // 回退：直接请求 GitHub API（网页预览模式）
        try {
          const response = await fetch(RELEASE_API_URL, {
            headers: {
              'User-Agent': 'ChillPass-Update-Checker',
              Accept: 'application/vnd.github+json',
            },
          })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const release = await response.json()

          const latestVersion = extractSemver(release.tag_name || '0.0.0')
          const exeAsset = release.assets?.find(
            (a: any) => a.name.endsWith('.exe') && !a.name.endsWith('.blockmap'),
          )
          const downloadUrl =
            exeAsset?.browser_download_url || release.html_url || ''
          const releaseNotes = release.body || mockText('mock.noReleaseNotes')
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
            mockText('mock.updateServerUnreachable', {
              msg: err instanceof Error ? err.message : mockText('common.unknownError'),
            }),
          )
        }
      }
    },

    // ===== 自动更新：下载新资源并应用 =====
    startUpdate: async () => {
      // 安卓/iOS：热替换 WebView 里的 Web 资源，不需要重新打包或重装 APK
      if (isNativeShell()) {
        try {
          await applyPendingWebUpdate()
          return
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err)
          // no-bundle 说明这个 Release 没带安卓更新包，翻译成可读原因
          throw new Error(
            detail === 'no-bundle' ? mockText('upd.reasonNoBundle') : detail,
          )
        }
      }

      const res = await fetch('/api/startUpdate', { method: 'POST' })
      if (!res.ok) {
        // 后端会带上具体原因（如网络不可达），透传出去让界面能说清楚
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      // 开发服务器对未知接口会回退成 200 的 HTML——必须校验响应体，
      // 否则会被当成「更新已启动」而实际什么都没发生
      const data = await res.json().catch(() => null)
      if (!data || data.ok !== true) {
        throw new Error(data?.error || 'unavailable')
      }
    },

    openExternalUrl: async (url: string) => {
      await openExternal(url)
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
