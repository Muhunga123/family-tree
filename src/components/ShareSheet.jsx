import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import { DURATION, EASE_LUXE } from '../utils/motion'

export default function ShareSheet() {
  const { shareOpen, setShareOpen, cloudEnabled, canEdit, actions, publicAccess } =
    useTree()
  const { signOut } = useAuth()
  const { ui } = useLanguage()
  const [publicBusy, setPublicBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const togglePublic = async () => {
    setPublicBusy(true)
    try {
      await actions.setPublicAccess(!publicAccess)
    } finally {
      setPublicBusy(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <AnimatePresence>
      {shareOpen && (
        <motion.div
          className="fixed inset-0 z-[65] flex items-end justify-center md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fade, ease: EASE_LUXE }}
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={() => setShareOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-[min(92dvh,900px)] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-2/95 shadow-2xl backdrop-blur-2xl md:max-w-md md:rounded-3xl"
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: DURATION.sheet, ease: EASE_LUXE }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="font-serif-display text-xl text-white">{ui('title.familyAccess')}</h2>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto px-5 py-5">
              {!cloudEnabled ? (
                <p className="font-sans-label text-sm leading-relaxed text-white/50">
                  Sharing unlocks once the cloud is connected. You are in local preview mode.
                </p>
              ) : (
                <>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={togglePublic}
                      disabled={publicBusy}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10 disabled:opacity-50"
                    >
                      <span className="font-sans-label text-sm text-white/80">
                        {publicAccess ? ui('public.on') : ui('public.off')}
                      </span>
                      <span
                        className={`relative h-6 w-11 rounded-full transition-colors ${publicAccess ? 'bg-white' : 'bg-white/15'}`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${publicAccess ? 'left-[1.4rem] bg-black' : 'left-0.5 bg-white/80'}`}
                        />
                      </span>
                    </button>
                  )}

                  {publicAccess ? (
                    <div className="flex flex-col gap-3">
                      <p className="font-sans-label text-sm leading-relaxed text-white/55">
                        {ui('public.linkHint')}
                      </p>
                      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                        <span className="min-w-0 flex-1 truncate font-sans-label text-sm text-white/70">
                          {shareUrl}
                        </span>
                        <button
                          type="button"
                          onClick={copyLink}
                          className="shrink-0 rounded-lg bg-white px-3 py-2 font-sans-label text-xs font-medium text-black transition-colors hover:bg-white/90"
                        >
                          {copied ? ui('public.copied') : ui('public.copyLink')}
                        </button>
                      </div>
                      <p className="font-sans-label text-[0.65rem] leading-relaxed text-white/30">
                        {ui('public.viewOnly')}
                      </p>
                    </div>
                  ) : canEdit ? (
                    <p className="font-sans-label text-sm leading-relaxed text-white/50">
                      {ui('public.enableFirst')}
                    </p>
                  ) : (
                    <p className="font-sans-label text-sm leading-relaxed text-white/50">
                      This tree is private. Ask the family admin for the link.
                    </p>
                  )}

                  {canEdit && (
                    <button
                      type="button"
                      onClick={signOut}
                      className="mt-2 rounded-xl border border-white/10 px-4 py-3.5 font-sans-label text-sm text-white/70 transition-colors hover:bg-white/5"
                    >
                      {ui('action.signOut')}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
