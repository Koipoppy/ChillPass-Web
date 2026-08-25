import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, HardDrive, Folder, MapPin, FolderOpen } from 'lucide-react'
import { useCourseStore } from '@stores/courseStore'
import { clearAllFiles } from '@services/browserFileStore'
import styles from './SettingsSub.module.css'

export default function DataSettings() {
  const navigate = useNavigate()
  const courses = useCourseStore(s => s.courses)

  const [confirmClear, setConfirmClear] = useState(false)
  const [paths, setPaths] = useState<{ installPath: string; userDataPath: string; tempPath: string } | null>(null)
  const [storageSize, setStorageSize] = useState(0)

  useEffect(() => {
    window.electronAPI?.getAppPaths().then(p => setPaths(p))
    window.electronAPI?.getStorageSize().then(s => setStorageSize(s))
  }, [])

  const courseCount = courses.length
  const totalFiles = courses.reduce((sum, bundle) => sum + bundle.course.files.length, 0)

  // 估算每门课程的占用大小（序列化为 JSON 后测量字节数）
  const courseSizes = courses.map(bundle => {
    const json = JSON.stringify(bundle)
    return { name: bundle.course.name, size: new Blob([json]).size }
  })
  const totalCourseSize = courseSizes.reduce((sum, c) => sum + c.size, 0)

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const handleClearData = async () => {
    // 清除 IndexedDB 中的课件文件
    try {
      await clearAllFiles()
    } catch {
      // 忽略错误
    }
    // 清除所有 localStorage 中的应用数据
    const keysToRemove = [
      'chillpass-course-v2',
      'chillpass-settings',
      'chillpass-auth',
      'chillpass-language',
      'chillpass-theme',
      'chillpass-study-time',
      'chillpass-wrong-questions',
      'chillpass-chat',
      'athena-storage',
    ]
    keysToRemove.forEach(k => localStorage.removeItem(k))
    // 刷新页面以重置内存状态
    window.location.reload()
  }

  return (
    <div className={`${styles.subPage} fade-in`}>
      <header className={styles.subHeader}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/settings')}
          aria-label="返回设置"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <div className={styles.headerText}>
          <h1 className={styles.title}>数据管理</h1>
          <p className={styles.subtitle}>管理本地存储的课程与学习数据</p>
        </div>
      </header>

      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>数据统计</h2>
          <p className={styles.cardDesc}>查看当前本地存储的课程与课件数量</p>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{courseCount}</span>
            <span className={styles.statLabel}>课程数量</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{totalFiles}</span>
            <span className={styles.statLabel}>课件文件</span>
          </div>
        </div>
      </section>

      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>存储信息</h2>
          <p className={styles.cardDesc}>查看应用安装位置、数据存储位置与磁盘占用情况</p>
        </div>

        <div className={styles.pathList}>
          <div className={styles.pathRow}>
            <div className={styles.pathRowIcon}>
              <MapPin size={18} strokeWidth={2} />
            </div>
            <div className={styles.pathRowContent}>
              <span className={styles.pathLabel}>安装位置</span>
              <span className={styles.pathRowValue}>
                {paths?.installPath || '加载中...'}
              </span>
            </div>
            <button
              type="button"
              className={styles.locateBtn}
              onClick={() => window.electronAPI?.openInstallPath()}
              title="在资源管理器中定位安装位置"
            >
              <FolderOpen size={14} strokeWidth={2} />
              定位
            </button>
          </div>

          <div className={styles.pathRow}>
            <div className={styles.pathRowIcon}>
              <Folder size={18} strokeWidth={2} />
            </div>
            <div className={styles.pathRowContent}>
              <span className={styles.pathLabel}>数据存储位置</span>
              <span className={styles.pathRowValue}>
                {paths?.userDataPath || '加载中...'}
              </span>
            </div>
          </div>

          <div className={styles.pathRow}>
            <div className={styles.pathRowIcon}>
              <HardDrive size={18} strokeWidth={2} />
            </div>
            <div className={styles.pathRowContent}>
              <span className={styles.pathLabel}>磁盘占用</span>
              <span className={styles.pathRowValue}>
                {formatSize(storageSize)}
                <span className={styles.pathValueHint}>
                  （课程数据约 {formatSize(totalCourseSize)}）
                </span>
              </span>
            </div>
          </div>
        </div>

        {courseSizes.length > 0 && (
          <div className={styles.courseSizeList}>
            <div className={styles.courseSizeTitle}>按课程占用</div>
            {courseSizes
              .slice()
              .sort((a, b) => b.size - a.size)
              .map((c, idx) => {
                const percent = totalCourseSize > 0 ? (c.size / totalCourseSize) * 100 : 0
                return (
                  <div key={idx} className={styles.courseSizeRow}>
                    <div className={styles.courseSizeHead}>
                      <span className={styles.courseSizeName}>{c.name}</span>
                      <span className={styles.courseSizeValue}>
                        {formatSize(c.size)} · {percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className={styles.courseSizeBar}>
                      <div
                        className={styles.courseSizeBarFill}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </section>

      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>危险操作</h2>
          <p className={styles.cardDesc}>
            清除操作将删除所有已上传的课件、考点与闯关进度，且不可恢复
          </p>
        </div>

        {!confirmClear ? (
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 size={16} strokeWidth={2} />
            清除所有课程数据
          </button>
        ) : (
          <div className={styles.confirmBox}>
            <div className={styles.confirmText}>
              确定要清除所有课程数据吗？此操作不可恢复，将删除所有已上传的课件、考点与闯关进度。
            </div>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => setConfirmClear(false)}
              >
                取消
              </button>
              <button
                type="button"
                className={styles.dangerSolidBtn}
                onClick={handleClearData}
              >
                <Trash2 size={16} strokeWidth={2} />
                确认清除
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
