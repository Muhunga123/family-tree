const LANGUAGES = ['en', 'fr', 'ln', 'sw']

export function getLocalizedText(field, language, fallback = '') {
  if (!field) return fallback
  if (typeof field === 'string') return field

  const selected = field[language]
  if (selected) return selected

  for (const lang of LANGUAGES) {
    if (field[lang]) return field[lang]
  }

  return fallback
}
