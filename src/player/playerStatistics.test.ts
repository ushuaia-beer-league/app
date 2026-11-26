import { describe, expect, it } from 'vitest'
import { personalStatistics } from './playerStatistics'

const goal = (
  date: string,
  scorerId: string,
  assistId: string | null = null,
) => ({
  date,
  matchId: date,
  teamId: 'team',
  competition: 'beer' as const,
  scorerId,
  assistId,
})

describe('personal statistics', () => {
  it('counts events after each publication once and keeps the original sheet facts', () => {
    const actual = personalStatistics({
      playerId: 'player',
      competition: 'beer' as const,
      scoringOn: '2026-07-01',
      goalieOn: '2026-07-03',
      goals: [
        goal('2026-07-01', 'player'),
        goal('2026-07-02', 'other', 'player'),
      ],
      goalieLines: ['2026-07-02', '2026-07-04'].map((date) => ({
        date,
        matchId: date,
        playerId: 'player',
        teamId: 'team',
        competition: 'beer' as const,
        shotsFaced: 10,
        goalsAgainst: 2,
      })),
      publishedScoring: { goals: 3, assists: 2, points: 5 },
      publishedGoalie: { games_played: 2, shots_faced: 30, goals_against: 3 },
    })
    expect(actual.scoring).toMatchObject({ goals: 3, assists: 3, points: 6 })
    expect(actual.goalie).toMatchObject({
      gamesPlayed: 3,
      shotsFaced: 40,
      goalsAgainst: 5,
      savePercentage: 0.875,
    })
  })

  it('omits unknown totals and accepts recorded statistics without a publication', () => {
    const base = {
      playerId: 'player',
      competition: 'beer' as const,
      scoringOn: null,
      goalieOn: null,
      goalieLines: [],
      publishedScoring: null,
      publishedGoalie: null,
    }
    expect(personalStatistics({ ...base, goals: [] })).toEqual({
      scoring: null,
      goalie: null,
    })
    expect(
      personalStatistics({
        ...base,
        scoringOn: '2026-07-15',
        goals: [goal('2026-07-01', 'player')],
      }).scoring,
    ).toMatchObject({ goals: 1, assists: 0, points: 1 })
  })
})
