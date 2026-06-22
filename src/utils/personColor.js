const PALETTE = [
  { bg: 'bg-amber-200', text: 'text-amber-900' },
  { bg: 'bg-rose-200', text: 'text-rose-900' },
  { bg: 'bg-sky-200', text: 'text-sky-900' },
  { bg: 'bg-emerald-200', text: 'text-emerald-900' },
  { bg: 'bg-violet-200', text: 'text-violet-900' },
  { bg: 'bg-orange-200', text: 'text-orange-900' },
  { bg: 'bg-teal-200', text: 'text-teal-900' },
  { bg: 'bg-fuchsia-200', text: 'text-fuchsia-900' },
]

export function getPersonColor(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

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

export function getAccent(person) {
  const key = person?.lineage || person?.id || 'x'
  return ACCENTS[hashId(key) % ACCENTS.length]
}
