// Timeline lens — arranges everyone with a known birth year along a single
// vertical river of decades. People without a birth year are grouped at the end.

const ROW_H = 92
const DECADE_GAP = 28
const TOP_PAD = 132
const SIDE_PAD = 24

export function buildTimeline(people) {
  const list = Object.values(people)
  const dated = list
    .filter((p) => p.birthYear)
    .sort((a, b) => a.birthYear - b.birthYear || (a.name || '').localeCompare(b.name || ''))
  const undated = list.filter((p) => !p.birthYear)

  const rows = []
  let y = TOP_PAD
  let lastDecade = null

  for (const person of dated) {
    const decade = Math.floor(person.birthYear / 10) * 10
    if (decade !== lastDecade) {
      if (lastDecade !== null) y += DECADE_GAP
      rows.push({ type: 'decade', label: `${decade}s`, y })
      y += 44
      lastDecade = decade
    }
    rows.push({ type: 'person', person, y })
    y += ROW_H
  }

  if (undated.length > 0) {
    y += DECADE_GAP
    rows.push({ type: 'decade', label: '—', y })
    y += 44
    for (const person of undated) {
      rows.push({ type: 'person', person, y })
      y += ROW_H
    }
  }

  return {
    rows,
    height: y + 80,
    sidePad: SIDE_PAD,
    rowH: ROW_H,
    count: dated.length + undated.length,
  }
}
