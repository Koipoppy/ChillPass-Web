import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Save, Check, ExternalLink, Trash2 } from 'lucide-react'
import { useSettingsStore, PROVIDER_MODELS, PROVIDER_DEFAULT_MODEL } from '@stores/settingsStore'
import type { AIProvider } from '@stores/settingsStore'
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

  // 当 store 中的值被外部修改时，同步本地输入
  useEffect(() => {
    setApiKeyInput(isZhipu ? storeZhipuKey : storeApiKey)
  }, [isZhipu, storeZhipuKey, storeApiKey])

  useEffect(() => {
    setModelInput(storeModel)
  }, [storeModel])

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
          aria-label="返回设置"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <div className={styles.headerText}>
          <h1 className={styles.title}>API 配置</h1>
          <p className={styles.subtitle}>接入 DeepSeek 大模型，用于提炼考点与生成课程</p>
        </div>
      </header>

      <section className={`liquid-glass ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>模型接入</h2>
          <p className={styles.cardDesc}>
            配置 DeepSeek API Key 与模型，所有数据仅保存在本地，不会上传至任何第三方服务
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>接口提供商</label>
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
              智谱 GLM
            </button>
          </div>
          <p className={styles.hint}>
            {isZhipu
              ? '使用智谱 AI 开放平台，国内访问友好，glm-5.3-flash 适合快速生成'
              : '使用 DeepSeek 大模型，适合考点推理与内容生成'}
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>API Key</label>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder={isZhipu ? '请输入智谱 API Key' : '请输入 DeepSeek API Key'}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => setShowKey(s => !s)}
              aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
            >
              {showKey ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
            </button>
          </div>
          <p className={styles.hint}>
            {isZhipu ? '可在智谱开放平台获取，数据仅保存在本地' : '可在 DeepSeek 开放平台获取，数据仅保存在本地'}
          </p>
          <a
            href={isZhipu ? 'https://open.bigmodel.cn' : 'https://platform.deepseek.com/api_keys'}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkBtn}
            style={{ marginTop: '8px', display: 'inline-flex' }}
          >
            <ExternalLink size={14} strokeWidth={2} />
            <span>{isZhipu ? '前往智谱开放平台获取 API Key' : '前往 DeepSeek 开放平台获取 API Key'}</span>
          </a>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>模型</label>
          <div className={styles.selectWrap}>
            <select
              className={styles.select}
              value={model}
              onChange={e => setModelInput(e.target.value)}
            >
              {PROVIDER_MODELS[provider].map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <p className={styles.hint}>
            {isZhipu
              ? 'glm-5.3-flash 适合快速生成，glm-5.3 适合复杂考点推理'
              : 'deepseek-chat 适合快速生成，deepseek-reasoner 适合复杂考点推理'}
          </p>
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={handleSave}>
            <Save size={16} strokeWidth={2} />
            保存设置
          </button>
          {saved && (
            <span className={styles.savedTip}>
              <Check size={14} strokeWidth={2.5} />
              已保存
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
