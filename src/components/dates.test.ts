import { formatDate, formatWeekdayDate } from './dates'

describe('formatWeekdayDate', () => {
  it('names the day of the week in Spanish', () => {
    expect(formatWeekdayDate('2026-05-23')).toBe('Sábado, 23 de mayo de 2026')
  })

  it('keeps the calendar day the sheet wrote, whatever zone the reader is in', () => {
    expect(formatWeekdayDate('2026-07-04')).toContain('4 de julio')
  })

  it('shows text that is not a date exactly as it arrived', () => {
    expect(formatWeekdayDate('a definir')).toBe('a definir')
    expect(formatWeekdayDate('2026-02-31')).toBe('2026-02-31')
  })
})

describe('formatDate', () => {
  it('reads as the league would say it out loud', () => {
    expect(formatDate('2026-07-04')).toBe('4 de julio de 2026')
  })
})
