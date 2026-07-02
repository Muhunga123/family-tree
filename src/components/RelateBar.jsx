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

  let headline
  let detail

  if (!anchor) {
    headline = ui('relate.pickFirst')
  } else if (!target) {
    headline = getDisplayName(anchor, t(anchor.role))
    detail = ui('relate.prompt')
  } else if (relateAnchorId === relateTargetId) {
    headline = ui('relate.same')
  } else {
    const result = findKinshipPath(people, relateAnchorId, relateTargetId)
    const targetName = getDisplayName(target, t(target.role))
    const anchorName = getDisplayName(anchor, t(anchor.role))

    if (!result) {
      headline = targetName
      detail = ui('relate.none')
    } else {
      const { key, inlaw } = classifyKinship(result, target) || {}
      const term = ui(`kin.${key || 'related'}`)
      const inlawSuffix = inlaw ? ` (${ui('kin.inlaw')})` : ''
      headline = targetName
      detail = ui('relate.result', {
        target: targetName,
        relation: `${term}${inlawSuffix}`,
        anchor: anchorName,
      })
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
          <div className="glass-panel pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl px-4 py-3">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-white/55" aria-hidden="true">
              <circle cx="7" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9.2 9.2l5.6 5.6" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="font-serif-display text-base leading-tight text-white">{headline}</p>
              {detail && (
                <p className="mt-1 font-sans-label text-xs leading-relaxed text-white/60">{detail}</p>
              )}
            </div>
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
