import type { CompetitionKey, GoalieLine } from '../data/types'
import { PUBLISHED_GOALKEEPERS } from './fixtures/season-2026'
import { goalkeeping, savePercentage } from './goalkeeping'

let sequence = 0

function line(
  playerId: string,
  shotsFaced: number,
  goalsAgainst: number,
  competition: CompetitionKey = 'beer',
): GoalieLine {
  sequence += 1
  return {
    matchId: `test-${sequence}`,
    competition,
    playerId,
    teamId: 'a-team',
    shotsFaced,
    goalsAgainst,
  }
}

function rowFor<Row extends { playerId: string }>(
  rows: readonly Row[],
  playerId: string,
): Row {
  const row = rows.find((candidate) => candidate.playerId === playerId)
  if (!row) throw new Error(`No goalkeeping row for ${playerId}`)
  return row
}

describe('savePercentage', () => {
  it('is the share of shots that did not go in', () => {
    expect(savePercentage(10, 2)).toBe(0.8)
  })

  it('is null when no shot was faced, not a perfect record', () => {
    expect(savePercentage(0, 0)).toBeNull()
  })

  it('refuses more goals than shots', () => {
    expect(() => savePercentage(5, 6)).toThrow(
      /cannot concede more than they faced/,
    )
  })

  it('refuses negative figures', () => {
    expect(() => savePercentage(-1, 0)).toThrow(/cannot be negative/)
    expect(() => savePercentage(10, -1)).toThrow(/cannot be negative/)
  })

  it('matches every percentage the league published', () => {
    for (const keeper of PUBLISHED_GOALKEEPERS) {
      const computed = savePercentage(keeper.shotsFaced, keeper.goalsAgainst)

      expect(computed).not.toBeNull()
      expect(Math.round((computed ?? 0) * 100)).toBe(keeper.printed)
    }
  })
})

describe('goalkeeping', () => {
  it('adds a keeper’s lines up and counts one game per line', () => {
    const rows = goalkeeping([line('keeper', 30, 3), line('keeper', 20, 1)], {
      competition: 'beer',
    })

    expect(rowFor(rows, 'keeper')).toEqual({
      playerId: 'keeper',
      gamesPlayed: 2,
      shotsFaced: 50,
      goalsAgainst: 4,
      savePercentage: 0.92,
    })
  })

  it('computes the percentage from the totals, never from the averages', () => {
    // 90 of 100 and 1 of 2 is 91 of 102, not the mean of 90% and 50%.
    const rows = goalkeeping([line('keeper', 100, 10), line('keeper', 2, 1)], {
      competition: 'beer',
    })

    expect(rowFor(rows, 'keeper').savePercentage).toBeCloseTo(91 / 102, 10)
  })

  it('leaves a keeper who faced nothing without a percentage', () => {
    const rows = goalkeeping([line('keeper', 0, 0)], { competition: 'beer' })

    expect(rowFor(rows, 'keeper')).toMatchObject({
      gamesPlayed: 1,
      savePercentage: null,
    })
  })

  it('orders by percentage and puts the keepers without one last', () => {
    const rows = goalkeeping(
      [line('weaker', 10, 4), line('stronger', 10, 1), line('untested', 0, 0)],
      { competition: 'beer' },
    )

    expect(rows.map((row) => row.playerId)).toEqual([
      'stronger',
      'weaker',
      'untested',
    ])
  })

  it('breaks a tie in percentage by the number of shots faced', () => {
    const rows = goalkeeping([line('busy', 100, 10), line('quiet', 10, 1)], {
      competition: 'beer',
    })

    expect(rows.map((row) => row.playerId)).toEqual(['busy', 'quiet'])
  })

  it('never lets one competition reach the other table', () => {
    const lines = [
      line('beer-keeper', 10, 1),
      line('wubl-keeper', 10, 1, 'wubl'),
    ]

    expect(
      goalkeeping(lines, { competition: 'beer' }).map((row) => row.playerId),
    ).toEqual(['beer-keeper'])
    expect(
      goalkeeping(lines, { competition: 'wubl' }).map((row) => row.playerId),
    ).toEqual(['wubl-keeper'])
  })
})
