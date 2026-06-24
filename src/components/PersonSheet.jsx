import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import { useLanguage } from '../hooks/useLanguage'
import { lifespanLabel } from '../utils/neighborhood'
import { getAccent, getDisplayName, getInitials } from '../utils/personColor'
import MemoriesPanel from './MemoriesPanel'

function RelationChips({ title, ids, people, onPick, t }) {
  const list = ids.map((id) => people[id]).filter(Boolean)
  if (list.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-sans-label text-[0.65rem] tracking-[0.18em] text-white/35 uppercase">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {list.map((person) => (
          <button
            key={person.id}
            type="button"
            onClick={() => onPick(person.id)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pr-3 pl-1 transition-colors hover:bg-white/10"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[0.6rem] font-semibold text-white"
              style={{ background: `linear-gradient(140deg, ${getAccent(person).from}, ${getAccent(person).to})` }}
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
        ))}
      </div>
    </div>
  )
}

export default function PersonSheet() {
  const {
    selectedPerson,
    closePerson,
    people,
    navigateTo,
    openEditor,
    cloudEnabled,
    canEdit,
    relateFrom,
    setViewMode,
  } = useTree()
  const { t, ui } = useLanguage()

  useEffect(() => {
    if (!selectedPerson) return
    const onKey = (e) => {
      if (e.key === 'Escape') closePerson()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedPerson, closePerson])

  const pickRelative = (id) => {
    closePerson()
    navigateTo(id)
  }

  return (
    <AnimatePresence>
      {selectedPerson && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-end md:items-stretch"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={closePerson}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-[min(88dvh,900px)] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-2/95 shadow-2xl backdrop-blur-2xl md:h-full md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-3xl md:border-l"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            <div className="flex justify-center pt-3 md:hidden">
              <span className="h-1.5 w-10 rounded-full bg-white/20" />
            </div>

            <div className="flex items-start justify-between px-6 pt-4">
              <div className="flex items-center gap-4">
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-white"
                  style={{
                    background: `linear-gradient(140deg, ${getAccent(selectedPerson).from}, ${getAccent(selectedPerson).to})`,
                    boxShadow: `0 8px 30px ${getAccent(selectedPerson).glow}`,
                  }}
                >
                  {selectedPerson.photo ? (
                    <img src={selectedPerson.photo} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    getInitials(selectedPerson.name)
                  )}
                </span>
                <div>
                  <h2 className="font-serif-display text-2xl text-white">
                    {getDisplayName(selectedPerson, t(selectedPerson.role))}
                  </h2>
                  <p className="mt-0.5 font-sans-label text-xs tracking-wide text-white/45 [font-variant-caps:small-caps]">
                    {[t(selectedPerson.role), lifespanLabel(selectedPerson)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePerson}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-6 overflow-y-auto px-5 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
              <div className="flex flex-col gap-2">
                <h3 className="font-sans-label text-[0.65rem] tracking-[0.18em] text-white/35 uppercase">
                  {ui('label.story')}
                </h3>
                <p className="font-serif-display text-base leading-relaxed text-white/80">
                  {t(selectedPerson.story, ui('misc.noStory'))}
                </p>
              </div>

              <RelationChips title={ui('label.parents')} ids={selectedPerson.parentIds} people={people} onPick={pickRelative} t={t} />
              <RelationChips title={ui('label.partner')} ids={selectedPerson.partnerIds} people={people} onPick={pickRelative} t={t} />
              <RelationChips title={ui('label.siblings')} ids={selectedPerson.siblingIds} people={people} onPick={pickRelative} t={t} />
              <RelationChips title={ui('label.children')} ids={selectedPerson.childIds} people={people} onPick={pickRelative} t={t} />

              <MemoriesPanel personId={selectedPerson.id} />

              <button
                type="button"
                onClick={() => {
                  relateFrom(selectedPerson.id)
                  setViewMode('overview')
                  closePerson()
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-sans-label text-sm text-white/75 transition-colors hover:bg-white/5"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <circle cx="7" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="17" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M9.2 9.2l5.6 5.6" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                {ui('action.relate')}
              </button>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => pickRelative(selectedPerson.id)}
                  className={`rounded-2xl bg-white/10 px-4 py-3.5 font-sans-label text-sm text-white transition-colors hover:bg-white/15 ${canEdit ? 'flex-1' : 'w-full'}`}
                >
                  {ui('action.center')}
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      openEditor({ mode: 'edit', personId: selectedPerson.id })
                      closePerson()
                    }}
                    className="flex-1 rounded-2xl bg-white px-4 py-3.5 font-sans-label text-sm font-medium text-black transition-colors hover:bg-white/90"
                  >
                    {ui('action.edit')}
                  </button>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    openEditor({ mode: 'add', relativeTo: selectedPerson.id })
                    closePerson()
                  }}
                  className="rounded-2xl border border-white/10 px-4 py-3.5 font-sans-label text-sm text-white/80 transition-colors hover:bg-white/5"
                >
                  {ui('action.addRelative')}
                </button>
              )}
              {!cloudEnabled && canEdit && (
                <p className="text-center font-sans-label text-[0.65rem] text-white/30">
                  Editing in preview mode — changes reset on reload until the cloud is connected.
                </p>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
