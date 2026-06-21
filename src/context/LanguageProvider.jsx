import { useMemo, useState } from 'react'
import { getLocalizedText } from '../utils/i18n'
import { LanguageContext } from './languageContext'

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en')

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (field, fallback = '') => getLocalizedText(field, language, fallback),
    }),
    [language],
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}
