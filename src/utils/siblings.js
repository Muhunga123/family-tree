/**
 * Sibling link direction: anchor = person linked to, satellite = sibling added.
 * Stored in DB as a_id=anchor, b_id=satellite (new rows).
 */

/** Infer anchor vs satellite from a stored relationship row. */
export function resolveSiblingAnchorPair(raw, aId, bId) {
  const a = raw[aId]
  const b = raw[bId]
  if (!a || !b) return null

  const parentsA = a.parents?.length ?? 0
  const parentsB = b.parents?.length ?? 0

  if (parentsA > parentsB) return { anchorId: aId, satelliteId: bId }
  if (parentsB > parentsA) return { anchorId: bId, satelliteId: aId }
  // Legacy rows stored (satellite, anchor); new rows store (anchor, satellite).
  return { anchorId: bId, satelliteId: aId }
}

/** Write bidirectional siblings + anchor metadata onto raw people maps. */
export function applySiblingRelToRaw(raw, aId, bId) {
  if (!raw[aId] || !raw[bId]) return
  if (!raw[aId].siblings.includes(bId)) raw[aId].siblings.push(bId)
  if (!raw[bId].siblings.includes(aId)) raw[bId].siblings.push(aId)

  const pair = resolveSiblingAnchorPair(raw, aId, bId)
  if (!pair) return
  const { anchorId, satelliteId } = pair
  raw[satelliteId].siblingAnchors = raw[satelliteId].siblingAnchors ?? []
  if (!raw[satelliteId].siblingAnchors.includes(anchorId)) {
    raw[satelliteId].siblingAnchors.push(anchorId)
  }
}

/** Anchor → satellite pairs for layout (uses stored anchors, with fallback). */
export function collectExplicitSiblingPairs(people) {
  const pairs = []
  const seen = new Set()

  for (const satelliteId of Object.keys(people)) {
    for (const anchorId of people[satelliteId].siblingAnchorIds ?? []) {
      if (!people[anchorId]) continue
      const key = [anchorId, satelliteId].sort().join('~')
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push({ anchorId, satelliteId })
    }
  }

  for (const id of Object.keys(people)) {
    for (const sibId of people[id].explicitSiblingIds ?? []) {
      const key = [id, sibId].sort().join('~')
      if (seen.has(key)) continue
      seen.add(key)

      const parentsA = people[id].parentIds?.length ?? 0
      const parentsB = people[sibId].parentIds?.length ?? 0
      let anchorId
      let satelliteId
      if (parentsA > parentsB) {
        anchorId = id
        satelliteId = sibId
      } else if (parentsB > parentsA) {
        anchorId = sibId
        satelliteId = id
      } else {
        anchorId = sibId
        satelliteId = id
      }
      pairs.push({ anchorId, satelliteId })
    }
  }

  return pairs
}
