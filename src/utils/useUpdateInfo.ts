import { useEffect, useState } from 'react'
import { useNotificationStore } from '@stores/notificationStore'
import { useT } from '../i18n'
import type { UpdateInfo } from '../types/index'

/** 每个新版本只推送一次通知，避免重复打扰 */
const NOTICE_KEY = 'chillpass-update-notice-version'

/**
 * 新版本检测（启动时检查一次）
 * 返回待更新信息与一键下载入口，供「悬浮任务卡」与底部通知中心共用
 */
export function useUpdateInfo() {
  const t = useT()
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.electronAPI
      ?.checkForUpdates()
      .then(info => {
        if (!info || cancelled) return
        setUpdateInfo(info)
        try {
          if (localStorage.getItem(NOTICE_KEY) !== info.version) {
            useNotificationStore.getState().addNotification({
              title: t('upd.availableTitle').replace('{version}', info.version),
              body: t('upd.availableBody').replace('{current}', info.currentVersion),
            })
            localStorage.setItem(NOTICE_KEY, info.version)
          }
        } catch {
          // localStorage 不可用时仅保留卡片内提示
        }
      })
      .catch(() => {
        // 网络不可用等情况静默忽略
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 手动下载地址：自动更新走不通时的兜底入口，界面上始终可点 */
  const manualUrl =
    updateInfo?.downloadUrl || 'https://github.com/Koipoppy/ChillPass-Web/releases/latest'

  /**
   * 一键下载
   * 自动更新可能起不来（网页预览模式没有后端、接口不存在、网络连不上 GitHub），
   * 失败时必须把原因显示出来并提供手动下载入口，不能像以前那样静默什么都不发生。
   */
  const download = async () => {
    if (!updateInfo) return
    setDownloading(true)
    setError(null)
    try {
      if (!window.electronAPI?.startUpdate) throw new Error('unavailable')
      await window.electronAPI.startUpdate()
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      setError(detail === 'network' ? t('upd.reasonNetwork') : detail)
      try {
        // 顺手试着打开下载页；被弹窗拦截也没关系，界面上有可点的手动链接
        await window.electronAPI?.openExternalUrl(manualUrl)
      } catch {
        // 弹窗被拦截：忽略，交给界面上的手动下载链接
      }
    } finally {
      setDownloading(false)
    }
  }

  return { updateInfo, downloading, error, download, manualUrl }
}
