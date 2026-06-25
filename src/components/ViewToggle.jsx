import { motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import { useLanguage } from '../hooks/useLanguage'
import { DURATION, EASE_LUXE } from '../utils/motion'

const OPTIONS = [
  { id: 'focus', key: 'lens.lineage' },
  { id: 'overview', key: 'lens.overview' },
  { id: 'timeline', key: 'lens.timeline' },
  { id: 'map', key: 'lens.map' },
]

export default function ViewToggle() {
  const { viewMode, setViewMode, stopRelate, relateMode } = useTree()
  const { ui } = useLanguage()

  const pick = (id) => {
    if (relateMode) stopRelate()
    setViewMode(id)
  }

  return (
    <div className="flex w-max min-w-full items-center gap-0.5 rounded-full border border-white/10 bg-ink-2/85 p-0.5 shadow-lg backdrop-blur-xl sm:min-w-0">
      {OPTIONS.map((opt) => {
        const active = viewMode === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => pick(opt.id)}
            className="relative shrink-0 rounded-full px-2.5 py-1.5 font-sans-label text-[0.65rem] transition-colors sm:px-3 sm:py-1 sm:text-[0.72rem]"
          >
            {active && (
              <motion.span
                layoutId="view-toggle-pill"
                className="absolute inset-0 rounded-full bg-white"
                transition={{ duration: DURATION.pill, ease: EASE_LUXE }}
              />
            )}
            <span className={`relative z-10 ${active ? 'text-black' : 'text-white/55'}`}>
              {ui(opt.key)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
