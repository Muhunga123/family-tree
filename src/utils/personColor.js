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
