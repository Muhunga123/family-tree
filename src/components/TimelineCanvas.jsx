import { useEffect, useMemo, useRef } from 'react'
import { useTree } from '../hooks/useTree'
import { useLanguage } from '../hooks/useLanguage'
import { useViewportFitPadding } from '../hooks/useViewportFitPadding'
import { useTreeViewport, viewportTransformStyle } from '../hooks/useTreeViewport'
import { buildTimeline } from '../utils/timelineLayout'
import { lifespanLabel } from '../utils/neighborhood'
import { getDisplayName } from '../utils/personColor'
import { usePersonNavigation } from '../hooks/usePersonNavigation'
import PersonAvatar from './PersonAvatar'
import ZoomControls from './ZoomControls'

const WIDTH = 560
const RAIL_X = 70

export default function TimelineCanvas() {
  const { people } = useTree()
  const handleTap = usePersonNavigation()
  const { t, ui } = useLanguage()
  const contentRef = useRef(null)
  const fitPadding = useViewportFitPadding()

  const layout = useMemo(() => buildTimeline(people), [people])
  const { viewportRef, transform, suppressClickRef, zoomIn, zoomOut, resetView, handlers } =
    useTreeViewport(contentRef, { width: WIDTH, height: layout.height }, { fitPadding })

  useEffect(() => {
    const id = requestAnimationFrame(resetView)
    return () => cancelAnimationFrame(id)
  }, [layout.height, resetView])

  if (layout.count === 0) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        <p className="font-sans-label text-sm">{ui('misc.noOne')}</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={viewportRef}
        className="h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        {...handlers}
      >
        <div style={viewportTransformStyle(transform)}>
          <div
            ref={contentRef}
            className="relative"
            style={{ width: WIDTH, height: layout.height }}
          >
            {/* The river */}
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
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    if (suppressClickRef?.current) return
                    handleTap(person.id)
                  }}
                  className="absolute flex items-center gap-3 rounded-2xl px-2 py-1.5 text-left outline-none transition-colors hover:bg-white/5"
                  style={{ left: RAIL_X - 22, top: row.y - 22, width: WIDTH - RAIL_X + 12 }}
                >
                  <PersonAvatar person={person} size={48} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-serif-display text-base text-white sm:text-[0.95rem]">
                      {getDisplayName(person, t(person.role))}
                    </span>
                    <span className="font-sans-label text-[0.65rem] text-white/45">
                      {lifespanLabel(person) || t(person.role)}
                    </span>
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
