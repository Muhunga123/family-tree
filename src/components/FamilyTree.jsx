import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import familyData from '../data/family.json'
import LanguageToggle from './LanguageToggle'
import TimelineSlider from './TimelineSlider'
import { useLanguage } from '../hooks/useLanguage'
import { buildFamilyLayout } from '../utils/familyLayout'
import { getDisplayName, getInitials, getPersonColor } from '../utils/personColor'
import {
  getBirthYearRange,
  isPersonVisibleAtYear,
} from '../utils/timeline'

function SpouseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-rose-400"
      aria-hidden="true"
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="currentColor"
      />
    </svg>
  )
}

function PersonPanel({ personId, person, onClose, isOpen }) {
  const { t } = useLanguage()
  useEffect(() => {
    if (!personId) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [personId, onClose])

  if (!personId || !person) return null

  const colors = getPersonColor(personId)
  const displayName = getDisplayName(person, t(person.role))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end md:items-stretch">
      <button
        type="button"
        aria-label="Close panel"
        className={`absolute inset-0 bg-stone-900/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-panel-title"
        className={`relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-cream shadow-2xl transition-transform duration-300 ease-out md:h-full md:max-h-none md:w-full md:max-w-md md:rounded-none md:rounded-l-2xl ${
          isOpen
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-200/80 px-5 py-4">
          <h2
            id="person-panel-title"
            className="font-serif-display text-xl italic text-stone-800"
          >
            {displayName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-200/60 hover:text-stone-800"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-6">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold shadow-sm ring-2 ring-white/80 ${colors.bg} ${colors.text}`}
            >
              {person.photo ? (
                <img
                  src={person.photo}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                getInitials(person.name)
              )}
            </div>
            <div>
              <p className="font-sans-label text-xs tracking-wide text-stone-500 [font-variant-caps:small-caps]">
                {t(person.role)}
              </p>
              {person.birthYear && (
                <p className="mt-1 font-sans-label text-sm text-stone-600">
                  Born {person.birthYear}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-sans-label text-xs tracking-wide text-stone-500 [font-variant-caps:small-caps]">
              Story
            </h3>
            <p className="mt-2 font-serif-display text-base leading-relaxed text-stone-700">
              {t(person.story, 'No story yet.')}
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}

function PersonNode({ id, person, registerRef, onSelect, isVisible }) {
  const { t } = useLanguage()
  const colors = getPersonColor(id)
  const displayName = getDisplayName(person, t(person.role))

  return (
    <button
      type="button"
      ref={(el) => registerRef(`person-${id}`, el)}
      data-person-id={id}
      disabled={!isVisible}
      onClick={() => onSelect(id)}
      aria-hidden={!isVisible}
      className={`flex w-24 flex-col items-center gap-2 rounded-lg p-1 transition-opacity duration-300 sm:w-28 ${
        isVisible
          ? 'cursor-pointer opacity-100 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400'
          : 'pointer-events-none cursor-default opacity-20'
      }`}
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold shadow-sm ring-2 ring-white/80 sm:h-20 sm:w-20 sm:text-xl ${colors.bg} ${colors.text}`}
      >
        {person.photo ? (
          <img
            src={person.photo}
            alt={displayName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          getInitials(person.name)
        )}
      </div>
      <div className="text-center">
        <p className="font-serif-display text-base italic leading-tight text-stone-800 sm:text-lg">
          {displayName}
        </p>
        <p className="mt-0.5 font-sans-label text-[0.65rem] tracking-wide text-stone-500 [font-variant-caps:small-caps] sm:text-xs">
          {t(person.role)}
        </p>
      </div>
    </button>
  )
}

function FamilyUnit({ unit, people, registerRef, onSelect, isPersonVisible }) {
  if (unit.type === 'couple') {
    const [leftId, rightId] = unit.ids
    const leftVisible = isPersonVisible(people[leftId])
    const rightVisible = isPersonVisible(people[rightId])
    const heartVisible = leftVisible && rightVisible

    return (
      <div
        ref={(el) => registerRef(`unit-${unit.key}`, el)}
        data-unit-key={unit.key}
        className="flex items-start gap-2 sm:gap-3"
      >
        <PersonNode
          id={leftId}
          person={people[leftId]}
          registerRef={registerRef}
          onSelect={onSelect}
          isVisible={leftVisible}
        />
        <div
          ref={(el) => registerRef(`spouse-${unit.key}`, el)}
          className={`flex h-16 items-center transition-opacity duration-300 sm:h-20 ${
            heartVisible ? 'opacity-100' : 'opacity-20'
          }`}
          aria-hidden={!heartVisible}
        >
          <SpouseIcon />
        </div>
        <PersonNode
          id={rightId}
          person={people[rightId]}
          registerRef={registerRef}
          onSelect={onSelect}
          isVisible={rightVisible}
        />
      </div>
    )
  }

  const id = unit.ids[0]
  return (
    <div
      ref={(el) => registerRef(`unit-${unit.key}`, el)}
      data-unit-key={unit.key}
    >
      <PersonNode
        id={id}
        person={people[id]}
        registerRef={registerRef}
        onSelect={onSelect}
        isVisible={isPersonVisible(people[id])}
      />
    </div>
  )
}

function rightAnglePath(from, to, bendOffset = 24) {
  const startX = from.centerX
  const startY = from.bottom
  const endX = to.centerX
  const endY = to.top
  const midY = startY + bendOffset

  return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`
}

function ConnectionOverlay({ parentChildLinks, rects, size, isUnitVisible }) {
  if (!size.width || !size.height) return null

  const paths = []

  for (const link of parentChildLinks) {
    const from = rects[`unit-${link.fromUnitKey}`]
    if (!from) continue

    const fromVisible = isUnitVisible(link.fromUnitKey)

    for (const toKey of link.toUnitKeys) {
      const to = rects[`unit-${toKey}`]
      if (!to) continue

      const toVisible = isUnitVisible(toKey)
      const linkVisible = fromVisible && toVisible

      paths.push({
        key: `parent-${link.fromUnitKey}-${toKey}`,
        d: rightAnglePath(from, to),
        stroke: '#a8a29e',
        strokeWidth: 1.5,
        opacity: linkVisible ? 0.85 : 0.15,
      })
    }
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      width={size.width}
      height={size.height}
      aria-hidden="true"
    >
      {paths.map((path) => (
        <path
          key={path.key}
          d={path.d}
          fill="none"
          stroke={path.stroke}
          strokeWidth={path.strokeWidth}
          strokeOpacity={path.opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

export default function FamilyTree({ data = familyData }) {
  const people = data.people
  const layout = useMemo(() => buildFamilyLayout(people), [people])
  const { min: minYear, max: maxYear } = useMemo(
    () => getBirthYearRange(people),
    [people],
  )

  const scrollRef = useRef(null)
  const contentRef = useRef(null)
  const nodeRefs = useRef(new Map())
  const [rects, setRects] = useState({})
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [selectedPersonId, setSelectedPersonId] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [timelineYear, setTimelineYear] = useState(maxYear)

  const unitPersonIds = useMemo(() => {
    const map = new Map()
    for (const units of layout.generations) {
      for (const unit of units) {
        map.set(unit.key, unit.ids)
      }
    }
    return map
  }, [layout])

  const isPersonVisible = useCallback(
    (person) => isPersonVisibleAtYear(person, timelineYear),
    [timelineYear],
  )

  const isUnitVisible = useCallback(
    (unitKey) => {
      const ids = unitPersonIds.get(unitKey) ?? []
      return ids.every((id) => isPersonVisible(people[id]))
    },
    [unitPersonIds, people, isPersonVisible],
  )

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    window.setTimeout(() => setSelectedPersonId(null), 300)
  }, [])

  const openPanel = useCallback((id) => {
    setSelectedPersonId((currentId) => {
      if (!currentId) {
        setPanelOpen(false)
        requestAnimationFrame(() => setPanelOpen(true))
      } else {
        setPanelOpen(true)
      }
      return id
    })
  }, [])

  const handleTimelineChange = useCallback(
    (year) => {
      setTimelineYear(year)
      if (
        selectedPersonId &&
        !isPersonVisibleAtYear(people[selectedPersonId], year)
      ) {
        closePanel()
      }
    },
    [selectedPersonId, people, closePanel],
  )

  const registerRef = useCallback((key, el) => {
    if (el) {
      nodeRefs.current.set(key, el)
    } else {
      nodeRefs.current.delete(key)
    }
  }, [])

  const measure = useCallback(() => {
    const content = contentRef.current
    if (!content) return

    const contentRect = content.getBoundingClientRect()
    const nextRects = {}

    nodeRefs.current.forEach((el, key) => {
      const rect = el.getBoundingClientRect()
      nextRects[key] = {
        left: rect.left - contentRect.left,
        right: rect.right - contentRect.left,
        top: rect.top - contentRect.top,
        bottom: rect.bottom - contentRect.top,
        centerX: rect.left - contentRect.left + rect.width / 2,
        width: rect.width,
        height: rect.height,
      }
    })

    setRects(nextRects)
    setSize({
      width: content.scrollWidth,
      height: content.scrollHeight,
    })
  }, [])

  useLayoutEffect(() => {
    measure()

    const content = contentRef.current
    if (!content) return

    const observer = new ResizeObserver(measure)
    observer.observe(content)

    const scrollEl = scrollRef.current
    if (scrollEl) observer.observe(scrollEl)

    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [layout, measure])

  return (
    <div className="flex h-dvh w-full flex-col bg-cream">
      <LanguageToggle />

      <header className="shrink-0 border-b border-stone-200/80 bg-cream/95 px-4 py-4 pr-36 backdrop-blur-sm sm:px-6 sm:pr-40">
        <h1 className="font-serif-display text-2xl italic text-stone-800 sm:text-3xl">
          Family Tree
        </h1>
        <p className="mt-1 font-sans-label text-xs tracking-wide text-stone-500 [font-variant-caps:small-caps]">
          Generations of our family
        </p>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain touch-pan-x touch-pan-y pb-24"
      >
        <div
          ref={contentRef}
          className="relative inline-flex min-w-full flex-col items-center gap-16 px-6 py-10 sm:gap-20 sm:px-10 sm:py-14"
        >
          <ConnectionOverlay
            parentChildLinks={layout.parentChildLinks}
            rects={rects}
            size={size}
            isUnitVisible={isUnitVisible}
          />

          {layout.generations.map((units, generationIndex) => (
            <div
              key={`generation-${generationIndex}`}
              className="flex flex-wrap items-start justify-center gap-10 sm:gap-16 md:gap-20"
            >
              {units.map((unit) => (
                <FamilyUnit
                  key={unit.key}
                  unit={unit}
                  people={people}
                  registerRef={registerRef}
                  onSelect={openPanel}
                  isPersonVisible={isPersonVisible}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <TimelineSlider
        minYear={minYear}
        maxYear={maxYear}
        year={timelineYear}
        onChange={handleTimelineChange}
      />

      <PersonPanel
        personId={selectedPersonId}
        person={selectedPersonId ? people[selectedPersonId] : null}
        onClose={closePanel}
        isOpen={panelOpen}
      />
    </div>
  )
}
