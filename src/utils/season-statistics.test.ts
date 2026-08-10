import type { GoalieLine, GoalRecord } from '../data/types'
import type { SeedPlayer } from '../data/seed'
import type { TeamSeed } from '../data/teams-2026'
import { computedGoalkeeping, computedScoring } from './season-statistics'

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

const season = (goals: GoalRecord[] = [], goalieLines: GoalieLine[] = []) => ({
  teams: TEAMS,
  players: PLAYERS,
  goals,
  goalieLines,
})

const goal = (fields: Partial<GoalRecord> = {}): GoalRecord => ({
  matchId: 'm1',
  competition: 'beer',
  teamId: 'sucucho',
  scorerId: 'p1',
  assistId: null,
  ...fields,
})

describe('computedScoring', () => {
  it('has nothing to say while the panel has recorded nothing', () => {
    // Null rather than an empty table: the section shows the league's published
    // totals and adds nothing beside them until there is something to add.
    expect(computedScoring(season(), 'beer')).toBeNull()
  })

  it('computes from the panel’s own goals the moment there are any', () => {
    // The night of 2026-08-10: sixty-eight goals loaded and the site unchanged,
    // because nothing read them.
    const table = computedScoring(
      season([
        goal({ scorerId: 'p1', assistId: 'p2' }),
        goal({ scorerId: 'p1' }),
        goal({ scorerId: 'p2', matchId: 'm2' }),
      ]),
      'beer',
    )

    // The count is what tells a reader this is not the season: it is what the
    // caption says out loud.
    expect(table?.matches).toBe(2)
    expect(table?.rows).toEqual([
      {
        name: 'Aguirre Nahuel',
        nameIsPrinted: false,
        team: 'Sucucho',
        isSubstitute: false,
        goals: 2,
        assists: 0,
        points: 2,
      },
      {
        name: 'Barrientos Luz',
        nameIsPrinted: false,
        team: 'Sucucho',
        isSubstitute: false,
        goals: 1,
        assists: 1,
        points: 2,
      },
    ])
  })

  it('never marks a computed name as printed, because it is not', () => {
    // The asterisk means "the sheet truncated this and nobody confirmed it".
    // A name read from the players table has not been truncated by anybody.
    const table = computedScoring(season([goal()]), 'beer')

    expect(table?.rows.every((row) => !row.nameIsPrinted)).toBe(true)
  })

  it('keeps the two competitions apart', () => {
    // A women's goal must not reach the Beer League table, and the women's
    // table is computed from its own goals even when the men's is not.
    const both = season([
      goal(),
      goal({ competition: 'wubl', teamId: 'wubl-brolas', scorerId: 'p2' }),
    ])

    expect(computedScoring(both, 'beer')?.rows).toHaveLength(1)
    const women = computedScoring(both, 'wubl')
    // The slug the goal carries is the old spelling; the team is found anyway.
    expect(women?.rows[0]?.team).toBe('Turbeerras')
  })

  it('leaves the team blank rather than guessing for somebody who only assisted', () => {
    const table = computedScoring(
      season([goal({ scorerId: null, assistId: 'p2' })]),
      'beer',
    )

    expect(table?.rows).toEqual([
      {
        name: 'Barrientos Luz',
        nameIsPrinted: false,
        team: null,
        isSubstitute: false,
        goals: 0,
        assists: 1,
        points: 1,
      },
    ])
  })
})

describe('computedGoalkeeping', () => {
  const line = (fields: Partial<GoalieLine> = {}): GoalieLine => ({
    matchId: 'm1',
    competition: 'beer',
    playerId: 'gk',
    teamId: 'sucucho',
    shotsFaced: 10,
    goalsAgainst: 2,
    ...fields,
  })

  it('has nothing to say until a line is recorded', () => {
    expect(computedGoalkeeping(season(), 'beer')).toBeNull()
  })

  it('adds the lines up and computes the percentage', () => {
    const table = computedGoalkeeping(
      season(
        [],
        [line(), line({ matchId: 'm2', shotsFaced: 10, goalsAgainst: 0 })],
      ),
      'beer',
    )

    expect(table?.matches).toBe(2)
    expect(table?.rows[0]).toEqual({
      name: 'Cavalleri Sol',
      nameIsPrinted: false,
      team: 'Sucucho',
      isSubstitute: false,
      gamesPlayed: 2,
      shotsFaced: 20,
      goalsAgainst: 2,
      savePercentage: 0.9,
    })
  })

  it('has no percentage for a keeper who faced nothing, rather than a perfect one', () => {
    const table = computedGoalkeeping(
      season([], [line({ shotsFaced: 0, goalsAgainst: 0 })]),
      'beer',
    )

    expect(table?.rows[0]?.savePercentage).toBeNull()
  })
})
