import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import { useLanguage } from '../hooks/useLanguage'
import { useTreeViewport, viewportTransformStyle } from '../hooks/useTreeViewport'
import { buildFullLayout, NODE_W, NODE_H } from '../utils/fullTreeLayout'
import { findKinshipPath } from '../utils/kinship'
import { lifespanLabel } from '../utils/neighborhood'
import { getDisplayName } from '../utils/personColor'
import { usePersonNavigation } from '../hooks/usePersonNavigation'
import { useViewportFitPadding } from '../hooks/useViewportFitPadding'
import { DURATION } from '../utils/motion'
import PersonAvatar from './PersonAvatar'
import ZoomControls from './ZoomControls'

function OverviewNode({ node, isFocal, onTap, t, maxDepth, dimmed, highlighted, suppressClickRef }) {
  const { person, x, y } = node
  const displayName = getDisplayName(person, t(person.role))
  const lifespan = lifespanLabel(person)

  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        if (suppressClickRef?.current) return
        onTap(person.id)
      }}
      className="group absolute flex flex-col items-center rounded-2xl px-1 pt-3 pb-1.5 outline-none sm:px-1.5 sm:pt-4 sm:pb-2"
      style={{
        left: x,
        top: y,
        width: NODE_W,
        height: NODE_H,
        opacity: dimmed ? 0.25 : 1,
        transform: highlighted ? 'scale(1.03)' : 'scale(1)',
        transition: 'opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1), transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <PersonAvatar
        person={person}
        size={54}
        isFocal={isFocal}
        highlighted={highlighted}
        maxDepth={maxDepth}
      />

      <span className="mt-2 flex w-full flex-col items-center gap-0.5 text-center">
        <span className="line-clamp-2 font-serif-display text-[0.88rem] leading-tight text-white sm:text-[0.92rem]">
          {displayName}
        </span>
        {lifespan && (
          <span className="font-sans-label text-[0.62rem] text-white/45">{lifespan}</span>
        )}
      </span>
    </button>
  )
}

export default function OverviewCanvas() {
  const {
    people,
    focusId,
    navigateTo,
    maxDepth,
    relateMode,
    relateAnchorId,
    relateTargetId,
    storyActive,
    setStoryActive,
  } = useTree()
  const { t, ui } = useLanguage()
  const handleTap = usePersonNavigation()
  const contentRef = useRef(null)
  const fitPadding = useViewportFitPadding()
  const topPad = fitPadding.top

  const layout = useMemo(() => buildFullLayout(people), [people])
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
    handlers,
  } = useTreeViewport(
      contentRef,
      {
        width: layout.width,
        height: layout.height + topPad,
      },
      { fitPadding, autoFit: false },
    )

  const nodeById = useMemo(() => {
    const map = new Map()
    for (const n of layout.nodes) map.set(n.id, n)
    return map
  }, [layout.nodes])

  const relatePathSet = useMemo(() => {
    if (!relateMode || !relateAnchorId || !relateTargetId) return null
    const result = findKinshipPath(people, relateAnchorId, relateTargetId)
    return result ? new Set(result.path) : null
  }, [relateMode, relateAnchorId, relateTargetId, people])

  const lastFocusFit = useRef('')

  const rectOf = useCallback(
    (node) => ({ x: node.x, y: node.y + topPad, w: NODE_W, h: NODE_H }),
    [topPad],
  )

  // Glide to the focal person when focus changes (not during story mode or touch).
  useEffect(() => {
    if (storyActive || interactingRef.current) return
    const node = nodeById.get(focusId)
    if (!node) return
    const key = `${focusId}:${layout.width}x${layout.height}`
    if (lastFocusFit.current === key) return
    lastFocusFit.current = key
    focusRect(rectOf(node), undefined, {
      duration: Math.round(DURATION.overviewFocus * 1000),
      ease: 'luxe',
    })
  }, [focusId, layout.width, layout.height, storyActive, focusRect, nodeById, rectOf, interactingRef])

  // Story Mode — a slow cinematic glide through the generations.
  const tourOrder = useMemo(
    () =>
      [...layout.nodes].sort(
        (a, b) => a.depth - b.depth || a.x - b.x,
      ),
    [layout.nodes],
  )
  const [storyStep, setStoryStep] = useState(0)

  useEffect(() => {
    if (!storyActive || tourOrder.length === 0) return
    let step = 0
    let timer
    const advance = () => {
      const node = tourOrder[step]
      if (node) {
        focusRect(rectOf(node), 0.95, {
          duration: Math.round(DURATION.story * 1000),
          ease: 'luxe',
        })
        navigateTo(node.id)
        setStoryStep(step)
      }
      step += 1
      if (step >= tourOrder.length) {
        timer = setTimeout(() => setStoryActive(false), 3200)
      } else {
        timer = setTimeout(advance, 3200)
      }
    }
    timer = setTimeout(advance, 300)
    return () => clearTimeout(timer)
  }, [storyActive, tourOrder, focusRect, rectOf, navigateTo, setStoryActive])

  if (layout.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        <p className="font-sans-label text-sm">No one to show yet.</p>
      </div>
    )
  }

  const storyPerson = storyActive ? tourOrder[storyStep]?.person : null

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
            style={{ width: layout.width, height: layout.height + topPad, paddingTop: topPad }}
          >
            <svg
              className="pointer-events-none absolute left-0 overflow-visible"
              style={{ top: topPad }}
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
            >
              {layout.partnerPaths.map((d, i) => (
                <path
                  key={`p-${i}`}
                  d={d}
                  fill="none"
                  stroke="rgba(255,255,255,0.30)"
                  strokeWidth={1.5}
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  strokeDasharray="4 5"
                />
              ))}

              {layout.siblingPaths.map((d, i) => (
                <path
                  key={`s-${i}`}
                  d={d}
                  fill="none"
                  stroke="rgba(255,255,255,0.38)"
                  strokeWidth={1.5}
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  strokeDasharray="3 4"
                />
              ))}

              {layout.parentPaths.map((d, i) => (
                <path
                  key={`c-${i}`}
                  d={d}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth={1.5}
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                />
              ))}
            </svg>

            {layout.nodes.map((node) => (
              <OverviewNode
                key={node.id}
                node={{ ...node, y: node.y + topPad }}
                isFocal={node.id === focusId}
                onTap={handleTap}
                t={t}
                maxDepth={maxDepth}
                dimmed={relatePathSet ? !relatePathSet.has(node.id) : false}
                highlighted={
                  relateMode &&
                  (node.id === relateAnchorId || node.id === relateTargetId)
                }
                suppressClickRef={suppressClickRef}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Story Mode caption */}
      <AnimatePresence>
        {storyActive && storyPerson && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-center px-4 sm:bottom-28"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <div className="pointer-events-auto max-w-md rounded-2xl border border-white/10 bg-ink-2/85 px-5 py-4 text-center shadow-2xl backdrop-blur-xl">
              <p className="font-serif-display text-lg text-white">
                {getDisplayName(storyPerson, t(storyPerson.role))}
              </p>
              <p className="mt-1 line-clamp-3 font-serif-display text-sm leading-relaxed text-white/65">
                {t(storyPerson.story, lifespanLabel(storyPerson))}
              </p>
              <button
                type="button"
                onClick={() => setStoryActive(false)}
                className="mt-3 rounded-full border border-white/15 px-4 py-1.5 font-sans-label text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                {ui('action.stop')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context chip */}
      {!storyActive && (
        <div className="pointer-events-none absolute bottom-24 right-4 z-20 rounded-full border border-white/10 bg-ink-2/70 px-3 py-1.5 backdrop-blur-md sm:bottom-28">
          <p className="font-sans-label text-[0.62rem] text-white/40">
            {layout.nodes.length} people · {layout.generations} generations
          </p>
        </div>
      )}

      <ZoomControls
        scale={transform.scale}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        resetView={resetView}
      />
    </div>
  )
}
