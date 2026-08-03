/**
 * The notation the league's spreadsheet uses, read as rules rather than as
 * string handling. Every quirk here is one the sheet actually contains, listed
 * in section 6.5 of `docs/knowledge-base.md`; the importer under `scripts/` is
 * only the file plumbing around these functions.
 */

import type {
  CompetitionKey,
  MatchResolution,
  MatchStage,
  Venue,
} from '../data/types'

/** One side's goal cell, as printed. */
export interface GoalCell {
  goals: number
  /** The sheet writes `5 p` or `8p` for the side that won on penalties. */
  wonShootout: boolean
}

/**
 * Reads a goal cell. Returns null for an empty cell, which is how the sheet
 * records a match that has not been played or whose score was never reported.
 */
export function parseGoalCell(cell: string): GoalCell | null {
  const text = cell.trim()
  if (text === '') return null

  const match = /^(\d+)\s*(p)?$/i.exec(text)
  if (!match) return null

  const [, digits, shootout] = match
  return { goals: Number(digits), wonShootout: shootout !== undefined }
}

/**
 * How a match ended, from the two goal cells alone.
 *
 * The shootout marker is the only positive evidence the sheet gives, so a match
 * with no marker and different goals is read as a regulation result. That is an
 * inference, not a fact on the page, and it is exactly what the reconciliation
 * against the published PG, PGR and PPSO columns exists to confirm: the season
 * has two shootout wins and both carry the marker. If a shootout ever went
 * unmarked, the totals would stop matching and the import would refuse to write.
 */
export function resolutionFor(home: GoalCell, away: GoalCell): MatchResolution {
  if (home.wonShootout || away.wonShootout) return 'shootout'
  if (home.goals === away.goals) return 'draw'
  return 'regulation'
}

/** The sheet writes times as both `21:30` and `2130`. */
export function parseTime(cell: string): string | null {
  const text = cell.trim()

  const colon = /^(\d{1,2}):(\d{2})$/.exec(text)
  const bare = /^(\d{1,2})(\d{2})$/.exec(text)
  const parts = colon ?? bare
  if (!parts) return null

  const hours = Number(parts[1])
  const minutes = Number(parts[2])
  if (hours > 23 || minutes > 59) return null

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** The sheet writes dates as `dd/mm/yyyy`. */
export function parseDate(cell: string): string | null {
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(cell.trim())
  if (!parts) return null

  // The pattern guarantees all three, and the defaults keep them typed as text.
  const [, day = '', month = '', year = ''] = parts
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

  // Rejects 31 February and friends: the round trip only survives a real date.
  const parsed = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(iso)) {
    return null
  }
  return iso
}

/** Cabecera Bahía and cabecera Poli, the two rinks that run in parallel. */
export function parseVenue(cell: string): Venue | null {
  const text = cell.trim().toLowerCase()
  if (text.startsWith('bah')) return 'bahia'
  if (text.startsWith('poli')) return 'poli'
  return null
}

/**
 * What a team cell in the fixture actually names. The sheet mixes real teams
 * with byes, positional placeholders and the all-star game, and each has to be
 * told apart before anything is looked up.
 */
export type TeamCell =
  | { kind: 'team'; name: string; women: boolean }
  | { kind: 'bye' }
  | { kind: 'placeholder'; printed: string }
  | { kind: 'empty' }

const PLACEHOLDER_PATTERNS = [
  /lugar/i, // "6to Lugar", "3er Lugar (hanta)", "Partido 5to Lugar"
  /ganador/i, // "Ganador 6to 7to (t9)"
  /determinar/i, // "Por determinar"
  /semifinal/i,
  /final/i,
  /estrellas/i, // "juego de estrellas"
  /cabecera/i, // "Cabecera libre"
]

export function parseTeamCell(cell: string): TeamCell {
  const text = cell.trim().replace(/\s+/g, ' ')
  if (text === '') return { kind: 'empty' }
  if (/^libre$/i.test(text)) return { kind: 'bye' }
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))) {
    return { kind: 'placeholder', printed: text }
  }

  // "Mujeres Tipo Nine" is the women's competition, whose four teams the
  // statistics sheets call something else entirely (open question 2).
  const women = /^mujeres\s+/i.test(text)
  const name = women ? text.replace(/^mujeres\s+/i, '') : text

  return { kind: 'team', name, women }
}

/**
 * A team or person name reduced to what two spellings of it have in common:
 * lower case, no accents, no punctuation, single spaces. Used only to match one
 * sheet against another, never to display or to store.
 *
 * The sheets need it badly. The roster writes "guete nadin" and "Bernales
 * joaquin"; the statistics sheets truncate to "Beltrami Ramir" and "Zayas
 * Marce"; one row reads "Bergeonneau, Mauri".
 */
export function matchKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * A person's name as the site should print it, from a sheet that types names in
 * whatever case it feels like. Only spacing and capitalisation are touched: a
 * missing accent stays missing and a surname the sheet spells oddly stays as
 * spelled, because correcting either would be inventing a fact about a person.
 */
export function displayName(name: string): string {
  return (
    name
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('es')
      // A slash and a hyphen start a word too: "Baeza Pedro/Tincho" is one
      // roster entry, and lower-casing the second half of it would be a new
      // spelling of somebody's name.
      .replace(
        /(^|[\s/-])(\p{L})/gu,
        (_, boundary: string, letter: string) =>
          boundary + letter.toLocaleUpperCase('es'),
      )
  )
}

/** What a fixture row turns out to be, once both of its team cells are read. */
export interface FixtureClassification {
  stage: MatchStage
  competition: CompetitionKey
  /**
   * True when nothing on the row says which competition it belongs to and the
   * Beer League was assumed. The importer records it on the row so the guess is
   * visible instead of buried.
   */
  competitionAssumed: boolean
  /**
   * False for a row that is not a match at all: a bye, or the all-star slots,
   * which name no teams and no competition.
   */
  isMatch: boolean
}

/**
 * Reads what a fixture row is from the text the sheet prints, not from its
 * position, so the same rules survive next season's calendar.
 *
 * The bracket rows never name a team; they name a seed ("3er Lugar (hanta)",
 * "Ganador 6to 7to (t9)") or a match ("Partido 3er Lugar", "Final — 1er Lugar").
 * Telling those two apart is what decides the stage: "3er Lugar" as a side means
 * the team that finished third, while "Partido 3er Lugar" is the third-place
 * match itself.
 */
export function classifyFixtureRow(
  home: TeamCell,
  away: TeamCell,
): FixtureClassification {
  const printed = [home, away]
    .map((cell) =>
      cell.kind === 'placeholder'
        ? cell.printed
        : cell.kind === 'team'
          ? cell.name
          : '',
    )
    .join(' ')
  const text = matchKey(printed)

  const women =
    [home, away].some((cell) => cell.kind === 'team' && cell.women) ||
    /mujeres/.test(text)
  const competition: CompetitionKey = women ? 'wubl' : 'beer'
  const namesATeam = [home, away].some((cell) => cell.kind === 'team')
  const competitionAssumed = !women && !namesATeam

  const base = { competition, competitionAssumed }

  // A bye is a rink standing empty, and the all-star slots name neither teams
  // nor a competition, so neither is a match this system can hold.
  if (home.kind === 'bye' || away.kind === 'bye') {
    return { ...base, stage: 'regular', isMatch: false }
  }
  if (/estrellas/.test(text)) {
    return { ...base, stage: 'all-star', isMatch: false }
  }
  if (/cabecera/.test(text)) {
    return { ...base, stage: 'regular', isMatch: false }
  }

  // "Partido 3er Lugar", "Partido 5to Lugar", "Final — 1er Lugar": the row names
  // the match, so the label is the stage.
  if (/final/.test(text)) {
    return {
      ...base,
      stage: /semifinal/.test(text) ? 'semifinal' : 'final',
      isMatch: true,
    }
  }
  if (/partido 3er lugar|3er lugar mujeres/.test(text)) {
    return { ...base, stage: 'third-place', isMatch: true }
  }
  if (/partido 5to lugar/.test(text)) {
    return { ...base, stage: 'fifth-place', isMatch: true }
  }

  // The play-in inside the regular phase: sixth against seventh, by position.
  if (/6to lugar/.test(text) && /7to lugar/.test(text)) {
    return { ...base, stage: 'playin', isMatch: true }
  }

  // Any other row that names seeds rather than teams is a bracket match. Six
  // teams enter the men's bracket, so the seeded pairs that feed the semifinals
  // are quarterfinals; the women's four teams make theirs semifinals.
  if (/lugar|ganador|determinar/.test(text)) {
    return {
      ...base,
      stage: women ? 'semifinal' : 'quarterfinal',
      isMatch: true,
    }
  }

  // Two named teams, or the round-1 row that names nobody at all: a regular
  // match. The empty one is stored with its time and its cabecera and no teams,
  // because a gap the sheet leaves is published, not filled in.
  return { ...base, stage: 'regular', isMatch: true }
}

/**
 * True when a statistics sheet marks a line as a substitute rather than a
 * roster player: "Sup (Zambirreras)", "Suplente (Sucucho)", "Hantachoppers
 * (sub)". Substitutes are not roster players, so their line cannot be turned
 * into a team membership.
 */
export function isSubstituteLine(teamText: string): boolean {
  return /\b(sup|sub|suplente|substitute)\b/i.test(teamText)
}
