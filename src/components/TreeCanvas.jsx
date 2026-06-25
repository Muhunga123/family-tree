import { useEffect, useMemo, useRef } from 'react'
import { useTree } from '../hooks/useTree'
import { useTreeViewport, viewportTransformStyle } from '../hooks/useTreeViewport'
import { useViewportFitPadding } from '../hooks/useViewportFitPadding'
import { buildLineageLayout, getLineageMetrics } from '../utils/lineageLayout'
import { isNarrowViewport } from '../utils/mobileChrome'
import { findKinshipPath } from '../utils/kinship'
import PersonCard from './PersonCard'
import ZoomControls from './ZoomControls'

const LINE = 'rgba(255,255,255,0.30)'

export default function TreeCanvas() {
  const {
    neighborhood,
    navigateTo,
    openPerson,
    focusId,
    maxDepth,
    people,
    relateMode,
    relateAnchorId,
    relateTargetId,
    relatePick,
  } = useTree()
  const contentRef = useRef(null)
  const fitPadding = useViewportFitPadding()

  const layout = useMemo(
    () => (neighborhood ? buildLineageLayout(neighborhood) : null),
    [neighborhood, fitPadding.top],
  )

  const relatePathSet = useMemo(() => {
    if (!relateMode || !relateAnchorId || !relateTargetId) return null
    const result = findKinshipPath(people, relateAnchorId, relateTargetId)
    return result ? new Set(result.path) : null
  }, [relateMode, relateAnchorId, relateTargetId, people])

  const { viewportRef, transform, suppressClickRef, zoomIn, zoomOut, resetView, focusRect, handlers } =
    useTreeViewport(contentRef, {
      width: layout?.width ?? 0,
      height: layout?.height ?? 0,
    }, { fitPadding })

  useEffect(() => {
    if (!layout) return
    const id = requestAnimationFrame(() => {
      if (isNarrowViewport()) {
        const focal = layout.nodes.find((n) => n.role === 'focal')
        if (focal) {
          const slot = getLineageMetrics().SLOT.focal
          focusRect(
            { x: focal.x - 12, y: focal.y - 12, w: slot.cardW + 24, h: slot.cardH + 24 },
            0.88,
            { duration: 380 },
          )
          return
        }
      }
      resetView()
    })
    return () => cancelAnimationFrame(id)
  }, [focusId, layout?.width, layout?.height, resetView, focusRect])

  if (!neighborhood || !layout) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        <p className="font-sans-label text-sm">No one to show yet.</p>
      </div>
    )
  }

  const handleTap = (id) => {
    if (relateMode) relatePick(id)
    else navigateTo(id)
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
            style={{ width: layout.width, height: layout.height }}
          >
            <svg
              key={focusId}
              className="connector-layer pointer-events-none absolute inset-0 overflow-visible"
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
            >
              {layout.paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={LINE}
                  strokeWidth={1.5}
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  shapeRendering="crispEdges"
                />
              ))}
            </svg>

            {layout.nodes.map((node) => (
              <PersonCard
                key={node.id}
                person={node.person}
                variant={node.variant}
                positioned
                maxDepth={maxDepth}
                dimmed={relatePathSet ? !relatePathSet.has(node.id) : false}
                highlighted={
                  relateMode &&
                  (node.id === relateAnchorId || node.id === relateTargetId)
                }
                suppressClickRef={suppressClickRef}
                style={{ left: node.x, top: node.y }}
                onTap={
                  !relateMode && node.role === 'focal' ? openPerson : handleTap
                }
              />
            ))}
          </div>
        </div>
      </div>

      <ZoomControls
        scale={transform.scale}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        resetView={resetView}
      />
    </div>
  )
}
