/**
 * 跨平台原生能力桥接层
 *
 * 同一份 dist 产物要在三个宿主里运行，平台差异全部收敛在本文件：
 *   win32    Node SEA 本地服务（installer/app.cjs）提供 /api/*，更新交给 updater.ps1
 *   android  Capacitor WebView，更新交给 live-update 插件热替换 Web 资源
 *   browser  纯浏览器预览，没有自动更新后端，退化为打开发布页
 *
 * 业务代码只认 window.electronAPI 门面，不直接感知宿主平台。
 */
import { translate } from '../i18n'
import { useLanguageStore } from '@stores/languageStore'
import type { UpdateInfo } from '../types/index'

/** 应用版本：构建期由 vite define 注入，与 package.json 同源 */
export const APP_VERSION = __APP_VERSION__

export type AppPlatform = 'win32' | 'darwin' | 'android' | 'ios' | 'browser'

/** GitHub 仓库：Windows 安装包与安卓热更新包发布在同一个 Release 下 */
const GITHUB_REPO = 'Koipoppy/ChillPass-Web'
/** Release 元数据接口，各平台共用 */
export const RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
const RELEASE_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`

/** 安卓热更新包在 Release 资产中的固定文件名 */
const BUNDLE_ASSET = 'dist.zip'

/** Capacitor 注入到 WebView 的全局桥接对象 */
interface CapacitorBridge {
  getPlatform?: () => string
  isNativePlatform?: () => boolean
}

function capacitorBridge(): CapacitorBridge | undefined {
  return (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor
}

let cachedPlatform: AppPlatform | null = null

/** 当前宿主平台 */
export function platform(): AppPlatform {
  if (cachedPlatform) return cachedPlatform

  // 真正的桌面壳（Electron/Tauri）会先注入 electronAPI 并上报自己的平台
  const injected = window.electronAPI?.platform
  if (injected && injected !== 'browser') {
    cachedPlatform = injected as AppPlatform
    return cachedPlatform
  }

  const native = capacitorBridge()?.getPlatform?.()
  if (native === 'android' || native === 'ios') {
    cachedPlatform = native
    return cachedPlatform
  }

  cachedPlatform = 'browser'
  return cachedPlatform
}

/** 是否运行在原生容器里（安卓/iOS 的 Capacitor WebView） */
export function isNativeShell(): boolean {
  const p = platform()
  return p === 'android' || p === 'ios'
}

/**
 * 是否存在可被应用控制的原生窗口。
 * SEA 安装版跑在系统默认浏览器里，安卓版跑在 WebView 里，两者都拿不到窗口装饰，
 * 因此标题栏的红黄绿按钮在这两个宿主下都要隐藏。
 */
export function hasControllableWindow(): boolean {
  const p = platform()
  return p === 'win32' || p === 'darwin'
}

/** 手动下载兜底地址 */
export function releasePageUrl(): string {
  return RELEASE_PAGE
}

/** 从 tag 中提取语义化版本号 */
export function extractSemver(tag: string): string {
  const match = tag.match(/(\d+\.\d+\.\d+)/)
  return match ? match[1] : '0.0.0'
}

/** 比较语义化版本号，a 大于 b 返回正数 */
export function compareVersions(a: string, b: string): number {
  const parts1 = extractSemver(a).split('.').map(Number)
  const parts2 = extractSemver(b).split('.').map(Number)
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const left = parts1[i] || 0
    const right = parts2[i] || 0
    if (left > right) return 1
    if (left < right) return -1
  }
  return 0
}

/** 用系统浏览器打开外部链接 */
export async function openExternal(url: string): Promise<void> {
  if (isNativeShell()) {
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url })
      return
    } catch {
      // 插件不可用时退回 window.open
    }
  }
  // 返回 null 表示被弹窗拦截，调用方据此回退到界面上的手动下载链接
  const win = window.open(url, '_blank')
  if (!win) throw new Error('popup-blocked')
}

/** 待安装的 Web 资源包，由 checkNativeUpdate 填充、applyPendingWebUpdate 消费 */
let pendingBundle: { version: string; url: string } | null = null

/**
 * 首屏渲染就绪后调用，告诉热更新插件本次启动成功。
 * 不调用的话插件会在下次启动时把资源回滚到 APK 内置版本。
 */
export async function notifyAppReady(): Promise<void> {
  if (!isNativeShell()) return
  try {
    const { LiveUpdate } = await import('@capawesome/capacitor-live-update')
    await LiveUpdate.ready()
  } catch {
    // 插件不可用（例如 APK 未内置该插件）：忽略，不影响正常使用
  }
}

/**
 * 原生宿主下的更新检查：直接读 GitHub Release，
 * 只有在同时存在新版号和 dist.zip 资产时才认为可更新。
 */
export async function checkNativeUpdate(): Promise<UpdateInfo | null> {
  const res = await fetch(RELEASE_API_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const release = await res.json()

  const latestVersion = extractSemver(release.tag_name || '0.0.0')
  const bundleAsset = release.assets?.find(
    (a: { name: string }) => a.name === BUNDLE_ASSET,
  )

  if (compareVersions(latestVersion, APP_VERSION) <= 0 || !bundleAsset) {
    pendingBundle = null
    return null
  }

  pendingBundle = {
    version: latestVersion,
    url: bundleAsset.browser_download_url,
  }

  return {
    version: latestVersion,
    releaseNotes: release.body || translate(useLanguageStore.getState().language, 'mock.noReleaseNotes'),
    // 手动兜底指向发布页：自动更新失败时用户可以去下载新的 APK
    downloadUrl: release.html_url || RELEASE_PAGE,
    releaseDate: release.published_at || new Date().toISOString(),
    currentVersion: APP_VERSION,
  }
}

/**
 * 下载并应用待安装的 Web 资源包。
 * 成功后 WebView 会重启，新版本立即生效——不需要重新打包 APK。
 */
export async function applyPendingWebUpdate(): Promise<void> {
  if (!pendingBundle) throw new Error('no-bundle')

  const { LiveUpdate } = await import('@capawesome/capacitor-live-update')
  const bundleId = `web-${pendingBundle.version}`
  await LiveUpdate.downloadBundle({ url: pendingBundle.url, bundleId })
  await LiveUpdate.setNextBundle({ bundleId })
  await LiveUpdate.reload()
}
