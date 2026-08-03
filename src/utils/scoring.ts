import type { CompetitionKey, GoalRecord, ScoringRow } from '../data/types'

interface ScoringOptions {
  competition: CompetitionKey
}

/**
 * Scoring leaders for one competition, derived from goal records.
 *
 * A player's points are goals plus assists; the league publishes no split
 * between a first and a second assist. A goal whose scorer was not written down
 * still counts for the team elsewhere but adds to nobody's line here, which is
 * how the gap stays visible instead of being handed to a plausible name.
 *
 * Ordering: points, then goals, so that eleven assists do not outrank eleven
 * goals. Players still level are ordered by player id, which keeps the output
 * stable rather than expressing any league rule.
 */
export function scoringLeaders(
  goals: readonly GoalRecord[],
  { competition }: ScoringOptions,
): ScoringRow[] {
  const rows = new Map<string, ScoringRow>()

  const rowFor = (playerId: string): ScoringRow => {
    const existing = rows.get(playerId)
    if (existing) return existing

    const created: ScoringRow = { playerId, goals: 0, assists: 0, points: 0 }
    rows.set(playerId, created)
    return created
  }

  for (const goal of goals) {
    if (goal.competition !== competition) continue

    if (goal.scorerId !== null) {
      const row = rowFor(goal.scorerId)
      row.goals += 1
      row.points += 1
    }

    if (goal.assistId !== null) {
      const row = rowFor(goal.assistId)
      row.assists += 1
      row.points += 1
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goals - a.goals ||
      a.playerId.localeCompare(b.playerId),
  )
}
