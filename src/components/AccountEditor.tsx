import { useState } from 'react'
import { User, X, Info } from 'lucide-react'
import { useAuthStore } from '@stores/authStore'
import styles from './AccountLogin.module.css'

interface AccountEditorProps {
  onClose: () => void
}

const PRESET_AVATARS = ['🦊', '🐱', '🐼', '🐧', '🦄', '🐯', '🐻', '🐰', '🐸', '🦉', '🐙', '🦋']

export default function AccountEditor({ onClose }: AccountEditorProps) {
  const user = useAuthStore(s => s.user)
  const updateAccount = useAuthStore(s => s.updateAccount)

  const [name, setName] = useState(user?.nickname || user?.username || '学习者')
  const [avatar, setAvatar] = useState<string>(user?.avatar || '🦊')
  const [bio, setBio] = useState(user?.bio || '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('请输入昵称')
      return
    }

    setSaving(true)
    await updateAccount({
      name: name.trim(),
      avatar,
      bio: bio.trim() || undefined,
    })
    setSaving(false)
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
              <h2 className={styles.modalTitle}>编辑个人资料</h2>
              <p className={styles.modalSubtitle}>修改你的昵称、头像和个性签名</p>
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
              账号信息保存在服务端，登录后可在任意设备访问。
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
            <button type="submit" className={styles.submitBtn} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
