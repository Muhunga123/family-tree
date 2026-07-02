// Finds the closest family path between two people and names the relationship.
// Edges: parent (up), child (down), partner, sibling — including inferred
// siblings from shared parents, step-parents via partner-of-parent, and
// step-children via partner's children.

const MAX_KINSHIP_DEPTH = 14

function isParentLike(prev, curr, people) {
  if (prev.parentIds.includes(curr)) return true
  for (const pid of prev.parentIds) {
    const parent = people[pid]
    if (parent?.partnerIds?.includes(curr)) return true
  }
  return false
}

function isChildLike(prev, curr, people) {
  if (prev.childIds.includes(curr)) return true
  for (const partnerId of prev.partnerIds ?? []) {
    const partner = people[partnerId]
    if (partner?.childIds?.includes(curr) && !prev.childIds.includes(curr)) return true
  }
  return false
}

function isSiblingLike(prev, curr, people) {
  if (prev.siblingIds.includes(curr)) return true
  for (const pid of prev.parentIds) {
    const parent = people[pid]
    if (parent?.childIds?.includes(curr) && curr !== prev.id) return true
  }
  return false
}

/** Neighbors for BFS — explicit graph edges plus safe inference. */
function collectNeighbors(people, personId) {
  const person = people[personId]
  if (!person) return []

  const out = []
  const seen = new Set()

  const add = (id, kind) => {
    if (!id || id === personId || !people[id]) return
    const key = `${id}:${kind}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ id, kind })
  }

  for (const id of person.parentIds ?? []) add(id, 'up')
  for (const id of person.childIds ?? []) add(id, 'down')
  for (const id of person.partnerIds ?? []) add(id, 'partner')
  for (const id of person.siblingIds ?? []) add(id, 'sibling')

  // Full / half siblings via shared parents.
  const siblingSeen = new Set(person.siblingIds ?? [])
  for (const pid of person.parentIds ?? []) {
    const parent = people[pid]
    if (!parent) continue
    for (const cid of parent.childIds ?? []) {
      if (cid !== personId && !siblingSeen.has(cid)) {
        add(cid, 'sibling')
        siblingSeen.add(cid)
      }
    }
    // Step-parent — partner of a biological parent.
    for (const partnerId of parent.partnerIds ?? []) {
      if (!(person.parentIds ?? []).includes(partnerId)) add(partnerId, 'up')
    }
  }

  // Step-children — partner's children not already listed as own children.
  for (const partnerId of person.partnerIds ?? []) {
    const partner = people[partnerId]
    for (const cid of partner?.childIds ?? []) {
      if (!(person.childIds ?? []).includes(cid)) add(cid, 'down')
    }
  }

  return out
}

export function findKinshipPath(people, fromId, toId) {
  if (!fromId || !toId || !people[fromId] || !people[toId]) return null
  if (fromId === toId) return { path: [fromId], steps: [] }

  const queue = [[fromId]]
  const seen = new Set([fromId])

  while (queue.length) {
    const path = queue.shift()
    if (path.length > MAX_KINSHIP_DEPTH) continue
    const current = path[path.length - 1]

    for (const { id } of collectNeighbors(people, current)) {
      if (seen.has(id)) continue
      const nextPath = [...path, id]
      if (id === toId) return buildResult(people, nextPath)
      seen.add(id)
      queue.push(nextPath)
    }
  }
  return null
}

function buildResult(people, path) {
  const steps = []
  for (let i = 1; i < path.length; i++) {
    const prev = people[path[i - 1]]
    const curr = path[i]
    if (isParentLike(prev, curr, people)) steps.push('up')
    else if (isChildLike(prev, curr, people)) steps.push('down')
    else if (prev.partnerIds.includes(curr)) steps.push('partner')
    else if (isSiblingLike(prev, curr, people)) steps.push('sibling')
    else steps.push('related')
  }
  return { path, steps }
}

/**
 * Returns a relationship descriptor for the LAST person on the path relative to
 * the FIRST. { key, inlaw } where key matches a `kin.*` UI string.
 */
export function classifyKinship(result, target) {
  if (!result) return null
  const { steps } = result
  if (steps.length === 0) return { key: 'self', inlaw: false }

  const inlaw = steps.includes('partner')
  const ups = steps.filter((s) => s === 'up').length
  const downs = steps.filter((s) => s === 'down').length
  const partners = steps.filter((s) => s === 'partner').length
  const siblings = steps.filter((s) => s === 'sibling').length

  const gender = target?.gender

  if (siblings > 0 && ups === 0 && downs === 0 && partners === 0) {
    return { key: genderTerm(gender, 'brother', 'sister', 'sibling'), inlaw: false }
  }

  if (partners > 0 && ups === 0 && downs === 0) {
    return { key: 'partner', inlaw: false }
  }

  if (ups > 0 && downs === 0) {
    if (ups === 1) return { key: genderTerm(gender, 'father', 'mother', 'parent'), inlaw }
    if (ups === 2) return { key: 'grandparent', inlaw }
    if (ups === 3) return { key: 'greatgrandparent', inlaw }
    return { key: 'greatgrandparent', inlaw }
  }

  if (downs > 0 && ups === 0) {
    if (downs === 1) return { key: genderTerm(gender, 'son', 'daughter', 'child'), inlaw }
    if (downs === 2) return { key: 'grandchild', inlaw }
    if (downs === 3) return { key: 'greatgrandchild', inlaw }
    return { key: 'greatgrandchild', inlaw }
  }

  if (ups === 1 && downs === 1) {
    return { key: genderTerm(gender, 'brother', 'sister', 'sibling'), inlaw }
  }
  if (ups === 1 && downs >= 2) return { key: 'niecenephew', inlaw }
  if (ups >= 2 && downs === 1) return { key: 'auntuncle', inlaw }
  if (ups >= 2 && downs >= 2) return { key: 'cousin', inlaw }

  return { key: 'related', inlaw }
}

function genderTerm(gender, male, female, neutral) {
  if (gender === 'male') return male
  if (gender === 'female') return female
  return neutral
}
