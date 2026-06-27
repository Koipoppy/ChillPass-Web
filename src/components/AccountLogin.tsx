import { useState } from 'react'
import { GraduationCap, X, Info } from 'lucide-react'
import { useAuthStore } from '@stores/authStore'
import type { CampusAccount } from '@types/index'
import styles from './AccountLogin.module.css'

interface AccountLoginProps {
  onClose: () => void
}

export default function AccountLogin({ onClose }: AccountLoginProps) {
  const login = useAuthStore(s => s.login)

  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [college, setCollege] = useState('')
  const [major, setMajor] = useState('')
  const [grade, setGrade] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!studentId.trim()) {
      setError('请输入学号')
      return
    }
    if (!name.trim()) {
      setError('请输入姓名')
      return
    }
    if (!school.trim()) {
      setError('请输入学校名称')
      return
    }

    const account: CampusAccount = {
      studentId: studentId.trim(),
      name: name.trim(),
      school: school.trim(),
      college: college.trim() || '未填写',
      major: major.trim() || '未填写',
      grade: grade.trim() || '未填写',
      loggedAt: Date.now(),
    }

    login(account)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`liquid-glass ${styles.modal}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleWrap}>
            <div className={styles.modalIcon}>
              <GraduationCap size={22} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>校园账号登录</h2>
              <p className={styles.modalSubtitle}>登录后可同步课程信息，未来支持教务系统对接</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.hint}>
            <Info size={14} strokeWidth={2} />
            <span>
              当前为本地账号模式，信息仅保存在本机。未来版本将支持对接教务系统自动导入课表和成绩。
            </span>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>学号 *</label>
              <input
                className={styles.input}
                type="text"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder="请输入学号"
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>姓名 *</label>
              <input
                className={styles.input}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="请输入姓名"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>学校 *</label>
            <input
              className={styles.input}
              type="text"
              value={school}
              onChange={e => setSchool(e.target.value)}
              placeholder="例如：清华大学"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>学院</label>
              <input
                className={styles.input}
                type="text"
                value={college}
                onChange={e => setCollege(e.target.value)}
                placeholder="例如：计算机学院"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>专业</label>
              <input
                className={styles.input}
                type="text"
                value={major}
                onChange={e => setMajor(e.target.value)}
                placeholder="例如：软件工程"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>年级</label>
            <input
              className={styles.input}
              type="text"
              value={grade}
              onChange={e => setGrade(e.target.value)}
              placeholder="例如：2024级"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              取消
            </button>
            <button type="submit" className={styles.submitBtn}>
              登录
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
