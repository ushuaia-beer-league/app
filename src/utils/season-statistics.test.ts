import type { SeedPlayer } from '../data/seed'
import type { GoalieLine, GoalRecord, Match } from '../data/types'
import type { TeamSeed } from '../data/teams-2026'
import type {
  PublishedGoalkeepingRow,
  PublishedScoringRow,
} from './published-statistics'
import { seasonGoalkeeping, seasonScoring } from './season-statistics'

const TEAMS: TeamSeed[] = [
  {
    slug: 'sucucho',
    competition: 'beer',
    shortName: 'Sucucho',
    fullName: null,
    nickname: null,
    aliases: [],
    mappingInferred: false,
  },
  {
    // A women's team under its renamed slug, to prove the bridge is crossed.
    slug: 'wubl-birra-del-fuego',
    competition: 'wubl',
    shortName: 'Turbeerras',
    fullName: null,
    nickname: null,
    aliases: [],
    mappingInferred: false,
  },
]

const PLAYERS: SeedPlayer[] = [
  { slug: 'p1', name: 'Aguirre Nahuel', printedName: 'aguirre nahuel' },
  { slug: 'p2', name: 'Barrientos Luz', printedName: 'barrientos luz' },
  { slug: 'gk', name: 'Cavalleri Sol', printedName: 'cavalleri sol' },
]

const PUBLISHED_ON = '2026-07-04'

/** One match before the league published its totals, and one after. */
const MATCHES: Match[] = [
  {
    id: 'antes',
    competition: 'beer',
    stage: 'regular',
    date: '2026-06-20',
    time: '21:30',
    venue: 'bahia',
    homeTeamId: 'sucucho',
    awayTeamId: 'blanco',
    score: { home: 3, away: 2, resolution: 'regulation' },
    notes: null,
  },
  {
    id: 'despues',
    competition: 'beer',
    stage: 'semifinal',
    date: '2026-08-08',
    time: '23:30',
    venue: null,
    homeTeamId: 'sucucho',
    awayTeamId: 'blanco',
    score: { home: 7, away: 4, resolution: 'regulation' },
    notes: null,
  },
]

const season = (goals: GoalRecord[] = [], goalieLines: GoalieLine[] = []) => ({
  teams: TEAMS,
  players: PLAYERS,
  goals,
  goalieLines,
  matches: MATCHES,
  publishedOn: PUBLISHED_ON,
})

const goal = (fields: Partial<GoalRecord> = {}): GoalRecord => ({
  matchId: 'despues',
  competition: 'beer',
  teamId: 'sucucho',
  scorerId: 'p1',
  assistId: null,
  ...fields,
})

const line = (fields: Partial<GoalieLine> = {}): GoalieLine => ({
  matchId: 'despues',
  competition: 'beer',
  playerId: 'gk',
  teamId: 'sucucho',
  shotsFaced: 10,
  goalsAgainst: 1,
  ...fields,
})

/** A published line the importer matched to a person, and one it did not. */
const RESOLVED: PublishedScoringRow = {
  playerId: 'p1',
  name: 'Aguirre Nahuel',
  nameIsPrinted: false,
  team: 'Sucucho',
  isSubstitute: false,
  assists: 1,
  goals: 9,
  points: 10,
}

const UNRESOLVED: PublishedScoringRow = {
  playerId: null,
  name: 'Beltrami Ramir',
  nameIsPrinted: true,
  team: 'Sucucho',
  isSubstitute: false,
  assists: 0,
  goals: 4,
  points: 4,
}

const PUBLISHED_KEEPER: PublishedGoalkeepingRow = {
  playerId: 'gk',
  name: 'Cavalleri Sol',
  nameIsPrinted: false,
  team: 'Sucucho',
  isSubstitute: false,
  gamesPlayed: 4,
  shotsFaced: 40,
  goalsAgainst: 8,
  savePercentage: 0.8,
}

describe('seasonScoring', () => {
  it('hands the published totals back untouched while nothing was recorded', () => {
    const table = seasonScoring(season(), 'beer', [RESOLVED])

    expect(table.addedMatches).toBe(0)
    expect(table.rows).toEqual([RESOLVED])
  })

  it('adds a recorded match to the person the published line names', () => {
    // One table, which is what the operator asked for after reading two.
    const table = seasonScoring(
      season([goal(), goal(), goal({ assistId: 'p1' })]),
      'beer',
      [RESOLVED],
    )

    expect(table.addedMatches).toBe(1)
    expect(table.rows).toEqual([
      { ...RESOLVED, goals: 12, assists: 2, points: 14 },
    ])
  })

  it('never counts a match the published totals already include', () => {
    // The rule that keeps the sum honest: a June sheet is inside the totals
    // published on 4 July, so adding it would double every goal in it. Nothing
    // loaded today is from June, which is exactly why it must be a rule.
    const table = seasonScoring(season([goal({ matchId: 'antes' })]), 'beer', [
      RESOLVED,
    ])

    expect(table.addedMatches).toBe(0)
    expect(table.rows).toEqual([RESOLVED])
  })

  it('leaves a line the importer never matched as its own row', () => {
    // Fourteen of the 2026 lines reach nobody. Merging a recorded goal into one
    // would be guessing which person it belongs to.
    const table = seasonScoring(season([goal()]), 'beer', [UNRESOLVED])

    expect(table.rows).toHaveLength(2)
    expect(table.rows).toContainEqual(UNRESOLVED)
    expect(table.rows).toContainEqual({
      playerId: 'p1',
      name: 'Aguirre Nahuel',
      nameIsPrinted: false,
      team: 'Sucucho',
      isSubstitute: false,
      goals: 1,
      assists: 0,
      points: 1,
    })
  })

  it('orders the merged table the way the league orders it', () => {
    // Points, then goals: eleven assists do not outrank eleven goals.
    const table = seasonScoring(
      season([goal({ scorerId: 'p2' }), goal({ scorerId: 'p2' })]),
      'beer',
      [RESOLVED],
    )

    expect(table.rows.map((row) => row.name)).toEqual([
      'Aguirre Nahuel',
      'Barrientos Luz',
    ])
  })

  it('keeps the two competitions apart, renamed slugs and all', () => {
    const both = season([
      goal(),
      goal({
        competition: 'wubl',
        teamId: 'wubl-brolas',
        scorerId: 'p2',
      }),
    ])

    expect(seasonScoring(both, 'beer', []).rows).toHaveLength(1)
    // The goal carries the old spelling of the slug; the team is found anyway.
    expect(seasonScoring(both, 'wubl', []).rows[0]?.team).toBe('Turbeerras')
  })
})

describe('seasonGoalkeeping', () => {
  it('adds the shots up and recomputes the percentage from the sum', () => {
    // Never an average of percentages: 80% over 40 shots and 90% over 10 is not
    // 85% of anything.
    const table = seasonGoalkeeping(season([], [line()]), 'beer', [
      PUBLISHED_KEEPER,
    ])

    expect(table.addedMatches).toBe(1)
    expect(table.rows[0]).toMatchObject({
      gamesPlayed: 5,
      shotsFaced: 50,
      goalsAgainst: 9,
      savePercentage: (50 - 9) / 50,
    })
  })

  it('ignores a line from a match the totals already cover', () => {
    const table = seasonGoalkeeping(
      season([], [line({ matchId: 'antes' })]),
      'beer',
      [PUBLISHED_KEEPER],
    )

    expect(table.addedMatches).toBe(0)
    expect(table.rows).toEqual([PUBLISHED_KEEPER])
  })

  it('has no percentage for a keeper who faced nothing, rather than a perfect one', () => {
    const table = seasonGoalkeeping(
      season([], [line({ playerId: 'p2', shotsFaced: 0, goalsAgainst: 0 })]),
      'beer',
      [],
    )

    expect(table.rows[0]?.savePercentage).toBeNull()
  })
})
