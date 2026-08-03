import type { Match, MatchResolution } from '../data/types'
import {
  BEER_TEAMS,
  PUBLISHED_BEER_STANDINGS,
  PUBLISHED_WUBL_STANDINGS,
  SEASON_2026_MATCHES,
  WUBL_TEAMS,
} from './fixtures/season-2026'
import { outcomeFor, pointsFor, standings } from './standings'

let sequence = 0

function match(
  home: string,
  goals: [number, number],
  away: string,
  overrides: Partial<Match> = {},
): Match {
  sequence += 1
  const resolution: MatchResolution =
    overrides.score?.resolution ??
    (goals[0] === goals[1] ? 'draw' : 'regulation')

  return {
    id: `test-${sequence}`,
    competition: 'beer',
    stage: 'regular',
    date: '2026-05-23',
    time: '21:30',
    venue: 'bahia',
    homeTeamId: home,
    awayTeamId: away,
    score: { home: goals[0], away: goals[1], resolution },
    ...overrides,
    // Spreading a Partial widens every field to include undefined, and a match
    // with no note carries null.
    notes: overrides.notes ?? null,
  }
}

function rowFor<Row extends { teamId: string }>(
  rows: readonly Row[],
  teamId: string,
): Row {
  const row = rows.find((candidate) => candidate.teamId === teamId)
  if (!row) throw new Error(`No standings row for ${teamId}`)
  return row
}

describe('pointsFor', () => {
  it('pays a win 2, whether or not it needed a shootout', () => {
    expect(pointsFor('regulation-win')).toBe(2)
    expect(pointsFor('shootout-win')).toBe(2)
  })

  it('pays a shootout loss 1 and a draw 1', () => {
    expect(pointsFor('shootout-loss')).toBe(1)
    expect(pointsFor('draw')).toBe(1)
  })

  it('pays a regulation loss nothing', () => {
    expect(pointsFor('regulation-loss')).toBe(0)
  })
})

describe('outcomeFor', () => {
  it('reads a regulation result from each side', () => {
    const score = { home: 9, away: 6, resolution: 'regulation' } as const

    expect(outcomeFor(score, 'home')).toBe('regulation-win')
    expect(outcomeFor(score, 'away')).toBe('regulation-loss')
  })

  it('reads a shootout result from each side', () => {
    const score = { home: 5, away: 4, resolution: 'shootout' } as const

    expect(outcomeFor(score, 'home')).toBe('shootout-win')
    expect(outcomeFor(score, 'away')).toBe('shootout-loss')
  })

  it('reads a draw from each side', () => {
    const score = { home: 4, away: 4, resolution: 'draw' } as const

    expect(outcomeFor(score, 'home')).toBe('draw')
    expect(outcomeFor(score, 'away')).toBe('draw')
  })

  it('refuses a draw whose goals differ', () => {
    expect(() =>
      outcomeFor({ home: 4, away: 3, resolution: 'draw' }, 'home'),
    ).toThrow(/draw cannot have different goals/)
  })

  it('refuses a decided match that ended level', () => {
    expect(() =>
      outcomeFor({ home: 4, away: 4, resolution: 'shootout' }, 'home'),
    ).toThrow(/cannot end level/)
  })
})

describe('standings', () => {
  it('counts a regulation win and a regulation loss', () => {
    const rows = standings([match('a', [3, 1], 'b')], { competition: 'beer' })

    expect(rowFor(rows, 'a')).toMatchObject({
      points: 2,
      played: 1,
      wins: 1,
      regulationWins: 1,
      losses: 0,
      goalsFor: 3,
      goalsAgainst: 1,
      goalDifference: 2,
    })
    expect(rowFor(rows, 'b')).toMatchObject({
      points: 0,
      played: 1,
      wins: 0,
      losses: 1,
      goalDifference: -2,
    })
  })

  it('pays a shootout win as much as a regulation win but leaves it out of PGR', () => {
    const shootout = standings(
      [
        match('a', [5, 4], 'b', {
          score: { home: 5, away: 4, resolution: 'shootout' },
        }),
      ],
      { competition: 'beer' },
    )
    const regulation = standings([match('c', [5, 4], 'd')], {
      competition: 'beer',
    })

    expect(rowFor(shootout, 'a').points).toBe(rowFor(regulation, 'c').points)
    expect(rowFor(shootout, 'a')).toMatchObject({ wins: 1, regulationWins: 0 })
    expect(rowFor(regulation, 'c')).toMatchObject({
      wins: 1,
      regulationWins: 1,
    })
  })

  it('pays a shootout loss 1', () => {
    const rows = standings(
      [
        match('a', [5, 4], 'b', {
          score: { home: 5, away: 4, resolution: 'shootout' },
        }),
      ],
      { competition: 'beer' },
    )

    expect(rowFor(rows, 'b')).toMatchObject({
      points: 1,
      shootoutLosses: 1,
      losses: 0,
      played: 1,
    })
  })

  it('pays a draw 1 to each side', () => {
    const rows = standings([match('a', [4, 4], 'b', { competition: 'wubl' })], {
      competition: 'wubl',
    })

    expect(rowFor(rows, 'a')).toMatchObject({ points: 1, draws: 1, played: 1 })
    expect(rowFor(rows, 'b')).toMatchObject({ points: 1, draws: 1, played: 1 })
  })

  it('counts a 0-0 as played, because zero is a real score', () => {
    const rows = standings([match('a', [0, 0], 'b', { competition: 'wubl' })], {
      competition: 'wubl',
    })

    expect(rowFor(rows, 'a')).toMatchObject({
      played: 1,
      points: 1,
      draws: 1,
      goalsFor: 0,
      goalsAgainst: 0,
    })
  })

  it('separates teams level on points by PGR, not by goal difference', () => {
    // Both finish on 6 points from three wins. `pgr` won all three in
    // regulation and by a single goal; `so` needed a shootout for one of its
    // three and has a far better goal difference, which must not save it.
    const rows = standings(
      [
        match('pgr', [2, 1], 'filler-a'),
        match('pgr', [2, 1], 'filler-b'),
        match('pgr', [2, 1], 'filler-c'),
        match('so', [10, 0], 'filler-d'),
        match('so', [10, 0], 'filler-e'),
        match('so', [2, 1], 'filler-f', {
          score: { home: 2, away: 1, resolution: 'shootout' },
        }),
      ],
      { competition: 'beer' },
    )

    const order = rows.map((row) => row.teamId)
    expect(rowFor(rows, 'pgr').points).toBe(rowFor(rows, 'so').points)
    expect(rowFor(rows, 'pgr').goalDifference).toBeLessThan(
      rowFor(rows, 'so').goalDifference,
    )
    expect(order.indexOf('pgr')).toBeLessThan(order.indexOf('so'))
  })

  it('separates teams level on points and PGR by goal difference', () => {
    const rows = standings(
      [match('wide', [10, 1], 'a'), match('narrow', [2, 1], 'b')],
      { competition: 'beer' },
    )

    expect(rows.map((row) => row.teamId).slice(0, 2)).toEqual([
      'wide',
      'narrow',
    ])
  })

  it('leaves out matches with no result recorded', () => {
    const rows = standings(
      [match('a', [3, 1], 'b'), match('a', [0, 0], 'b', { score: null })],
      { competition: 'beer' },
    )

    expect(rowFor(rows, 'a').played).toBe(1)
  })

  it('leaves out a fixture row with no teams recorded', () => {
    const rows = standings(
      [match('a', [0, 0], 'b', { homeTeamId: null, awayTeamId: null })],
      { competition: 'beer' },
    )

    expect(rows).toHaveLength(0)
  })

  it('leaves the play-in and the playoffs out of the regular table', () => {
    const rows = standings(
      [
        match('a', [3, 1], 'b'),
        match('a', [10, 7], 'b', { stage: 'playin' }),
        match('a', [4, 2], 'b', { stage: 'semifinal' }),
        match('a', [4, 2], 'b', { stage: 'final' }),
      ],
      { competition: 'beer' },
    )

    expect(rowFor(rows, 'a').played).toBe(1)
  })

  it('never lets one competition reach the other table', () => {
    const matches = [
      match('beer-team', [3, 1], 'other-beer-team'),
      match('wubl-team', [3, 1], 'other-wubl-team', { competition: 'wubl' }),
    ]

    expect(
      standings(matches, { competition: 'beer' }).map((row) => row.teamId),
    ).toEqual(['beer-team', 'other-beer-team'])
    expect(
      standings(matches, { competition: 'wubl' }).map((row) => row.teamId),
    ).toEqual(['wubl-team', 'other-wubl-team'])
  })

  it('lists a team that has not played yet, at zero', () => {
    const rows = standings([], { competition: 'beer', teamIds: ['a', 'b'] })

    expect(rows).toHaveLength(2)
    expect(rowFor(rows, 'a')).toMatchObject({
      played: 0,
      points: 0,
      goalDifference: 0,
    })
  })

  describe('against the tables the league published on 4 July 2026', () => {
    it('reproduces all seven Beer League rows, in order', () => {
      const rows = standings(SEASON_2026_MATCHES, {
        competition: 'beer',
        teamIds: BEER_TEAMS,
      })

      expect(rows).toEqual(PUBLISHED_BEER_STANDINGS)
    })

    it('keeps Rock Choppers above Blanco on PGR despite the worse goal difference', () => {
      const rows = standings(SEASON_2026_MATCHES, { competition: 'beer' })
      const order = rows.map((row) => row.teamId)

      expect(rowFor(rows, 'rock-choppers').goalDifference).toBeLessThan(
        rowFor(rows, 'blanco').goalDifference,
      )
      expect(order.indexOf('rock-choppers')).toBeLessThan(
        order.indexOf('blanco'),
      )
    })

    it('reproduces all four Women’s Beer League rows, draw included', () => {
      const rows = standings(SEASON_2026_MATCHES, {
        competition: 'wubl',
        teamIds: WUBL_TEAMS,
      })

      expect(rows).toEqual(PUBLISHED_WUBL_STANDINGS)
      expect(rowFor(rows, 'wubl-birra-del-fuego').draws).toBe(1)
      expect(rowFor(rows, 'wubl-tipo-nine').draws).toBe(1)
    })

    it('gives every Beer League team the six games the sheet says they played', () => {
      const rows = standings(SEASON_2026_MATCHES, { competition: 'beer' })

      expect(rows.map((row) => row.played)).toEqual([6, 6, 6, 6, 6, 6, 6])
    })
  })
})
