/**
 * 模型目录服务
 * - 内置回退目录：服务商接口不可用时展示（含本地化说明）
 * - 实时拉取：调用服务商 OpenAI 兼容的 GET /models 接口，获取账号实际可用模型
 */
import { translate, type TranslationKey } from '../i18n'
import { useLanguageStore } from '@stores/languageStore'
import { useSettingsStore } from '@stores/settingsStore'
import type { AIProvider } from '@stores/settingsStore'

/** 各服务商的模型列表接口（OpenAI 兼容：GET {base}/models） */
const MODEL_LIST_URL: Record<AIProvider, string> = {
  deepseek: 'https://api.deepseek.com/models',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4/models',
}

/** 内置回退目录：服务商接口不可用或未填 Key 时展示 */
export const BUILTIN_MODELS: Record<AIProvider, { id: string; descKey: TranslationKey }[]> = {
  deepseek: [
    { id: 'deepseek-flash', descKey: 'model.deepseekFlash' },
    { id: 'deepseek-v4-pro', descKey: 'model.deepseekV4Pro' },
  ],
  zhipu: [
    { id: 'glm-5.3-flash', descKey: 'model.glmFlash' },
    { id: 'glm-5.3', descKey: 'model.glm53' },
  ],
}

/**
 * 已知模型的说明键：用于给实时拉取回来的模型 ID 匹配本地化说明
 * 未收录的模型显示通用说明
 */
const KNOWN_MODEL_DESC: Record<string, TranslationKey> = {
  'deepseek-flash': 'model.deepseekFlash',
  'deepseek-v4-pro': 'model.deepseekV4Pro',
  'deepseek-v4-flash': 'model.deepseekV4FlashLegacy',
  'deepseek-v4-flash-vision-exp': 'model.deepseekVisionExp',
  'deepseek-chat': 'model.deepseekChatLegacy',
  'deepseek-reasoner': 'model.deepseekReasonerLegacy',
  'glm-5.3-flash': 'model.glmFlash',
  'glm-5.3': 'model.glm53',
}

/**
 * 已退役且调用会报错的模型 ID → 替代模型
 * deepseek-chat / deepseek-reasoner 已于 2026-07-24 退役，直接用会返回 404
 */
export const RETIRED_MODEL_ALIASES: Record<string, string> = {
  'deepseek-chat': 'deepseek-flash',
  'deepseek-reasoner': 'deepseek-flash',
}

/** 把历史遗留的失效模型 ID 归一化为当前可用模型 */
export function normalizeModelId(model: string): string {
  return RETIRED_MODEL_ALIASES[model] ?? model
}

/**
 * 模型的视觉（图片理解）能力
 * 仅标注已知不支持视觉的模型；未收录的模型返回 'unknown'，不做拦截
 */
const MODEL_VISION: Record<string, boolean> = {
  'deepseek-flash': true,
  'deepseek-v4-pro': false,
  'deepseek-v4-flash': true,
  'deepseek-v4-flash-vision-exp': true,
  'deepseek-chat': false,
  'deepseek-reasoner': false,
}

/** 该模型是否支持图片理解：'yes' / 'no' / 'unknown'（未收录） */
export function modelVisionSupport(model: string): 'yes' | 'no' | 'unknown' {
  const v = MODEL_VISION[model]
  return v === undefined ? 'unknown' : v ? 'yes' : 'no'
}

/** 取模型说明文案（未收录的模型返回通用说明） */
export function describeModel(model: string): string {
  const lang = useLanguageStore.getState().language
  const key = KNOWN_MODEL_DESC[model]
  return translate(lang, key ?? 'model.unknownDesc')
}

/** 该模型是否有内置说明 */
export function hasModelDescription(model: string): boolean {
  return !!KNOWN_MODEL_DESC[model]
}

/** 服务层抛错的本地化文本 */
function modelError(key: TranslationKey, map?: Record<string, string>): Error {
  let msg = translate(useLanguageStore.getState().language, key)
  for (const [k, v] of Object.entries(map ?? {})) msg = msg.replace(`{${k}}`, v)
  return new Error(msg)
}

/**
 * 实时拉取服务商当前可用的模型 ID 列表
 * 使用与对话接口相同的 API Key 做 Bearer 认证
 */
export async function fetchProviderModels(
  provider: AIProvider,
  apiKey: string,
  timeoutMs = 15000,
): Promise<string[]> {
  const key = apiKey.trim()
  if (!key) throw modelError('service.noApiKey')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(MODEL_LIST_URL[provider], {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw modelError('service.apiError', {
        code: String(res.status),
        msg: detail.slice(0, 200),
      })
    }

    const data = await res.json()
    const ids: string[] = Array.isArray(data?.data)
      ? data.data
          .map((m: { id?: unknown }) => (typeof m?.id === 'string' ? m.id : ''))
          .filter((id: string) => id.length > 0)
      : []

    // 去重并保持服务商返回的顺序
    return Array.from(new Set(ids))
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw modelError('service.timeout')
    }
    throw err instanceof Error ? err : modelError('common.unknownError')
  } finally {
    clearTimeout(timeoutId)
  }
}

/** 当前提供商已保存的 API Key */
export function getProviderKey(provider: AIProvider): string {
  const { apiKey, zhipuApiKey } = useSettingsStore.getState()
  return provider === 'zhipu' ? zhipuApiKey : apiKey
}
