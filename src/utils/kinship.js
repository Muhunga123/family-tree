// Finds the closest family path between two people and names the relationship.
// Edges: parent (up), child (down), partner, sibling. Returns the path of person
// ids plus a relationship descriptor that the UI localizes.

const MAX_KINSHIP_DEPTH = 12

export function findKinshipPath(people, fromId, toId) {
  if (!fromId || !toId || !people[fromId] || !people[toId]) return null
  if (fromId === toId) return { path: [fromId], steps: [] }

  const queue = [[fromId]]
  const seen = new Set([fromId])

  while (queue.length) {
    const path = queue.shift()
    if (path.length > MAX_KINSHIP_DEPTH) continue
    const current = path[path.length - 1]
    const person = people[current]
    if (!person) continue

    const neighbors = [
      ...person.parentIds.map((id) => ({ id, kind: 'up' })),
      ...person.childIds.map((id) => ({ id, kind: 'down' })),
      ...person.partnerIds.map((id) => ({ id, kind: 'partner' })),
      ...person.siblingIds.map((id) => ({ id, kind: 'sibling' })),
    ]

    for (const { id } of neighbors) {
      if (seen.has(id) || !people[id]) continue
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
    if (prev.parentIds.includes(curr)) steps.push('up')
    else if (prev.childIds.includes(curr)) steps.push('down')
    else if (prev.partnerIds.includes(curr)) steps.push('partner')
    else if (prev.siblingIds.includes(curr)) steps.push('sibling')
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

  // Pure sibling (explicit or blood).
  if (siblings > 0 && ups === 0 && downs === 0 && partners === 0) {
    return { key: genderTerm(gender, 'brother', 'sister', 'sibling'), inlaw: false }
  }

  // Pure partner.
  if (partners > 0 && ups === 0 && downs === 0) {
    return { key: 'partner', inlaw: false }
  }

  // Pure ancestor.
  if (ups > 0 && downs === 0) {
    if (ups === 1) return { key: genderTerm(gender, 'father', 'mother', 'parent'), inlaw }
    if (ups === 2) return { key: 'grandparent', inlaw }
    if (ups === 3) return { key: 'greatgrandparent', inlaw }
    return { key: 'greatgrandparent', inlaw }
  }

  // Pure descendant.
  if (downs > 0 && ups === 0) {
    if (downs === 1) return { key: genderTerm(gender, 'son', 'daughter', 'child'), inlaw }
    if (downs === 2) return { key: 'grandchild', inlaw }
    if (downs === 3) return { key: 'greatgrandchild', inlaw }
    return { key: 'greatgrandchild', inlaw }
  }

  // Up then down (collateral).
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
