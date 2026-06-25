/**
 * Shared motion language — ease-out expo / Apple-style curves used by
 * Linear, Stripe, and other polished product UIs. Every transition in the
 * app should pull from here so timing and easing stay in sync.
 */

/** Primary glide — long luxurious deceleration (ease-out expo). */
export const EASE_LUXE = [0.16, 1, 0.3, 1]

/** Gentle ease-in-out for sheets and overlays. */
export const EASE_IO = [0.45, 0, 0.15, 1]

/** JS easing mirror of EASE_LUXE for rAF viewport animations. */
export function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

/** Softer expo — even longer tail, ideal for camera handoffs. */
export function easeOutExpoSoft(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -8 * t)
}

export const DURATION = {
  /** Lineage / overview camera glide between people */
  nav: { mobile: 1.05, desktop: 1.18 },
  /** First paint fit */
  initial: { mobile: 0.62, desktop: 0.72 },
  /** Person sheet, share sheet, modals */
  sheet: 0.58,
  /** Backdrop fade */
  fade: 0.42,
  /** Connector / chip opacity */
  subtle: 0.55,
  /** View toggle pill */
  pill: 0.52,
  /** Story mode glide */
  story: 1.15,
  /** Focus change in overview */
  overviewFocus: 0.95,
}

export function navDurationMs() {
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640
  const d = narrow ? DURATION.nav.mobile : DURATION.nav.desktop
  return Math.round(d * 1000)
}

export function initialFitMs() {
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640
  const d = narrow ? DURATION.initial.mobile : DURATION.initial.desktop
  return Math.round(d * 1000)
}

/** Framer Motion transition preset — tween only, no spring overshoot. */
export function luxeTween(seconds = DURATION.subtle, delay = 0) {
  return { duration: seconds, ease: EASE_LUXE, delay }
}

export function layoutTween(seconds) {
  return {
    layout: { duration: seconds, ease: EASE_LUXE },
    opacity: luxeTween(seconds * 0.85),
    scale: luxeTween(seconds * 0.85),
  }
}
