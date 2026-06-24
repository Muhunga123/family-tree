import { forwardRef } from 'react'
import {
  getAccent,
  getDisplayName,
  getInitials,
  generationGlow,
  isDeceased,
  memorialAvatarBackground,
  memorialAvatarFilter,
  memorialAvatarShadow,
  memorialGlow,
  memorialGlowOpacity,
  memorialInitialsColor,
} from '../utils/personColor'

/**
 * Shared circular avatar — living gradient or memorial grey treatment.
 * Used across overview, lineage, timeline, and search.
 */
const PersonAvatar = forwardRef(function PersonAvatar(
  {
    person,
    size = 64,
    isFocal = false,
    highlighted = false,
    maxDepth = 0,
    className = '',
    alt,
  },
  ref,
) {
  const accent = getAccent(person)
  const deceased = isDeceased(person)
  const displayName = alt ?? getDisplayName(person)
  const glow = deceased
    ? memorialGlow(isFocal)
    : generationGlow(person.generationDepth ?? 0, maxDepth, isFocal ? 0.85 : 0.5)
  const glowOpacity = deceased ? memorialGlowOpacity(isFocal) : isFocal ? 0.9 : 0.5
  const initialsClass = size >= 80 ? 'text-2xl' : size >= 56 ? 'text-base' : 'text-sm'

  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute rounded-full transition-opacity duration-300 ${deceased ? 'inset-[-6px] blur-lg' : 'inset-0 blur-md'}`}
        style={{
          background: `radial-gradient(circle, ${glow}, transparent 72%)`,
          opacity: glowOpacity,
        }}
      />
      <span
        ref={ref}
        className={`relative flex h-full w-full items-center justify-center rounded-full font-semibold ${deceased && !person.photo ? 'font-serif-display' : ''} ${!deceased || person.photo ? 'text-white' : ''}`}
        style={{
          background: deceased
            ? memorialAvatarBackground()
            : `linear-gradient(140deg, ${accent.from}, ${accent.to})`,
          color: deceased && !person.photo ? memorialInitialsColor() : '#fff',
          boxShadow: deceased
            ? memorialAvatarShadow({ isFocal, highlighted })
            : highlighted
              ? `0 0 0 3px rgba(255,255,255,0.95), 0 8px 30px ${accent.glow}`
              : isFocal
                ? `0 0 0 2px rgba(255,255,255,0.9), 0 8px 30px ${accent.glow}`
                : '0 0 0 1px rgba(255,255,255,0.14)',
        }}
      >
        {person.photo ? (
          <img
            src={person.photo}
            alt={displayName}
            className="h-full w-full rounded-full object-cover"
            loading="lazy"
            style={deceased ? { filter: memorialAvatarFilter() } : undefined}
          />
        ) : (
          <span className={initialsClass}>{getInitials(person.name)}</span>
        )}
      </span>
    </span>
  )
})

export default PersonAvatar
