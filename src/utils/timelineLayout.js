// Timeline lens — arranges everyone with a known birth year along a single
// vertical river of decades. People without a birth year are grouped at the end.

import { isDeceased } from './personColor'

const ROW_H = 92
const DECADE_GAP = 28
const TOP_PAD = 132
const SIDE_PAD = 24

function lifespanYears(person) {
  if (!person.birthYear) return 0
  const end = person.deathYear ?? new Date().getFullYear()
  return Math.max(1, end - person.birthYear)
}

export function buildTimeline(people) {
  const list = Object.values(people)
  const dated = list
    .filter((p) => p.birthYear)
    .sort((a, b) => a.birthYear - b.birthYear || (a.name || '').localeCompare(b.name || ''))
  const undated = list.filter((p) => !p.birthYear)

  const rows = []
  const byPersonId = {}
  let y = TOP_PAD
  let lastDecade = null
  let maxLifespan = 1

  for (const person of dated) {
    maxLifespan = Math.max(maxLifespan, lifespanYears(person))
    const decade = Math.floor(person.birthYear / 10) * 10
    if (decade !== lastDecade) {
      if (lastDecade !== null) y += DECADE_GAP
      rows.push({ type: 'decade', label: `${decade}s`, y })
      y += 44
      lastDecade = decade
    }
    const row = {
      type: 'person',
      person,
      y,
      birthYear: person.birthYear,
      deathYear: person.deathYear ?? null,
      lifespanYears: lifespanYears(person),
      memorial: isDeceased(person),
    }
    rows.push(row)
    byPersonId[person.id] = row
    y += ROW_H
  }

  if (undated.length > 0) {
    y += DECADE_GAP
    rows.push({ type: 'decade', label: '—', y })
    y += 44
    for (const person of undated) {
      const row = {
        type: 'person',
        person,
        y,
        birthYear: null,
        deathYear: person.deathYear ?? null,
        lifespanYears: 0,
        memorial: isDeceased(person),
      }
      rows.push(row)
      byPersonId[person.id] = row
      y += ROW_H
    }
  }

  return {
    rows,
    byPersonId,
    height: y + 80,
    sidePad: SIDE_PAD,
    rowH: ROW_H,
    count: dated.length + undated.length,
    maxLifespan,
  }
}

export function timelineRowBounds(row, width) {
  return { x: 0, y: row.y - 36, w: width, h: 72 }
}
