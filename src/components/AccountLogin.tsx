import { useState } from 'react'
import { User, X, Info } from 'lucide-react'
import { useAuthStore } from '@stores/authStore'
import { useT } from '../i18n'
import type { LocalAccount } from '@types/index'
import styles from './AccountLogin.module.css'

interface AccountLoginProps {
  onClose: () => void
}

/** 预设头像 emoji（默认使用 🦊） */
const PRESET_AVATARS = ['🦊', '🐱', '🐼', '🐧', '🦄', '🐯', '🐻', '🐰']

export default function AccountLogin({ onClose }: AccountLoginProps) {
  const login = useAuthStore(s => s.login)
  const t = useT()

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string>('🦊')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError(t('account.nameRequired'))
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
              <h2 className={styles.modalTitle}>{t('account.createTitle')}</h2>
              <p className={styles.modalSubtitle}>{t('account.modalSubtitle')}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label={t('account.close')}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.hint}>
            <Info size={14} strokeWidth={2} />
            <span>
              {t('account.offlineHintLogin')}
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('account.nameLabel')}</label>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('account.namePlaceholder')}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('account.avatarLabel')}</label>
            <div className={styles.avatarPicker}>
              {PRESET_AVATARS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className={`${styles.avatarOption} ${avatar === emoji ? styles.avatarOptionActive : ''}`}
                  onClick={() => setAvatar(emoji)}
                  aria-label={t('account.pickAvatar').replace('{emoji}', emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('account.bioLabel')}</label>
            <textarea
              className={styles.input}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder={t('account.bioPlaceholder')}
              rows={2}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className={styles.submitBtn}>
              {t('account.createBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
