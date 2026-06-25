import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isNarrowViewport } from '../utils/mobileChrome'

export const VIEWPORT_MIN_SCALE = 0.35
export const VIEWPORT_MIN_SCALE_MOBILE = 0.45
export const VIEWPORT_MAX_SCALE = 2.5
export const VIEWPORT_ZOOM_STEP = 0.12
const DRAG_THRESHOLD = 10

/** Shared transform wrapper — GPU layer for smoother mobile pan/zoom. */
export function viewportTransformStyle({ x, y, scale }) {
  return {
    transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
    transformOrigin: '0 0',
    willChange: 'transform',
    width: 'max-content',
    backfaceVisibility: 'hidden',
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

export function useTreeViewport(contentRef, contentSize, options = {}) {
  const fitPaddingRef = useRef(options.fitPadding ?? null)
  fitPaddingRef.current = options.fitPadding ?? null

  const getPad = () =>
    fitPaddingRef.current ?? { top: 0, bottom: 0, left: 0, right: 0 }
  const viewportRef = useRef(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const transformRef = useRef(transform)
  const dragRef = useRef(null)
  const animRef = useRef(null)
  const panFrameRef = useRef(null)
  const pendingPanRef = useRef(null)
  const pointersRef = useRef(new Map())
  const pinchRef = useRef(null)
  /** When true, person-card taps should be ignored (user was panning). */
  const suppressClickRef = useRef(false)

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

      // Strict bounds — content cannot pan fully off-screen (prevents blank view).
      const minX = cw <= innerW ? pad.left + (innerW - cw) / 2 : pad.left + innerW - cw
      const maxX = cw <= innerW ? pad.left + (innerW - cw) / 2 : pad.left
      const minY = ch <= innerH ? pad.top + (innerH - ch) / 2 : pad.top + innerH - ch
      const maxY = ch <= innerH ? pad.top + (innerH - ch) / 2 : pad.top

      return { minX, maxX, minY, maxY }
    },
    [measureContent],
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

  const applyTransform = useCallback(
    (next) => {
      const clamped = clampTransform(next)
      transformRef.current = clamped
      setTransform(clamped)
    },
    [clampTransform],
  )

  useEffect(() => {
    transformRef.current = transform
  }, [transform])

  const zoomBy = useCallback(
    (delta, anchor) => {
      setTransform((t) => {
        const newScale = clampScale(t.scale + delta)
        if (newScale === t.scale) return t

        const viewport = viewportRef.current
        if (!viewport) return clampTransform({ ...t, scale: newScale })

        const cx = anchor?.x ?? viewport.clientWidth / 2
        const cy = anchor?.y ?? viewport.clientHeight / 2
        const ratio = newScale / t.scale

        return clampTransform({
          scale: newScale,
          x: cx - (cx - t.x) * ratio,
          y: cy - (cy - t.y) * ratio,
        })
      })
    },
    [clampTransform],
  )

  const zoomIn = useCallback(() => zoomBy(VIEWPORT_ZOOM_STEP), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(-VIEWPORT_ZOOM_STEP), [zoomBy])

  const animateTo = useCallback(
    (target, { duration = 620 } = {}) => {
      cancelAnim()
      const clamped = clampTransform(target)
      if (prefersReducedMotion() || duration <= 0) {
        setTransform(clamped)
        return
      }
      const start = transformRef.current
      const t0 = performance.now()
      const ease = (p) => 1 - Math.pow(1 - p, 3)
      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration)
        const e = ease(p)
        setTransform({
          x: start.x + (clamped.x - start.x) * e,
          y: start.y + (clamped.y - start.y) * e,
          scale: start.scale + (clamped.scale - start.scale) * e,
        })
        if (p < 1) animRef.current = requestAnimationFrame(step)
        else animRef.current = null
      }
      animRef.current = requestAnimationFrame(step)
    },
    [clampTransform],
  )

  const focusRect = useCallback(
    (rect, targetScale, opts) => {
      const viewport = viewportRef.current
      if (!viewport || !rect) return
      const pad = getPad()
      const vw = viewport.clientWidth
      const vh = viewport.clientHeight
      const innerW = Math.max(vw - pad.left - pad.right, 1)
      const innerH = Math.max(vh - pad.top - pad.bottom, 1)
      const scale = clampScale(targetScale ?? transformRef.current.scale)
      const cx = rect.x + (rect.w ?? 0) / 2
      const cy = rect.y + (rect.h ?? 0) / 2
      animateTo(
        {
          scale,
          x: pad.left + innerW / 2 - cx * scale,
          y: pad.top + innerH / 2 - cy * scale,
        },
        opts,
      )
    },
    [animateTo],
  )

  const resetView = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      setTransform({ x: 0, y: 0, scale: 1 })
      return
    }
    const pad = getPad()
    const vw = viewport.clientWidth
    const vh = viewport.clientHeight
    const innerW = Math.max(vw - pad.left - pad.right, 1)
    const innerH = Math.max(vh - pad.top - pad.bottom, 1)
    const { width: cw, height: ch } = measureContent()
    const fitContain = Math.min(innerW / cw, innerH / ch)
    const narrow = isNarrowViewport()
    const fit = narrow
      ? Math.min(Math.max(fitContain, 0.58), 1.35) * 0.97
      : Math.min(fitContain, 1) * 0.92
    const scale = clampScale(fit)
    applyTransform({
      scale,
      x: pad.left + (innerW - cw * scale) / 2,
      y: pad.top + (innerH - ch * scale) / 2,
    })
  }, [applyTransform, measureContent])

  useEffect(() => {
    const id = requestAnimationFrame(resetView)
    return () => cancelAnimationFrame(id)
  }, [resetView])

  useEffect(() => {
    setTransform((t) => clampTransform(t))
  }, [clampTransform, resolvedSize.height, resolvedSize.width])

  const flushPan = useCallback(() => {
    panFrameRef.current = null
    if (!pendingPanRef.current) return
    applyTransform({
      scale: transformRef.current.scale,
      ...pendingPanRef.current,
    })
    pendingPanRef.current = null
  }, [applyTransform])

  const schedulePan = useCallback(
    (x, y) => {
      pendingPanRef.current = { x, y }
      if (!panFrameRef.current) {
        panFrameRef.current = requestAnimationFrame(flushPan)
      }
    },
    [flushPan],
  )

  const onPointerDown = (e) => {
    cancelAnim()
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    e.currentTarget.setPointerCapture?.(e.pointerId)

    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()]
      const dist = pointerDistance(pts[0], pts[1])
      if (dist > 0) {
        pinchRef.current = {
          dist,
          scale: transformRef.current.scale,
          x: transformRef.current.x,
          y: transformRef.current.y,
        }
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
      applyTransform({
        scale: newScale,
        x: anchor.x - (anchor.x - t.x) * scaleRatio,
        y: anchor.y - (anchor.y - t.y) * scaleRatio,
      })
      suppressClickRef.current = true
      return
    }

    if (!dragRef.current || dragRef.current.id !== e.pointerId) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      dragRef.current.moved = true
      suppressClickRef.current = true
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
      setTransform((t) => clampTransform(t))
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [clampTransform])

  useEffect(() => cancelAnim, [])

  return {
    viewportRef,
    transform,
    suppressClickRef,
    zoomIn,
    zoomOut,
    resetView,
    animateTo,
    focusRect,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
