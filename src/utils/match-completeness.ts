/**
 * What a match still needs.
 *
 * This is what the back office is organised around: not a list of forms, but a
 * list of matches each saying what is missing from it. The operator is a person
 * with a paper sheet in their hand on a Sunday, and the panel's job is to tell
 * them where to start.
 *
 * A gap is never an error. A match played last month with no scorers recorded is
 * a normal state of this league's data, and the point of naming the gap is that
 * somebody can close it, not that something is broken.
 */

import type { Match } from '../data/types'

/** What the database holds for one match, counted. */
export interface MatchRecordCounts {
  /** Rows in `match_players`. */
  players: number
  /** Rows in `match_goals`. */
  goals: number
  /** Rows in `goalie_lines`. */
  goalieLines: number
}

export type MatchGapKind =
  | 'teams'
  | 'venue'
  | 'score'
  | 'resolution'
  | 'players'
  | 'goals'
  | 'goalkeepers'

export interface MatchGap {
  kind: MatchGapKind
  /** What the panel says out loud, in Spanish. */
  label: string
  /**
   * True when closing this gap needs the organisation rather than the operator:
   * nobody can enter the teams of a slot the sheet never filled.
   */
  needsTheLeague: boolean
}

/**
 * Everything missing from one match, in the order an operator would fill it.
 *
 * The order matters: there is no point asking for scorers before there is a
 * score, and no point asking for a score before anybody knows who played.
 */
export function matchGaps(match: Match, counts: MatchRecordCounts): MatchGap[] {
  const gaps: MatchGap[] = []

  const hasTeams = match.homeTeamId !== null && match.awayTeamId !== null
  if (!hasTeams) {
    gaps.push({
      kind: 'teams',
      label: 'Faltan los equipos',
      // The 2026 sheet has a slot with a time, a cabecera and no teams, and the
      // bracket rows name positions rather than teams. An operator cannot invent
      // either.
      needsTheLeague: true,
    })
  }

  if (match.venue === null) {
    gaps.push({
      kind: 'venue',
      label: 'Falta la cabecera',
      needsTheLeague: false,
    })
  }

  if (match.score === null) {
    gaps.push({
      kind: 'score',
      label: 'Falta el resultado',
      needsTheLeague: false,
    })
    // Everything below hangs off the score, so a match with none is not also
    // missing its scorers: it is missing its result.
    return gaps
  }

  if (!hasTeams) return gaps

  const goalsScored = match.score.home + match.score.away

  if (counts.players === 0) {
    gaps.push({
      kind: 'players',
      label: 'Falta quiénes jugaron',
      needsTheLeague: false,
    })
  }

  if (counts.goals < goalsScored) {
    const missing = goalsScored - counts.goals
    gaps.push({
      kind: 'goals',
      label:
        counts.goals === 0
          ? `Faltan los ${goalsScored} goles`
          : `Faltan ${missing} de los ${goalsScored} goles`,
      needsTheLeague: false,
    })
  }

  if (counts.goalieLines === 0) {
    gaps.push({
      kind: 'goalkeepers',
      label: 'Faltan los arqueros',
      needsTheLeague: false,
    })
  } else if (counts.goalieLines === 1) {
    gaps.push({
      kind: 'goalkeepers',
      label: 'Falta el arquero de un equipo',
      needsTheLeague: false,
    })
  }

  return gaps
}

/**
 * More goals recorded than the score says is a different thing from a gap: it is
 * a contradiction, and it means either the score or the goals are wrong. The
 * panel has to say so rather than quietly showing a complete match.
 */
export function goalsExceedScore(
  match: Match,
  counts: MatchRecordCounts,
): boolean {
  if (match.score === null) return false
  return counts.goals > match.score.home + match.score.away
}

/** A match nothing is missing from, and nothing contradicts. */
export function isMatchComplete(
  match: Match,
  counts: MatchRecordCounts,
): boolean {
  return (
    matchGaps(match, counts).length === 0 && !goalsExceedScore(match, counts)
  )
}
