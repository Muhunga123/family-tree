import { useMemo } from 'react'
import { useTree } from '../hooks/useTree'
import { usePersonNavigation } from '../hooks/usePersonNavigation'
import { useLanguage } from '../hooks/useLanguage'
import { getAccent, getDisplayName, getInitials } from '../utils/personColor'

// Normalizes a person's places into { label, lat?, lng? } entries.
function placesOf(person) {
  const out = []
  if (person.birthPlace) out.push({ label: person.birthPlace })
  for (const p of person.places ?? []) {
    if (typeof p === 'string') out.push({ label: p })
    else if (p && p.label) out.push({ label: p.label, lat: p.lat, lng: p.lng })
  }
  return out
}

function project(lat, lng, w, h) {
  const x = ((Number(lng) + 180) / 360) * w
  const y = ((90 - Number(lat)) / 180) * h
  return { x, y }
}

export default function MapCanvas() {
  const { people } = useTree()
  const handleTap = usePersonNavigation()
  const { t, ui } = useLanguage()

  const groups = useMemo(() => {
    const map = new Map()
    for (const person of Object.values(people)) {
      for (const place of placesOf(person)) {
        const key = place.label.trim().toLowerCase()
        if (!key) continue
        if (!map.has(key)) {
          map.set(key, { label: place.label, lat: place.lat, lng: place.lng, people: [] })
        }
        const g = map.get(key)
        if (g.lat == null && place.lat != null) {
          g.lat = place.lat
          g.lng = place.lng
        }
        if (!g.people.some((p) => p.id === person.id)) g.people.push(person)
      }
    }
    return [...map.values()].sort((a, b) => b.people.length - a.people.length)
  }, [people])

  const located = groups.filter((g) => g.lat != null && g.lng != null)

  return (
    <div className="h-full w-full overflow-y-auto px-4 pt-28 pb-28 sm:px-6 sm:pt-32">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        {located.length > 0 && (
          <div
            className="relative overflow-hidden rounded-3xl border border-white/10"
            style={{
              aspectRatio: '2 / 1',
              background:
                'radial-gradient(120% 120% at 30% 20%, rgba(91,140,255,0.18), rgba(10,12,20,0.6))',
            }}
          >
            {located.map((g) => {
              const { x, y } = project(g.lat, g.lng, 100, 100)
              return (
                <span
                  key={g.label}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  title={g.label}
                >
                  <span className="block h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
                </span>
              )
            })}
          </div>
        )}

        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-white/10 bg-white/5 px-6 py-12 text-center">
            <p className="font-serif-display text-lg text-white/80">{ui('label.places')}</p>
            <p className="font-sans-label text-sm text-white/45">
              {ui('misc.noOne')}
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/50" aria-hidden="true">
                  <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                <h3 className="font-serif-display text-base text-white">{g.label}</h3>
                <span className="font-sans-label text-[0.65rem] text-white/35">
                  {g.people.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.people.map((person) => {
                  const accent = getAccent(person)
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => handleTap(person.id)}
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pr-3 pl-1 transition-colors hover:bg-white/10"
                    >
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[0.6rem] font-semibold text-white"
                        style={{ background: `linear-gradient(140deg, ${accent.from}, ${accent.to})` }}
                      >
                        {person.photo ? (
                          <img src={person.photo} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          getInitials(person.name)
                        )}
                      </span>
                      <span className="font-sans-label text-sm text-white/80">
                        {getDisplayName(person, t(person.role))}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
