import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { DURATION, EASE_LUXE } from '../utils/motion'

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
    const id = window.setTimeout(() => setVisible(true), 1200)
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
          className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex justify-center px-3 sm:px-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: DURATION.fade, ease: EASE_LUXE }}
        >
          <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/10 bg-ink-2/95 px-4 py-3.5 shadow-2xl backdrop-blur-xl">
            <p className="font-sans-label text-sm leading-relaxed text-white/85">
              {isIos ? (
                <>
                  <strong className="text-white">Add to Home Screen</strong> for the best experience on
                  your phone: tap the <strong className="text-white">Share</strong> button in Safari,
                  then <strong className="text-white">Add to Home Screen</strong>.
                </>
              ) : (
                <>
                  <strong className="text-white">Install this app</strong> on your phone: open the browser
                  menu → <strong className="text-white">Add to Home screen</strong> or{' '}
                  <strong className="text-white">Install app</strong>.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="touch-target mt-3 font-sans-label text-sm text-white/55 hover:text-white"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
