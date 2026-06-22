import { byBirthYear } from '../data/normalizeFamily'

function resolve(people, ids) {
  return ids.map((id) => people[id]).filter(Boolean)
}

/**
 * Given the full people graph and a focal person id, returns the immediate
 * "neighborhood" used by the focus-based navigation: the focal person plus
 * their parents, partner(s), siblings, and children. This is what we render
 * instead of the whole tree, so the view stays readable at any scale.
 */
export function getNeighborhood(people, focalId) {
  const focal = people[focalId]
  if (!focal) return null

  const partners = resolve(people, focal.partnerIds).sort(byBirthYear)
  const parents = resolve(people, focal.parentIds).sort(byBirthYear)
  const siblings = resolve(people, focal.siblingIds).sort(byBirthYear)

  const childIds = new Set(focal.childIds)
  for (const partner of partners) {
    for (const childId of partner.childIds) childIds.add(childId)
  }
  const children = resolve(people, [...childIds]).sort(byBirthYear)

  return {
    focal,
    partners,
    parents,
    siblings,
    children,
    counts: {
      parents: parents.length,
      partners: partners.length,
      siblings: siblings.length,
      children: children.length,
    },
  }
}

/**
 * Short life-span label, e.g. "1948", "1948 – 1990", "b. 1948".
 */
export function lifespanLabel(person) {
  const { birthYear, deathYear } = person
  if (birthYear && deathYear) return `${birthYear} – ${deathYear}`
  if (birthYear) return `b. ${birthYear}`
  if (deathYear) return `d. ${deathYear}`
  return ''
}
