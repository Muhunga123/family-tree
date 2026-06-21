import { useLanguage } from '../hooks/useLanguage'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ln', label: 'LN' },
]

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div
      className="fixed top-4 right-4 z-40 flex rounded-full border border-stone-200/80 bg-cream/95 p-1 shadow-sm backdrop-blur-sm"
      role="group"
      aria-label="Language"
    >
      {LANGUAGES.map(({ code, label }) => {
        const isActive = language === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            aria-pressed={isActive}
            className={`rounded-full px-3 py-1.5 font-sans-label text-xs tracking-wide transition-colors [font-variant-caps:small-caps] ${
              isActive
                ? 'bg-stone-800 text-cream'
                : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-800'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
