// Surfaces people whose birth/passing falls on today's date (month + day).
// Only works when a full date is stored; year-only records are ignored, so the
// banner stays quiet rather than guessing.

function monthDay(dateStr) {
  if (!dateStr) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr)
  if (!m) return null
  return { month: Number(m[2]), day: Number(m[3]) }
}

export function findTodaysPeople(people, now = new Date()) {
  const month = now.getMonth() + 1
  const day = now.getDate()
  const birthdays = []
  const memorials = []

  for (const person of Object.values(people)) {
    const born = monthDay(person.birthDate)
    if (born && born.month === month && born.day === day) {
      birthdays.push(person)
    }
    const died = monthDay(person.deathDate)
    if (died && died.month === month && died.day === day) {
      memorials.push(person)
    }
  }

  return { birthdays, memorials }
}
