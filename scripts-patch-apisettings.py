# ApiSettings.tsx i18n 批量替换
import io

PATH = 'src/pages/settings/ApiSettings.tsx'
with io.open(PATH, 'r', encoding='utf-8') as f:
    c = f.read()

R = []

R.append((
    "import styles from './SettingsSub.module.css'",
    "import { useT } from '../../i18n'\nimport styles from './SettingsSub.module.css'"
))
R.append((
    "export default function ApiSettings() {\n  const navigate = useNavigate()\n  const t = useT()",
    "export default function ApiSettings() {\n  const navigate = useNavigate()\n  const t = useT()"
))
R.append((
    "          aria-label=\"返回设置\"",
    "          aria-label={t('common.back')}",
))
R.append((
    "          <h2 className={styles.cardTitle}>模型接入</h2>\n          <p className={styles.cardDesc}>\n            配置 DeepSeek API Key 与模型，所有数据仅保存在本地，不会上传至任何第三方服务\n          </p>",
    "          <h2 className={styles.cardTitle}>{t('api.cardTitle')}</h2>\n          <p className={styles.cardDesc}>\n            {t('api.cardDesc')}\n          </p>",
))
R.append((
    "          <label className={styles.label}>接口提供商</label>",
    "          <label className={styles.label}>{t('api.provider')}</label>",
))
R.append((
    "              ? '使用智谱 AI 开放平台，国内访问友好，glm-5.3-flash 适合快速生成'\n              : '使用 DeepSeek 大模型，适合考点推理与内容生成'}",
    "              ? t('api.hintZhipu')\n              : t('api.hintDeepseek')}",
))
R.append((
    "          <label className={styles.label}>API Key</label>",
    "          <label className={styles.label}>{t('api.keyLabel')}</label>",
))
R.append((
    "              placeholder={isZhipu ? '请输入智谱 API Key' : '请输入 DeepSeek API Key'}",
    "              placeholder={isZhipu ? t('api.keyPhZhipu') : t('api.keyPhDeepseek')}",
))
R.append((
    "              aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}",
    "              aria-label={showKey ? t('api.hideKey') : t('api.showKey')}",
))
R.append((
    "            {isZhipu ? '可在智谱开放平台获取，数据仅保存在本地' : '可在 DeepSeek 开放平台获取，数据仅保存在本地'}",
    "            {isZhipu ? t('api.keyHintZhipu') : t('api.keyHintDeepseek')}",
))
R.append((
    "            <span>{isZhipu ? '前往智谱开放平台获取 API Key' : '前往 DeepSeek 开放平台获取 API Key'}</span>",
    "            <span>{isZhipu ? t('api.linkZhipu') : t('api.linkDeepseek')}</span>",
))
R.append((
    "          <label className={styles.label}>模型</label>",
    "          <label className={styles.label}>{t('api.modelLabel')}</label>",
))
R.append((
    "              ? 'glm-5.3-flash 适合快速生成，glm-5.3 适合复杂考点推理'\n              : 'deepseek-chat 适合快速生成，deepseek-reasoner 适合复杂考点推理'}",
    "              ? t('api.modelHintZhipu')\n              : t('api.modelHintDeepseek')}",
))
R.append((
    "            保存设置\n          </button>",
    "            {t('api.save')}\n          </button>",
))
R.append((
    "              已保存\n            </span>",
    "              {t('common.saved')}\n            </span>",
))

missing = []
for i, (old, new) in enumerate(R):
    if old not in c:
        missing.append((i, old[:70]))
        continue
    c = c.replace(old, new, 1)

if missing:
    print('MISSING:', len(missing))
    for i, s in missing:
        print(' ', i, repr(s))
else:
    with io.open(PATH, 'w', encoding='utf-8', newline='') as f:
        f.write(c)
    print('ApiSettings patched: all', len(R), 'replacements applied')
