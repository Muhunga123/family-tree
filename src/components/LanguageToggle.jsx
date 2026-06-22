import { useLanguage } from '../hooks/useLanguage'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ln', label: 'LN' },
  { code: 'sw', label: 'SW' },
]

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div
      className="max-w-[11rem] overflow-x-auto no-scrollbar sm:max-w-none"
      role="group"
      aria-label="Language"
    >
      <div className="flex w-max rounded-full border border-white/10 bg-white/5 p-0.5 backdrop-blur-md">
        {LANGUAGES.map(({ code, label }) => {
          const isActive = language === code
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code)}
              aria-pressed={isActive}
              className={`rounded-full px-2 py-1 font-sans-label text-[0.65rem] font-medium tracking-wide transition-colors sm:px-2.5 sm:text-[0.7rem] ${
                isActive ? 'bg-white text-black' : 'text-white/55 hover:text-white'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
