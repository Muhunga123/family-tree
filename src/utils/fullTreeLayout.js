import { byBirthYear } from '../data/normalizeFamily'
import { collectExplicitSiblingPairs } from './siblings'
import { hline, snap, vline } from './svgGeometry'

// Fixed geometry → every coordinate is computed, so connectors are exact.
export const NODE_W = 122
export const NODE_H = 138
export const AVATAR = 58
export const AVATAR_CY = 16 + AVATAR / 2 // padding-top + half avatar
const COUPLE_GAP = 18
const SIBLING_GAP = 22
const UNIT_GAP = 40
const ROW_GAP = 104
const ROW_H = NODE_H + ROW_GAP

function anchorPersonLeft(anchorPersonId, anchorUid, placed, units) {
  const anchorPlaced = placed.get(anchorUid)
  const unit = units.get(anchorUid)
  if (!anchorPlaced || !unit) return anchorPlaced?.x ?? 0
  const memberIdx = Math.max(0, unit.members.indexOf(anchorPersonId))
  return anchorPlaced.x + memberIdx * (NODE_W + COUPLE_GAP)
}

function shiftUnitDepth(uid, delta, unitChildren, placed) {
  if (!delta) return
  const p = placed.get(uid)
  if (!p) return
  p.depth += delta
  for (const childUid of unitChildren.get(uid) ?? []) {
    shiftUnitDepth(childUid, delta, unitChildren, placed)
  }
}

/** After depth shifts, keep every unit at depth >= 0. */
function normalizeMinDepth(placed, unitChildren) {
  let minDepth = Infinity
  for (const p of placed.values()) minDepth = Math.min(minDepth, p.depth)
  if (!Number.isFinite(minDepth) || minDepth >= 0) return
  const lift = -minDepth
  for (const uid of placed.keys()) {
    shiftUnitDepth(uid, lift, unitChildren, placed)
  }
}

/**
 * Satellite siblings sit beside their anchor on the anchor's row. Their
 * descendants branch upward so they don't collide with the anchor's children.
 */
function branchSatelliteChildrenUpward(satelliteUnits, unitChildren, placed) {
  for (const satelliteUid of satelliteUnits) {
    const parent = placed.get(satelliteUid)
    if (!parent) continue
    const kids = unitChildren.get(satelliteUid) ?? []
    if (kids.length === 0) continue

    const targetDepth = parent.depth - 1
    for (const childUid of kids) {
      const child = placed.get(childUid)
      if (!child) continue
      const delta = targetDepth - child.depth
      if (delta !== 0) shiftUnitDepth(childUid, delta, unitChildren, placed)
    }
  }
}

/**
 * Pull explicit siblings onto the same row as their anchor and place them to
 * the anchor's left — so lines always run from the person they relate to.
 */
function alignExplicitSiblings(people, units, unitOf, placed, unitChildren, unitWidth, shiftTree, satelliteUnits) {
  for (const { anchorId: anchorPersonId, satelliteId: satellitePersonId } of collectExplicitSiblingPairs(
    people,
  )) {
    const anchorUid = unitOf.get(anchorPersonId)
    const satelliteUid = unitOf.get(satellitePersonId)
    if (!anchorUid || !satelliteUid || anchorUid === satelliteUid) continue

    const anchorPlaced = placed.get(anchorUid)
    const satellitePlaced = placed.get(satelliteUid)
    if (!anchorPlaced || !satellitePlaced) continue

    satelliteUnits.add(satelliteUid)

    const targetDepth = anchorPlaced.depth
    const depthDelta = targetDepth - satellitePlaced.depth
    if (depthDelta !== 0) {
      shiftUnitDepth(satelliteUid, depthDelta, unitChildren, placed)
    }

    const refreshedSatellite = placed.get(satelliteUid)
    const anchorLeft = anchorPersonLeft(anchorPersonId, anchorUid, placed, units)

    let leftEdge = anchorLeft
    for (const otherId of people[anchorPersonId].explicitSiblingIds ?? []) {
      if (otherId === satellitePersonId) continue
      const otherUid = unitOf.get(otherId)
      const op = otherUid ? placed.get(otherUid) : null
      if (op && op.depth === targetDepth) {
        leftEdge = Math.min(leftEdge, op.x)
      }
    }

    const targetX = leftEdge - unitWidth(satelliteUid) - SIBLING_GAP
    const dx = targetX - refreshedSatellite.x
    if (Math.abs(dx) > 0.5) shiftTree(satelliteUid, dx)
  }
}

/**
 * Lays out the entire family as a tidy, generational graph.
 *
 * Couples are grouped into "units" that sit side by side; children hang from the
 * couple's shared anchor point. Explicit siblings are anchored beside their
 * linked relative on the same row. Because all geometry derives from constants,
 * the SVG connectors line up perfectly with the cards.
 */
export function buildFullLayout(people) {
  const ids = Object.keys(people)
  if (ids.length === 0) {
    return {
      nodes: [],
      partnerPaths: [],
      siblingPaths: [],
      parentPaths: [],
      width: 0,
      height: 0,
      generations: 0,
    }
  }

  const ordered = ids
    .slice()
    .sort((a, b) => byBirthYear(people[a], people[b]) || a.localeCompare(b))

  // 1. Group people into couple/single units.
  const unitOf = new Map()
  const units = new Map()
  let seq = 0

  for (const id of ordered) {
    if (unitOf.has(id)) continue
    const members = [id]
    const partnerId = (people[id].partnerIds || []).find(
      (pid) => people[pid] && !unitOf.has(pid),
    )
    if (partnerId) members.push(partnerId)
    const uid = `u${seq++}`
    units.set(uid, { id: uid, members })
    members.forEach((m) => unitOf.set(m, uid))
  }

  // 2. Assign each unit's children (each child claimed by a single parent unit).
  const unitChildren = new Map()
  const childLinks = new Map() // parentUid -> [childPersonId]
  const assignedChild = new Set()
  units.forEach((_, uid) => {
    unitChildren.set(uid, [])
    childLinks.set(uid, [])
  })

  for (const id of ordered) {
    const uid = unitOf.get(id)
    const seen = new Set()
    for (const childId of people[id].childIds || []) {
      const cu = unitOf.get(childId)
      if (cu == null || cu === uid || seen.has(cu)) continue
      seen.add(cu)
      childLinks.get(uid).push(childId)
      if (!assignedChild.has(cu)) {
        assignedChild.add(cu)
        unitChildren.get(uid).push(cu)
      }
    }
  }

  const roots = [...units.keys()].filter((u) => !assignedChild.has(u))

  const unitWidth = (uid) => {
    const n = units.get(uid).members.length
    return n * NODE_W + (n - 1) * COUPLE_GAP
  }

  const placed = new Map() // uid -> { x, depth }
  const visiting = new Set()

  const shiftTree = (uid, dx) => {
    const p = placed.get(uid)
    if (!p) return
    p.x += dx
    for (const k of unitChildren.get(uid)) shiftTree(k, dx)
  }

  // Extent-based tidy placement. Returns the subtree's right edge.
  const layout = (uid, depth, leftBound) => {
    if (placed.has(uid)) return placed.get(uid).x + unitWidth(uid)
    if (visiting.has(uid)) return leftBound
    visiting.add(uid)

    const w = unitWidth(uid)
    const kids = unitChildren.get(uid)
    let x

    if (kids.length === 0) {
      x = leftBound
    } else {
      let childLeft = leftBound
      let right
      const centers = []
      for (const k of kids) {
        right = layout(k, depth + 1, childLeft)
        centers.push(placed.get(k).x + unitWidth(k) / 2)
        childLeft = right + UNIT_GAP
      }
      const span = (centers[0] + centers[centers.length - 1]) / 2
      x = span - w / 2
      if (x < leftBound) {
        const dx = leftBound - x
        for (const k of kids) shiftTree(k, dx)
        x = leftBound
      }
    }

    placed.set(uid, { x, depth })
    visiting.delete(uid)

    let right = x + w
    for (const k of kids) {
      const kp = placed.get(k)
      if (kp) right = Math.max(right, kp.x + unitWidth(k))
    }
    return right
  }

  let cursor = 0
  for (const root of roots) {
    const right = layout(root, 0, cursor)
    cursor = right + UNIT_GAP * 2
  }

  // 2b. Anchor explicit siblings beside their linked relative (no more limbo).
  const satelliteUnits = new Set()
  alignExplicitSiblings(people, units, unitOf, placed, unitChildren, unitWidth, shiftTree, satelliteUnits)
  branchSatelliteChildrenUpward(satelliteUnits, unitChildren, placed)
  normalizeMinDepth(placed, unitChildren)

  // 3. Build node boxes + center lookups.
  const nodes = []
  const center = new Map() // personId -> { cx, topY, bottomY, avatarCY }
  let maxDepth = 0

  units.forEach((unit, uid) => {
    const p = placed.get(uid)
    if (!p) return
    maxDepth = Math.max(maxDepth, p.depth)
    const y = p.depth * ROW_H
    unit.members.forEach((personId, idx) => {
      const x = p.x + idx * (NODE_W + COUPLE_GAP)
      nodes.push({ id: personId, person: people[personId], x, y, depth: p.depth })
      center.set(personId, {
        cx: x + NODE_W / 2,
        topY: y,
        bottomY: y + NODE_H,
        avatarCY: y + AVATAR_CY,
      })
    })
  })

  // 4. Partner connectors (behind avatars).
  const partnerPaths = []
  units.forEach((unit) => {
    if (unit.members.length < 2) return
    const a = center.get(unit.members[0])
    const b = center.get(unit.members[1])
    if (a && b) partnerPaths.push(hline(a.cx, b.cx, a.avatarCY))
  })

  // 5. Explicit sibling connectors — always from anchor to satellite.
  const siblingPaths = []
  for (const { anchorId, satelliteId } of collectExplicitSiblingPairs(people)) {
    const anchor = center.get(anchorId)
    const satellite = center.get(satelliteId)
    if (anchor && satellite) {
      const y = snap((anchor.avatarCY + satellite.avatarCY) / 2)
      siblingPaths.push(hline(anchor.cx, satellite.cx, y))
    }
  }

  // 6. Parent → child connectors (orthogonal bus, one stem per couple).
  const parentPaths = []
  units.forEach((unit, uid) => {
    const kids = childLinks.get(uid)
    if (!kids || kids.length === 0) return
    const p = placed.get(uid)
    if (!p) return

    const childCenters = kids
      .map((id) => center.get(id))
      .filter(Boolean)
    if (childCenters.length === 0) return

    const w = unitWidth(uid)
    const stemX = snap(p.x + w / 2)
    const unitY = p.depth * ROW_H
    const avatarBottom = unitY + 16 + AVATAR

    let stemTopY
    if (unit.members.length >= 2) {
      const a = center.get(unit.members[0])
      const b = center.get(unit.members[1])
      stemTopY = snap((a.avatarCY + b.avatarCY) / 2)
    } else {
      stemTopY = avatarBottom
    }

    const childTopY = Math.min(...childCenters.map((c) => c.topY))
    const childBottomY = Math.max(...childCenters.map((c) => c.bottomY))
    const branchUp = childBottomY < unitY

    if (branchUp) {
      const railY = snap(childBottomY + (unitY - childBottomY) * 0.42)
      for (const c of childCenters) {
        parentPaths.push(vline(c.cx, c.bottomY, railY))
      }
      const xs = [...childCenters.map((c) => c.cx), stemX]
      parentPaths.push(hline(Math.min(...xs), Math.max(...xs), railY))
      parentPaths.push(vline(stemX, railY, stemTopY))
    } else {
      const railY = snap(avatarBottom + (childTopY - avatarBottom) * 0.42)
      parentPaths.push(vline(stemX, stemTopY, railY))
      const xs = [...childCenters.map((c) => c.cx), stemX]
      parentPaths.push(hline(Math.min(...xs), Math.max(...xs), railY))
      for (const c of childCenters) {
        parentPaths.push(vline(c.cx, railY, c.topY))
      }
    }
  })

  const width = nodes.reduce((m, n) => Math.max(m, n.x + NODE_W), NODE_W)
  const height = (maxDepth + 1) * NODE_H + maxDepth * ROW_GAP

  return {
    nodes,
    partnerPaths,
    siblingPaths,
    parentPaths,
    width,
    height,
    generations: maxDepth + 1,
  }
}
