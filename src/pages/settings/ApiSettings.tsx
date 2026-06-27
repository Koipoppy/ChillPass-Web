import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Save, Check, ExternalLink } from 'lucide-react'
import { useSettingsStore } from '@stores/settingsStore'
import styles from './SettingsSub.module.css'

export default function ApiSettings() {
  const navigate = useNavigate()

  const storeApiKey = useSettingsStore(s => s.apiKey)
  const storeModel = useSettingsStore(s => s.model)
  const setApiKey = useSettingsStore(s => s.setApiKey)
  const setModel = useSettingsStore(s => s.setModel)

  const [apiKey, setApiKeyInput] = useState(storeApiKey)
  const [model, setModelInput] = useState(storeModel)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  // 当 store 中的值被外部修改时，同步本地输入
  useEffect(() => {
    setApiKeyInput(storeApiKey)
  }, [storeApiKey])

  useEffect(() => {
    setModelInput(storeModel)
  }, [storeModel])

  const handleSave = () => {
    setApiKey(apiKey.trim())
    setModel(model)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
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
          <label className={styles.label}>API Key</label>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="请输入 DeepSeek API Key"
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
          <p className={styles.hint}>可在 DeepSeek 开放平台获取，数据仅保存在本地</p>
          <a
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkBtn}
            style={{ marginTop: '8px', display: 'inline-flex' }}
          >
            <ExternalLink size={14} strokeWidth={2} />
            <span>前往 DeepSeek 开放平台获取 API Key</span>
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
              <option value="deepseek-chat">deepseek-chat（通用对话，速度快）</option>
              <option value="deepseek-reasoner">deepseek-reasoner（深度推理，更精准）</option>
            </select>
          </div>
          <p className={styles.hint}>
            deepseek-chat 适合快速生成，deepseek-reasoner 适合复杂考点推理
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
    </div>
  )
}
