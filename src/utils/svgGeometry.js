export const snap = (n) => Math.round(n * 2) / 2

export function hline(x1, x2, y) {
  return `M ${snap(x1)} ${snap(y)} L ${snap(x2)} ${snap(y)}`
}

export function vline(x, y1, y2) {
  return `M ${snap(x)} ${snap(y1)} L ${snap(x)} ${snap(y2)}`
}
