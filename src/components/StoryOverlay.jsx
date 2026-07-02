import { AnimatePresence, motion } from 'motion/react'
import { useLanguage } from '../hooks/useLanguage'
import { getDisplayName } from '../utils/personColor'
import { DURATION, EASE_LUXE } from '../utils/motion'

export default function StoryOverlay({
  active,
  captionPerson,
  captionBody,
  labelKey,
  labelVars,
  stepIndex,
  totalSteps,
  voiceOn,
  onVoiceToggle,
  onStop,
}) {
  const { t, ui } = useLanguage()

  if (!active || !captionPerson) return null

  const generationLabel = labelKey ? ui(labelKey, labelVars) : ui('story.title')

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={stepIndex}
          className="pointer-events-none absolute inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 sm:bottom-32"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: DURATION.fade, ease: EASE_LUXE }}
        >
          <div className="glass-panel pointer-events-auto w-full max-w-lg rounded-2xl px-6 py-5 text-center">
            <p className="font-sans-label text-[0.62rem] tracking-[0.2em] text-white/45 uppercase">
              {generationLabel}
            </p>
            <p className="mt-2 font-serif-display text-xl leading-tight text-white sm:text-2xl">
              {getDisplayName(captionPerson, t(captionPerson.role))}
            </p>
            <p className="mt-3 line-clamp-4 font-serif-display text-[0.95rem] leading-relaxed text-white/70 sm:text-base">
              {captionBody}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === stepIndex ? 'w-6 bg-white/85' : 'w-1.5 bg-white/25'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onVoiceToggle}
                className={`rounded-full border px-4 py-1.5 font-sans-label text-xs transition-colors ${
                  voiceOn
                    ? 'border-white/25 bg-white/12 text-white'
                    : 'border-white/12 text-white/55 hover:bg-white/8 hover:text-white/80'
                }`}
                aria-pressed={voiceOn}
              >
                {voiceOn ? ui('story.mute') : ui('story.listen')}
              </button>
              <button
                type="button"
                onClick={onStop}
                className="rounded-full border border-white/12 px-4 py-1.5 font-sans-label text-xs text-white/55 transition-colors hover:bg-white/8 hover:text-white"
              >
                {ui('action.stop')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
