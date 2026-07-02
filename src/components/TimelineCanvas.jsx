import { useEffect, useMemo, useRef } from 'react'
import { useTree } from '../hooks/useTree'
import { useLanguage } from '../hooks/useLanguage'
import { useViewportFitPadding } from '../hooks/useViewportFitPadding'
import { useTreeViewport, viewportTransformStyle } from '../hooks/useTreeViewport'
import { buildTimeline, timelineRowBounds } from '../utils/timelineLayout'
import { lifespanLabel } from '../utils/neighborhood'
import { getAccent, getDisplayName } from '../utils/personColor'
import { usePersonNavigation } from '../hooks/usePersonNavigation'
import { DURATION } from '../utils/motion'
import PersonAvatar from './PersonAvatar'
import ZoomControls from './ZoomControls'

const WIDTH = 560
const RAIL_X = 70

function LifeRail({ row, maxLifespan, accent, memorial }) {
  if (!row.birthYear) return null
  const widthPct = Math.min(100, Math.round((row.lifespanYears / maxLifespan) * 100))
  const endLabel = row.deathYear ? `${row.birthYear} – †${row.deathYear}` : `${row.birthYear} –`

  return (
    <span className="mt-1 flex min-w-0 flex-col gap-1">
      <span className="font-sans-label text-[0.6rem] tracking-wide text-white/40">{endLabel}</span>
      <span className="relative h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-white/8">
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${widthPct}%`,
            background: memorial
              ? 'linear-gradient(90deg, rgba(160,160,170,0.35), rgba(120,120,130,0.55))'
              : `linear-gradient(90deg, ${accent.from}, ${accent.to})`,
            opacity: memorial ? 0.85 : 0.9,
          }}
        />
      </span>
    </span>
  )
}

export default function TimelineCanvas() {
  const { people, focusId } = useTree()
  const handleTap = usePersonNavigation()
  const { t, ui } = useLanguage()
  const contentRef = useRef(null)
  const fitPadding = useViewportFitPadding()
  const lastFocusKey = useRef('')

  const layout = useMemo(() => buildTimeline(people), [people])
  const {
    viewportRef,
    transformLayerRef,
    transform,
    suppressClickRef,
    zoomIn,
    zoomOut,
    resetView,
    focusRect,
    handlers,
  } = useTreeViewport(contentRef, { width: WIDTH, height: layout.height }, { fitPadding })

  useEffect(() => {
    if (layout.height <= 0) return
    const id = requestAnimationFrame(resetView)
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.height])

  useEffect(() => {
    if (!focusId || !layout.byPersonId[focusId]) return
    const key = `${focusId}:${layout.height}`
    if (lastFocusKey.current === key) return
    lastFocusKey.current = key
    const row = layout.byPersonId[focusId]
    const id = requestAnimationFrame(() => {
      focusRect(timelineRowBounds(row, WIDTH), undefined, {
        duration: Math.round(DURATION.overviewFocus * 1000),
        ease: 'luxe',
        padding: 0.88,
      })
    })
    return () => cancelAnimationFrame(id)
  }, [focusId, layout, focusRect])

  if (layout.count === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div className="glass-panel max-w-sm rounded-2xl px-6 py-8">
          <p className="font-serif-display text-lg text-white/80">{ui('lens.timeline')}</p>
          <p className="mt-2 font-sans-label text-sm text-white/45">{ui('misc.noOne')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={viewportRef}
        className="h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
        style={{ touchAction: 'none', isolation: 'isolate' }}
        {...handlers}
      >
        <div ref={transformLayerRef} style={viewportTransformStyle(transform)}>
          <div
            ref={contentRef}
            className="relative"
            style={{ width: WIDTH, height: layout.height }}
          >
            <div
              className="absolute top-0 bottom-0 w-px"
              style={{
                left: RAIL_X,
                background:
                  'linear-gradient(to bottom, transparent, rgba(255,255,255,0.18) 6%, rgba(255,255,255,0.18) 94%, transparent)',
              }}
            />

            {layout.rows.map((row, i) => {
              if (row.type === 'decade') {
                return (
                  <div
                    key={`d-${i}`}
                    className="absolute flex items-center gap-2"
                    style={{ left: 0, top: row.y, width: WIDTH }}
                  >
                    <span
                      className="font-sans-label text-xs tracking-[0.2em] text-white/40"
                      style={{ width: RAIL_X - 12, textAlign: 'right' }}
                    >
                      {row.label}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  </div>
                )
              }

              const person = row.person
              const isFocused = person.id === focusId
              const accent = getAccent(person)

              return (
                <button
                  key={person.id}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    if (suppressClickRef?.current) return
                    handleTap(person.id)
                  }}
                  className={`absolute flex items-center gap-3 rounded-2xl px-2 py-1.5 text-left outline-none transition-all duration-500 ${
                    isFocused ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'
                  }`}
                  style={{ left: RAIL_X - 22, top: row.y - 22, width: WIDTH - RAIL_X + 12 }}
                >
                  <PersonAvatar person={person} size={48} isFocal={isFocused} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-serif-display text-base text-white sm:text-[0.95rem]">
                      {getDisplayName(person, t(person.role))}
                    </span>
                    <LifeRail
                      row={row}
                      maxLifespan={layout.maxLifespan}
                      accent={accent}
                      memorial={row.memorial}
                    />
                    {!row.birthYear && (
                      <span className="mt-1 font-sans-label text-[0.65rem] text-white/45">
                        {lifespanLabel(person) || t(person.role)}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <ZoomControls scale={transform.scale} zoomIn={zoomIn} zoomOut={zoomOut} resetView={resetView} />
    </div>
  )
}
