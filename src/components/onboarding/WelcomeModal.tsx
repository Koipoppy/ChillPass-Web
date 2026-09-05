import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Key,
  Upload,
  Sparkles,
  ShieldCheck,
  Globe,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import { useOnboardingStore } from '@stores/onboardingStore'
import { useSettingsStore } from '@stores/settingsStore'
import { useCourseStore } from '@stores/courseStore'
import { useLanguageStore, LANGUAGES } from '@stores/languageStore'
import type { Language } from '@stores/languageStore'
import { useT } from '../../i18n'
import styles from './WelcomeModal.module.css'

const SLIDE_COUNT = 3

/**
 * 首次使用欢迎向导
 * 仅当"真·新用户"（无 API Key 且无课程）时由 App 挂载显示
 */
export default function WelcomeModal() {
  const navigate = useNavigate()
  const t = useT()

  const stage = useOnboardingStore(s => s.stage)
  const forceWelcome = useOnboardingStore(s => s.forceWelcome)
  const startGuide = useOnboardingStore(s => s.startGuide)
  const skipGuide = useOnboardingStore(s => s.skipGuide)
  const apiKey = useSettingsStore(s => s.apiKey)
  const courses = useCourseStore(s => s.courses)
  const language = useLanguageStore(s => s.language)
  const setLanguage = useLanguageStore(s => s.setLanguage)

  const [slide, setSlide] = useState(0)

  // 显示条件：
  // - 全新用户（无 Key 且无课程）首次启动自动弹出
  // - 从设置页"重新查看新手引导"强制弹出（老用户显式请求不受拦截）
  const isFreshUser = !apiKey && courses.length === 0
  if (stage !== 'welcome' || (!isFreshUser && !forceWelcome)) return null

  const handleGoConfig = () => {
    startGuide()
    navigate('/settings/api')
  }

  const overviewSteps = [
    { icon: Key, titleKey: 'onboarding.step1Title', descKey: 'onboarding.step1Desc' },
    { icon: Upload, titleKey: 'onboarding.step2Title', descKey: 'onboarding.step2Desc' },
    { icon: Sparkles, titleKey: 'onboarding.step3Title', descKey: 'onboarding.step3Desc' },
  ] as const

  return (
    <div className={styles.overlay}>
      <div className={`liquid-glass ${styles.modal}`} onClick={e => e.stopPropagation()}>
        <button
          className={styles.closeBtn}
          onClick={skipGuide}
          aria-label={t('onboarding.skip')}
          title={t('onboarding.skip')}
        >
          <X size={18} strokeWidth={2} />
        </button>

        <div className={styles.body}>
          {slide === 0 && (
            <div className={styles.slide}>
              <div className={styles.heroIcon}>
                <Sparkles size={30} strokeWidth={1.8} />
              </div>
              <h2 className={styles.title}>{t('onboarding.welcomeTitle')}</h2>
              <p className={styles.subtitle}>{t('onboarding.welcomeSubtitle')}</p>
              <div className={styles.privacyNote}>
                <ShieldCheck size={14} strokeWidth={2} />
                <span>{t('onboarding.privacyNote')}</span>
              </div>
              <div className={styles.langSection}>
                <div className={styles.langLabel}>
                  <Globe size={13} strokeWidth={2} />
                  <span>{t('onboarding.languageLabel')}</span>
                </div>
                <div className={styles.langGrid}>
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`${styles.langChip} ${language === lang.code ? styles.langChipActive : ''}`}
                      onClick={() => setLanguage(lang.code as Language)}
                    >
                      <span className={styles.langFlag}>{lang.flag}</span>
                      <span className={styles.langName}>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {slide === 1 && (
            <div className={styles.slide}>
              <h2 className={styles.title}>{t('onboarding.overviewTitle')}</h2>
              <div className={styles.steps}>
                {overviewSteps.map((step, i) => {
                  const Icon = step.icon
                  return (
                    <div key={step.titleKey} className={styles.stepRow}>
                      <div className={styles.stepNum}>{i + 1}</div>
                      <div className={styles.stepIcon}>
                        <Icon size={20} strokeWidth={1.8} />
                      </div>
                      <div className={styles.stepText}>
                        <span className={styles.stepTitle}>{t(step.titleKey)}</span>
                        <span className={styles.stepDesc}>{t(step.descKey)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {slide === 2 && (
            <div className={styles.slide}>
              <div className={styles.heroIcon}>
                <Key size={28} strokeWidth={1.8} />
              </div>
              <h2 className={styles.title}>{t('onboarding.startTitle')}</h2>
              <p className={styles.subtitle}>{t('onboarding.startDesc')}</p>
              <button type="button" className={styles.primaryBtn} onClick={handleGoConfig}>
                <span>{t('onboarding.goConfig')}</span>
                <ArrowRight size={17} strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.skipBtn} onClick={skipGuide}>
            {t('onboarding.skip')}
          </button>
          <div className={styles.dots}>
            {Array.from({ length: SLIDE_COUNT }, (_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${slide === i ? styles.dotActive : ''}`}
              />
            ))}
          </div>
          <div className={styles.navBtns}>
            {slide > 0 && (
              <button
                type="button"
                className={styles.navBtn}
                onClick={() => setSlide(slide - 1)}
              >
                <ChevronLeft size={16} strokeWidth={2} />
                {t('onboarding.prev')}
              </button>
            )}
            {slide < SLIDE_COUNT - 1 && (
              <button
                type="button"
                className={styles.navBtnPrimary}
                onClick={() => setSlide(slide + 1)}
              >
                {t('onboarding.next')}
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
