import { useTree } from '../hooks/useTree'
import LanguageToggle from './LanguageToggle'

export default function TopBar() {
  const { tree, focusPerson, canGoBack, goBack, setShareOpen, canEdit } = useTree()

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 p-4 sm:p-5">
      <div className="pointer-events-auto flex items-center gap-2">
        {canGoBack && (
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur-md transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div className="flex flex-col leading-none">
          <span className="flex items-center gap-2 font-serif-display text-lg text-white/90">
            {tree?.name ?? 'Family'}
            {canEdit && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 font-sans-label text-[0.6rem] tracking-wide text-white/55 uppercase">
                Admin
              </span>
            )}
          </span>
          {focusPerson && (
            <span className="font-sans-label text-[0.65rem] tracking-wide text-white/40">
              Viewing lineage
            </span>
          )}
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <LanguageToggle />
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="Share and members"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur-md transition-colors hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M17 8h4M19 6v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}
