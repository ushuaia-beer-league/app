import type { CompetitionKey, GoalRecord } from '../data/types'
import { scoringLeaders } from './scoring'

let sequence = 0

function goal(
  scorerId: string | null,
  assistId: string | null = null,
  competition: CompetitionKey = 'beer',
): GoalRecord {
  sequence += 1
  return {
    matchId: `test-${sequence}`,
    competition,
    teamId: 'a-team',
    scorerId,
    assistId,
  }
}

function lineFor(
  playerId: string,
  goals: number,
  assists: number,
): GoalRecord[] {
  return [
    ...Array.from({ length: goals }, () => goal(playerId)),
    ...Array.from({ length: assists }, () => goal(null, playerId)),
  ]
}

function rowFor<Row extends { playerId: string }>(
  rows: readonly Row[],
  playerId: string,
): Row {
  const row = rows.find((candidate) => candidate.playerId === playerId)
  if (!row) throw new Error(`No scoring row for ${playerId}`)
  return row
}

describe('scoringLeaders', () => {
  it('adds goals and assists into points', () => {
    const rows = scoringLeaders(lineFor('scorer', 3, 2), {
      competition: 'beer',
    })

    expect(rowFor(rows, 'scorer')).toEqual({
      playerId: 'scorer',
      goals: 3,
      assists: 2,
      points: 5,
    })
  })

  it('credits both the scorer and the assist of one goal', () => {
    const rows = scoringLeaders([goal('scorer', 'passer')], {
      competition: 'beer',
    })

    expect(rowFor(rows, 'scorer')).toMatchObject({
      goals: 1,
      assists: 0,
      points: 1,
    })
    expect(rowFor(rows, 'passer')).toMatchObject({
      goals: 0,
      assists: 1,
      points: 1,
    })
  })

  it('gives a goal with no scorer recorded to nobody', () => {
    const rows = scoringLeaders([goal(null), goal('scorer')], {
      competition: 'beer',
    })

    expect(rows).toHaveLength(1)
    expect(rowFor(rows, 'scorer').goals).toBe(1)
  })

  it('still credits the assist when the scorer was not written down', () => {
    const rows = scoringLeaders([goal(null, 'passer')], { competition: 'beer' })

    expect(rowFor(rows, 'passer')).toMatchObject({
      goals: 0,
      assists: 1,
      points: 1,
    })
  })

  it('ranks goals above assists when players are level on points', () => {
    const rows = scoringLeaders(
      [...lineFor('passer', 1, 4), ...lineFor('shooter', 4, 1)],
      {
        competition: 'beer',
      },
    )

    expect(rows.map((row) => row.playerId)).toEqual(['shooter', 'passer'])
  })

  it('never lets one competition reach the other table', () => {
    const goals = [goal('beer-player'), goal('wubl-player', null, 'wubl')]

    expect(
      scoringLeaders(goals, { competition: 'beer' }).map((row) => row.playerId),
    ).toEqual(['beer-player'])
    expect(
      scoringLeaders(goals, { competition: 'wubl' }).map((row) => row.playerId),
    ).toEqual(['wubl-player'])
  })

  it('orders the head of the published Beer League table the way the league does', () => {
    // Section 6.6 of the knowledge base: eleven assists must not outrank eleven
    // goals, and the two players level on 6 assists and 17 goals keep a stable
    // order.
    const rows = scoringLeaders(
      [
        ...lineFor('beltrami-ramiro', 23, 6),
        ...lineFor('baeza-pedro', 17, 6),
        ...lineFor('ruggirello-matt', 17, 6),
        ...lineFor('velasquez-luciano', 11, 5),
        ...lineFor('carrion-francisco', 5, 11),
      ],
      { competition: 'beer' },
    )

    expect(rows.map((row) => row.playerId)).toEqual([
      'beltrami-ramiro',
      'baeza-pedro',
      'ruggirello-matt',
      'velasquez-luciano',
      'carrion-francisco',
    ])
    expect(rows.map((row) => row.points)).toEqual([29, 23, 23, 16, 16])
  })
})
