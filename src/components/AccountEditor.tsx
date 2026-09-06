import { useState } from 'react'
import { User, X, Info } from 'lucide-react'
import { useAuthStore } from '@stores/authStore'
import { useT } from '../i18n'
import styles from './AccountLogin.module.css'

interface AccountEditorProps {
  onClose: () => void
}

/** 预设头像 emoji */
const PRESET_AVATARS = ['🦊', '🐱', '🐼', '🐧', '🦄', '🐯', '🐻', '🐰', '🐸', '🦉', '🐙', '🦋']

export default function AccountEditor({ onClose }: AccountEditorProps) {
  const account = useAuthStore(s => s.account)
  const updateAccount = useAuthStore(s => s.updateAccount)
  const t = useT()

  const [name, setName] = useState(account?.name ?? t('account.defaultName'))
  const [avatar, setAvatar] = useState<string>(account?.avatar ?? '🦊')
  const [bio, setBio] = useState(account?.bio ?? '')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError(t('account.nameRequired'))
      return
    }

    updateAccount({
      name: name.trim(),
      avatar,
      bio: bio.trim() || undefined,
    })
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
              <h2 className={styles.modalTitle}>{t('account.editTitle')}</h2>
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
              {t('account.offlineHintEditor')}
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
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
