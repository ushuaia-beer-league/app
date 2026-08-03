import type {
  CompetitionKey,
  Match,
  MatchScore,
  Outcome,
  StandingsRow,
} from '../data/types'

/**
 * The league's own scale, read from its standings sheet: a win is worth 2, a
 * shootout loss is worth 1, a draw is worth 1, a regulation loss is worth 0.
 * A shootout win pays the same as a regulation win; PGR is what keeps them
 * apart for tiebreaking.
 *
 * Every table in the site goes through this map. Nothing else assigns points.
 */
const POINTS: Record<Outcome, number> = {
  'regulation-win': 2,
  'shootout-win': 2,
  draw: 1,
  'shootout-loss': 1,
  'regulation-loss': 0,
}

export function pointsFor(outcome: Outcome): number {
  return POINTS[outcome]
}

/**
 * What one side took from a recorded score.
 *
 * Contradictory records throw instead of resolving to something plausible: a
 * draw with different goals, or a decided match that ended level, means the
 * import or the migration let bad data through, and a silently wrong table is
 * the failure this project exists to prevent.
 */
export function outcomeFor(score: MatchScore, side: 'home' | 'away'): Outcome {
  const level = score.home === score.away

  if (score.resolution === 'draw') {
    if (!level) {
      throw new Error(
        `A draw cannot have different goals, got ${score.home}-${score.away}`,
      )
    }
    return 'draw'
  }

  if (level) {
    throw new Error(
      `A match resolved in ${score.resolution} cannot end level, got ${score.home}-${score.away}`,
    )
  }

  const won =
    side === 'home' ? score.home > score.away : score.away > score.home

  if (score.resolution === 'shootout') {
    return won ? 'shootout-win' : 'shootout-loss'
  }
  return won ? 'regulation-win' : 'regulation-loss'
}

interface StandingsOptions {
  competition: CompetitionKey
  /**
   * Teams that must appear even before they play, so a table is complete on the
   * first day of a season. Teams found in the matches are added regardless.
   */
  teamIds?: readonly string[]
}

function emptyRow(teamId: string): StandingsRow {
  return {
    teamId,
    played: 0,
    points: 0,
    wins: 0,
    regulationWins: 0,
    shootoutLosses: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
  }
}

function countMatch(
  row: StandingsRow,
  outcome: Outcome,
  scored: number,
  conceded: number,
) {
  row.played += 1
  row.points += pointsFor(outcome)
  row.goalsFor += scored
  row.goalsAgainst += conceded
  row.goalDifference = row.goalsFor - row.goalsAgainst

  switch (outcome) {
    case 'regulation-win':
      row.wins += 1
      row.regulationWins += 1
      break
    case 'shootout-win':
      row.wins += 1
      break
    case 'draw':
      row.draws += 1
      break
    case 'shootout-loss':
      row.shootoutLosses += 1
      break
    case 'regulation-loss':
      row.losses += 1
      break
  }
}

/**
 * The regular-season table for one competition, derived from match records.
 *
 * Only `regular` matches count: the 6th-versus-7th play-in decides a playoff
 * berth and the league does not count it as another regular game. Matches
 * without a score, or without both teams recorded, are left out rather than
 * treated as 0-0, because a missing result is not a result.
 *
 * Ordering follows the league: points, then PGR, then goal difference. There is
 * no mini-table among tied teams. Rows still level after goal difference are
 * ordered by team id, which is not a league rule but keeps the output stable.
 */
export function standings(
  matches: readonly Match[],
  { competition, teamIds = [] }: StandingsOptions,
): StandingsRow[] {
  const rows = new Map<string, StandingsRow>()

  const rowFor = (teamId: string): StandingsRow => {
    const existing = rows.get(teamId)
    if (existing) return existing

    const created = emptyRow(teamId)
    rows.set(teamId, created)
    return created
  }

  for (const teamId of teamIds) rowFor(teamId)

  for (const match of matches) {
    if (match.competition !== competition || match.stage !== 'regular') continue

    const { score, homeTeamId, awayTeamId } = match
    if (!score || homeTeamId === null || awayTeamId === null) continue

    countMatch(
      rowFor(homeTeamId),
      outcomeFor(score, 'home'),
      score.home,
      score.away,
    )
    countMatch(
      rowFor(awayTeamId),
      outcomeFor(score, 'away'),
      score.away,
      score.home,
    )
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.regulationWins - a.regulationWins ||
      b.goalDifference - a.goalDifference ||
      a.teamId.localeCompare(b.teamId),
  )
}
