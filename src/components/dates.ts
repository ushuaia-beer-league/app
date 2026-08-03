/**
 * Dates as the league's readers say them.
 *
 * Every date in the domain is a plain calendar day, `YYYY-MM-DD`, so it is read
 * and printed in UTC. Parsing one in the visitor's own zone would move it: at
 * Ushuaia's offset `2026-07-04` becomes the evening of 3 July, and the site
 * would publish a date the sheet never wrote.
 *
 * Not in `src/utils` because there is no rule here, only Spanish spelling.
 */

const WEEKDAY_DATE = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * Day and abbreviated month, for a bracket column: "8 ago". The year is left
 * out because the season is what the page is about, and the long spelling wraps
 * to three lines in a column narrow enough to hold two team names.
 */
const SHORT_DATE = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

const PLAIN_DATE = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * A calendar day, or null when the text is not one. Anything the sources hand
 * over is shown as it is rather than replaced by an apology, so the callers
 * below fall back to the original text.
 */
function calendarDay(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null

  const day = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(day.getTime())) return null

  // 31 February rolls forward into March rather than failing, so only a date
  // that survives the round trip is a real one.
  return day.toISOString().startsWith(isoDate) ? day : null
}

/** Spanish leaves a weekday in lower case; a heading reads better capitalised. */
function capitalise(text: string): string {
  return text.charAt(0).toLocaleUpperCase('es') + text.slice(1)
}

/** "Sábado, 23 de mayo de 2026". The heading of a round of the fixture. */
export function formatWeekdayDate(isoDate: string): string {
  const day = calendarDay(isoDate)
  return day === null ? isoDate : capitalise(WEEKDAY_DATE.format(day))
}

/** "4 de julio de 2026". The day the league published a table. */
export function formatDate(isoDate: string): string {
  const day = calendarDay(isoDate)
  return day === null ? isoDate : PLAIN_DATE.format(day)
}

/** "8 ago". A match day where the column is too narrow for the month's name. */
export function formatShortDate(isoDate: string): string {
  const day = calendarDay(isoDate)
  return day === null ? isoDate : SHORT_DATE.format(day)
}
