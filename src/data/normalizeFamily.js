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
      photo: raw.photo || null,
      story: raw.story ?? { en: '', fr: '', ln: '', sw: '' },
      lineage: raw.lineage ?? null,
      partnerIds: [],
      parentIds: [],
      childIds: [],
      siblingIds: [],
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
  }

  for (const id of Object.keys(people)) {
    for (const partnerId of people[id].partnerIds) {
      addUnique(people[partnerId].partnerIds, id)
    }
  }

  for (const id of Object.keys(people)) {
    const siblings = new Set()
    for (const parentId of people[id].parentIds) {
      for (const childId of people[parentId].childIds) {
        if (childId !== id) siblings.add(childId)
      }
    }
    people[id].siblingIds = [...siblings]
  }

  return people
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

export { byBirthYear }
