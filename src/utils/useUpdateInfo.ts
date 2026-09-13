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

  /** 一键下载：安装版走自动更新，失败时回退到系统浏览器下载 */
  const download = async () => {
    if (!updateInfo) return
    setDownloading(true)
    try {
      if (!window.electronAPI?.startUpdate) throw new Error('unavailable')
      await window.electronAPI.startUpdate()
    } catch {
      window.electronAPI?.openExternalUrl(updateInfo.downloadUrl)
    } finally {
      setDownloading(false)
    }
  }

  return { updateInfo, downloading, download }
}
