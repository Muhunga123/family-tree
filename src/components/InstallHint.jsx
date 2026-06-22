import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

export default function InstallHint() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isMobile() || isStandalone()) return
    if (localStorage.getItem('install-hint-dismissed')) return
    const id = window.setTimeout(() => setVisible(true), 2000)
    return () => window.clearTimeout(id)
  }, [])

  const dismiss = () => {
    localStorage.setItem('install-hint-dismissed', '1')
    setVisible(false)
  }

  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex justify-center px-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
        >
          <div className="pointer-events-auto max-w-sm rounded-2xl border border-white/10 bg-ink-2/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <p className="font-sans-label text-sm leading-relaxed text-white/80">
              {isIos ? (
                <>
                  Add to Home Screen: tap <strong className="text-white">Share</strong> →{' '}
                  <strong className="text-white">Add to Home Screen</strong> for the best phone experience.
                </>
              ) : (
                <>
                  Install this app: open the browser menu → <strong className="text-white">Add to Home screen</strong> or{' '}
                  <strong className="text-white">Install app</strong>.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="mt-2 font-sans-label text-xs text-white/45 hover:text-white"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
