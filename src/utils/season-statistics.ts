/**
 * The scoring and goalkeeping the panel's own match sheets add up to.
 *
 * The league's 2026 sources carry **season totals per player** and no record of
 * a single goal, which is why those tables have always been a transcription of
 * what the league published, dated.
 *
 * On 2026-08-10 the operator loaded sixty-eight goals from the sheets and
 * reported the site had not changed. It had not: nothing read them. But
 * replacing the published table with these would have been worse than ignoring
 * them, and this is the part worth writing down — **the two are not two
 * versions of the same table**. The published totals are the regular season to
 * 4 July; the loaded goals are the playoff night of 8 August. Swapping one for
 * the other would have turned a season into one evening and read as if the year
 * had been lost, and adding them together would produce a number that is
 * neither.
 *
 * So this returns its own table, or null while the panel has recorded nothing,
 * and the section shows both with each one saying what it covers. When the
 * sheets eventually cover the whole season the two converge and the league can
 * retire the transcription.
 *
 * The rows come out in the shape the published tables already use, so one
 * component renders either. `nameIsPrinted` is false on a computed row: the name
 * comes from `players`, not from a sheet that truncates.
 */

import type { SeedPlayer } from '../data/seed'
import type { CompetitionKey, GoalieLine, GoalRecord } from '../data/types'
import type { TeamSeed } from '../data/teams-2026'
import { canonicalSlug } from '../data/teams-2026'
import { goalkeeping } from './goalkeeping'
import type {
  PublishedGoalkeepingRow,
  PublishedScoringRow,
} from './published-statistics'
import { scoringLeaders } from './scoring'

export interface ComputedTable<Row> {
  rows: readonly Row[]
  /** How many match sheets these numbers come from, which the caption says. */
  matches: number
}

interface Season {
  teams: readonly TeamSeed[]
  players: readonly SeedPlayer[]
  goals: readonly GoalRecord[]
  goalieLines: readonly GoalieLine[]
}

function nameOf(players: readonly SeedPlayer[], playerId: string): string {
  return (
    players.find((player) => player.slug === playerId)?.name ??
    'Persona que no está en la base'
  )
}

/**
 * The team a record belongs to, by short name.
 *
 * Through `canonicalSlug`, because a panel-renamed slug must still find its
 * team: that is the bridge the women's rosters needed in August and every
 * slug-keyed lookup goes through it.
 */
function teamOf(teams: readonly TeamSeed[], teamId: string): string | null {
  const wanted = canonicalSlug(teamId)
  return (
    teams.find((team) => canonicalSlug(team.slug) === wanted)?.shortName ?? null
  )
}

export function computedScoring(
  season: Season,
  competition: CompetitionKey,
): ComputedTable<PublishedScoringRow> | null {
  const own = season.goals.filter((goal) => goal.competition === competition)
  if (own.length === 0) return null

  // The team of a scorer is the side of a goal they scored, which is the only
  // team a goal record knows about. A player who only assisted has no team on
  // this table rather than a guessed one.
  const teamByPlayer = new Map<string, string>()
  for (const goal of own) {
    if (goal.scorerId !== null && !teamByPlayer.has(goal.scorerId)) {
      teamByPlayer.set(goal.scorerId, goal.teamId)
    }
  }

  return {
    matches: new Set(own.map((goal) => goal.matchId)).size,
    rows: scoringLeaders(own, { competition }).map((row) => {
      const teamId = teamByPlayer.get(row.playerId)
      return {
        name: nameOf(season.players, row.playerId),
        // Computed rows name people from `players`, so no name here is the
        // truncation a sheet printed.
        nameIsPrinted: false,
        team: teamId === undefined ? null : teamOf(season.teams, teamId),
        isSubstitute: false,
        assists: row.assists,
        goals: row.goals,
        points: row.points,
      }
    }),
  }
}

export function computedGoalkeeping(
  season: Season,
  competition: CompetitionKey,
): ComputedTable<PublishedGoalkeepingRow> | null {
  const own = season.goalieLines.filter(
    (line) => line.competition === competition,
  )
  if (own.length === 0) return null

  return {
    matches: new Set(own.map((line) => line.matchId)).size,
    rows: goalkeeping(own, { competition }).map((row) => {
      // A keeper's team comes from their lines: the aggregate carries only
      // their own totals, which is what keeps it a pure sum.
      const teamId = own.find((line) => line.playerId === row.playerId)?.teamId
      return {
        name: nameOf(season.players, row.playerId),
        nameIsPrinted: false,
        team: teamId === undefined ? null : teamOf(season.teams, teamId),
        isSubstitute: false,
        gamesPlayed: row.gamesPlayed,
        shotsFaced: row.shotsFaced,
        goalsAgainst: row.goalsAgainst,
        savePercentage: row.savePercentage,
      }
    }),
  }
}
