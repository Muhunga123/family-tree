import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import { useLanguage } from '../hooks/useLanguage'
import { findTodaysPeople } from '../utils/anniversaries'
import { getDisplayName } from '../utils/personColor'

export default function TodayBanner() {
  const { people, navigateTo, setViewMode, relateMode } = useTree()
  const { t, ui } = useLanguage()
  const [dismissed, setDismissed] = useState(false)

  const today = useMemo(() => findTodaysPeople(people), [people])
  const entry = today.birthdays[0]
    ? { person: today.birthdays[0], key: 'today.birthday' }
    : today.memorials[0]
      ? { person: today.memorials[0], key: 'today.remembering' }
      : null

  const show = entry && !dismissed && !relateMode

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={() => {
            navigateTo(entry.person.id)
            setViewMode('focus')
            setDismissed(true)
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute inset-x-0 top-[calc(7.25rem+env(safe-area-inset-top))] z-20 mx-auto flex w-fit max-w-[92vw] items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-2 backdrop-blur-md sm:top-28 sm:max-w-[90%] sm:px-4"
        >
          <span className="text-sm">🕯️</span>
          <span className="font-sans-label text-xs text-amber-100/90">
            {ui(entry.key, { name: getDisplayName(entry.person, t(entry.person.role)) })}
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              setDismissed(true)
            }}
            className="ml-1 font-sans-label text-xs text-amber-100/60 hover:text-amber-100"
          >
            ✕
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
