function getParents(person) {
  return person.parents ?? []
}

function getChildrenIds(people, id) {
  const direct = people[id].children ?? []
  const inferred = Object.entries(people)
    .filter(([, person]) => getParents(person).includes(id))
    .map(([childId]) => childId)
  return [...new Set([...direct, ...inferred])]
}

function getCoupleChildren(people, personId) {
  const person = people[personId]
  const spouseId = person.spouse
  const own = new Set(getChildrenIds(people, personId))
  if (spouseId && people[spouseId]) {
    for (const childId of getChildrenIds(people, spouseId)) {
      own.add(childId)
    }
  }
  return [...own]
}

function buildParentMap(people) {
  const parentsOf = new Map()

  for (const [id, person] of Object.entries(people)) {
    parentsOf.set(id, getParents(person))
  }

  for (const [id, person] of Object.entries(people)) {
    for (const childId of person.children ?? []) {
      const existing = parentsOf.get(childId) ?? []
      if (!existing.includes(id)) {
        parentsOf.set(childId, [...existing, id])
      }
    }
  }

  return parentsOf
}

function findRoots(people, parentsOf) {
  const ids = Object.keys(people)
  return ids.filter((id) => {
    const parents = parentsOf.get(id) ?? []
    return parents.length === 0 || parents.every((parentId) => !people[parentId])
  })
}

function normalizeSpouseGenerations(people, generationOf) {
  let changed = true

  while (changed) {
    changed = false
    for (const [id, person] of Object.entries(people)) {
      const spouseId = person.spouse
      if (!spouseId || !people[spouseId]) continue

      const shared = Math.max(
        generationOf.get(id) ?? 0,
        generationOf.get(spouseId) ?? 0,
      )

      if ((generationOf.get(id) ?? 0) !== shared) {
        generationOf.set(id, shared)
        changed = true
      }
      if ((generationOf.get(spouseId) ?? 0) !== shared) {
        generationOf.set(spouseId, shared)
        changed = true
      }
    }
  }
}

function propagateChildGenerations(people, parentsOf, generationOf) {
  let changed = true

  while (changed) {
    changed = false
    for (const [id, parents] of parentsOf.entries()) {
      if (parents.length === 0) continue

      const parentGen = Math.max(
        ...parents.map((parentId) => generationOf.get(parentId) ?? 0),
      )
      const expected = parentGen + 1
      const current = generationOf.get(id) ?? 0

      if (current < expected) {
        generationOf.set(id, expected)
        changed = true
      }
    }
  }
}

function assignGenerations(people, roots, parentsOf) {
  const generationOf = new Map()
  const queue = roots.map((id) => ({ id, generation: 0 }))

  while (queue.length > 0) {
    const { id, generation } = queue.shift()
    if (generationOf.has(id)) {
      generationOf.set(id, Math.max(generationOf.get(id), generation))
      continue
    }
    generationOf.set(id, generation)

    for (const childId of getChildrenIds(people, id)) {
      queue.push({ id: childId, generation: generation + 1 })
    }
  }

  for (const id of Object.keys(people)) {
    if (!generationOf.has(id)) {
      generationOf.set(id, 0)
    }
  }

  normalizeSpouseGenerations(people, generationOf)
  propagateChildGenerations(people, parentsOf, generationOf)
  normalizeSpouseGenerations(people, generationOf)

  return generationOf
}

function makeCoupleUnit(people, id, used) {
  const person = people[id]
  const spouseId = person.spouse

  if (spouseId && people[spouseId] && !used.has(spouseId)) {
    used.add(id)
    used.add(spouseId)
    const ids = [id, spouseId].sort((a, b) => a.localeCompare(b))
    return {
      key: `couple-${ids.join('-')}`,
      type: 'couple',
      ids,
      children: getCoupleChildren(people, id),
    }
  }

  used.add(id)
  return {
    key: `single-${id}`,
    type: 'single',
    ids: [id],
    children: getChildrenIds(people, id),
  }
}

function buildUnitsForGeneration(people, personIds) {
  const used = new Set()
  const units = []

  for (const id of personIds) {
    if (used.has(id)) continue
    units.push(makeCoupleUnit(people, id, used))
  }

  return units
}

function orderGenerations(people, generationOf) {
  const byGeneration = new Map()

  for (const [id, generation] of generationOf.entries()) {
    if (!byGeneration.has(generation)) {
      byGeneration.set(generation, [])
    }
    byGeneration.get(generation).push(id)
  }

  const sortedGenerations = [...byGeneration.keys()].sort((a, b) => a - b)
  const orderedUnits = []

  for (const generation of sortedGenerations) {
    const personIds = byGeneration.get(generation)
    let units = buildUnitsForGeneration(people, personIds)

    if (generation > 0 && orderedUnits.length > 0) {
      const parentOrder = new Map()
      orderedUnits[orderedUnits.length - 1].forEach((unit, index) => {
        for (const childId of unit.children) {
          parentOrder.set(childId, index)
        }
      })

      units = [...units].sort((a, b) => {
        const aOrder = Math.min(...a.ids.map((id) => parentOrder.get(id) ?? Infinity))
        const bOrder = Math.min(...b.ids.map((id) => parentOrder.get(id) ?? Infinity))
        return aOrder - bOrder
      })
    }

    orderedUnits.push(units)
  }

  return orderedUnits
}

export function buildFamilyLayout(people) {
  const parentsOf = buildParentMap(people)
  const roots = findRoots(people, parentsOf)
  const generationOf = assignGenerations(people, roots, parentsOf)
  const generations = orderGenerations(people, generationOf)

  const spousePairs = []
  const parentChildLinks = []
  const seenCouples = new Set()

  for (const units of generations) {
    for (const unit of units) {
      if (unit.type === 'couple') {
        const pairKey = [...unit.ids].sort().join('-')
        if (!seenCouples.has(pairKey)) {
          seenCouples.add(pairKey)
          spousePairs.push({ ids: unit.ids, unitKey: unit.key })
        }
      }
    }
  }

  for (let genIndex = 0; genIndex < generations.length - 1; genIndex++) {
    const parentUnits = generations[genIndex]
    const childUnits = generations[genIndex + 1]

    for (const parentUnit of parentUnits) {
      if (parentUnit.children.length === 0) continue

      const childUnitsForParent = childUnits.filter((childUnit) =>
        childUnit.ids.some((id) => parentUnit.children.includes(id)),
      )

      if (childUnitsForParent.length > 0) {
        parentChildLinks.push({
          fromUnitKey: parentUnit.key,
          toUnitKeys: childUnitsForParent.map((unit) => unit.key),
        })
      }
    }
  }

  return { generations, spousePairs, parentChildLinks }
}
