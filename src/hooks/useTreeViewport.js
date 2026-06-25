import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isNarrowViewport } from '../utils/mobileChrome'
import { easeOutExpoSoft } from '../utils/motion'

export const VIEWPORT_MIN_SCALE = 0.35
export const VIEWPORT_MIN_SCALE_MOBILE = 0.4
export const VIEWPORT_MAX_SCALE = 3
export const VIEWPORT_ZOOM_STEP = 0.12
const DRAG_THRESHOLD = 10

/** @deprecated use navDurationMs() from utils/motion */
export const NAV_GLIDE_MS = { mobile: 1050, desktop: 1180 }
/** @deprecated use initialFitMs() from utils/motion */
export const INITIAL_FIT_MS = { mobile: 620, desktop: 720 }

export const EASE_GLIDE = easeOutExpoSoft

export const EASE_SMOOTH = (p) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2

function resolveEase(ease) {
  if (typeof ease === 'function') return ease
  if (ease === 'smooth') return EASE_SMOOTH
  if (ease === 'luxe' || ease === 'glide') return easeOutExpoSoft
  return easeOutExpoSoft
}

function cssTransform({ x, y, scale }) {
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`
}

/** Shared transform wrapper — GPU layer for smoother mobile pan/zoom. */
export function viewportTransformStyle({ x, y, scale }) {
  return {
    transform: cssTransform({ x, y, scale }),
    transformOrigin: '0 0',
    willChange: 'transform',
    width: 'max-content',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  }
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

function minScaleForViewport() {
  return isNarrowViewport() ? VIEWPORT_MIN_SCALE_MOBILE : VIEWPORT_MIN_SCALE
}

function pointerDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function pointerMidpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function isInteractiveTarget(target) {
  return (
    target instanceof Element &&
    !!target.closest(
      'button, a, input, textarea, select, label, [role="button"], [data-no-pan]',
    )
  )
}

export function useTreeViewport(contentRef, contentSize, options = {}) {
  const fitPadding = options.fitPadding ?? null
  const autoFit = options.autoFit !== false
  const viewportRef = useRef(null)
  const transformLayerRef = useRef(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const transformRef = useRef(transform)
  const dragRef = useRef(null)
  const animRef = useRef(null)
  const panFrameRef = useRef(null)
  const pendingPanRef = useRef(null)
  const pointersRef = useRef(new Map())
  const pinchRef = useRef(null)
  const interactingRef = useRef(false)
  const suppressClickRef = useRef(false)
  const fittedSizeRef = useRef('')

  const getPad = useCallback(() => {
    return fitPadding ?? { top: 0, bottom: 0, left: 0, right: 0 }
  }, [fitPadding])

  const clampScale = (s) =>
    Math.min(VIEWPORT_MAX_SCALE, Math.max(minScaleForViewport(), s))

  const cancelAnim = () => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
  }

  const resolvedSize = useMemo(
    () => ({
      width: contentSize?.width ?? 0,
      height: contentSize?.height ?? 0,
    }),
    [contentSize?.height, contentSize?.width],
  )

  const measureContent = useCallback(() => {
    const content = contentRef.current
    return {
      width:
        resolvedSize.width || content?.scrollWidth || content?.offsetWidth || 1,
      height:
        resolvedSize.height || content?.scrollHeight || content?.offsetHeight || 1,
    }
  }, [contentRef, resolvedSize.height, resolvedSize.width])

  const getBounds = useCallback(
    (scale) => {
      const viewport = viewportRef.current
      if (!viewport) {
        return {
          minX: -Infinity,
          maxX: Infinity,
          minY: -Infinity,
          maxY: Infinity,
        }
      }

      const pad = getPad()
      const vw = Math.max(viewport.clientWidth, 1)
      const vh = Math.max(viewport.clientHeight, 1)
      const innerW = Math.max(vw - pad.left - pad.right, 1)
      const innerH = Math.max(vh - pad.top - pad.bottom, 1)
      const { width: contentW, height: contentH } = measureContent()
      const cw = contentW * scale
      const ch = contentH * scale

      const minX = cw <= innerW ? pad.left + (innerW - cw) / 2 : pad.left + innerW - cw
      const maxX = cw <= innerW ? pad.left + (innerW - cw) / 2 : pad.left
      const minY = ch <= innerH ? pad.top + (innerH - ch) / 2 : pad.top + innerH - ch
      const maxY = ch <= innerH ? pad.top + (innerH - ch) / 2 : pad.top

      return { minX, maxX, minY, maxY }
    },
    [getPad, measureContent],
  )

  const clampTransform = useCallback(
    ({ x, y, scale }) => {
      const b = getBounds(scale)
      return {
        scale,
        x: Math.min(b.maxX, Math.max(b.minX, x)),
        y: Math.min(b.maxY, Math.max(b.minY, y)),
      }
    },
    [getBounds],
  )

  /** Update transform. During touch gestures, write to DOM only (no React re-render). */
  const paintTransform = useCallback(
    (next, syncReact = true) => {
      const clamped = clampTransform(next)
      transformRef.current = clamped
      if (transformLayerRef.current) {
        transformLayerRef.current.style.transform = cssTransform(clamped)
      }
      if (syncReact && !interactingRef.current) {
        setTransform(clamped)
      }
      return clamped
    },
    [clampTransform],
  )

  const syncReactTransform = useCallback(() => {
    setTransform({ ...transformRef.current })
  }, [])

  const zoomBy = useCallback(
    (delta, anchor) => {
      const t = transformRef.current
      const newScale = clampScale(t.scale + delta)
      if (newScale === t.scale) return

      const viewport = viewportRef.current
      if (!viewport) {
        paintTransform({ ...t, scale: newScale })
        return
      }

      const cx = anchor?.x ?? viewport.clientWidth / 2
      const cy = anchor?.y ?? viewport.clientHeight / 2
      const ratio = newScale / t.scale
      paintTransform({
        scale: newScale,
        x: cx - (cx - t.x) * ratio,
        y: cy - (cy - t.y) * ratio,
      })
    },
    [paintTransform],
  )

  const zoomIn = useCallback(() => zoomBy(VIEWPORT_ZOOM_STEP), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(-VIEWPORT_ZOOM_STEP), [zoomBy])

  const animateTo = useCallback(
    (target, { duration = 620, ease = 'glide' } = {}) => {
      if (interactingRef.current) return
      cancelAnim()
      const clamped = clampTransform(target)
      if (prefersReducedMotion() || duration <= 0) {
        paintTransform(clamped)
        return
      }
      const start = transformRef.current
      const t0 = performance.now()
      const easeFn = resolveEase(ease)
      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration)
        const e = easeFn(p)
        paintTransform(
          {
            x: start.x + (clamped.x - start.x) * e,
            y: start.y + (clamped.y - start.y) * e,
            scale: start.scale + (clamped.scale - start.scale) * e,
          },
          false,
        )
        if (p < 1) animRef.current = requestAnimationFrame(step)
        else {
          animRef.current = null
          syncReactTransform()
        }
      }
      animRef.current = requestAnimationFrame(step)
    },
    [clampTransform, paintTransform, syncReactTransform],
  )

  const focusRect = useCallback(
    (rect, targetScale, opts = {}) => {
      const viewport = viewportRef.current
      if (!viewport || !rect || interactingRef.current) return
      const pad = getPad()
      const innerW = Math.max(viewport.clientWidth - pad.left - pad.right, 1)
      const innerH = Math.max(viewport.clientHeight - pad.top - pad.bottom, 1)

      let scale = targetScale
      if (scale == null && opts.bounds?.w && opts.bounds?.h) {
        const margin = opts.margin ?? (isNarrowViewport() ? 16 : 28)
        const fit = Math.min(
          innerW / (opts.bounds.w + margin),
          innerH / (opts.bounds.h + margin),
        )
        scale = clampScale(fit * (opts.padding ?? 0.94))
      } else {
        scale = clampScale(scale ?? transformRef.current.scale)
      }

      const focalCx = rect.x + (rect.w ?? 0) / 2
      const focalCy = rect.y + (rect.h ?? 0) / 2
      let cx = focalCx
      let cy = focalCy
      if (opts.bounds?.w && opts.bounds?.h) {
        const boundsCx = opts.bounds.x + opts.bounds.w / 2
        const boundsCy = opts.bounds.y + opts.bounds.h / 2
        const bias = opts.focalBias ?? 0.42
        cx = boundsCx + (focalCx - boundsCx) * bias
        cy = boundsCy + (focalCy - boundsCy) * bias
      }

      animateTo(
        {
          scale,
          x: pad.left + innerW / 2 - cx * scale,
          y: pad.top + innerH / 2 - cy * scale,
        },
        opts,
      )
    },
    [animateTo, getPad],
  )

  const fitBounds = useCallback(
    (bounds, opts = {}) => {
      const viewport = viewportRef.current
      if (!viewport || !bounds?.w || !bounds?.h || interactingRef.current) return
      const pad = getPad()
      const innerW = Math.max(viewport.clientWidth - pad.left - pad.right, 1)
      const innerH = Math.max(viewport.clientHeight - pad.top - pad.bottom, 1)
      const margin = opts.margin ?? (isNarrowViewport() ? 16 : 28)
      const fit = Math.min(
        innerW / (bounds.w + margin),
        innerH / (bounds.h + margin),
      )
      const scale = clampScale(fit * (opts.padding ?? 0.94))
      const cx = bounds.x + bounds.w / 2
      const cy = bounds.y + bounds.h / 2
      animateTo(
        {
          scale,
          x: pad.left + innerW / 2 - cx * scale,
          y: pad.top + innerH / 2 - cy * scale,
        },
        { duration: opts.duration ?? (isNarrowViewport() ? 380 : 500), ease: opts.ease ?? 'glide' },
      )
    },
    [animateTo, getPad],
  )

  const computeFitTransform = useCallback(
    (bounds, focal, opts = {}) => {
      const viewport = viewportRef.current
      if (!viewport || !bounds?.w || !bounds?.h) return null
      const pad = getPad()
      const innerW = Math.max(viewport.clientWidth - pad.left - pad.right, 1)
      const innerH = Math.max(viewport.clientHeight - pad.top - pad.bottom, 1)
      const margin = opts.margin ?? (isNarrowViewport() ? 16 : 28)
      const fit = Math.min(
        innerW / (bounds.w + margin),
        innerH / (bounds.h + margin),
      )
      const scale = clampScale(fit * (opts.padding ?? 0.94))

      let cx = bounds.x + bounds.w / 2
      let cy = bounds.y + bounds.h / 2
      if (focal?.w && focal?.h) {
        const focalCx = focal.x + focal.w / 2
        const focalCy = focal.y + focal.h / 2
        const bias = opts.focalBias ?? 0.38
        cx = cx + (focalCx - cx) * bias
        cy = cy + (focalCy - cy) * bias
      }

      return {
        scale,
        x: pad.left + innerW / 2 - cx * scale,
        y: pad.top + innerH / 2 - cy * scale,
      }
    },
    [getPad],
  )

  /**
   * FLIP-style handoff: pin a content point to a screen position, then glide
   * to the target framing. Makes the tapped person feel anchored in place.
   */
  const glideFromScreen = useCallback(
    (screenPoint, contentCenter, target, opts = {}) => {
      if (interactingRef.current || !target) return
      const scale = target.scale
      paintTransform(
        {
          x: screenPoint.x - contentCenter.x * scale,
          y: screenPoint.y - contentCenter.y * scale,
          scale,
        },
        false,
      )
      animateTo(target, { ease: 'luxe', ...opts })
    },
    [animateTo, paintTransform],
  )

  const resetView = useCallback(() => {
    if (interactingRef.current) return
    const viewport = viewportRef.current
    if (!viewport) {
      paintTransform({ x: 0, y: 0, scale: 1 })
      return
    }
    const pad = getPad()
    const innerW = Math.max(viewport.clientWidth - pad.left - pad.right, 1)
    const innerH = Math.max(viewport.clientHeight - pad.top - pad.bottom, 1)
    const { width: cw, height: ch } = measureContent()
    const fitContain = Math.min(innerW / cw, innerH / ch)
    const fit = isNarrowViewport() ? fitContain * 0.94 : Math.min(fitContain, 1) * 0.92
    const scale = clampScale(fit)
    paintTransform({
      scale,
      x: pad.left + (innerW - cw * scale) / 2,
      y: pad.top + (innerH - ch * scale) / 2,
    })
  }, [getPad, measureContent, paintTransform])

  // Initial fit once per content size — callers can disable when they manage their own fit.
  useEffect(() => {
    if (!autoFit) return
    const key = `${resolvedSize.width}x${resolvedSize.height}`
    if (!resolvedSize.width || !resolvedSize.height) return
    if (fittedSizeRef.current === key || interactingRef.current) return
    fittedSizeRef.current = key
    const id = requestAnimationFrame(resetView)
    return () => cancelAnimationFrame(id)
  }, [autoFit, resolvedSize.width, resolvedSize.height, resetView])

  const flushPan = useCallback(() => {
    panFrameRef.current = null
    if (!pendingPanRef.current) return
    paintTransform(
      {
        scale: transformRef.current.scale,
        ...pendingPanRef.current,
      },
      false,
    )
    pendingPanRef.current = null
  }, [paintTransform])

  const schedulePan = useCallback(
    (x, y) => {
      pendingPanRef.current = { x, y }
      if (!panFrameRef.current) {
        panFrameRef.current = requestAnimationFrame(flushPan)
      }
    },
    [flushPan],
  )

  const endInteraction = useCallback(() => {
    interactingRef.current = false
    syncReactTransform()
  }, [syncReactTransform])

  const onPointerDown = (e) => {
    // Let person cards and other controls receive taps without starting a pan.
    if (isInteractiveTarget(e.target)) return

    cancelAnim()
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 2) {
      interactingRef.current = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
      const pts = [...pointersRef.current.values()]
      const dist = pointerDistance(pts[0], pts[1])
      if (dist > 0) {
        pinchRef.current = { dist, scale: transformRef.current.scale }
      }
      dragRef.current = null
      return
    }

    const t = transformRef.current
    dragRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      tx: t.x,
      ty: t.y,
      moved: false,
    }
    suppressClickRef.current = false
  }

  const onPointerMove = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()]
      const dist = pointerDistance(pts[0], pts[1])
      if (dist < 1) return
      const mid = pointerMidpoint(pts[0], pts[1])
      const viewport = viewportRef.current
      if (!viewport) return
      const rect = viewport.getBoundingClientRect()
      const anchor = { x: mid.x - rect.left, y: mid.y - rect.top }
      const ratio = dist / pinchRef.current.dist
      const newScale = clampScale(pinchRef.current.scale * ratio)
      const t = transformRef.current
      const scaleRatio = newScale / t.scale
      paintTransform(
        {
          scale: newScale,
          x: anchor.x - (anchor.x - t.x) * scaleRatio,
          y: anchor.y - (anchor.y - t.y) * scaleRatio,
        },
        false,
      )
      suppressClickRef.current = true
      return
    }

    if (!dragRef.current || dragRef.current.id !== e.pointerId) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    if (!dragRef.current.moved) {
      if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return
      dragRef.current.moved = true
      suppressClickRef.current = true
      interactingRef.current = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    schedulePan(dragRef.current.tx + dx, dragRef.current.ty + dy)
  }

  const onPointerUp = (e) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null

    if (dragRef.current?.id === e.pointerId) {
      if (dragRef.current.moved) suppressClickRef.current = true
      dragRef.current = null
    }

    if (pointersRef.current.size === 0) {
      endInteraction()
    }

    if (suppressClickRef.current) {
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 80)
    }
  }

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const blockWheel = (e) => e.preventDefault()
    el.addEventListener('wheel', blockWheel, { passive: false })
    return () => el.removeEventListener('wheel', blockWheel)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (interactingRef.current) return
      paintTransform(transformRef.current)
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [paintTransform])

  useEffect(() => cancelAnim, [])

  return {
    viewportRef,
    transformLayerRef,
    transform,
    suppressClickRef,
    interactingRef,
    zoomIn,
    zoomOut,
    resetView,
    animateTo,
    focusRect,
    fitBounds,
    computeFitTransform,
    glideFromScreen,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
