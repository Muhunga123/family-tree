/**
 * Single source of truth for visual constants — every lens, connector, and
 * chrome surface should pull from here so the app feels like one product.
 */

/** Tree connector strokes (Lineage + Overview SVG paths). */
export const CONNECTOR = {
  parent: 'rgba(255, 255, 255, 0.34)',
  partner: 'rgba(255, 255, 255, 0.30)',
  sibling: 'rgba(255, 255, 255, 0.38)',
  width: 1.5,
  partnerDash: '4 5',
  siblingDash: '3 4',
}

/** Typography tracking — uppercase labels (roles, section headers). */
export const LABEL_TRACKING = '0.16em'
