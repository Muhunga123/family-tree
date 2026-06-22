import { motion } from 'motion/react'
import { useLanguage } from '../hooks/useLanguage'
import { lifespanLabel } from '../utils/neighborhood'
import { getAccent, getDisplayName, getInitials } from '../utils/personColor'

const SIZES = {
  focal: { avatar: 'h-24 w-24 text-2xl', name: 'text-lg', width: 'w-32' },
  default: { avatar: 'h-16 w-16 text-lg', name: 'text-sm', width: 'w-24' },
  small: { avatar: 'h-12 w-12 text-sm', name: 'text-xs', width: 'w-20' },
}

export default function PersonCard({
  person,
  variant = 'default',
  onTap,
  onLongPress,
  label,
}) {
  const { t } = useLanguage()
  const size = SIZES[variant] ?? SIZES.default
  const accent = getAccent(person)
  const displayName = getDisplayName(person, t(person.role))
  const role = t(person.role)
  const lifespan = lifespanLabel(person)
  const isFocal = variant === 'focal'

  return (
    <motion.button
      type="button"
      layout
      onClick={() => onTap?.(person.id)}
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault()
          onLongPress(person.id)
        }
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      whileTap={{ scale: 0.95 }}
      className={`group flex shrink-0 flex-col items-center gap-2 ${size.width} rounded-2xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
    >
      <span className="relative inline-flex items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full blur-md transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle, ${accent.glow}, transparent 70%)`,
            opacity: isFocal ? 0.9 : 0.45,
          }}
        />
        <span
          className={`relative flex items-center justify-center rounded-full font-semibold text-white ${size.avatar}`}
          style={{
            background: `linear-gradient(140deg, ${accent.from}, ${accent.to})`,
            boxShadow: isFocal
              ? `0 0 0 2px rgba(255,255,255,0.9), 0 8px 30px ${accent.glow}`
              : '0 0 0 1px rgba(255,255,255,0.14)',
          }}
        >
          {person.photo ? (
            <img
              src={person.photo}
              alt={displayName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            getInitials(person.name)
          )}
        </span>
      </span>

      <span className="flex flex-col items-center gap-0.5 text-center">
        {label && (
          <span className="font-sans-label text-[0.6rem] tracking-[0.18em] text-white/40 uppercase">
            {label}
          </span>
        )}
        <span
          className={`font-serif-display leading-tight text-white ${size.name}`}
        >
          {displayName}
        </span>
        {lifespan && (
          <span className="font-sans-label text-[0.65rem] text-white/45">
            {lifespan}
          </span>
        )}
        {role && !label && (
          <span className="font-sans-label text-[0.6rem] tracking-[0.14em] text-white/35 [font-variant-caps:small-caps]">
            {role}
          </span>
        )}
      </span>
    </motion.button>
  )
}
