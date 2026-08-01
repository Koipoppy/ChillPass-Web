import { useState } from 'react'
import { User, X, Info } from 'lucide-react'
import { useAuthStore } from '@stores/authStore'
import type { LocalAccount } from '@types/index'
import styles from './AccountLogin.module.css'

interface AccountLoginProps {
  onClose: () => void
}

/** 预设头像 emoji（默认使用 🦊） */
const PRESET_AVATARS = ['🦊', '🐱', '🐼', '🐧', '🦄', '🐯', '🐻', '🐰']

export default function AccountLogin({ onClose }: AccountLoginProps) {
  const login = useAuthStore(s => s.login)

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string>('🦊')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('请输入昵称')
      return
    }

    const account: LocalAccount = {
      name: name.trim(),
      avatar,
      bio: bio.trim() || undefined,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
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
              <User size={22} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>创建本地账号</h2>
              <p className={styles.modalSubtitle}>账号信息仅保存在本机，离线运行，无需联网</p>
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
              当前为本地离线账号，所有信息仅保存在本机浏览器中，不会上传到任何服务器。
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>昵称 *</label>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入昵称"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>头像</label>
            <div className={styles.avatarPicker}>
              {PRESET_AVATARS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className={`${styles.avatarOption} ${avatar === emoji ? styles.avatarOptionActive : ''}`}
                  onClick={() => setAvatar(emoji)}
                  aria-label={`选择头像 ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>个性签名</label>
            <textarea
              className={styles.input}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="一句话介绍自己（可选）"
              rows={2}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              取消
            </button>
            <button type="submit" className={styles.submitBtn}>
              创建账号
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
