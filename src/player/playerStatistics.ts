import type { CompetitionKey, GoalieLine, GoalRecord } from '../data/types'
import { goalkeeping, savePercentage } from '../utils/goalkeeping'
import { scoringLeaders } from '../utils/scoring'

interface StatisticsInput {
  playerId: string
  competition: CompetitionKey
  scoringOn: string | null
  goalieOn: string | null
  goals: readonly (GoalRecord & { date: string })[]
  goalieLines: readonly (GoalieLine & { date: string })[]
  publishedScoring: { goals: number; assists: number; points: number } | null
  publishedGoalie: {
    games_played: number
    shots_faced: number
    goals_against: number
  } | null
}

export function personalStatistics(input: StatisticsInput) {
  const {
    playerId,
    competition,
    scoringOn,
    goalieOn,
    goals,
    goalieLines,
    publishedScoring,
    publishedGoalie,
  } = input
  const recordedScoring = scoringLeaders(
    goals.filter(
      (goal) => !publishedScoring || !scoringOn || goal.date > scoringOn,
    ),
    { competition },
  ).find((row) => row.playerId === playerId)
  const recordedGoalie = goalkeeping(
    goalieLines.filter(
      (line) => !publishedGoalie || !goalieOn || line.date > goalieOn,
    ),
    { competition },
  ).find((row) => row.playerId === playerId)

  const shotsFaced =
    (publishedGoalie?.shots_faced ?? 0) + (recordedGoalie?.shotsFaced ?? 0)
  const goalsAgainst =
    (publishedGoalie?.goals_against ?? 0) + (recordedGoalie?.goalsAgainst ?? 0)

  return {
    scoring:
      publishedScoring || recordedScoring
        ? {
            goals:
              (publishedScoring?.goals ?? 0) + (recordedScoring?.goals ?? 0),
            assists:
              (publishedScoring?.assists ?? 0) +
              (recordedScoring?.assists ?? 0),
            points:
              (publishedScoring?.points ?? 0) + (recordedScoring?.points ?? 0),
          }
        : null,
    goalie:
      publishedGoalie || recordedGoalie
        ? {
            gamesPlayed:
              (publishedGoalie?.games_played ?? 0) +
              (recordedGoalie?.gamesPlayed ?? 0),
            shotsFaced,
            goalsAgainst,
            savePercentage: savePercentage(shotsFaced, goalsAgainst),
          }
        : null,
  }
}
