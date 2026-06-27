import { useLanguageStore } from '@stores/languageStore'
import { translate, type TranslationKey } from './translations'

export function useT() {
  const language = useLanguageStore(s => s.language)
  return (key: TranslationKey) => translate(language, key)
}

export { translate, type TranslationKey } from './translations'
