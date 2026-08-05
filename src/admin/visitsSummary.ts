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
