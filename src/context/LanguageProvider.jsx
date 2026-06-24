import { useEffect, useMemo, useState } from 'react'
import { getLocalizedText } from '../utils/i18n'
import { getUIString } from '../utils/uiStrings'
import { LanguageContext } from './languageContext'

const STORAGE_KEY = 'family-tree-language'
const SUPPORTED = ['en', 'fr', 'ln', 'sw']

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof localStorage === 'undefined') return 'en'
    const saved = localStorage.getItem(STORAGE_KEY)
    return SUPPORTED.includes(saved) ? saved : 'en'
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, [language])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (field, fallback = '') => getLocalizedText(field, language, fallback),
      ui: (key, vars) => getUIString(key, language, vars),
    }),
    [language],
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}
