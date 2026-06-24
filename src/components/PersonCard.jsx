import { forwardRef } from 'react'
import { motion } from 'motion/react'
import { useLanguage } from '../hooks/useLanguage'
import { lifespanLabel } from '../utils/neighborhood'
import { getDisplayName } from '../utils/personColor'
import { SLOT } from '../utils/lineageLayout'
import PersonAvatar from './PersonAvatar'

const SIZES = {
  focal: { avatar: 96, name: 'text-lg', width: 'w-32' },
  default: { avatar: 64, name: 'text-sm', width: 'w-24' },
  small: { avatar: 48, name: 'text-xs', width: 'w-20' },
}

export default forwardRef(function PersonCard(
  {
    person,
    variant = 'default',
    positioned = false,
    style,
    onTap,
    onLongPress,
    label,
    maxDepth = 0,
    dimmed = false,
    highlighted = false,
  },
  avatarRef,
) {
  const { t } = useLanguage()
  const size = SIZES[variant] ?? SIZES.default
  const slot = SLOT[variant] ?? SLOT.default
  const displayName = getDisplayName(person, t(person.role))
  const role = t(person.role)
  const lifespan = lifespanLabel(person)
  const isFocal = variant === 'focal'

  const inner = (
    <>
      <PersonAvatar
        ref={avatarRef}
        person={person}
        size={positioned ? slot.avatar : size.avatar}
        isFocal={isFocal}
        highlighted={highlighted}
        maxDepth={maxDepth}
      />

      <span
        className="flex w-full flex-col items-center gap-0.5 text-center"
        style={positioned ? { height: slot.textH, paddingTop: 8 } : undefined}
      >
        {label && (
          <span className="font-sans-label text-[0.6rem] tracking-[0.18em] text-white/40 uppercase">
            {label}
          </span>
        )}
        <span
          className={`line-clamp-2 font-serif-display leading-tight text-white ${size.name}`}
        >
          {displayName}
        </span>
        {lifespan && (
          <span className="font-sans-label text-[0.65rem] text-white/45">
            {lifespan}
          </span>
        )}
        {role && !label && (
          <span className="line-clamp-1 font-sans-label text-[0.6rem] tracking-[0.14em] text-white/35 [font-variant-caps:small-caps]">
            {role}
          </span>
        )}
      </span>
    </>
  )

  const baseClass = positioned
    ? 'absolute flex flex-col items-center outline-none transition-opacity duration-300 focus-visible:ring-2 focus-visible:ring-white/40'
    : `group flex shrink-0 flex-col items-center gap-2 ${size.width} rounded-2xl p-2 outline-none transition-opacity duration-300 focus-visible:ring-2 focus-visible:ring-white/40`

  const positionedStyle = positioned
    ? {
        left: style?.left,
        top: style?.top,
        width: slot.cardW,
        height: slot.cardH,
        padding: slot.pad,
        opacity: dimmed ? 0.28 : 1,
      }
    : { ...style, opacity: dimmed ? 0.28 : 1 }

  if (positioned) {
    return (
      <button
        type="button"
        onClick={() => onTap?.(person.id)}
        onContextMenu={(e) => {
          if (onLongPress) {
            e.preventDefault()
            onLongPress(person.id)
          }
        }}
        className={baseClass}
        style={positionedStyle}
      >
        {inner}
      </button>
    )
  }

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
      animate={{ opacity: dimmed ? 0.28 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      whileTap={{ scale: 0.95 }}
      className={baseClass}
      style={style}
    >
      {inner}
    </motion.button>
  )
})
