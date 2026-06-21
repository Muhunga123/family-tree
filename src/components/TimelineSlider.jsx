export default function TimelineSlider({ minYear, maxYear, year, onChange }) {
  return (
    <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-stone-200/80 bg-cream/95 px-4 py-4 backdrop-blur-sm sm:px-6">
      <div className="mx-auto flex max-w-xl items-center gap-3 sm:gap-4">
        <span className="w-10 font-sans-label text-xs text-stone-500 tabular-nums">
          {minYear}
        </span>
        <input
          type="range"
          min={minYear}
          max={maxYear}
          step={1}
          value={year}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label="Timeline year"
          aria-valuemin={minYear}
          aria-valuemax={maxYear}
          aria-valuenow={year}
          className="h-2 w-full flex-1 cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-800 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-stone-800"
        />
        <span className="w-10 text-right font-sans-label text-xs font-medium text-stone-800 tabular-nums">
          {year}
        </span>
      </div>
    </div>
  )
}
