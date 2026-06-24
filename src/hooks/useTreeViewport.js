import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export const VIEWPORT_MIN_SCALE = 0.35
export const VIEWPORT_MAX_SCALE = 2
export const VIEWPORT_ZOOM_STEP = 0.1
const PAN_MARGIN = 40

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
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

  const clampScale = (s) =>
    Math.min(VIEWPORT_MAX_SCALE, Math.max(VIEWPORT_MIN_SCALE, s))

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

  const getBounds = useCallback(
    (scale) => {
      const viewport = viewportRef.current
      const content = contentRef.current
      if (!viewport) {
        return {
          minX: -Infinity,
          maxX: Infinity,
          minY: -Infinity,
          maxY: Infinity,
        }
      }

      const pad = getPad()
      const vw = viewport.clientWidth
      const vh = viewport.clientHeight
      const innerW = vw - pad.left - pad.right
      const innerH = vh - pad.top - pad.bottom
      const contentW =
        resolvedSize.width || content?.scrollWidth || content?.offsetWidth || 1
      const contentH =
        resolvedSize.height || content?.scrollHeight || content?.offsetHeight || 1
      const cw = contentW * scale
      const ch = contentH * scale

      const minX = cw <= innerW ? pad.left + (innerW - cw) / 2 : pad.left + innerW - cw - PAN_MARGIN
      const maxX = cw <= innerW ? pad.left + (innerW - cw) / 2 : pad.left + PAN_MARGIN
      const minY = ch <= innerH ? pad.top + (innerH - ch) / 2 : pad.top + innerH - ch - PAN_MARGIN
      const maxY = ch <= innerH ? pad.top + (innerH - ch) / 2 : pad.top + PAN_MARGIN

      return { minX, maxX, minY, maxY }
    },
    [contentRef, resolvedSize.height, resolvedSize.width],
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

  useEffect(() => {
    transformRef.current = transform
  }, [transform])

  const zoomBy = useCallback(
    (delta) => {
      setTransform((t) => {
        const newScale = clampScale(t.scale + delta)
        if (newScale === t.scale) return t

        const viewport = viewportRef.current
        if (!viewport) return clampTransform({ ...t, scale: newScale })

        const cx = viewport.clientWidth / 2
        const cy = viewport.clientHeight / 2
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

  // Glide the camera to a target transform (eased). Jumps instantly when the
  // user prefers reduced motion.
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

  // Glide so a content-space rectangle is centered in the viewport.
  const focusRect = useCallback(
    (rect, targetScale, opts) => {
      const viewport = viewportRef.current
      if (!viewport || !rect) return
      const pad = getPad()
      const vw = viewport.clientWidth
      const vh = viewport.clientHeight
      const innerW = vw - pad.left - pad.right
      const innerH = vh - pad.top - pad.bottom
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
    const content = contentRef.current
    if (!viewport) {
      setTransform({ x: 0, y: 0, scale: 1 })
      return
    }
    const pad = getPad()
    const vw = viewport.clientWidth
    const vh = viewport.clientHeight
    const innerW = vw - pad.left - pad.right
    const innerH = vh - pad.top - pad.bottom
    const cw = resolvedSize.width || content?.scrollWidth || content?.offsetWidth || 1
    const ch = resolvedSize.height || content?.scrollHeight || content?.offsetHeight || 1
    const fit = Math.min(innerW / cw, innerH / ch, 1) * 0.92
    const scale = clampScale(fit)
    setTransform(
      clampTransform({
        scale,
        x: pad.left + (innerW - cw * scale) / 2,
        y: pad.top + (innerH - ch * scale) / 2,
      }),
    )
  }, [clampTransform, contentRef, resolvedSize.height, resolvedSize.width])

  useEffect(() => {
    const id = requestAnimationFrame(resetView)
    return () => cancelAnimationFrame(id)
  }, [resetView])

  // Clamp immediately when layout size changes (prevents stale oversized bounds).
  useEffect(() => {
    setTransform((t) => clampTransform(t))
  }, [clampTransform, resolvedSize.height, resolvedSize.width])

  const onPointerDown = (e) => {
    if (e.target.closest('button')) return
    cancelAnim()
    const t = transformRef.current
    dragRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      tx: t.x,
      ty: t.y,
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!dragRef.current || dragRef.current.id !== e.pointerId) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setTransform((t) =>
      clampTransform({
        scale: t.scale,
        x: dragRef.current.tx + dx,
        y: dragRef.current.ty + dy,
      }),
    )
  }

  const onPointerUp = (e) => {
    if (dragRef.current?.id === e.pointerId) dragRef.current = null
  }

  // Block trackpad / wheel zoom — zoom is button-only.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const blockWheel = (e) => e.preventDefault()
    el.addEventListener('wheel', blockWheel, { passive: false })
    return () => el.removeEventListener('wheel', blockWheel)
  }, [])

  // Re-clamp after viewport size changes.
  useEffect(() => {
    const handleResize = () => {
      setTransform((t) => clampTransform(t))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [clampTransform])

  // Stop any running glide animation on unmount.
  useEffect(() => cancelAnim, [])

  return {
    viewportRef,
    transform,
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
