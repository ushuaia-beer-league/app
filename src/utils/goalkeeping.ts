import type { CompetitionKey, GoalieLine, GoalkeepingRow } from '../data/types'

/**
 * `(shots faced - goals against) / shots faced`, as a ratio between 0 and 1.
 *
 * A goalkeeper who faced nothing gets null, not a perfect record: facing no
 * shots is an absence of evidence, and 100% would rank them above everyone who
 * actually played. Rounding belongs to the view, not here.
 */
export function savePercentage(
  shotsFaced: number,
  goalsAgainst: number,
): number | null {
  if (shotsFaced < 0 || goalsAgainst < 0) {
    throw new Error(
      `Shots faced and goals against cannot be negative, got ${shotsFaced} and ${goalsAgainst}`,
    )
  }
  if (goalsAgainst > shotsFaced) {
    throw new Error(
      `A goalkeeper cannot concede more than they faced, got ${goalsAgainst} of ${shotsFaced}`,
    )
  }
  if (shotsFaced === 0) return null

  return (shotsFaced - goalsAgainst) / shotsFaced
}

interface GoalkeepingOptions {
  competition: CompetitionKey
}

/**
 * Goalkeeping table for one competition, derived from the lines on the match
 * sheets. Shots faced are recorded; the percentage is computed here every time
 * so the two can never disagree.
 *
 * Ordering: save percentage, then shots faced, so a keeper with one clean game
 * does not sit above one with a season behind them. Keepers who faced nothing
 * come last, since they have no percentage to compare.
 */
export function goalkeeping(
  lines: readonly GoalieLine[],
  { competition }: GoalkeepingOptions,
): GoalkeepingRow[] {
  const totals = new Map<string, GoalkeepingRow>()

  for (const line of lines) {
    if (line.competition !== competition) continue

    const existing = totals.get(line.playerId)
    const row = existing ?? {
      playerId: line.playerId,
      gamesPlayed: 0,
      shotsFaced: 0,
      goalsAgainst: 0,
      savePercentage: null,
    }
    if (!existing) totals.set(line.playerId, row)

    row.gamesPlayed += 1
    row.shotsFaced += line.shotsFaced
    row.goalsAgainst += line.goalsAgainst
  }

  for (const row of totals.values()) {
    row.savePercentage = savePercentage(row.shotsFaced, row.goalsAgainst)
  }

  return [...totals.values()].sort(
    (a, b) =>
      (b.savePercentage ?? -1) - (a.savePercentage ?? -1) ||
      b.shotsFaced - a.shotsFaced ||
      a.playerId.localeCompare(b.playerId),
  )
}
