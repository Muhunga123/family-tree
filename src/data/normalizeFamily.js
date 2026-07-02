function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value)
}

function byBirthYear(a, b) {
  return (a.birthYear ?? Infinity) - (b.birthYear ?? Infinity)
}

/**
 * Normalizes a raw `people` map (the family.json shape, or rows from Supabase)
 * into a fully cross-linked graph where every person carries explicit
 * partnerIds / parentIds / childIds / siblingIds.
 */
export function normalizePeople(rawPeople) {
  const people = {}

  for (const [id, raw] of Object.entries(rawPeople)) {
    people[id] = {
      id,
      name: raw.name ?? '',
      role: raw.role ?? null,
      gender: raw.gender ?? null,
      birthYear: raw.birthYear ?? null,
      deathYear: raw.deathYear ?? null,
      birthDate: raw.birthDate ?? null,
      deathDate: raw.deathDate ?? null,
      birthPlace: raw.birthPlace ?? null,
      places: Array.isArray(raw.places) ? raw.places : [],
      photo: raw.photo || null,
      story: raw.story ?? { en: '', fr: '', ln: '', sw: '' },
      lineage: raw.lineage ?? null,
      partnerIds: [],
      parentIds: [],
      childIds: [],
      siblingIds: [],
      explicitSiblingIds: [],
      siblingAnchorIds: [],
      generationDepth: 0,
    }
  }

  for (const [id, raw] of Object.entries(rawPeople)) {
    if (raw.spouse && people[raw.spouse]) {
      addUnique(people[id].partnerIds, raw.spouse)
    }
    for (const partnerId of raw.partners ?? raw.spouses ?? []) {
      if (people[partnerId]) addUnique(people[id].partnerIds, partnerId)
    }
    for (const parentId of raw.parents ?? []) {
      if (people[parentId]) {
        addUnique(people[id].parentIds, parentId)
        addUnique(people[parentId].childIds, id)
      }
    }
    for (const childId of raw.children ?? []) {
      if (people[childId]) {
        addUnique(people[id].childIds, childId)
        addUnique(people[childId].parentIds, id)
      }
    }
    for (const siblingId of raw.siblings ?? []) {
      if (people[siblingId]) {
        addUnique(people[id].explicitSiblingIds, siblingId)
        addUnique(people[siblingId].explicitSiblingIds, id)
      }
    }
    for (const anchorId of raw.siblingAnchors ?? []) {
      if (people[anchorId]) addUnique(people[id].siblingAnchorIds, anchorId)
    }
  }

  for (const id of Object.keys(people)) {
    for (const partnerId of people[id].partnerIds) {
      addUnique(people[partnerId].partnerIds, id)
    }
  }

  for (const id of Object.keys(people)) {
    const siblings = new Set(people[id].explicitSiblingIds)
    for (const parentId of people[id].parentIds) {
      for (const childId of people[parentId].childIds) {
        if (childId !== id) siblings.add(childId)
      }
    }
    people[id].siblingIds = [...siblings]
  }

  // Generation depth: 0 for the oldest ancestors, increasing with each
  // descending generation. Used for the warmth ramp + timeline ordering.
  const depthCache = {}
  const computeDepth = (id, stack) => {
    if (depthCache[id] != null) return depthCache[id]
    const parents = people[id].parentIds
    if (parents.length === 0) {
      depthCache[id] = 0
      return 0
    }
    if (stack.has(id)) return 0 // cycle guard
    stack.add(id)
    let d = 0
    for (const pid of parents) {
      d = Math.max(d, computeDepth(pid, stack) + 1)
    }
    stack.delete(id)
    depthCache[id] = d
    return d
  }
  for (const id of Object.keys(people)) {
    people[id].generationDepth = computeDepth(id, new Set())
  }

  return people
}

/** Largest generation depth across the whole tree (0 when empty). */
export function maxGenerationDepth(people) {
  let max = 0
  for (const p of Object.values(people)) {
    if (p.generationDepth > max) max = p.generationDepth
  }
  return max
}

/**
 * Picks a sensible starting person: the eldest root ancestor with descendants.
 */
export function pickRootId(people) {
  const ids = Object.keys(people)
  if (ids.length === 0) return null

  const roots = ids
    .map((id) => people[id])
    .filter((p) => p.parentIds.length === 0 && p.childIds.length > 0)
    .sort(byBirthYear)

  if (roots.length > 0) return roots[0].id

  const withChildren = ids
    .map((id) => people[id])
    .filter((p) => p.childIds.length > 0)
    .sort(byBirthYear)

  if (withChildren.length > 0) return withChildren[0].id

  return ids[0]
}

function matchesHomeFocusName(name) {
  const n = (name || '').toLowerCase()
  return n.includes('nestor') && n.includes('kasanda')
}

/**
 * Default Lineage home — Nestor Kasanda’s three-generation view (design mock).
 * Override with VITE_HOME_FOCUS_ID when needed.
 */
export function pickHomeFocusId(people) {
  const envId = import.meta.env.VITE_HOME_FOCUS_ID
  if (envId && people[envId]) return envId

  const named = Object.values(people).find((p) => matchesHomeFocusName(p.name))
  if (named) return named.id

  let bestId = null
  let bestScore = -1

  for (const p of Object.values(people)) {
    const hasParents = p.parentIds.length > 0
    const hasKids = p.childIds.length > 0
    const hasPeers = p.siblingIds.length > 0 || p.partnerIds.length > 0
    if (!hasParents || !hasKids || !hasPeers) continue

    const score =
      p.parentIds.length * 2 +
      Math.min(p.childIds.length, 10) +
      p.siblingIds.length +
      p.partnerIds.length

    if (score > bestScore) {
      bestScore = score
      bestId = p.id
    }
  }

  return bestId ?? pickRootId(people)
}

export { byBirthYear }
