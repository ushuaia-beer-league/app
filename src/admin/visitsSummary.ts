/**
 * The counters turned into something a person can read.
 *
 * Pure, and outside the screen, for the usual reason: this is where a wrong sum
 * would quietly mislead whoever is deciding whether the site is worth keeping.
 *
 * The counters hold a path, a day and a number, and nothing about anybody. What
 * this adds is arithmetic, never an identity.
 */

/** One row as the database keeps it. */
export interface ViewCount {
  path: string
  /** `YYYY-MM-DD`, the league's own day. */
  day: string
  views: number
}

/** One counter from the other table: a property of a visit, and how often. */
export interface VisitFactCount {
  /** `YYYY-MM-DD`, the league's own day. */
  day: string
  /** `visitor`, `device`, `referrer` or `entry`. */
  fact: string
  value: string
  visits: number
}

/** One line of the table the screen shows: a path and what it did. */
export interface VisitsRow {
  path: string
  /** How this path is named on screen. */
  label: string
  total: number
  /** Views on the most recent day the counters know about. */
  today: number
  /** The last day this path was opened at all, or null when never. */
  lastSeen: string | null
}

export interface VisitsSummary {
  rows: VisitsRow[]
  total: number
  /** The most recent day any path was opened, which "today" is counted against. */
  latestDay: string | null
  days: number
}

/**
 * What each path is called, in the words the panel already uses elsewhere.
 *
 * A path with no entry keeps its own name rather than being hidden or renamed to
 * something invented: an unknown path in this table is a fact worth seeing, since
 * only the site itself can put one there.
 */
const LABELS: Readonly<Record<string, string>> = {
  '/': 'Sitio público',
  admin: 'Panel: partidos',
  'admin/equipos': 'Panel: equipos y planteles',
  'admin/fixture': 'Panel: fixture',
  'admin/sponsors': 'Panel: sponsors',
  'admin/fotos': 'Panel: fotos',
  'admin/temporadas': 'Panel: temporadas',
  'admin/administradores': 'Panel: administradores',
  'admin/visitas': 'Panel: visitas',
}

/** The name for a path, and the path itself when nobody named it. */
export function labelFor(path: string): string {
  if (LABELS[path] !== undefined) return LABELS[path]
  // A match sheet is one path per match, and there are forty of them: they are
  // named as one thing rather than listed as forty uuids.
  if (path.startsWith('admin/partidos/')) return 'Panel: una planilla'
  return path
}

/**
 * Sums the counters per path, most visited first.
 *
 * "Today" is the most recent day in the data rather than the reader's clock: the
 * panel is read from a phone whose timezone nobody controls, and a column that
 * says zero because the phone has already rolled over midnight would be a lie
 * about the site rather than a fact about the phone.
 */
export function summariseVisits(counts: readonly ViewCount[]): VisitsSummary {
  const latestDay = counts.reduce<string | null>(
    (latest, count) =>
      latest === null || count.day > latest ? count.day : latest,
    null,
  )

  const byPath = new Map<string, VisitsRow>()

  for (const count of counts) {
    const row = byPath.get(count.path) ?? {
      path: count.path,
      label: labelFor(count.path),
      total: 0,
      today: 0,
      lastSeen: null,
    }

    row.total += count.views
    if (count.day === latestDay) row.today += count.views
    if (
      count.views > 0 &&
      (row.lastSeen === null || count.day > row.lastSeen)
    ) {
      row.lastSeen = count.day
    }

    byPath.set(count.path, row)
  }

  // A path that is a match sheet is folded into one line, so forty uuids do not
  // bury the eight screens that have names.
  const folded = new Map<string, VisitsRow>()
  for (const row of byPath.values()) {
    const key = row.label
    const existing = folded.get(key)
    if (!existing) {
      folded.set(key, { ...row, path: row.label === row.path ? row.path : key })
      continue
    }
    existing.total += row.total
    existing.today += row.today
    if (
      row.lastSeen !== null &&
      (existing.lastSeen === null || row.lastSeen > existing.lastSeen)
    ) {
      existing.lastSeen = row.lastSeen
    }
  }

  const rows = [...folded.values()].sort(
    (a, b) => b.total - a.total || a.label.localeCompare(b.label, 'es'),
  )

  return {
    rows,
    total: rows.reduce((sum, row) => sum + row.total, 0),
    latestDay,
    days: new Set(counts.map((count) => count.day)).size,
  }
}

/** One line of a breakdown: what it is, how many, and what share of the total. */
export interface FactRow {
  value: string
  label: string
  visits: number
  /** Whole per cent of the entries in the window, for reading aloud. */
  share: number
}

/**
 * What the four counters add up to.
 *
 * The two visitor numbers are separate on purpose, because they do not mean the
 * same kind of thing and adding them would produce a number that means nothing:
 * `firstTime` counts browsers, once each, and `returns` counts occasions.
 */
export interface VisitFactsSummary {
  /** Browsers that had never opened the site before, in this window. */
  firstTime: number
  /**
   * Times a browser that had been here on an earlier day came back, counted once
   * per day. One person returning on five days adds five: this is how often the
   * league comes back, not how many of them do.
   */
  returns: number
  /** Entries to the site in the window, which is what the shares are of. */
  entries: number
  devices: FactRow[]
  referrers: FactRow[]
  /** The pages people landed on, most landed-on first. */
  landings: FactRow[]
}

const DEVICE_LABELS: Readonly<Record<string, string>> = {
  phone: 'Teléfono',
  computer: 'Computadora',
}

/**
 * `direct` is the one that needs saying out loud rather than in a footnote: a link
 * opened from WhatsApp usually arrives with nothing attached, so most of it is
 * somebody sharing the site in a group, not somebody typing the address.
 */
const REFERRER_LABELS: Readonly<Record<string, string>> = {
  direct: 'Directo o por WhatsApp',
  search: 'Buscadores',
  social: 'Redes sociales',
  other: 'Otro sitio',
}

function labelOf(fact: string, value: string): string {
  if (fact === 'device') return DEVICE_LABELS[value] ?? value
  if (fact === 'referrer') return REFERRER_LABELS[value] ?? value
  if (fact === 'entry') return labelFor(value)
  return value
}

/**
 * Adds up one property, most counted first.
 *
 * A value nobody named keeps its own name. Only the site writes to this table, so
 * an unfamiliar value means the site changed and this file did not, which is worth
 * seeing rather than hiding.
 */
function breakdown(
  counts: readonly VisitFactCount[],
  fact: string,
  entries: number,
): FactRow[] {
  const totals = new Map<string, number>()

  for (const count of counts) {
    if (count.fact !== fact) continue
    totals.set(count.value, (totals.get(count.value) ?? 0) + count.visits)
  }

  return [...totals]
    .map(([value, visits]) => ({
      value,
      label: labelOf(fact, value),
      visits,
      share: entries === 0 ? 0 : Math.round((visits / entries) * 100),
    }))
    .sort((a, b) => b.visits - a.visits || a.label.localeCompare(b.label, 'es'))
}

function totalOf(counts: readonly VisitFactCount[], fact: string): number {
  return counts.reduce(
    (sum, count) => (count.fact === fact ? sum + count.visits : sum),
    0,
  )
}

/**
 * The counters turned into the five things the panel shows.
 *
 * Entries come from the device counters rather than from a column of their own,
 * because every entry answers that question: a browser always knows whether it is
 * a phone. The landing pages do not always add up to the same number, and that is
 * correct rather than a bug: a path nobody can name is left uncounted instead of
 * being stored as junk.
 */
export function summariseVisitFacts(
  counts: readonly VisitFactCount[],
): VisitFactsSummary {
  const entries = totalOf(counts, 'device')

  return {
    firstTime: counts.reduce(
      (sum, count) =>
        count.fact === 'visitor' && count.value === 'new'
          ? sum + count.visits
          : sum,
      0,
    ),
    returns: counts.reduce(
      (sum, count) =>
        count.fact === 'visitor' && count.value === 'returning'
          ? sum + count.visits
          : sum,
      0,
    ),
    entries,
    devices: breakdown(counts, 'device', entries),
    referrers: breakdown(counts, 'referrer', entries),
    landings: breakdown(counts, 'entry', entries),
  }
}
