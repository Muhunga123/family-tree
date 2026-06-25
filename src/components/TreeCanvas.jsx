import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTree } from '../hooks/useTree'
import { useTreeViewport, viewportTransformStyle } from '../hooks/useTreeViewport'
import { useViewportFitPadding } from '../hooks/useViewportFitPadding'
import { buildLineageLayout, focalRect, layoutBounds } from '../utils/lineageLayout'
import { isNarrowViewport } from '../utils/mobileChrome'
import { initialFitMs, navDurationMs } from '../utils/motion'
import { findKinshipPath } from '../utils/kinship'
import PersonCard from './PersonCard'
import ZoomControls from './ZoomControls'

const LINE = 'rgba(255,255,255,0.34)'

/** Initial home framing — default ~90% zoom. */
const HOME_FIT = { margin: 20, padding: 0.9 }
const NAV_FIT = { margin: 16, padding: 0.88 }

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
  const lastFitKey = useRef('')
  const hasNavigated = useRef(false)
  const tapAnchorRef = useRef(null)

  const layoutSizeKey = useMemo(() => {
    if (!neighborhood) return ''
    const n = neighborhood
    return [
      focusId,
      n.parents.map((p) => p.id).join(','),
      n.siblings.map((p) => p.id).join(','),
      n.partners.map((p) => p.id).join(','),
      n.children.map((p) => p.id).join(','),
    ].join('|')
  }, [neighborhood, focusId])

  const layout = useMemo(
    () => (neighborhood ? buildLineageLayout(neighborhood) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutSizeKey],
  )

  const relatePathSet = useMemo(() => {
    if (!relateMode || !relateAnchorId || !relateTargetId) return null
    const result = findKinshipPath(people, relateAnchorId, relateTargetId)
    return result ? new Set(result.path) : null
  }, [relateMode, relateAnchorId, relateTargetId, people])

  const {
    viewportRef,
    transformLayerRef,
    transform,
    suppressClickRef,
    interactingRef,
    zoomIn,
    zoomOut,
    resetView,
    focusRect,
    computeFitTransform,
    glideFromScreen,
    handlers,
  } = useTreeViewport(
    contentRef,
    {
      width: layout?.width ?? 0,
      height: layout?.height ?? 0,
    },
    { fitPadding, autoFit: false },
  )

  const recordTap = useCallback(
    (id, e) => {
      const viewport = viewportRef.current
      if (!viewport || !e) return
      const rect = viewport.getBoundingClientRect()
      tapAnchorRef.current = {
        personId: id,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    },
    [viewportRef],
  )

  const centerTree = useCallback(
    (bounds, focal, opts = {}) => {
      if (!bounds) {
        resetView()
        return
      }
      focusRect(
        {
          x: bounds.x + bounds.w / 2,
          y: bounds.y + bounds.h / 2,
          w: 0,
          h: 0,
        },
        undefined,
        { ...opts, bounds, focalBias: 0 },
      )
    },
    [focusRect, resetView],
  )

  // Camera glide — FLIP handoff keeps the tapped person visually anchored.
  useEffect(() => {
    if (!layout || interactingRef.current) return
    const key = `${layoutSizeKey}:${layout.width}x${layout.height}`
    if (lastFitKey.current === key) return

    const isNavigation = hasNavigated.current
    const duration = isNavigation ? navDurationMs() : initialFitMs()

    const bounds = layoutBounds(layout)
    const focal = focalRect(layout, focusId)
    const anchor = tapAnchorRef.current
    tapAnchorRef.current = null

    const glideOpts = {
      ...(isNavigation ? NAV_FIT : HOME_FIT),
      duration,
      ease: 'luxe',
    }

    const id = requestAnimationFrame(() => {
      if (lastFitKey.current === key) return
      lastFitKey.current = key
      if (!isNavigation) hasNavigated.current = true

      if (!bounds) {
        resetView()
        return
      }

      if (isNavigation && anchor?.personId === focusId && focal) {
        const center = {
          x: focal.x + focal.w / 2,
          y: focal.y + focal.h / 2,
        }
        const target = computeFitTransform(bounds, focal, glideOpts)
        if (!target) return
        glideFromScreen({ x: anchor.x, y: anchor.y }, center, target, glideOpts)
      } else {
        centerTree(bounds, focal, glideOpts)
      }
    })
    return () => cancelAnimationFrame(id)
  }, [
    layoutSizeKey,
    layout,
    focusId,
    centerTree,
    computeFitTransform,
    glideFromScreen,
    resetView,
    interactingRef,
  ])

  if (!neighborhood || !layout) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        <p className="font-sans-label text-sm">No one to show yet.</p>
      </div>
    )
  }

  const handleTap = (id, e) => {
    if (relateMode) {
      relatePick(id)
      return
    }
    recordTap(id, e)
    navigateTo(id)
  }

  const handleFocalTap = (id, e) => {
    if (relateMode) {
      relatePick(id)
      return
    }
    recordTap(id, e)
    openPerson(id)
  }

  const handleFit = () => {
    const bounds = layoutBounds(layout)
    if (bounds) {
      centerTree(bounds, focalRect(layout, focusId), {
        ...NAV_FIT,
        duration: isNarrowViewport() ? 620 : 720,
        ease: 'luxe',
      })
    } else resetView()
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
            style={{ width: layout.width, height: layout.height }}
          >
            <svg
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
                  !relateMode && node.role === 'focal' ? handleFocalTap : handleTap
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
        resetView={handleFit}
      />
    </div>
  )
}
