import { useEffect, useMemo, useRef } from 'react'
import { useTree } from '../hooks/useTree'
import { useTreeViewport } from '../hooks/useTreeViewport'
import { useViewportFitPadding } from '../hooks/useViewportFitPadding'
import { buildLineageLayout } from '../utils/lineageLayout'
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
    [neighborhood],
  )

  const relatePathSet = useMemo(() => {
    if (!relateMode || !relateAnchorId || !relateTargetId) return null
    const result = findKinshipPath(people, relateAnchorId, relateTargetId)
    return result ? new Set(result.path) : null
  }, [relateMode, relateAnchorId, relateTargetId, people])

  const { viewportRef, transform, zoomIn, zoomOut, resetView, handlers } =
    useTreeViewport(contentRef, {
      width: layout?.width ?? 0,
      height: layout?.height ?? 0,
    }, { fitPadding })

  useEffect(() => {
    const id = requestAnimationFrame(resetView)
    return () => cancelAnimationFrame(id)
  }, [focusId, layout?.width, layout?.height, resetView])

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
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            width: 'max-content',
          }}
        >
          <div
            ref={contentRef}
            className="relative"
            style={{ width: layout.width, height: layout.height }}
          >
            {/* Connectors — drawn first, behind nodes. Keyed by focus so the
                rails gently light up each time you navigate. */}
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

            {/* Nodes — absolute positions from layout engine */}
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
