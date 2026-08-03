import { SEED_2026 } from '../data/seed-2026'
import type {
  SeedPublishedGoalieLine,
  SeedPublishedPlayerLine,
} from '../data/seed'
import {
  formatSavePercentage,
  publishedGoalkeepingTable,
  publishedScoringTable,
} from './published-statistics'

const skater = (
  overrides: Partial<SeedPublishedPlayerLine> = {},
): SeedPublishedPlayerLine => ({
  competition: 'beer',
  sourceFile: 'spreadsheet-export/player-stats.html',
  printedPlayerName: 'Printed Name',
  printedTeam: 'Hantachoppers',
  playerSlug: null,
  teamSlug: null,
  resolvedName: null,
  assists: 0,
  goals: 0,
  points: 0,
  ...overrides,
})

const keeper = (
  overrides: Partial<SeedPublishedGoalieLine> = {},
): SeedPublishedGoalieLine => ({
  competition: 'beer',
  sourceFile: 'spreadsheet-export/goalie-stats.html',
  printedPlayerName: 'Printed Keeper',
  printedTeam: 'Hantachoppers',
  playerSlug: null,
  teamSlug: null,
  resolvedName: null,
  gamesPlayed: 1,
  shotsFaced: 10,
  goalsAgainst: 2,
  ...overrides,
})

describe('publishedScoringTable', () => {
  it('prefers the roster spelling and says when it had to use the printed text', () => {
    const rows = publishedScoringTable(
      [
        skater({
          printedPlayerName: 'Beltrami Ramir',
          resolvedName: 'Beltrami Ramiro',
        }),
        skater({ printedPlayerName: 'velasquez lucia' }),
      ],
      { competition: 'beer' },
    )

    expect(rows.map((row) => [row.name, row.nameIsPrinted])).toEqual([
      ['Beltrami Ramiro', false],
      ['velasquez lucia', true],
    ])
  })

  it('ranks goals above assists when players are level on points', () => {
    const rows = publishedScoringTable(
      [
        skater({
          printedPlayerName: 'Passer',
          assists: 11,
          goals: 5,
          points: 16,
        }),
        skater({
          printedPlayerName: 'Shooter',
          assists: 5,
          goals: 11,
          points: 16,
        }),
      ],
      { competition: 'beer' },
    )

    expect(rows.map((row) => row.name)).toEqual(['Shooter', 'Passer'])
  })

  it('marks a substitute line without turning it into a team', () => {
    const rows = publishedScoringTable(
      [
        skater({ printedTeam: 'Suplente (Sucucho)' }),
        skater({ printedTeam: null }),
      ],
      { competition: 'beer' },
    )

    expect(rows[0]).toMatchObject({
      isSubstitute: true,
      team: 'Suplente (Sucucho)',
    })
    expect(rows[1]).toMatchObject({ isSubstitute: false, team: null })
  })

  it('never lets one competition reach the other table', () => {
    const lines = [
      skater({ printedPlayerName: 'Beer' }),
      skater({ printedPlayerName: 'Wubl', competition: 'wubl' }),
    ]

    expect(publishedScoringTable(lines, { competition: 'beer' })).toHaveLength(
      1,
    )
    expect(publishedScoringTable(lines, { competition: 'wubl' })[0]?.name).toBe(
      'Wubl',
    )
  })

  it('reproduces the head of the table the league published', () => {
    const rows = publishedScoringTable(SEED_2026.publishedPlayerStats, {
      competition: 'beer',
    })

    expect(rows.slice(0, 3).map((row) => [row.name, row.points])).toEqual([
      ['Beltrami Ramiro', 29],
      ['Baeza Pedro/Tincho', 23],
      ['Ruggirello Matt', 23],
    ])
  })
})

describe('publishedGoalkeepingTable', () => {
  it('computes the percentage rather than reading one', () => {
    const rows = publishedGoalkeepingTable(
      [keeper({ shotsFaced: 173, goalsAgainst: 25 })],
      {
        competition: 'beer',
      },
    )

    expect(rows[0]?.savePercentage).toBeCloseTo(148 / 173, 10)
  })

  it('orders by percentage and puts a keeper who faced nothing last', () => {
    const rows = publishedGoalkeepingTable(
      [
        keeper({
          printedPlayerName: 'Weaker',
          shotsFaced: 10,
          goalsAgainst: 4,
        }),
        keeper({
          printedPlayerName: 'Untested',
          shotsFaced: 0,
          goalsAgainst: 0,
        }),
        keeper({
          printedPlayerName: 'Stronger',
          shotsFaced: 10,
          goalsAgainst: 1,
        }),
      ],
      { competition: 'beer' },
    )

    expect(rows.map((row) => row.name)).toEqual([
      'Stronger',
      'Weaker',
      'Untested',
    ])
  })

  it('matches every percentage the league printed, for both competitions', () => {
    const printed: Record<string, number> = {
      'Badaraco Nico': 86,
      'Amaolo Lanata, Gonza': 88,
      'Zayas Marce': 79,
      'bernales joaqu': 79,
      'Martin lopez mieres': 73,
      'Zunino franc': 71,
      'Valdez Gusta': 69,
      'Amaolo Lanata, Euge': 61,
      'Lautaro Jofre': 59,
      'Cavaliere Milag': 70,
    }

    for (const competition of ['beer', 'wubl'] as const) {
      for (const row of publishedGoalkeepingTable(
        SEED_2026.publishedGoalieStats,
        {
          competition,
        },
      )) {
        const line = SEED_2026.publishedGoalieStats.find(
          (candidate) =>
            candidate.competition === competition &&
            (candidate.resolvedName ?? candidate.printedPlayerName) ===
              row.name,
        )
        const expected = printed[line?.printedPlayerName ?? '']
        if (expected === undefined) continue

        expect(formatSavePercentage(row.savePercentage)).toBe(`${expected}%`)
      }
    }
  })
})

describe('formatSavePercentage', () => {
  it('prints a whole percentage, as the league does', () => {
    expect(formatSavePercentage(148 / 173)).toBe('86%')
    expect(formatSavePercentage(1)).toBe('100%')
  })

  it('prints a dash when there is no percentage to print', () => {
    expect(formatSavePercentage(null)).toBe('—')
  })
})
