import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Folder,
  FolderInput,
  Copy,
  Move,
  Check,
  AlertCircle,
  Loader,
  FileText,
  HardDrive,
} from 'lucide-react'
import { useSettingsStore } from '@stores/settingsStore'
import { useCourseStore } from '@stores/courseStore'
import type { MigrationResult } from '@types/index'
import { useT } from '../../i18n'
import styles from './SettingsSub.module.css'

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 迁移文件条目（聚合所有课程的文件） */
interface MigrationFileEntry {
  id: string
  name: string
  path: string
  size: number
  courseName: string
}

export default function StorageSettings() {
  const t = useT()
  const navigate = useNavigate()

  // ===== 存储路径 =====
  const storagePath = useSettingsStore(s => s.storagePath)
  const setStoragePath = useSettingsStore(s => s.setStoragePath)

  // ===== 课程数据 =====
  const courses = useCourseStore(s => s.courses)
  const updateFilePaths = useCourseStore(s => s.updateFilePaths)

  // 默认用户数据目录
  const [defaultPath, setDefaultPath] = useState('')
  const [selecting, setSelecting] = useState(false)

  // ===== 迁移状态 =====
  const [targetDir, setTargetDir] = useState('')
  const [selectingTarget, setSelectingTarget] = useState(false)
  const [isMove, setIsMove] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [fileExistsMap, setFileExistsMap] = useState<Record<string, boolean>>({})
  const [checkingFiles, setCheckingFiles] = useState(false)

  // 获取默认用户数据目录
  useEffect(() => {
    window.electronAPI
      .getUserDataPath()
      .then(setDefaultPath)
      .catch(() => setDefaultPath(''))
  }, [])

  // 收集所有课程的所有文件
  const allFiles = useMemo<MigrationFileEntry[]>(() => {
    const files: MigrationFileEntry[] = []
    for (const bundle of courses) {
      for (const file of bundle.course.files) {
        files.push({
          id: file.id,
          name: file.name,
          path: file.path,
          size: file.size,
          courseName: bundle.course.name,
        })
      }
    }
    return files
  }, [courses])

  const totalSize = useMemo(
    () => allFiles.reduce((sum, f) => sum + f.size, 0),
    [allFiles]
  )

  const missingCount = useMemo(
    () => allFiles.filter(f => fileExistsMap[f.path] === false).length,
    [allFiles, fileExistsMap]
  )

  // 检查文件是否存在（按唯一路径去重，避免重复 IO）
  useEffect(() => {
    if (allFiles.length === 0) {
      setFileExistsMap({})
      setCheckingFiles(false)
      return
    }
    let cancelled = false
    setCheckingFiles(true)
    setFileExistsMap({})

    const uniquePaths = Array.from(new Set(allFiles.map(f => f.path)))

    const checkAll = async () => {
      const map: Record<string, boolean> = {}
      for (const p of uniquePaths) {
        if (cancelled) return
        try {
          map[p] = await window.electronAPI.fileExists(p)
        } catch {
          map[p] = false
        }
      }
      if (!cancelled) {
        setFileExistsMap(map)
        setCheckingFiles(false)
      }
    }
    void checkAll()

    return () => {
      cancelled = true
    }
  }, [allFiles])

  // 迁移进度模拟（API 不提供细粒度进度，用平滑动画填充至 90%，完成后跳 100%）
  useEffect(() => {
    if (!migrating) return
    setProgress(0)
    const timer = window.setInterval(() => {
      setProgress(p => (p >= 90 ? p : p + Math.random() * 7))
    }, 220)
    return () => window.clearInterval(timer)
  }, [migrating])

  // ===== 存储目录操作 =====
  const handleSelectDir = useCallback(async () => {
    if (selecting) return
    setSelecting(true)
    try {
      const dir = await window.electronAPI.openDirectoryDialog()
      if (dir) setStoragePath(dir)
    } catch {
      // 忽略选择失败
    } finally {
      setSelecting(false)
    }
  }, [selecting, setStoragePath])

  const handleRestoreDefault = () => {
    setStoragePath('')
  }

  // ===== 目标目录操作 =====
  const handleSelectTarget = useCallback(async () => {
    if (selectingTarget) return
    setSelectingTarget(true)
    try {
      const dir = await window.electronAPI.openDirectoryDialog()
      if (dir) {
        setTargetDir(dir)
        setMigrationResult(null)
      }
    } catch {
      // 忽略选择失败
    } finally {
      setSelectingTarget(false)
    }
  }, [selectingTarget])

  // ===== 开始迁移 =====
  const handleMigrate = async () => {
    if (migrating) return
    if (!targetDir || allFiles.length === 0) return

    setMigrating(true)
    setMigrationResult(null)
    setProgress(0)

    try {
      const filePaths = allFiles.map(f => f.path)
      const result = await window.electronAPI.migrateFiles(filePaths, targetDir, isMove)
      setProgress(100)

      // 迁移成功且有路径映射时，更新 store 中的文件路径
      if (result.success && Object.keys(result.pathMap).length > 0) {
        updateFilePaths(result.pathMap)
      }

      setMigrationResult(result)
    } catch (err) {
      setMigrationResult({
        success: false,
        migratedFiles: 0,
        totalSize: 0,
        errors: [err instanceof Error ? err.message : t('storage.migrateFailedRetry')],
        pathMap: {},
      })
    } finally {
      setMigrating(false)
    }
  }

  const displayPath = storagePath || defaultPath
  const isUsingDefault = !storagePath
  const canMigrate = !migrating && !!targetDir && allFiles.length > 0

  /** 迁移模式按钮样式（pill 风格，参考 UploadPage 模式选择器） */
  const getModeButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    color: isActive ? '#ffffff' : 'var(--text-secondary)',
    background: isActive ? 'var(--text-primary)' : 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-pill)',
    cursor: migrating ? 'not-allowed' : 'pointer',
    opacity: migrating ? 0.5 : 1,
    boxShadow: isActive ? 'var(--shadow-ambient)' : 'none',
    transition: 'all 0.25s ease',
  })

  return (
    <div className={`${styles.subPage} fade-in`}>
      {/* ===== 头部 ===== */}
      <header className={styles.subHeader}>
        <button
          className={styles.backBtn}
          onClick={() => navigate('/settings')}
          aria-label={t('common.back')}
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t('settings.storage')}</h1>
          <p className={styles.subtitle}>
            {t('storage.cardDesc')}
          </p>
        </div>
      </header>

      {/* ===== Section 1: 资源存储位置 ===== */}
      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{t('storage.resLocation')}</h2>
          <p className={styles.cardDesc}>
            {t('storage.dirHint')}
          </p>
        </div>

        <div className={styles.pathBox}>
          <div className={styles.pathIcon}>
            <Folder size={20} strokeWidth={1.8} />
          </div>
          <div className={styles.pathContent}>
            <div className={styles.pathValue} title={displayPath}>
              {displayPath || t('storage.gettingPath')}
            </div>
            {isUsingDefault && defaultPath && (
              <span className={styles.pathBadge}>{t('storage.defaultBadge')}</span>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryBtn}
            onClick={handleSelectDir}
            disabled={selecting}
          >
            <Folder size={16} strokeWidth={2} />
            {selecting ? t('storage.selecting') : t('storage.selectDir')}
          </button>
          <button
            className={styles.ghostBtn}
            onClick={handleRestoreDefault}
            disabled={isUsingDefault}
          >
            {t('storage.resetDefault')}
          </button>
        </div>
      </section>

      {/* ===== Section 2: 资源迁移 ===== */}
      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{t('storage.migration')}</h2>
          <p className={styles.cardDesc}>
            {t('storage.migrateDesc')}
          </p>
        </div>

        {/* 文件汇总 */}
        <div className={styles.field}>
          <label className={styles.label}>{t('storage.fileList')}</label>
          <div style={summaryStyle}>
            <div style={summaryItemStyle}>
              <FileText size={16} strokeWidth={2} style={{ color: 'var(--accent-text)' }} />
              <span>{t('storage.totalFiles').replace('{count}', String(allFiles.length))}</span>
            </div>
            <div style={summaryItemStyle}>
              <HardDrive size={16} strokeWidth={2} style={{ color: 'var(--accent-text)' }} />
              <span>{t('storage.totalSizeLabel').replace('{size}', formatSize(totalSize))}</span>
            </div>
            {missingCount > 0 && (
              <div style={{ ...summaryItemStyle, color: 'var(--danger-text)' }}>
                <AlertCircle size={16} strokeWidth={2} />
                <span>{t('storage.filesMissing').replace('{count}', String(missingCount))}</span>
              </div>
            )}
            {checkingFiles && (
              <div style={{ ...summaryItemStyle, color: 'var(--text-tertiary)' }}>
                <Loader size={14} strokeWidth={2} style={spinStyle} />
                <span>{t('storage.checkingFiles')}</span>
              </div>
            )}
          </div>
        </div>

        {/* 文件列表 */}
        {allFiles.length > 0 ? (
          <div className={styles.fileList}>
            {allFiles.map(file => {
              const exists = fileExistsMap[file.path]
              const isMissing = exists === false
              return (
                <div key={file.id} className={styles.fileItem}>
                  <div className={styles.fileIcon}>
                    <FileText size={16} strokeWidth={1.8} />
                  </div>
                  <div className={styles.fileInfo}>
                    <span className={`${styles.fileName} ${isMissing ? styles.fileMissing : ''}`}>
                      {file.name}
                    </span>
                    <span
                      className={`${styles.filePath} ${isMissing ? styles.fileMissing : ''}`}
                      title={file.path}
                    >
                      {file.path}
                    </span>
                  </div>
                  <span style={fileSizeStyle}>{formatSize(file.size)}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={emptyStyle}>
            {t('storage.noFiles')}
          </div>
        )}

        {/* 目标目录 */}
        <div className={styles.field}>
          <label className={styles.label}>{t('storage.targetDir')}</label>
          <div className={styles.pathBox}>
            <div className={styles.pathIcon}>
              <FolderInput size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.pathContent}>
              <div className={styles.pathValue} title={targetDir}>
                {targetDir || t('storage.noTarget')}
              </div>
            </div>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              onClick={handleSelectTarget}
              disabled={selectingTarget || migrating}
            >
              <FolderInput size={16} strokeWidth={2} />
              {selectingTarget ? t('storage.selecting') : t('storage.selectTarget')}
            </button>
          </div>
        </div>

        {/* 迁移模式 */}
        <div className={styles.field}>
          <label className={styles.label}>{t('storage.modeLabel')}</label>
          <div style={modeSelectorStyle}>
            <button
              type="button"
              style={getModeButtonStyle(!isMove)}
              onClick={() => !migrating && setIsMove(false)}
              disabled={migrating}
            >
              <Copy size={16} strokeWidth={2} />
              <span>{t('storage.modeCopy')}</span>
            </button>
            <button
              type="button"
              style={getModeButtonStyle(isMove)}
              onClick={() => !migrating && setIsMove(true)}
              disabled={migrating}
            >
              <Move size={16} strokeWidth={2} />
              <span>{t('storage.modeMove')}</span>
            </button>
          </div>
          <p className={styles.hint}>
            {isMove
              ? t('storage.moveMode')
              : t('storage.copyMode')}
          </p>
        </div>

        {/* 迁移进度 */}
        {migrating && (
          <div className={styles.migrateProgress}>
            <div className={styles.migrateProgressText}>
              <Loader size={16} strokeWidth={2} style={spinStyle} />
              <span>{t('storage.migratingProgress').replace('{percent}', String(Math.round(progress)))}</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* 迁移结果 */}
        {migrationResult && !migrating && (
          <div style={resultBoxStyle(migrationResult.success)}>
            <div style={resultHeaderStyle}>
              {migrationResult.success ? (
                <Check size={18} strokeWidth={2.5} style={{ color: 'var(--success-text)' }} />
              ) : (
                <AlertCircle size={18} strokeWidth={2.5} style={{ color: 'var(--danger-text)' }} />
              )}
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {migrationResult.success ? t('storage.migrateDone') : t('storage.migrateFailed')}
              </span>
            </div>
            <div style={resultDetailStyle}>
              <div>{t('storage.migratedCount').replace('{count}', String(migrationResult.migratedFiles))}</div>
              <div>{t('storage.migratedTotalSize').replace('{size}', formatSize(migrationResult.totalSize))}</div>
              {targetDir && (
                <div style={{ marginTop: 4 }}>{t('storage.targetDirResult').replace('{dir}', targetDir)}</div>
              )}
              {Object.keys(migrationResult.pathMap).length > 0 && (
                <div style={{ marginTop: 6, color: 'var(--text-tertiary)', fontSize: 12 }}>
                  {t('storage.pathUpdated').replace('{count}', String(Object.keys(migrationResult.pathMap).length))}
                </div>
              )}
            </div>
            {migrationResult.errors.length > 0 && (
              <div style={errorsStyle}>
                {migrationResult.errors.map((err, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <AlertCircle
                      size={13}
                      strokeWidth={2}
                      style={{ color: 'var(--danger-text)', flexShrink: 0, marginTop: 2 }}
                    />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className={styles.actions}>
          <button
            className={styles.primaryBtn}
            onClick={handleMigrate}
            disabled={!canMigrate}
          >
            {migrating ? (
              <>
                <Loader size={16} strokeWidth={2} style={spinStyle} />
                {t('storage.migrating')}
              </>
            ) : (
              <>
                <Move size={16} strokeWidth={2} />
                {t('storage.startMigrate')}
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  )
}

/* ===== 内联样式（迁移专属元素，复用全局设计变量） ===== */

/** 旋转动画（用于 Loader 图标） */
const spinStyle: React.CSSProperties = {
  animation: 'spin 0.8s linear infinite',
}

const summaryStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 16,
  padding: '12px 16px',
  borderRadius: 'var(--radius-md)',
  background: 'rgba(0, 0, 0, 0.03)',
}

const summaryItemStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text-secondary)',
}

const fileSizeStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  fontFamily: '"SF Mono", "Menlo", "Consolas", monospace',
}

const emptyStyle: React.CSSProperties = {
  padding: '24px 16px',
  textAlign: 'center',
  fontSize: 13,
  color: 'var(--text-tertiary)',
  borderRadius: 'var(--radius-md)',
  background: 'rgba(0, 0, 0, 0.02)',
}

const modeSelectorStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: 4,
  background: 'rgba(0, 0, 0, 0.04)',
  borderRadius: 'var(--radius-pill)',
}

const resultBoxStyle = (success: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: '16px 18px',
  borderRadius: 'var(--radius-md)',
  background: success ? 'rgba(52, 199, 89, 0.06)' : 'rgba(255, 59, 48, 0.06)',
  border: `1px solid ${success ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 59, 48, 0.2)'}`,
  animation: 'fadeIn 0.3s ease-out',
})

const resultHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const resultDetailStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 13,
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
}

const errorsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255, 59, 48, 0.06)',
  fontSize: 12,
  color: 'var(--danger-text)',
  lineHeight: 1.5,
  maxHeight: 120,
  overflowY: 'auto',
}
