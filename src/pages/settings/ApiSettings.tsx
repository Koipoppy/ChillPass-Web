import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Save,
  Check,
  ExternalLink,
  Trash2,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react'
import { useSettingsStore, PROVIDER_DEFAULT_MODEL } from '@stores/settingsStore'
import type { AIProvider } from '@stores/settingsStore'
import {
  BUILTIN_MODELS,
  describeModel,
  fetchProviderModels,
} from '@services/modelCatalog'
import { useTokenStore, dateKey } from '@stores/tokenStore'
import { useT } from '../../i18n'
import styles from './SettingsSub.module.css'

export default function ApiSettings() {
  const navigate = useNavigate()
  const t = useT()

  const tokenTotal = useTokenStore(s => s.total)
  const callCount = useTokenStore(s => s.callCount)
  const dailyUsage = useTokenStore(s => s.daily)
  const resetStats = useTokenStore(s => s.resetStats)

  const provider = useSettingsStore(s => s.provider)
  const storeApiKey = useSettingsStore(s => s.apiKey)
  const storeZhipuKey = useSettingsStore(s => s.zhipuApiKey)
  const storeModel = useSettingsStore(s => s.model)
  const setProvider = useSettingsStore(s => s.setProvider)
  const setApiKey = useSettingsStore(s => s.setApiKey)
  const setZhipuApiKey = useSettingsStore(s => s.setZhipuApiKey)
  const setModel = useSettingsStore(s => s.setModel)

  const isZhipu = provider === 'zhipu'
  const storedKey = isZhipu ? storeZhipuKey : storeApiKey

  const [apiKey, setApiKeyInput] = useState(storedKey)
  const [model, setModelInput] = useState(storeModel)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  // ── 模型列表：实时拉取 + 悬停说明 ──
  const [liveModels, setLiveModels] = useState<string[] | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [hoveredModel, setHoveredModel] = useState<string | null>(null)
  const modelBoxRef = useRef<HTMLDivElement>(null)

  // 当 store 中的值被外部修改时，同步本地输入
  useEffect(() => {
    setApiKeyInput(isZhipu ? storeZhipuKey : storeApiKey)
  }, [isZhipu, storeZhipuKey, storeApiKey])

  useEffect(() => {
    setModelInput(storeModel)
  }, [storeModel])

  // 切换提供商：模型切换为该提供商默认模型，并清空上一个提供商的实时列表
  useEffect(() => {
    setLiveModels(null)
    setFetchError('')
  }, [provider])

  /** 拉取服务商当前可用的模型列表 */
  const handleFetchModels = async () => {
    const key = apiKey.trim() || storedKey.trim()
    if (!key) {
      setFetchError(t('api.modelNeedKey'))
      return
    }
    setFetching(true)
    setFetchError('')
    try {
      const ids = await fetchProviderModels(provider, key)
      setLiveModels(ids)
    } catch (err) {
      setLiveModels(null)
      setFetchError(
        t('api.modelRefreshFailed').replace(
          '{msg}',
          err instanceof Error ? err.message : t('about.unknownError'),
        ),
      )
    } finally {
      setFetching(false)
    }
  }

  // 已保存过 Key 时自动拉取一次，省去用户手动点击
  useEffect(() => {
    if (!storedKey.trim()) return
    let cancelled = false
    setFetching(true)
    setFetchError('')
    fetchProviderModels(provider, storedKey)
      .then(ids => {
        if (!cancelled) setLiveModels(ids)
      })
      .catch(() => {
        // 自动拉取失败不打扰用户，仅保留内置列表
        if (!cancelled) setLiveModels(null)
      })
      .finally(() => {
        if (!cancelled) setFetching(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, storedKey])

  // 点击外部或按 Esc 关闭下拉
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (modelBoxRef.current && !modelBoxRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  // 下拉选项：实时列表优先，否则用内置列表；始终保留当前已选模型
  const modelOptions = useMemo(() => {
    const base =
      liveModels && liveModels.length > 0
        ? liveModels
        : BUILTIN_MODELS[provider].map(m => m.id)
    const list = [...base]
    if (model && !list.includes(model)) list.unshift(model)
    return list
  }, [liveModels, provider, model])

  // 悬停说明：优先显示光标停留的选项，否则显示当前所选模型
  const tipModel = hoveredModel ?? model

  // 切换提供商：模型自动切换为该提供商的默认模型
  const handleProviderChange = (next: AIProvider) => {
    if (next === provider) return
    setProvider(next)
    setModelInput(PROVIDER_DEFAULT_MODEL[next])
  }

  const handleSave = () => {
    if (isZhipu) setZhipuApiKey(apiKey.trim())
    else setApiKey(apiKey.trim())
    setModel(model)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  // ── Token 统计 ──
  const todayUsage = dailyUsage[dateKey()]

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = dateKey(d)
      return {
        key,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        usage: dailyUsage[key]?.total ?? 0,
      }
    })
  }, [dailyUsage])

  const maxDayUsage = Math.max(...last7Days.map(d => d.usage), 0)

  const handleResetStats = () => {
    if (window.confirm(t('tokens.resetConfirm'))) resetStats()
  }

  return (
    <div className={`${styles.subPage} fade-in`}>
      <header className={styles.subHeader}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/settings')}
          aria-label={t('common.back')}
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t('settings.api')}</h1>
          <p className={styles.subtitle}>{t('api.subtitle')}</p>
        </div>
      </header>

      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{t('api.cardTitle')}</h2>
          <p className={styles.cardDesc}>
            {t('api.cardDesc')}
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('api.provider')}</label>
          <div className={styles.providerGroup}>
            <button
              type="button"
              className={`${styles.providerOption} ${!isZhipu ? styles.providerOptionActive : ''}`}
              onClick={() => handleProviderChange('deepseek')}
            >
              DeepSeek
            </button>
            <button
              type="button"
              className={`${styles.providerOption} ${isZhipu ? styles.providerOptionActive : ''}`}
              onClick={() => handleProviderChange('zhipu')}
            >
              {t('api.providerZhipu')}
            </button>
          </div>
          <p className={styles.hint}>
            {isZhipu
              ? t('api.hintZhipu')
              : t('api.hintDeepseek')}
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('api.keyLabel')}</label>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder={isZhipu ? t('api.keyPhZhipu') : t('api.keyPhDeepseek')}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => setShowKey(s => !s)}
              aria-label={showKey ? t('api.hideKey') : t('api.showKey')}
            >
              {showKey ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
            </button>
          </div>
          <p className={styles.hint}>
            {isZhipu ? t('api.keyHintZhipu') : t('api.keyHintDeepseek')}
          </p>
          <a
            href={isZhipu ? 'https://open.bigmodel.cn' : 'https://platform.deepseek.com/api_keys'}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkBtn}
            style={{ marginTop: '8px', display: 'inline-flex' }}
          >
            <ExternalLink size={14} strokeWidth={2} />
            <span>{isZhipu ? t('api.linkZhipu') : t('api.linkDeepseek')}</span>
          </a>
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label}>{t('api.modelLabel')}</label>
            <button
              type="button"
              className={styles.fetchBtn}
              onClick={handleFetchModels}
              disabled={fetching}
            >
              <RefreshCw
                size={13}
                strokeWidth={2.2}
                className={fetching ? styles.spinIcon : undefined}
              />
              <span>{fetching ? t('api.modelRefreshing') : t('api.modelRefresh')}</span>
            </button>
          </div>

          <div className={styles.modelSelect} ref={modelBoxRef}>
            {/* 悬停说明面板：光标停在选项或当前模型上时显示 */}
            {tipModel && (
              <div className={styles.modelTip} role="tooltip">
                {describeModel(tipModel)}
              </div>
            )}

            <button
              type="button"
              className={`${styles.modelTrigger} ${menuOpen ? styles.modelTriggerOpen : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              onMouseEnter={() => setHoveredModel(null)}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
            >
              <span className={styles.modelTriggerId}>{model}</span>
              <ChevronDown
                size={16}
                strokeWidth={2}
                className={`${styles.modelChevron} ${menuOpen ? styles.modelChevronOpen : ''}`}
              />
            </button>

            {menuOpen && (
              <div className={styles.modelMenu} role="listbox">
                {modelOptions.map(id => (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={id === model}
                    className={`${styles.modelOption} ${id === model ? styles.modelOptionActive : ''}`}
                    onMouseEnter={() => setHoveredModel(id)}
                    onFocus={() => setHoveredModel(id)}
                    onClick={() => {
                      setModelInput(id)
                      setMenuOpen(false)
                      setHoveredModel(null)
                    }}
                  >
                    <span className={styles.modelOptionId}>{id}</span>
                    {id === model && <Check size={14} strokeWidth={2.5} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 拉取状态 */}
          {fetchError ? (
            <p className={styles.modelStatusError}>
              <AlertTriangle size={13} strokeWidth={2.2} />
              <span>{fetchError}</span>
            </p>
          ) : liveModels ? (
            <p className={styles.modelStatusOk}>
              <Check size={13} strokeWidth={2.5} />
              <span>
                {t('api.modelRefreshOk').replace('{count}', String(liveModels.length))}
                {' · '}
                {t('api.modelLiveHint')}
              </span>
            </p>
          ) : (
            <p className={styles.hint}>{t('api.modelBuiltinHint')}</p>
          )}

          <p className={styles.hint}>{t('api.modelHoverHint')}</p>
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={handleSave}>
            <Save size={16} strokeWidth={2} />
            {t('api.save')}
          </button>
          {saved && (
            <span className={styles.savedTip}>
              <Check size={14} strokeWidth={2.5} />
              {t('common.saved')}
            </span>
          )}
        </div>
      </section>

      {/* Token 用量统计 */}
      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{t('tokens.title')}</h2>
          <p className={styles.cardDesc}>{t('tokens.desc')}</p>
        </div>

        {callCount === 0 ? (
          <p className={styles.tokensEmpty}>{t('tokens.empty')}</p>
        ) : (
          <>
            <div className={styles.tokensGrid}>
              <div className={styles.tokenStat}>
                <span className={styles.tokenNum}>{tokenTotal.total.toLocaleString()}</span>
                <span className={styles.tokenLabel}>{t('tokens.total')}</span>
                <span className={styles.tokenDetail}>
                  {t('tokens.prompt')} {tokenTotal.prompt.toLocaleString()}
                  {' · '}
                  {t('tokens.completion')} {tokenTotal.completion.toLocaleString()}
                </span>
              </div>
              <div className={styles.tokenStat}>
                <span className={styles.tokenNum}>{todayUsage?.total.toLocaleString() ?? '0'}</span>
                <span className={styles.tokenLabel}>{t('tokens.today')}</span>
                <span className={styles.tokenDetail}>
                  {t('tokens.calls')} {callCount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className={styles.tokenChart}>
              <div className={styles.tokenChartTitle}>{t('tokens.last7')}</div>
              <div className={styles.tokenChartBars}>
                {last7Days.map(d => (
                  <div key={d.key} className={styles.tokenBarCol}>
                    <div className={styles.tokenBar}>
                      <div
                        className={styles.tokenBarFill}
                        style={{
                          height:
                            d.usage > 0
                              ? `${Math.max((d.usage / maxDayUsage) * 100, 6)}%`
                              : '2%',
                        }}
                        title={d.usage.toLocaleString()}
                      />
                    </div>
                    <span className={styles.tokenBarLabel}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.ghostBtn} onClick={handleResetStats}>
                <Trash2 size={16} strokeWidth={2} />
                {t('tokens.reset')}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
