import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import { usePersonNavigation } from '../hooks/usePersonNavigation'
import { useLanguage } from '../hooks/useLanguage'
import { getAccent, getDisplayName, getInitials } from '../utils/personColor'
import { DURATION, EASE_LUXE } from '../utils/motion'

function placesOf(person) {
  const out = []
  if (person.birthPlace) {
    out.push({ label: person.birthPlace, kind: 'birth' })
  }
  for (const p of person.places ?? []) {
    if (typeof p === 'string') out.push({ label: p, kind: 'place' })
    else if (p && p.label) out.push({ label: p.label, lat: p.lat, lng: p.lng, kind: 'place' })
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
          map.set(key, {
            label: place.label,
            lat: place.lat,
            lng: place.lng,
            hasBirth: place.kind === 'birth',
            people: [],
          })
        }
        const g = map.get(key)
        if (place.kind === 'birth') g.hasBirth = true
        if (g.lat == null && place.lat != null) {
          g.lat = place.lat
          g.lng = place.lng
        }
        if (!g.people.some((p) => p.id === person.id)) g.people.push(person)
      }
    }
    return [...map.values()].sort((a, b) => {
      if (a.hasBirth !== b.hasBirth) return a.hasBirth ? -1 : 1
      return b.people.length - a.people.length
    })
  }, [people])

  const located = groups.filter((g) => g.lat != null && g.lng != null)

  return (
    <div className="h-full w-full overflow-y-auto px-4 pt-28 pb-28 sm:px-6 sm:pt-32">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        {located.length > 0 && (
          <motion.div
            className="glass-panel relative overflow-hidden rounded-3xl"
            style={{ aspectRatio: '2 / 1' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.fade, ease: EASE_LUXE }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 120% at 30% 20%, rgba(91,140,255,0.18), rgba(10,12,20,0.6))',
              }}
            />
            {located.map((g) => {
              const { x, y } = project(g.lat, g.lng, 100, 100)
              return (
                <span
                  key={g.label}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  title={g.label}
                >
                  <span
                    className={`block rounded-full shadow-[0_0_12px_rgba(255,255,255,0.65)] ${
                      g.hasBirth ? 'h-3 w-3 bg-white' : 'h-2 w-2 bg-white/70'
                    }`}
                  />
                </span>
              )
            })}
          </motion.div>
        )}

        {groups.length === 0 ? (
          <div className="glass-panel flex flex-col items-center gap-2 rounded-3xl px-6 py-12 text-center">
            <p className="font-serif-display text-lg text-white/80">{ui('label.places')}</p>
            <p className="font-sans-label text-sm text-white/45">{ui('misc.noOne')}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {groups.map((g, i) => (
              <motion.div
                key={g.label}
                className="glass-panel flex flex-col gap-2 rounded-3xl p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION.fade, ease: EASE_LUXE, delay: i * 0.04 }}
              >
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/50" aria-hidden="true">
                    <path
                      d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                  <h3 className="font-serif-display text-base text-white">{g.label}</h3>
                  {g.hasBirth && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 font-sans-label text-[0.58rem] tracking-wide text-white/45 uppercase">
                      {ui('label.birthPlace')}
                    </span>
                  )}
                  <span className="ml-auto font-sans-label text-[0.65rem] text-white/35">
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
                          style={{
                            background: `linear-gradient(140deg, ${accent.from}, ${accent.to})`,
                          }}
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
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
