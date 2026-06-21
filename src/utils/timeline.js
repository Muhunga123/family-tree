export function getBirthYearRange(people) {
  const years = Object.values(people)
    .map((person) => person.birthYear)
    .filter((year) => typeof year === 'number')

  const currentYear = new Date().getFullYear()

  return {
    min: years.length > 0 ? Math.min(...years) : currentYear,
    max: currentYear,
  }
}

export function isPersonVisibleAtYear(person, year) {
  if (typeof person.birthYear !== 'number') return true
  return person.birthYear <= year
}
