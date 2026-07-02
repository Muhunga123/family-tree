import { useMemo, useRef, useEffect, useCallback } from 'react'
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
import { CONNECTOR } from '../design/tokens'
import { buildOverviewStops } from '../utils/storyTour'
import { useStoryTour } from '../hooks/useStoryTour'
import PersonAvatar from './PersonAvatar'
import StoryOverlay from './StoryOverlay'
import ZoomControls from './ZoomControls'

function OverviewNode({ node, isFocal, onTap, translate, maxDepth, dimmed, highlighted, suppressClickRef }) {
  const { person, x, y } = node
  const displayName = getDisplayName(person, translate(person.role))
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
        opacity: dimmed ? 0.22 : 1,
        transform: highlighted ? 'scale(1.04)' : 'scale(1)',
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
    homeFocusId,
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

  const storyStops = useMemo(
    () => buildOverviewStops(layout, people, homeFocusId ?? focusId, topPad),
    [layout, people, homeFocusId, focusId, topPad],
  )

  const {
    stepIndex,
    currentStop,
    captionPerson,
    captionBody,
    voiceOn,
    setVoiceOn,
    stopTour,
    totalSteps,
  } = useStoryTour({
    active: storyActive,
    stops: storyStops,
    people,
    focusRect,
    setStoryActive,
  })

  const storyHighlightSet = useMemo(
    () => (storyActive && currentStop ? new Set(currentStop.personIds) : null),
    [storyActive, currentStop],
  )

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

  if (layout.nodes.length === 0) {
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
        className={`h-full w-full overflow-hidden ${storyActive ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
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
                  stroke={CONNECTOR.partner}
                  strokeWidth={CONNECTOR.width}
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  strokeDasharray={CONNECTOR.partnerDash}
                />
              ))}

              {layout.siblingPaths.map((d, i) => (
                <path
                  key={`s-${i}`}
                  d={d}
                  fill="none"
                  stroke={CONNECTOR.sibling}
                  strokeWidth={CONNECTOR.width}
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  strokeDasharray={CONNECTOR.siblingDash}
                />
              ))}

              {layout.parentPaths.map((d, i) => (
                <path
                  key={`c-${i}`}
                  d={d}
                  fill="none"
                  stroke={CONNECTOR.parent}
                  strokeWidth={CONNECTOR.width}
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  opacity={0.65}
                />
              ))}
            </svg>

            {layout.nodes.map((node) => (
              <OverviewNode
                key={node.id}
                node={{ ...node, y: node.y + topPad }}
                isFocal={node.id === focusId}
                onTap={handleTap}
                translate={t}
                maxDepth={maxDepth}
                dimmed={
                  storyHighlightSet
                    ? !storyHighlightSet.has(node.id)
                    : relatePathSet
                      ? !relatePathSet.has(node.id)
                      : false
                }
                highlighted={
                  (storyActive && storyHighlightSet?.has(node.id)) ||
                  (relateMode &&
                    (node.id === relateAnchorId || node.id === relateTargetId))
                }
                suppressClickRef={suppressClickRef}
              />
            ))}
          </div>
        </div>
      </div>

      <StoryOverlay
        active={storyActive}
        captionPerson={captionPerson}
        captionBody={captionBody}
        labelKey={currentStop?.labelKey}
        labelVars={currentStop?.labelVars}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        voiceOn={voiceOn}
        onVoiceToggle={() => setVoiceOn(!voiceOn)}
        onStop={stopTour}
      />

      {!storyActive && (
        <div className="pointer-events-none absolute bottom-24 right-4 z-20 rounded-full border border-white/10 bg-ink-2/70 px-3 py-1.5 backdrop-blur-md sm:bottom-28">
          <p className="font-sans-label text-[0.62rem] text-white/40">
            {ui('misc.peopleGenerations', {
              people: layout.nodes.length,
              generations: layout.generations,
            })}
          </p>
        </div>
      )}

      {!storyActive && (
        <ZoomControls
          scale={transform.scale}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          resetView={resetView}
        />
      )}
    </div>
  )
}
