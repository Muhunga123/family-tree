import { useTree } from '../hooks/useTree'
import { useLanguage } from '../hooks/useLanguage'

function BarButton({ label, onClick, primary, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`touch-target flex h-12 w-12 items-center justify-center rounded-full transition-colors sm:h-14 sm:w-14 ${
        primary
          ? 'bg-white text-black hover:bg-white/90'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export default function BottomBar() {
  const { goHome, setSearchOpen, openEditor, canEdit } = useTree()
  const { ui } = useLanguage()

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:p-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <nav className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-ink-2/80 p-1.5 shadow-2xl backdrop-blur-xl sm:gap-1.5 sm:p-2">
        <BarButton label={ui('action.home')} onClick={goHome}>
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path d="M4 11l8-7 8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 10v9h12v-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </BarButton>
        <BarButton label={ui('action.search')} onClick={() => setSearchOpen(true)}>
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </BarButton>
        {canEdit && (
          <BarButton label={ui('action.add')} primary onClick={() => openEditor({ mode: 'add' })}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
              <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </BarButton>
        )}
      </nav>
    </div>
  )
}
