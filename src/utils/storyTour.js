import { layoutBounds } from './lineageLayout'
import { lifespanLabel } from './neighborhood'
import { NODE_H, NODE_W } from './fullTreeLayout'

/** Ancestors of home + home + all descendants — the story “path”. */
export function buildHomePathSet(people, homeFocusId) {
  const ids = new Set()
  const home = people[homeFocusId]
  if (!home) return ids

  const visitParents = (id) => {
    if (!id || ids.has(id)) return
    ids.add(id)
    for (const pid of people[id]?.parentIds ?? []) visitParents(pid)
  }
  visitParents(homeFocusId)

  const queue = [...(home.childIds ?? [])]
  while (queue.length) {
    const id = queue.shift()
    if (!people[id] || ids.has(id)) continue
    ids.add(id)
    for (const cid of people[id].childIds ?? []) queue.push(cid)
  }
  return ids
}

export function boundsForOverviewNodes(nodes, topPad = 0) {
  if (!nodes.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y + topPad)
    maxX = Math.max(maxX, n.x + NODE_W)
    maxY = Math.max(maxY, n.y + topPad + NODE_H)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

function pickCaptionId(nodes, preferredId, people) {
  const prefer = nodes.find((n) => n.id === preferredId)
  if (prefer) return prefer.id
  const withStory = nodes.find((n) => {
    const s = people[n.id]?.story
    return s && Object.values(s).some((v) => (v || '').trim())
  })
  if (withStory) return withStory.id
  return nodes[Math.floor(nodes.length / 2)]?.id ?? nodes[0]?.id
}

/** Lineage — one cinematic stop per generation row. */
export function buildLineageStops(layout, focusId, people = {}) {
  if (!layout?.nodes?.length) return []

  const groups = [
    { id: 'parents', roles: ['parent'], labelKey: 'story.gen.elders' },
    { id: 'focal-row', roles: ['sibling', 'focal', 'partner'], labelKey: 'story.gen.focal' },
    { id: 'children', roles: ['child'], labelKey: 'story.gen.children' },
  ]

  return groups
    .map((g) => {
      const nodes = layout.nodes.filter((n) => g.roles.includes(n.role))
      if (nodes.length === 0) return null
      const preferredId = g.id === 'parents' ? nodes[0].id : focusId
      return {
        id: g.id,
        personIds: nodes.map((n) => n.id),
        captionId: pickCaptionId(nodes, preferredId, people),
        bounds: layoutBounds({ nodes }),
        labelKey: g.labelKey,
      }
    })
    .filter(Boolean)
}

/** Overview — one stop per generation on the home path. */
export function buildOverviewStops(layout, people, homeFocusId, topPad = 0) {
  if (!layout?.nodes?.length || !homeFocusId) return []

  const pathSet = buildHomePathSet(people, homeFocusId)
  const home = people[homeFocusId]
  const depths = [...new Set(layout.nodes.map((n) => n.depth))].sort((a, b) => a - b)

  return depths
    .map((depth) => {
      const atDepth = layout.nodes.filter((n) => n.depth === depth)
      const onPath = atDepth.filter((n) => pathSet.has(n.id))
      const nodes = onPath.length > 0 ? onPath : atDepth
      if (nodes.length === 0) return null

      let labelKey = 'story.gen.generation'
      if (depth === 0) labelKey = 'story.gen.elders'
      else if (home && depth === home.generationDepth) labelKey = 'story.gen.focal'
      else if (home && depth > home.generationDepth) labelKey = 'story.gen.children'

      return {
        id: `depth-${depth}`,
        depth,
        personIds: nodes.map((n) => n.id),
        captionId: pickCaptionId(nodes, homeFocusId, people),
        bounds: boundsForOverviewNodes(nodes, topPad),
        labelKey,
        labelVars: { n: depth + 1 },
      }
    })
    .filter(Boolean)
}

/** Caption body — story in active language, else role + lifespan. */
export function storyCaptionBody(person, t, ui) {
  if (!person) return ui('misc.noStory')
  const story = t(person.story, '').trim()
  if (story) return story
  const role = t(person.role, '')
  const lifespan = lifespanLabel(person)
  if (role && lifespan) return `${role} · ${lifespan}`
  if (role) return role
  if (lifespan) return lifespan
  return ui('misc.noStory')
}
