import {
  VIEWPORT_MAX_SCALE,
  VIEWPORT_MIN_SCALE,
} from '../hooks/useTreeViewport'

export default function ZoomControls({ scale, zoomIn, zoomOut, resetView }) {
  const atMin = scale <= VIEWPORT_MIN_SCALE + 0.001
  const atMax = scale >= VIEWPORT_MAX_SCALE - 0.001

  return (
    <div className="pointer-events-none absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 z-20 flex flex-col gap-1.5 sm:bottom-28 sm:left-4">
      <div className="glass-panel pointer-events-auto flex flex-col overflow-hidden rounded-2xl">
        <button
          type="button"
          aria-label="Zoom in"
          disabled={atMax}
          onClick={zoomIn}
          className="flex h-11 w-11 items-center justify-center text-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={atMin}
          onClick={zoomOut}
          className="flex h-11 w-11 items-center justify-center border-t border-white/10 text-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Fit tree to screen"
          onClick={resetView}
          className="border-t border-white/10 px-2 py-2 font-sans-label text-[0.6rem] text-white/55 transition-colors hover:bg-white/10 hover:text-white"
        >
          Fit
        </button>
      </div>
      <span className="pointer-events-none text-center font-sans-label text-[0.6rem] text-white/35">
        {Math.round(scale * 100)}%
      </span>
    </div>
  )
}
