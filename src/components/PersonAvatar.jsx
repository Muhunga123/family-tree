import { forwardRef } from 'react'
import {
  accentBulbLayers,
  defaultAvatarShadow,
  focalBulbShadow,
  FOCAL_ACCENT,
  getAccent,
  getDisplayName,
  getInitials,
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
 * Focal lineage nodes get a multi-layer accent “bulb” glow.
 */
const PersonAvatar = forwardRef(function PersonAvatar(
  {
    person,
    size = 64,
    isFocal = false,
    highlighted = false,
    className = '',
    alt,
  },
  ref,
) {
  const deceased = isDeceased(person)
  const accent = isFocal && !deceased ? FOCAL_ACCENT : getAccent(person)
  const displayName = alt ?? getDisplayName(person)
  const bulb = accentBulbLayers(accent)
  const initialsClass = size >= 80 ? 'text-2xl' : size >= 56 ? 'text-base' : 'text-sm'
  const showBulb = isFocal || highlighted

  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {showBulb && !deceased && (
        <>
          <span
            aria-hidden="true"
            className="avatar-bulb-outer pointer-events-none absolute rounded-full"
            style={{
              inset: '-34%',
              background: `radial-gradient(circle, ${bulb.core} 0%, ${bulb.mid} 28%, ${bulb.soft} 52%, transparent 72%)`,
              filter: 'blur(12px)',
            }}
          />
          <span
            aria-hidden="true"
            className="avatar-bulb-mid pointer-events-none absolute rounded-full"
            style={{
              inset: '-18%',
              background: `radial-gradient(circle, ${bulb.core} 0%, ${bulb.soft} 45%, transparent 68%)`,
              filter: 'blur(6px)',
            }}
          />
        </>
      )}

      {showBulb && deceased && (
        <span
          aria-hidden="true"
          className="avatar-bulb-outer pointer-events-none absolute rounded-full"
          style={{
            inset: '-36%',
            background: `radial-gradient(circle, ${memorialGlow(true)} 0%, transparent 68%)`,
            opacity: memorialGlowOpacity(true),
            filter: 'blur(12px)',
          }}
        />
      )}

      {!showBulb && deceased && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-6px] rounded-full blur-lg"
          style={{
            background: `radial-gradient(circle, ${memorialGlow(false)}, transparent 72%)`,
            opacity: memorialGlowOpacity(false),
          }}
        />
      )}

      <span
        ref={ref}
        className={`relative flex h-full w-full items-center justify-center rounded-full font-semibold ${deceased && !person.photo ? 'font-serif-display' : ''} ${!deceased || person.photo ? 'text-white' : ''}`}
        style={{
          background: deceased
            ? memorialAvatarBackground()
            : `linear-gradient(145deg, ${accent.from} 0%, ${accent.to} 100%)`,
          color: deceased && !person.photo ? memorialInitialsColor() : '#fff',
          boxShadow: deceased
            ? memorialAvatarShadow({ isFocal, highlighted })
            : showBulb
              ? focalBulbShadow(accent)
              : defaultAvatarShadow(),
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
          <span className={`${initialsClass} font-semibold tracking-tight`}>
            {getInitials(person.name)}
          </span>
        )}
      </span>
    </span>
  )
})

export default PersonAvatar
