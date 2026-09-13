import { useUiStyleStore, type UiStyle } from '@stores/uiStyleStore'
import { useT } from '../../i18n'
import styles from './UiStyleToggle.module.css'

/** 界面风格开关：在旧版（左侧栏）与新版（底部 dock）之间切换 */
const OPTIONS: UiStyle[] = ['classic', 'dock']

export default function UiStyleToggle() {
  const uiStyle = useUiStyleStore(s => s.uiStyle)
  const setUiStyle = useUiStyleStore(s => s.setUiStyle)
  const t = useT()

  const labels: Record<UiStyle, string> = {
    classic: t('uistyle.classic'),
    dock: t('uistyle.modern'),
  }

  return (
    <div
      className={styles.switch}
      role="group"
      aria-label={t('uistyle.label')}
      title={t('uistyle.switchTip')}
    >
      <span
        className={styles.thumb}
        data-pos={uiStyle === 'dock' ? 'right' : 'left'}
        aria-hidden="true"
      />
      {OPTIONS.map(option => (
        <button
          key={option}
          type="button"
          className={`${styles.option} ${uiStyle === option ? styles.optionActive : ''}`}
          onClick={() => setUiStyle(option)}
          aria-pressed={uiStyle === option}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  )
}
