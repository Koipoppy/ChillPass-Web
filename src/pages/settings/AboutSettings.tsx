import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Info,
  RefreshCw,
  Download,
  AlertCircle,
  Loader,
  Users,
  MessageCircle,
  Copy,
  Check,
} from 'lucide-react'
import type { UpdateInfo, UpdateStatus } from '@types/index'
import { useT } from '../../i18n'
import styles from './SettingsSub.module.css'

export default function AboutSettings() {
  const navigate = useNavigate()
  const t = useT()

  const [version, setVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopyWechat = () => {
    navigator.clipboard.writeText('Eikawa_Koi').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  // 获取应用版本
  useEffect(() => {
    window.electronAPI
      .getAppVersion()
      .then(v => setVersion(v))
      .catch(() => setVersion(t('about.unknown')))
  }, [t])

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking')
    setErrorMsg('')
    setUpdateInfo(null)
    try {
      const info = await window.electronAPI.checkForUpdates()
      if (info) {
        setUpdateInfo(info)
        setUpdateStatus('available')
      } else {
        setUpdateStatus('not-available')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('about.unknownError'))
      setUpdateStatus('error')
    }
  }

  const handleDownload = () => {
    if (updateInfo?.downloadUrl) {
      window.electronAPI.openExternalUrl(updateInfo.downloadUrl)
    }
  }

  return (
    <div className={`${styles.subPage} fade-in`}>
      <header className={styles.subHeader}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/settings')}
          aria-label={t('about.backToSettings')}
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t('settings.about')}</h1>
          <p className={styles.subtitle}>{t('about.subtitle')}</p>
        </div>
      </header>

      {/* 应用信息 */}
      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{t('about.appInfo')}</h2>
        </div>

        <div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{t('about.appName')}</span>
            <span className={styles.infoValue}>ChillPass</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{t('about.version')}</span>
            <span className={styles.infoValue}>{version || t('about.loading')}</span>
          </div>
        </div>
      </section>

      {/* 更新检查 */}
      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{t('about.updateCheck')}</h2>
          <p className={styles.cardDesc}>{t('about.updateCheckDesc')}</p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleCheckUpdate}
            disabled={updateStatus === 'checking'}
          >
            <RefreshCw
              size={16}
              strokeWidth={2}
              style={updateStatus === 'checking' ? { animation: 'spin 0.8s linear infinite' } : undefined}
            />
            {updateStatus === 'checking' ? t('about.checking') : t('about.checkUpdate')}
          </button>
        </div>

        {updateStatus === 'checking' && (
          <div className={styles.updateStatus}>
            <div className={styles.updateStatusText} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader size={16} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />
              {t('about.checkingUpdate')}
            </div>
          </div>
        )}

        {updateStatus === 'available' && updateInfo && (
          <div className={`${styles.updateStatus} ${styles.updateStatusAvailable}`}>
            <div className={styles.updateStatusText}>
              {t('about.newVersion')} <strong>v{updateInfo.version}</strong>
              {t('about.currentVersion').replace('{version}', updateInfo.currentVersion)}
            </div>
            {updateInfo.releaseDate && (
              <div className={styles.updateStatusText} style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                {t('about.releaseDate').replace('{date}', updateInfo.releaseDate)}
              </div>
            )}
            {updateInfo.releaseNotes && (
              <div className={styles.releaseNotes}>{updateInfo.releaseNotes}</div>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleDownload}
              >
                <Download size={16} />
                {t('about.download')}
              </button>
            </div>
          </div>
        )}

        {updateStatus === 'not-available' && (
          <div className={styles.updateStatus}>
            <div className={styles.updateStatusText} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={16} strokeWidth={2} />
              {t('about.latest')}
            </div>
          </div>
        )}

        {updateStatus === 'error' && (
          <div className={styles.updateStatus} style={{ borderColor: 'rgba(255, 59, 48, 0.25)', background: 'rgba(255, 59, 48, 0.05)' }}>
            <div className={styles.updateStatusText} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger-text)' }}>
              <AlertCircle size={16} strokeWidth={2} />
              {t('about.checkFailed')}：{errorMsg}
            </div>
          </div>
        )}
      </section>

      {/* 加入我们 */}
      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{t('about.joinUs')}</h2>
          <p className={styles.cardDesc}>{t('about.joinUsDesc')}</p>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t('about.wechat')}</span>
          <span className={styles.infoValue} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={16} strokeWidth={2} />
            Eikawa_Koi
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleCopyWechat}
              style={{ marginLeft: 8, padding: '6px 14px', fontSize: 13 }}
            >
              {copied ? (
                <>
                  <Check size={14} strokeWidth={2} />
                  {t('about.copied')}
                </>
              ) : (
                <>
                  <Copy size={14} strokeWidth={2} />
                  {t('about.copy')}
                </>
              )}
            </button>
          </span>
        </div>
      </section>
    </div>
  )
}
