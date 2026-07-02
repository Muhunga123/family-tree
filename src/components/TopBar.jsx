import { useRef, useState } from 'react'
import { useTree } from '../hooks/useTree'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import LanguageToggle from './LanguageToggle'
import ViewToggle from './ViewToggle'
import AdminSignInModal from './AdminSignInModal'
import GlassIconButton from './GlassIconButton'

export default function TopBar() {
  const {
    tree,
    focusPerson,
    canGoBack,
    goBack,
    goHome,
    setShareOpen,
    canEdit,
    setViewMode,
    setStoryActive,
    relateMode,
    startRelate,
    stopRelate,
  } = useTree()
  const { cloudEnabled, session } = useAuth()
  const { ui } = useLanguage()
  const [adminSignInOpen, setAdminSignInOpen] = useState(false)
  const longPressTimer = useRef(null)

  const playStory = () => {
    stopRelate()
    goHome()
    setViewMode('focus')
    setStoryActive(true)
  }

  const startLongPress = () => {
    if (!cloudEnabled || session) return
    longPressTimer.current = setTimeout(() => setAdminSignInOpen(true), 700)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-1.5 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-0.5 sm:gap-2 sm:px-5 sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
            {canGoBack && (
              <GlassIconButton label="Back" onClick={goBack}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </GlassIconButton>
            )}
            <div className="min-w-0 flex-1">
              <span
                className="flex min-w-0 items-center gap-1.5 font-serif-display text-base leading-tight text-white/90 sm:gap-2 sm:text-lg"
                onPointerDown={startLongPress}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span className="truncate">{tree?.name ?? 'Family'}</span>
                {canEdit && (
                  <span className="hidden shrink-0 rounded-full bg-white/10 px-2 py-0.5 font-sans-label text-[0.6rem] tracking-wide text-white/55 uppercase sm:inline">
                    {ui('label.admin')}
                  </span>
                )}
              </span>
              {focusPerson && (
                <span className="hidden font-sans-label text-[0.65rem] tracking-wide text-white/40 sm:block">
                  {ui('label.viewingLineage')}
                </span>
              )}
            </div>
          </div>

          <div className="pointer-events-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <LanguageToggle />
            <GlassIconButton label={ui('action.play')} onClick={playStory}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M8 5l11 7-11 7z" fill="currentColor" />
              </svg>
            </GlassIconButton>
            <GlassIconButton
              label={ui('action.relate')}
              onClick={relateMode ? stopRelate : startRelate}
              active={relateMode}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <circle cx="7" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="17" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M9.2 9.2l5.6 5.6" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </GlassIconButton>
            <GlassIconButton label={ui('title.familyAccess')} onClick={() => setShareOpen(true)}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M17 8h4M19 6v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </GlassIconButton>
          </div>
        </div>

        <div className="pointer-events-auto -mx-1 overflow-x-auto px-1 no-scrollbar sm:mx-0 sm:flex sm:justify-center">
          <ViewToggle />
        </div>
      </header>

      <AdminSignInModal
        open={adminSignInOpen && !session}
        onClose={() => setAdminSignInOpen(false)}
      />
    </>
  )
}
