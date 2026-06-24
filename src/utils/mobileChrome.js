/** Space reserved for top bar + view toggle (px). */
export const CHROME_TOP_MOBILE = 132
export const CHROME_TOP_DESKTOP = 112
export const CHROME_BOTTOM_MOBILE = 108
export const CHROME_BOTTOM_DESKTOP = 88

export function isNarrowViewport() {
  if (typeof window === 'undefined') return true
  return window.innerWidth < 640
}

/** Padding so pan/zoom "fit" keeps the tree in the visible area between chrome. */
export function getViewportFitPadding() {
  const narrow = isNarrowViewport()
  return {
    top: narrow ? CHROME_TOP_MOBILE : CHROME_TOP_DESKTOP,
    bottom: narrow ? CHROME_BOTTOM_MOBILE : CHROME_BOTTOM_DESKTOP,
    left: narrow ? 8 : 16,
    right: narrow ? 8 : 16,
  }
}
