export default function GlassIconButton({
  label,
  onClick,
  active = false,
  className = '',
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active || undefined}
      className={`touch-target glass-icon-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 ${active ? 'glass-icon-btn-active' : ''} ${className}`}
    >
      {children}
    </button>
  )
}
