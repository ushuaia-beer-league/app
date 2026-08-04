/**
 * Step one of the import: read `docs/sources/` and write one reviewable JSON
 * file. Nothing here touches the database or the seed, so the parse can be read
 * and argued with before anything is loaded, which is what the
 * `import-source-data` skill asks for.
 *
 *   npm run parse:sources
 *
 * The rules for reading the sheet's notation live in `src/utils`, with tests.
 * This file is the plumbing: read, classify, resolve, report.
 *
 * `docs/sources/` is read only. This script opens it and never writes to it.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEAMS_2026, type TeamSeed } from '../src/data/teams-2026'
import type {
  CompetitionKey,
  MatchResolution,
  MatchStage,
  Venue,
} from '../src/data/types'
import {
  classifyFixtureRow,
  displayName,
  isSubstituteLine,
  matchKey,
  parseDate,
  parseGoalCell,
  parseTeamCell,
  parseTime,
  parseVenue,
  resolutionFor,
} from '../src/utils/source-notation'
import { confirmedName } from '../src/utils/confirmed-names'
import { findByTruncatedName, findTeam } from '../src/utils/team-lookup'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const SOURCES = join(ROOT, 'docs', 'sources')
const OUT = join(HERE, 'parsed', 'season-2026.json')

/** The season this import covers, and the date the totals were published. */
const SEASON = 2026
const PUBLISHED_ON = '2026-07-04'

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

interface ParsedPlayer {
  slug: string
  /** Cased for display, spelling untouched. */
  name: string
  /** Exactly as the roster sheet types it. */
  printedName: string
}

interface ParsedRosterEntry {
  playerSlug: string
  teamSlug: string
  competition: CompetitionKey
  jerseyNumber: number | null
  printedTeam: string
}

interface ParsedMatch {
  id: string
  competition: CompetitionKey
  stage: MatchStage
  date: string
  time: string
  venue: Venue | null
  homeTeamSlug: string | null
  awayTeamSlug: string | null
  homeGoals: number | null
  awayGoals: number | null
  resolution: MatchResolution | null
  /** What the sheet printed where a team should be, when it was not a team. */
  printedHome: string | null
  printedAway: string | null
  notes: string[]
}

interface CalendarNote {
  date: string | null
  time: string | null
  printed: string
  reason: string
}

interface PublishedStandingsRow {
  competition: CompetitionKey
  printedTeam: string
  teamSlug: string | null
  points: number
  wins: number
  losses: number
  shootoutLosses: number
  draws: number
  regulationWins: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  played: number
}

interface PublishedPlayerStatsRow {
  competition: CompetitionKey
  sourceFile: string
  printedPlayerName: string
  printedTeam: string | null
  playerSlug: string | null
  teamSlug: string | null
  assists: number
  goals: number
  points: number
}

interface PublishedGoalieStatsRow {
  competition: CompetitionKey
  sourceFile: string
  printedPlayerName: string
  printedTeam: string | null
  playerSlug: string | null
  teamSlug: string | null
  gamesPlayed: number
  shotsFaced: number
  goalsAgainst: number
  /** The percentage as printed, kept only as evidence. Never used to compute. */
  printedSavePercentage: string | null
}

interface ParsedSeason {
  season: number
  publishedOn: string
  sources: string[]
  teams: readonly TeamSeed[]
  players: ParsedPlayer[]
  rosters: ParsedRosterEntry[]
  matches: ParsedMatch[]
  calendarNotes: CalendarNote[]
  publishedStandings: PublishedStandingsRow[]
  publishedPlayerStats: PublishedPlayerStatsRow[]
  publishedGoalieStats: PublishedGoalieStatsRow[]
  findings: string[]
}

const findings: string[] = []
const note = (message: string) => findings.push(message)

// ---------------------------------------------------------------------------
// Reading the files
// ---------------------------------------------------------------------------

/**
 * The exports are machine-generated Google Sheets tables: one table, one row per
 * spreadsheet row, with the row number in the first cell and the column letters
 * in the first row. Both are dropped here.
 */
function readSheet(name: string): string[][] {
  const html = readFileSync(join(SOURCES, 'spreadsheet-export', name), 'utf8')
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((cell) =>
      cell[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim(),
    ),
  )
  // Drop the column-letter header row, then the row-number cell of each row.
  return rows.slice(1).map((cells) => cells.slice(1))
}

/** The fixture, the one source that wins on results. */
function readFixtureCsv(): string[][] {
  const text = readFileSync(join(SOURCES, 'fixture-2026-calendar.csv'), 'utf8')
  return text
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map(splitCsvLine)
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (const character of line) {
    if (character === '"') {
      quoted = !quoted
      continue
    }
    if (character === ',' && !quoted) {
      cells.push(current)
      current = ''
      continue
    }
    current += character
  }
  cells.push(current)
  return cells
}

const cellAt = (row: readonly string[], index: number) => row[index] ?? ''

const number = (cell: string): number | null => {
  const text = cell.trim()
  if (text === '') return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

// ---------------------------------------------------------------------------
// Rosters
// ---------------------------------------------------------------------------

function parseRosters(): {
  players: ParsedPlayer[]
  rosters: ParsedRosterEntry[]
} {
  const rows = readSheet('teams.html')
  const players = new Map<string, ParsedPlayer>()
  const rosters: ParsedRosterEntry[] = []

  for (const row of rows.slice(1)) {
    const printedName = cellAt(row, 0).trim()
    const printedJersey = cellAt(row, 1).trim()
    const printedTeam = cellAt(row, 2).trim()
    if (printedName === '' && printedTeam === '') continue

    if (printedName === '') {
      note(`Roster row with a team (${printedTeam}) and no player, skipped.`)
      continue
    }

    const confirmed = confirmedName(printedName)
    const slug = matchKey(confirmed).replace(/ /g, '-')
    const existing = players.get(slug)
    if (existing) {
      note(
        `Roster names ${printedName} twice; kept one player and both roster rows.`,
      )
    } else {
      players.set(slug, {
        slug,
        name: displayName(confirmed),
        printedName,
      })
    }

    // The roster sheet is the Beer League's: every team on it is a men's-league
    // team under its sponsored name. The women's rosters are not published.
    const team = findTeam(TEAMS_2026, 'beer', printedTeam)
    if (!team) {
      note(`Roster team "${printedTeam}" matches no known team; row skipped.`)
      continue
    }

    const jerseyNumber = number(printedJersey)
    if (printedJersey !== '' && jerseyNumber === null) {
      note(
        `Jersey "${printedJersey}" of ${printedName} is not a number; stored empty.`,
      )
    }
    if (printedJersey === '') {
      note(
        `${printedName} (${team.shortName}) has no jersey number on the sheet.`,
      )
    }

    rosters.push({
      playerSlug: slug,
      teamSlug: team.slug,
      competition: 'beer',
      jerseyNumber,
      printedTeam,
    })
  }

  // Jersey numbers are not unique per team in the source, and the importer must
  // not invent one to make them unique.
  const seen = new Map<string, string[]>()
  for (const entry of rosters) {
    if (entry.jerseyNumber === null) continue
    const key = `${entry.teamSlug}#${entry.jerseyNumber}`
    seen.set(key, [...(seen.get(key) ?? []), entry.playerSlug])
  }
  for (const [key, holders] of seen) {
    if (holders.length > 1) {
      note(
        `Jersey ${key.split('#')[1]} is worn by ${holders.join(' and ')} in ${key.split('#')[0]}.`,
      )
    }
  }

  return { players: [...players.values()], rosters }
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function parseFixture(): {
  matches: ParsedMatch[]
  calendarNotes: CalendarNote[]
} {
  const rows = readFixtureCsv()
  const matches: ParsedMatch[] = []
  const calendarNotes: CalendarNote[] = []

  let date: string | null = null
  let sequence = 0
  let started = false

  for (const row of rows) {
    const printedDate = cellAt(row, 0).trim()
    const printedTime = cellAt(row, 1)
    const printedHome = cellAt(row, 2)
    const printedAway = cellAt(row, 6)
    const printedWinner = cellAt(row, 9).trim()
    const printedResult = cellAt(row, 8).trim()

    if (printedDate !== '') {
      const parsed = parseDate(printedDate)
      if (parsed) {
        date = parsed
      } else if (started) {
        // The last row of the sheet is the reserved emergency date, written as
        // free text with a warning sign rather than as a date cell.
        calendarNotes.push({
          date: null,
          time: null,
          printed: printedDate.replace(/\s+/g, ' '),
          reason:
            'A date the sheet reserves in prose rather than as a fixture row.',
        })
        continue
      }
    }

    const time = parseTime(printedTime)
    if (time === null) {
      // Header rows, the team list at the top and the blank separators.
      continue
    }
    started = true
    if (date === null) {
      note(`Fixture row at ${time} has no date above it; skipped.`)
      continue
    }

    const home = parseTeamCell(printedHome)
    const away = parseTeamCell(printedAway)
    const classification = classifyFixtureRow(home, away)
    const venue = parseVenue(cellAt(row, 7))

    if (!classification.isMatch) {
      calendarNotes.push({
        date,
        time,
        printed: `${printedHome.trim()} / ${printedAway.trim()}`.trim(),
        reason:
          classification.stage === 'all-star'
            ? 'An all-star slot: the sheet names no teams and no competition, so it is not stored as a match.'
            : 'A bye or a free rink, which is not a match.',
      })
      continue
    }

    sequence += 1
    const rowNotes: string[] = []

    const homeGoals = parseGoalCell(cellAt(row, 3))
    const awayGoals = parseGoalCell(cellAt(row, 5))
    let resolution: MatchResolution | null = null

    if (homeGoals && awayGoals) {
      resolution = resolutionFor(homeGoals, awayGoals)
      if (printedResult === '' && printedWinner === '') {
        rowNotes.push(
          'The sheet carries the goals and leaves the Resultado and Ganador columns empty; the goals are the reliable part and the result was read from them.',
        )
      }
    } else if (homeGoals || awayGoals) {
      note(
        `${date} ${time}: half a score on the sheet; both goal cells left empty.`,
      )
      rowNotes.push(
        'The sheet records a goal count for one side only, so neither was kept.',
      )
    }

    const resolveSide = (cell: typeof home, printed: string): string | null => {
      if (cell.kind !== 'team') return null
      const team = findTeam(TEAMS_2026, classification.competition, cell.name)
      if (!team) {
        note(`${date} ${time}: team "${printed.trim()}" matches no known team.`)
        return null
      }
      return team.slug
    }

    const homeTeamSlug = resolveSide(home, printedHome)
    const awayTeamSlug = resolveSide(away, printedAway)

    if (home.kind === 'empty' && away.kind === 'empty') {
      rowNotes.push(
        'The sheet gives this slot a time and a cabecera and names no teams at all. Published as the gap it is.',
      )
    }
    if (classification.competitionAssumed) {
      rowNotes.push(
        'The row names no team and no competition; filed under the Beer League, which is the only competition playing on this date.',
      )
    }
    if (home.kind === 'placeholder')
      rowNotes.push(`Home side printed as "${home.printed}".`)
    if (away.kind === 'placeholder')
      rowNotes.push(`Away side printed as "${away.printed}".`)

    // The winner column of round 5 names teams that are not on the row. Reported,
    // never used to overrule the goals.
    if (printedWinner !== '') {
      const winner = findTeam(
        TEAMS_2026,
        classification.competition,
        printedWinner,
      )

      if (winner && homeTeamSlug && awayTeamSlug) {
        if (winner.slug !== homeTeamSlug && winner.slug !== awayTeamSlug) {
          note(
            `${date} ${time}: the Ganador column says "${printedWinner}", which is neither side of this match.`,
          )
          rowNotes.push(
            `The sheet's Ganador column reads "${printedWinner}", a team that did not play this match. Ignored in favour of the goals.`,
          )
        }
      } else if (winner) {
        // The play-in names its sides by position and its winner by name, so
        // there is nothing to check that name against.
        note(
          `${date} ${time}: the Ganador column names "${printedWinner}" on a row whose sides are printed as positions, so the two cannot be cross-checked.`,
        )
        rowNotes.push(
          `The sheet's Ganador column reads "${printedWinner}" while the sides are printed as positions. Recorded as a gap rather than resolved.`,
        )
      }
    }

    matches.push({
      id: `${SEASON}-${String(sequence).padStart(3, '0')}`,
      competition: classification.competition,
      stage: classification.stage,
      date,
      time,
      venue,
      homeTeamSlug,
      awayTeamSlug,
      homeGoals: homeGoals && awayGoals ? homeGoals.goals : null,
      awayGoals: homeGoals && awayGoals ? awayGoals.goals : null,
      resolution,
      printedHome: home.kind === 'placeholder' ? home.printed : null,
      printedAway: away.kind === 'placeholder' ? away.printed : null,
      notes: rowNotes,
    })
  }

  return { matches, calendarNotes }
}

// ---------------------------------------------------------------------------
// The published tables, which exist to check the import
// ---------------------------------------------------------------------------

function parsePublishedStandings(): PublishedStandingsRow[] {
  const rows = readSheet('standings.html')
  const out: PublishedStandingsRow[] = []

  // The sheet holds both tables side by side: the Beer League from column A and
  // the women's from column O, each with its own header row.
  const blocks: {
    competition: CompetitionKey
    offset: number
    drawColumn: boolean
  }[] = [
    { competition: 'beer', offset: 0, drawColumn: false },
    { competition: 'wubl', offset: 14, drawColumn: true },
  ]

  for (const block of blocks) {
    for (const row of rows) {
      const printedTeam = cellAt(row, block.offset).trim()
      const points = number(cellAt(row, block.offset + 1))
      if (printedTeam === '' || points === null) continue
      if (matchKey(printedTeam) === 'equipo') continue

      const team = findTeam(TEAMS_2026, block.competition, printedTeam)
      if (!team) {
        note(
          `Published standings name "${printedTeam}" in the ${block.competition} table, which matches no known team.`,
        )
      }

      const value = (index: number) =>
        number(cellAt(row, block.offset + index)) ?? 0

      out.push({
        competition: block.competition,
        printedTeam,
        teamSlug: team?.slug ?? null,
        points,
        wins: value(2),
        losses: value(3),
        // The women's sheet carries an "empate" column where the men's carries
        // PPSO. Same position, different meaning, and reading it as the wrong one
        // would pay a draw as a shootout loss.
        shootoutLosses: block.drawColumn ? 0 : value(4),
        draws: block.drawColumn ? value(4) : 0,
        regulationWins: value(5),
        goalsFor: value(6),
        goalsAgainst: value(7),
        goalDifference: value(8),
        played: value(9),
      })
    }
  }
  return out
}

function parsePublishedPlayerStats(
  players: readonly ParsedPlayer[],
): PublishedPlayerStatsRow[] {
  const files: { file: string; competition: CompetitionKey }[] = [
    { file: 'player-stats.html', competition: 'beer' },
    { file: 'wubl-player-stats.html', competition: 'wubl' },
  ]
  const out: PublishedPlayerStatsRow[] = []

  for (const { file, competition } of files) {
    for (const row of readSheet(file).slice(1)) {
      const printedPlayerName = cellAt(row, 0).trim()
      if (printedPlayerName === '') continue

      const printedTeam = cellAt(row, 1).trim()
      const player = findByTruncatedName(
        players,
        confirmedName(printedPlayerName),
      )
      const team =
        printedTeam === ''
          ? null
          : findTeam(TEAMS_2026, competition, printedTeam)

      out.push({
        competition,
        sourceFile: `spreadsheet-export/${file}`,
        printedPlayerName,
        printedTeam: printedTeam === '' ? null : printedTeam,
        playerSlug: player?.slug ?? null,
        teamSlug: team?.slug ?? null,
        // A blank cell is a zero: the printed Puntos column reads 0 on exactly
        // the lines where both Asistencias and Goles are blank.
        assists: number(cellAt(row, 2)) ?? 0,
        goals: number(cellAt(row, 3)) ?? 0,
        points: number(cellAt(row, 4)) ?? 0,
      })
    }
  }
  return out
}

function parsePublishedGoalieStats(
  players: readonly ParsedPlayer[],
): PublishedGoalieStatsRow[] {
  const files: { file: string; competition: CompetitionKey }[] = [
    { file: 'goalie-stats.html', competition: 'beer' },
    { file: 'wubl-goalie-stats.html', competition: 'wubl' },
  ]
  const out: PublishedGoalieStatsRow[] = []

  for (const { file, competition } of files) {
    for (const row of readSheet(file).slice(1)) {
      const printedPlayerName = cellAt(row, 0).trim()
      if (printedPlayerName === '') continue

      const printedTeam = cellAt(row, 1).trim()
      const player = findByTruncatedName(
        players,
        confirmedName(printedPlayerName),
      )
      const team =
        printedTeam === ''
          ? null
          : findTeam(TEAMS_2026, competition, printedTeam)
      const shotsFaced = number(cellAt(row, 3)) ?? 0
      const goalsAgainst = number(cellAt(row, 4)) ?? 0

      if (goalsAgainst > shotsFaced) {
        note(
          `Published goalkeeper line ${printedPlayerName} concedes ${goalsAgainst} of ${shotsFaced} shots faced.`,
        )
      }

      out.push({
        competition,
        sourceFile: `spreadsheet-export/${file}`,
        printedPlayerName,
        printedTeam: printedTeam === '' ? null : printedTeam,
        playerSlug: player?.slug ?? null,
        teamSlug: team?.slug ?? null,
        gamesPlayed: number(cellAt(row, 2)) ?? 0,
        shotsFaced,
        goalsAgainst,
        printedSavePercentage: cellAt(row, 5).trim() || null,
      })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const { players, rosters } = parseRosters()
const { matches, calendarNotes } = parseFixture()
const publishedStandings = parsePublishedStandings()
const publishedPlayerStats = parsePublishedPlayerStats(players)
const publishedGoalieStats = parsePublishedGoalieStats(players)

const unresolvedPlayerLines = [
  ...publishedPlayerStats,
  ...publishedGoalieStats,
].filter((row) => row.playerSlug === null)

// Every unresolved line is named, because a count is not something anybody can
// act on. Three things end up here and they need different answers from the
// organisation: a substitute who is on no roster, a person the roster does not
// list at all, and one name spelled two ways.
for (const row of unresolvedPlayerLines) {
  const reason =
    row.printedTeam === null
      ? 'the sheet gives no team either'
      : isSubstituteLine(row.printedTeam)
        ? 'marked as a substitute, so no roster row is expected'
        : row.competition === 'wubl'
          ? // The only rosters the league publishes are the Beer League's. A woman
            // who plays in both competitions is matched through her Beer League
            // roster row; one who plays only in the WUBL has no roster anywhere.
            'the women’s rosters are not published, so there is nothing to match against'
          : 'no roster player matches this spelling'
  note(
    `Published ${row.competition} line "${row.printedPlayerName}" is not linked to a player: ${reason}.`,
  )
}

for (const printedTeam of new Set(
  [...publishedPlayerStats, ...publishedGoalieStats]
    .filter((row) => row.printedTeam !== null && row.teamSlug === null)
    .map((row) => row.printedTeam as string),
)) {
  note(
    isSubstituteLine(printedTeam)
      ? `Published statistics carry "${printedTeam}" where a team goes: a substitute marker, kept as printed.`
      : `Published statistics name the team "${printedTeam}", which maps to no known team.`,
  )
}
const unresolvedTeamLines = [
  ...publishedPlayerStats,
  ...publishedGoalieStats,
].filter((row) => row.printedTeam !== null && row.teamSlug === null)

const parsed: ParsedSeason = {
  season: SEASON,
  publishedOn: PUBLISHED_ON,
  sources: [
    'fixture-2026-calendar.csv',
    'spreadsheet-export/teams.html',
    'spreadsheet-export/standings.html',
    'spreadsheet-export/player-stats.html',
    'spreadsheet-export/goalie-stats.html',
    'spreadsheet-export/wubl-player-stats.html',
    'spreadsheet-export/wubl-goalie-stats.html',
  ],
  teams: TEAMS_2026,
  players,
  rosters,
  matches,
  calendarNotes,
  publishedStandings,
  publishedPlayerStats,
  publishedGoalieStats,
  findings,
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8')

const byStage = new Map<string, number>()
for (const match of matches) {
  byStage.set(match.stage, (byStage.get(match.stage) ?? 0) + 1)
}

console.log(`Parsed the ${SEASON} season into ${OUT.replace(ROOT, '.')}\n`)
console.log(`  teams                 ${parsed.teams.length}`)
console.log(`  players               ${players.length}`)
console.log(`  roster entries        ${rosters.length}`)
console.log(`  matches               ${matches.length}`)
for (const [stage, count] of [...byStage].sort()) {
  console.log(`    ${stage.padEnd(18)}${count}`)
}
console.log(
  `  with a score          ${matches.filter((m) => m.homeGoals !== null).length}`,
)
console.log(`  calendar notes        ${calendarNotes.length}`)
console.log(`  published standings   ${publishedStandings.length}`)
console.log(`  published skaters     ${publishedPlayerStats.length}`)
console.log(`  published goalies     ${publishedGoalieStats.length}`)
console.log(`  unmatched stat lines  ${unresolvedPlayerLines.length}`)
console.log(`  unmatched team cells  ${unresolvedTeamLines.length}`)

if (findings.length > 0) {
  console.log(`\n${findings.length} finding(s), none of them fixed here:`)
  for (const finding of findings) console.log(`  - ${finding}`)
}
