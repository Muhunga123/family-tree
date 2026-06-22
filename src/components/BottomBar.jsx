import { useTree } from '../hooks/useTree'

function BarButton({ label, onClick, primary, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
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

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <nav className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-2/80 p-2 shadow-2xl backdrop-blur-xl">
        <BarButton label="Home" onClick={goHome}>
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path d="M4 11l8-7 8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 10v9h12v-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </BarButton>
        <BarButton label="Search" onClick={() => setSearchOpen(true)}>
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </BarButton>
        {canEdit && (
          <BarButton label="Add person" primary onClick={() => openEditor({ mode: 'add' })}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
              <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </BarButton>
        )}
      </nav>
    </div>
  )
}
