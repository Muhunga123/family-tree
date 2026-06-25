import { byBirthYear } from '../data/normalizeFamily'
import { isNarrowViewport } from './mobileChrome'
import { hline, snap, vline } from './svgGeometry'

/**
 * Lineage view layout — every node position and connector is computed from
 * fixed geometry (no DOM measurement), so lines remain consistently aligned.
 */
const DESKTOP = {
  SLOT: {
    default: { cardW: 96, cardH: 148, pad: 8, avatar: 64, textH: 68 },
    focal: { cardW: 128, cardH: 168, pad: 8, avatar: 96, textH: 68 },
  },
  SLOT_GAP: 20,
  ROW_GAP: 84,
  PAD: { top: 132, bottom: 56, x: 56 },
}

const MOBILE = {
  SLOT: {
    default: { cardW: 100, cardH: 158, pad: 6, avatar: 62, textH: 82 },
    focal: { cardW: 118, cardH: 172, pad: 6, avatar: 80, textH: 82 },
  },
  SLOT_GAP: 10,
  ROW_GAP: 56,
  // Chrome padding is handled by the viewport — keep layout padding minimal.
  PAD: { top: 16, bottom: 28, x: 24 },
}

export const SLOT = DESKTOP.SLOT

export function getLineageMetrics() {
  return isNarrowViewport() ? MOBILE : DESKTOP
}

const LINK_Y_FROM_AVATAR_TOP = DESKTOP.SLOT.default.avatar / 2

function slotOf(variant = 'default') {
  const { SLOT } = getLineageMetrics()
  return SLOT[variant] ?? SLOT.default
}

function cardW(variant) {
  return slotOf(variant).cardW
}

function widthFor(items) {
  const { SLOT_GAP } = getLineageMetrics()
  return items.reduce(
    (sum, item, i) => sum + cardW(item.variant) + (i > 0 ? SLOT_GAP : 0),
    0,
  )
}

function sortPeople(list) {
  return [...list].sort(
    (a, b) => byBirthYear(a, b) || (a.name || '').localeCompare(b.name || '') || a.id.localeCompare(b.id),
  )
}

/** Avatar anchor points derived from slot constants. */
export function avatarAnchor(node) {
  const s = slotOf(node.variant)
  const cx = snap(node.x + s.cardW / 2)
  const avatarTop = snap(node.y + s.pad)
  const topY = avatarTop
  const botY = snap(avatarTop + s.avatar)
  const midY = snap(avatarTop + s.avatar / 2)
  const linkY = snap(avatarTop + s.avatar / 2)
  return { cx, topY, botY, midY, linkY, topX: cx, botX: cx }
}

function busY(topY, bottomY) {
  return snap(bottomY + (topY - bottomY) * 0.46)
}

function drawBus(stemX, stemTopY, targets, paths) {
  if (!targets.length) return
  const railY = busY(Math.min(...targets.map((t) => t.topY)), stemTopY)
  paths.push(vline(stemX, stemTopY, railY))
  const xs = [...targets.map((t) => t.topX), stemX]
  paths.push(hline(Math.min(...xs), Math.max(...xs), railY))
  for (const t of targets) {
    paths.push(vline(t.topX, railY, t.topY))
  }
}

function buildPaths(nodes) {
  const paths = []
  const byRole = (role) => nodes.filter((n) => n.role === role).sort((a, b) => a.x - b.x)
  const anchor = (node) => avatarAnchor(node)

  const focal = nodes.find((n) => n.role === 'focal')
  if (!focal) return paths

  const focalA = anchor(focal)
  const parents = byRole('parent')
  const siblings = byRole('sibling')
  const partners = byRole('partner')
  const children = byRole('child')

  if (partners.length > 0) {
    const couple = [focalA, ...partners.map(anchor)]
    const y = snap(couple.reduce((s, a) => s + a.linkY, 0) / couple.length)
    const xs = couple.map((a) => a.cx)
    paths.push(hline(Math.min(...xs), Math.max(...xs), y))
  }

  if (siblings.length > 0) {
    const group = [...siblings.map(anchor), focalA]
    const y = snap(group.reduce((s, a) => s + a.linkY, 0) / group.length)
    const xs = group.map((a) => a.cx)
    paths.push(hline(Math.min(...xs), Math.max(...xs), y))
  }

  const parentTargets = [focal, ...siblings].map(anchor)
  if (parents.length > 0 && parentTargets.length > 0) {
    if (parents.length >= 2) {
      const left = anchor(parents[0])
      const right = anchor(parents[parents.length - 1])
      const parentRailY = snap((left.linkY + right.linkY) / 2)
      paths.push(hline(left.cx, right.cx, parentRailY))
      drawBus(snap((left.cx + right.cx) / 2), parentRailY, parentTargets, paths)
    } else {
      const p = anchor(parents[0])
      drawBus(p.cx, p.linkY, parentTargets, paths)
    }
  }

  if (children.length > 0) {
    const childAnchors = children.map(anchor)
    const coupleAnchors = [focalA, ...partners.map(anchor)]
    const stemX = snap(
      (Math.min(...coupleAnchors.map((a) => a.cx)) +
        Math.max(...coupleAnchors.map((a) => a.cx))) /
        2,
    )
    const stemTopY = Math.max(...coupleAnchors.map((a) => a.botY))
    drawBus(stemX, stemTopY, childAnchors, paths)
  }

  return paths
}

function placeCenteredRow(items, y, centerX) {
  const { SLOT_GAP } = getLineageMetrics()
  const rowW = widthFor(items)
  let x = centerX - rowW / 2
  return items.map((item) => {
    const variant = item.variant ?? 'default'
    const node = { ...item, variant, x: snap(x), y: snap(y) }
    x += cardW(variant) + SLOT_GAP
    return node
  })
}

function placeFocalRow({ siblings, focal, partners, y, centerX }) {
  const { SLOT_GAP } = getLineageMetrics()
  const focalW = cardW('focal')
  const focalX = centerX - focalW / 2
  const nodes = []

  let leftX = focalX
  for (let i = siblings.length - 1; i >= 0; i--) {
    leftX -= SLOT_GAP + cardW('default')
    nodes.push({
      person: siblings[i],
      role: 'sibling',
      id: siblings[i].id,
      variant: 'default',
      x: snap(leftX),
      y: snap(y),
    })
  }

  nodes.push({
    person: focal,
    role: 'focal',
    id: focal.id,
    variant: 'focal',
    x: snap(focalX),
    y: snap(y),
  })

  let rightX = focalX + focalW + SLOT_GAP
  for (const p of partners) {
    nodes.push({
      person: p,
      role: 'partner',
      id: p.id,
      variant: 'default',
      x: snap(rightX),
      y: snap(y),
    })
    rightX += cardW('default') + SLOT_GAP
  }

  return nodes
}

/**
 * Compute absolute positions for every person in the focal neighborhood.
 */
export function buildLineageLayout(neighborhood) {
  const { SLOT, ROW_GAP, PAD } = getLineageMetrics()
  const focal = neighborhood.focal
  const parents = sortPeople(neighborhood.parents)
  const siblings = sortPeople(neighborhood.siblings)
  const partners = sortPeople(neighborhood.partners)
  const children = sortPeople(neighborhood.children)

  const parentItems = parents.map((p) => ({ person: p, role: 'parent', id: p.id }))
  const childItems = children.map((p) => ({ person: p, role: 'child', id: p.id }))

  const { SLOT_GAP } = getLineageMetrics()
  const focalRowLeft =
    siblings.length * cardW('default') + Math.max(0, siblings.length) * SLOT_GAP + cardW('focal') / 2
  const focalRowRight =
    cardW('focal') / 2 + Math.max(0, partners.length) * SLOT_GAP + partners.length * cardW('default')

  const halfCore = Math.max(
    focalRowLeft,
    focalRowRight,
    widthFor(parentItems) / 2,
    widthFor(childItems) / 2,
    isNarrowViewport() ? 140 : 180,
  )
  const centerX = PAD.x + halfCore
  const canvasW = snap(centerX * 2)

  const nodes = []
  let y = PAD.top

  if (parentItems.length > 0) {
    nodes.push(...placeCenteredRow(parentItems, y, centerX))
    y += SLOT.default.cardH + ROW_GAP
  }

  nodes.push(...placeFocalRow({ siblings, focal, partners, y, centerX }))
  y += SLOT.focal.cardH + ROW_GAP

  if (childItems.length > 0) {
    nodes.push(...placeCenteredRow(childItems, y, centerX))
    y += SLOT.default.cardH
  }

  const height = snap(y + PAD.bottom)
  const paths = buildPaths(nodes)

  return { nodes, paths, width: canvasW, height }
}
