/**
 * Step two of the import: reconcile the parsed season against the tables the
 * league published, and only then write the versioned seed.
 *
 *   npm run parse:sources && npm run build:seed
 *
 * The reconciliation is the point. The parse makes inferences the sheet does not
 * state outright, above all that a decided match with no shootout marker was won
 * in regulation, and the published PG, PGR, PPSO and goal columns are the only
 * evidence that those inferences are right. If a single cell disagrees and is not
 * a known, named error, this script writes nothing and exits non-zero: a partial
 * season loaded silently is the failure mode docs/plan.md step 8 exists to
 * prevent.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { format, resolveConfig } from 'prettier'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Seed } from '../src/data/seed'
import type { CompetitionKey, Match, StandingsRow } from '../src/data/types'
import { goalkeeping, savePercentage } from '../src/utils/goalkeeping'
import { standings } from '../src/utils/standings'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const PARSED = join(HERE, 'parsed', 'season-2026.json')
const OUT = join(ROOT, 'src', 'data', 'seed-2026.ts')

/**
 * A cell the league published that the results do not produce, each one read and
 * accounted for by hand. Anything not on this list stops the import.
 */
const ACCEPTED_DISCREPANCIES = [
  {
    competition: 'beer' as CompetitionKey,
    teamSlug: 'blanco',
    field: 'losses' as keyof StandingsRow,
    published: 1,
    computed: 2,
    why: 'The published row contradicts itself: 2 wins, 1 loss and 2 shootout losses is five games under a PJ of 6. Its points, goals and goal difference all reconcile, so the loss column is a slip on the sheet and the results are right. Open question for the organisation.',
  },
]

interface ParsedMatch {
  id: string
  competition: CompetitionKey
  stage: Match['stage']
  date: string
  time: string
  venue: Match['venue']
  homeTeamSlug: string | null
  awayTeamSlug: string | null
  homeGoals: number | null
  awayGoals: number | null
  resolution: Match['score'] extends null
    ? never
    : NonNullable<Match['score']>['resolution']
  printedHome: string | null
  printedAway: string | null
  notes: string[]
}

interface ParsedSeason {
  season: number
  publishedOn: string
  sources: string[]
  teams: Seed['teams']
  players: Seed['players']
  rosters: (Seed['rosters'][number] & { printedTeam: string })[]
  matches: (Omit<ParsedMatch, 'resolution'> & {
    resolution: 'regulation' | 'shootout' | 'draw' | null
  })[]
  calendarNotes: Seed['calendarNotes']
  publishedStandings: {
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
  }[]
  publishedPlayerStats: Seed['publishedPlayerStats']
  publishedGoalieStats: (Seed['publishedGoalieStats'][number] & {
    printedSavePercentage: string | null
  })[]
  findings: string[]
}

const parsed = JSON.parse(readFileSync(PARSED, 'utf8')) as ParsedSeason

// ---------------------------------------------------------------------------
// The parsed fixture, as the domain types see it
// ---------------------------------------------------------------------------

const matches: Match[] = parsed.matches.map((match) => ({
  id: match.id,
  competition: match.competition,
  stage: match.stage,
  date: match.date,
  time: match.time,
  venue: match.venue,
  homeTeamId: match.homeTeamSlug,
  awayTeamId: match.awayTeamSlug,
  score:
    match.homeGoals !== null &&
    match.awayGoals !== null &&
    match.resolution !== null
      ? {
          home: match.homeGoals,
          away: match.awayGoals,
          resolution: match.resolution,
        }
      : null,
  // Everything the parse could not resolve about this row, in one readable
  // string, so a gap survives into the application instead of stopping at the
  // importer's console.
  // The parse already names each side it could not resolve, so the notes are
  // just its lines joined; a row that needs no explanation gets null rather
  // than an empty string.
  notes: match.notes.join(' ') || null,
}))

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

const problems: string[] = []
const accepted: string[] = []

const COMPARED = [
  'points',
  'wins',
  'regulationWins',
  'shootoutLosses',
  'draws',
  'losses',
  'goalsFor',
  'goalsAgainst',
  'goalDifference',
  'played',
] as const satisfies readonly (keyof StandingsRow)[]

for (const competition of ['beer', 'wubl'] as const) {
  const published = parsed.publishedStandings.filter(
    (row) => row.competition === competition,
  )
  const teamIds = parsed.teams
    .filter((team) => team.competition === competition)
    .map((team) => team.slug)
  const computed = standings(matches, { competition, teamIds })

  for (const publishedRow of published) {
    if (publishedRow.teamSlug === null) {
      problems.push(
        `${competition}: published row "${publishedRow.printedTeam}" is not linked to a team, so it cannot be reconciled.`,
      )
      continue
    }

    const computedRow = computed.find(
      (row) => row.teamId === publishedRow.teamSlug,
    )
    if (!computedRow) {
      problems.push(
        `${competition}: the results produce no row for ${publishedRow.teamSlug}, which the league published.`,
      )
      continue
    }

    for (const field of COMPARED) {
      const publishedValue = publishedRow[field]
      const computedValue = computedRow[field]
      if (publishedValue === computedValue) continue

      const excuse = ACCEPTED_DISCREPANCIES.find(
        (entry) =>
          entry.competition === competition &&
          entry.teamSlug === publishedRow.teamSlug &&
          entry.field === field &&
          entry.published === publishedValue &&
          entry.computed === computedValue,
      )

      if (excuse) {
        accepted.push(
          `${competition} ${publishedRow.teamSlug} ${field}: published ${publishedValue}, results give ${computedValue}. ${excuse.why}`,
        )
      } else {
        problems.push(
          `${competition} ${publishedRow.teamSlug} ${field}: published ${publishedValue}, results give ${computedValue}.`,
        )
      }
    }
  }

  // Every team the league lists has to be in the table and the other way round.
  for (const row of computed) {
    if (!published.some((candidate) => candidate.teamSlug === row.teamId)) {
      problems.push(
        `${competition}: ${row.teamId} plays in the fixture and does not appear in the published standings.`,
      )
    }
  }
}

// The published statistics cannot be recomputed from the sources, which carry no
// per-goal record, so what is checked is that each printed line agrees with
// itself: points against goals plus assists, and the printed percentage against
// shots faced and goals against.
for (const line of parsed.publishedPlayerStats) {
  if (line.points !== line.goals + line.assists) {
    problems.push(
      `Published line "${line.printedPlayerName}" prints ${line.points} points against ${line.goals} goals and ${line.assists} assists.`,
    )
  }
}

for (const line of parsed.publishedGoalieStats) {
  const printed = line.printedSavePercentage
  if (!printed) continue

  const expected = savePercentage(line.shotsFaced, line.goalsAgainst)
  if (expected === null) continue

  const asPrinted = Number(printed.replace('%', '').trim())
  if (Number.isFinite(asPrinted) && Math.round(expected * 100) !== asPrinted) {
    problems.push(
      `Published goalkeeper "${line.printedPlayerName}" prints ${printed} against ${line.goalsAgainst} of ${line.shotsFaced}, which is ${Math.round(expected * 100)}%.`,
    )
  }
}

// A goalkeeping table built from the seed's own lines would be empty for 2026,
// and that is the expected state until the back office enters match sheets. This
// asserts the derived path still runs on an empty input rather than throwing.
for (const competition of ['beer', 'wubl'] as const) {
  const derived = goalkeeping([], { competition })
  if (derived.length !== 0) {
    problems.push(
      `${competition}: the derived goalkeeping table is not empty on no lines.`,
    )
  }
}

// ---------------------------------------------------------------------------
// Report, then write only if it reconciles
// ---------------------------------------------------------------------------

console.log(
  `Reconciling the ${parsed.season} season against what the league published\n`,
)
console.log(`  matches                ${matches.length}`)
console.log(
  `  with a score           ${matches.filter((m) => m.score !== null).length}`,
)
console.log(`  published rows checked ${parsed.publishedStandings.length}`)
console.log(`  fields per row         ${COMPARED.length}`)

if (accepted.length > 0) {
  console.log(
    `\n${accepted.length} known discrepancy, accepted and documented:`,
  )
  for (const entry of accepted) console.log(`  - ${entry}`)
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s). Nothing was written.`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

const seed: Seed = {
  season: parsed.season,
  publishedOn: parsed.publishedOn,
  sources: parsed.sources,
  teams: parsed.teams,
  players: parsed.players,
  // The printed team name stays in the parse: every roster row resolved to a
  // team, so the string adds nothing the slug does not already say.
  rosters: parsed.rosters.map((entry) => ({
    playerSlug: entry.playerSlug,
    teamSlug: entry.teamSlug,
    competition: entry.competition,
    jerseyNumber: entry.jerseyNumber,
  })),
  matches,
  publishedPlayerStats: parsed.publishedPlayerStats,
  // The printed percentage stays behind: it was checked above against the two
  // numbers it is made of, and carrying it further would be a second answer to
  // the same question.
  publishedGoalieStats: parsed.publishedGoalieStats.map((line) => ({
    competition: line.competition,
    sourceFile: line.sourceFile,
    printedPlayerName: line.printedPlayerName,
    printedTeam: line.printedTeam,
    playerSlug: line.playerSlug,
    teamSlug: line.teamSlug,
    gamesPlayed: line.gamesPlayed,
    shotsFaced: line.shotsFaced,
    goalsAgainst: line.goalsAgainst,
  })),
  calendarNotes: parsed.calendarNotes,
  findings: parsed.findings,
}

const header = `/**
 * The ${parsed.season} season, generated from \`docs/sources/\` by
 * \`npm run build:seed\`. Do not edit by hand.
 *
 * Written only after every field of every row the league published reconciled
 * with what the results produce, with one documented exception recorded in
 * \`scripts/build-seed.ts\`. What the sources leave unresolved is carried in
 * \`findings\` rather than smoothed over.
 *
 * Totals published: ${parsed.publishedOn}.
 */

import type { Seed } from './seed'

export const SEED_${parsed.season}: Seed = ${JSON.stringify(seed, null, 2)}

export default SEED_${parsed.season}
`

// Formatted with the repository's own prettier configuration, so regenerating
// the seed is idempotent: without this, `npm run format` and `npm run build:seed`
// would each undo the other's work on this file for ever.
const formatted = await format(header, {
  ...(await resolveConfig(OUT)),
  parser: 'typescript',
})

writeFileSync(OUT, formatted, 'utf8')

console.log(`\nReconciled. Wrote ${OUT.replace(ROOT, '.')}`)
console.log(
  `  ${seed.players.length} players, ${seed.rosters.length} roster entries`,
)
console.log(
  `  ${seed.publishedPlayerStats.length} published skater lines, ${seed.publishedGoalieStats.length} goalkeeper lines`,
)
console.log(`  ${seed.findings.length} finding(s) carried into the application`)
