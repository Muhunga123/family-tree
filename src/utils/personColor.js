export function getInitials(name) {
  const initials = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return initials || '?'
}

export function getDisplayName(person, roleLabel = '') {
  if (person.name) return person.name
  return roleLabel
}

// Refined accent palette tuned for a dark glass UI. Each person gets a stable
// accent used for their avatar gradient, ring, and glow.
const ACCENTS = [
  { from: '#7c6cff', to: '#5b8cff', glow: 'rgba(124,108,255,0.45)' },
  { from: '#ff6cab', to: '#ff8f6c', glow: 'rgba(255,108,171,0.42)' },
  { from: '#27d3c4', to: '#3aa0ff', glow: 'rgba(39,211,196,0.42)' },
  { from: '#f7b955', to: '#ff7a59', glow: 'rgba(247,185,85,0.42)' },
  { from: '#9b6cff', to: '#d36cff', glow: 'rgba(155,108,255,0.42)' },
  { from: '#54d68b', to: '#2bb6c9', glow: 'rgba(84,214,139,0.42)' },
  { from: '#5b8cff', to: '#7c6cff', glow: 'rgba(91,140,255,0.42)' },
  { from: '#ff8f6c', to: '#ff6cab', glow: 'rgba(255,143,108,0.42)' },
]

function hashId(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Purple accent for the focal lineage person (design mock). */
export const FOCAL_ACCENT = {
  from: '#9b6cff',
  to: '#7c6cff',
  glow: 'rgba(155, 108, 255, 0.42)',
}

/** Layered rgba stops for the focal “light bulb” halo. */
export function accentBulbLayers(accent) {
  return {
    core: hexToRgba(accent.from, 0.32),
    mid: hexToRgba(accent.from, 0.18),
    soft: hexToRgba(accent.to, 0.1),
    whisper: hexToRgba(accent.from, 0.05),
  }
}

/** Soft colored bloom — no white rim. */
export function focalBulbShadow(accent) {
  const layers = accentBulbLayers(accent)
  return [
    `0 0 12px 3px ${layers.mid}`,
    `0 0 28px 10px ${layers.soft}`,
    `0 0 48px 18px ${layers.whisper}`,
  ].join(', ')
}

/** Default avatar ring for non-focal lineage nodes. */
export function defaultAvatarShadow() {
  return '0 0 0 1px rgba(255,255,255,0.18), 0 4px 14px rgba(0,0,0,0.35)'
}

export function getAccent(person) {
  const key = person?.lineage || person?.id || 'x'
  return ACCENTS[hashId(key) % ACCENTS.length]
}

export function isDeceased(person) {
  return Boolean(person?.deathYear || person?.deathDate)
}

/** Muted avatar treatment for deceased relatives — much greyer, with a soft silvery glow. */
export function memorialAvatarBackground() {
  return 'linear-gradient(145deg, #737378 0%, #525256 52%, #3f3f43 100%)'
}

export function memorialAvatarFilter() {
  return 'grayscale(1) saturate(0.08) brightness(0.78) contrast(0.92)'
}

export function memorialInitialsColor() {
  return '#d8d4cc'
}

/** Shady silvery halo — muted grey with a gentle bright center. */
export function memorialGlow(isFocal = false) {
  return isFocal ? 'rgba(228, 228, 234, 0.45)' : 'rgba(198, 200, 208, 0.58)'
}

export function memorialGlowOpacity(isFocal = false) {
  return isFocal ? 0.55 : 0.68
}

export function memorialAvatarShadow({ isFocal = false, highlighted = false } = {}) {
  if (highlighted) {
    return '0 0 20px rgba(210, 212, 220, 0.35)'
  }
  if (isFocal) {
    return '0 0 18px rgba(205, 207, 215, 0.28), inset 0 1px 0 rgba(255,255,255,0.1)'
  }
  return '0 0 0 1px rgba(255,255,255,0.16), 0 0 16px rgba(185, 187, 195, 0.32), inset 0 1px 0 rgba(255,255,255,0.1)'
}

// Generational warmth ramp: the oldest generation glows warm gold; each
// descending generation cools toward soft blue. Returns an rgba() string.
const WARM = [247, 201, 120]
const COOL = [150, 190, 255]

export function generationGlow(depth = 0, maxDepth = 0, alpha = 0.5) {
  const ratio = maxDepth > 0 ? Math.min(1, Math.max(0, depth / maxDepth)) : 0
  const c = WARM.map((w, i) => Math.round(w + (COOL[i] - w) * ratio))
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}
