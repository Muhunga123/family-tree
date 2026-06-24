import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import { useLanguage } from '../hooks/useLanguage'
import { lifespanLabel } from '../utils/neighborhood'
import { getDisplayName } from '../utils/personColor'
import PersonAvatar from './PersonAvatar'

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen, peopleList, navigateTo, setViewMode } = useTree()
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (searchOpen) setQuery('')
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen, setSearchOpen])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return peopleList
    return peopleList.filter((p) => {
      const name = getDisplayName(p, t(p.role)).toLowerCase()
      const role = (t(p.role) || '').toLowerCase()
      return name.includes(q) || role.includes(q)
    })
  }, [query, peopleList, t])

  const pick = (id) => {
    navigateTo(id)
    setViewMode('focus')
    setSearchOpen(false)
  }

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col bg-ink/80 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:gap-4 sm:pt-10">
            <div className="flex items-center gap-3">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/40" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search any relative..."
                  className="w-full bg-transparent font-sans-label text-base text-white placeholder:text-white/35 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="rounded-2xl px-3 py-3 font-sans-label text-sm text-white/60 transition-colors hover:text-white"
              >
                Done
              </button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-xl flex-1 overflow-y-auto px-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <ul className="flex flex-col gap-1">
              {results.map((person) => {
                const name = getDisplayName(person, t(person.role))
                const lifespan = lifespanLabel(person)
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => pick(person.id)}
                      className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-white/5"
                    >
                      <PersonAvatar person={person} size={44} />
                      <span className="flex flex-col">
                        <span className="font-serif-display text-white">{name}</span>
                        <span className="font-sans-label text-xs text-white/45">
                          {[t(person.role), lifespan].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
              {results.length === 0 && (
                <li className="px-2 py-8 text-center font-sans-label text-sm text-white/40">
                  No matches for "{query}"
                </li>
              )}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
