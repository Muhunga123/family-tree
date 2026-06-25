import { AnimatePresence, motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import { useLanguage } from '../hooks/useLanguage'
import { getDisplayName } from '../utils/personColor'
import { findKinshipPath, classifyKinship } from '../utils/kinship'
import { DURATION, EASE_LUXE } from '../utils/motion'

export default function RelateBar() {
  const {
    relateMode,
    relateAnchorId,
    relateTargetId,
    people,
    stopRelate,
    resetRelate,
  } = useTree()
  const { t, ui } = useLanguage()

  const anchor = relateAnchorId ? people[relateAnchorId] : null
  const target = relateTargetId ? people[relateTargetId] : null

  let message
  if (!anchor) {
    message = ui('relate.pickFirst')
  } else if (!target) {
    message = `${getDisplayName(anchor, t(anchor.role))} → ${ui('relate.prompt')}`
  } else if (relateAnchorId === relateTargetId) {
    message = ui('relate.same')
  } else {
    const result = findKinshipPath(people, relateAnchorId, relateTargetId)
    if (!result) {
      message = ui('relate.none')
    } else {
      const { key, inlaw } = classifyKinship(result, target) || {}
      const term = ui(`kin.${key || 'related'}`)
      const inlawSuffix = inlaw ? ` (${ui('kin.inlaw')})` : ''
      const anchorName = getDisplayName(anchor, t(anchor.role))
      const targetName = getDisplayName(target, t(target.role))
      message = `${targetName} — ${term}${inlawSuffix} · ${anchorName}`
    }
  }

  return (
    <AnimatePresence>
      {relateMode && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-[calc(7.25rem+env(safe-area-inset-top))] z-40 flex justify-center px-3 sm:top-32 sm:px-4"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: DURATION.fade, ease: EASE_LUXE }}
        >
          <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-ink-2/90 px-4 py-2.5 shadow-2xl backdrop-blur-xl">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-white/55" aria-hidden="true">
              <circle cx="7" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9.2 9.2l5.6 5.6" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <p className="min-w-0 flex-1 font-sans-label text-xs text-white/80">{message}</p>
            {target && (
              <button
                type="button"
                onClick={resetRelate}
                className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 font-sans-label text-[0.65rem] text-white/70 hover:bg-white/10 hover:text-white"
              >
                ↺
              </button>
            )}
            <button
              type="button"
              onClick={stopRelate}
              aria-label="Close"
              className="shrink-0 rounded-full px-2 py-1 font-sans-label text-[0.65rem] text-white/55 hover:text-white"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
