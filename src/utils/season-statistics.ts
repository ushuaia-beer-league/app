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
 * The first attempt showed them as two tables. The operator read it and asked
 * for one: «las estadísticas estaría bueno que eso esté todo junto». He is
 * right that two tables of goleadores is not what anybody wants to read, and
 * the sum is safe **as long as nothing is counted twice** — which is a real
 * risk, not a theoretical one, so the rule is written into `additiveGoals`
 * below: only matches played after the publication date are added, because
 * everything on or before it is already inside the published totals.
 *
 * A line whose person the importer never resolved cannot be merged into
 * anybody, so it stays as its own row. That is fourteen of the 2026 lines, and
 * they are the ones already marked as unconfirmed names.
 *
 * The rows come out in the shape the published tables already use, so one
 * component renders either. `nameIsPrinted` is false on a computed row: the name
 * comes from `players`, not from a sheet that truncates.
 */

import type { SeedPlayer } from '../data/seed'
import type {
  CompetitionKey,
  GoalieLine,
  GoalRecord,
  Match,
} from '../data/types'
import type { TeamSeed } from '../data/teams-2026'
import { canonicalSlug } from '../data/teams-2026'
import { goalkeeping, savePercentage } from './goalkeeping'
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
  matches: readonly Match[]
  /** The day the league's transcribed totals were published. */
  publishedOn: string
}

/**
 * Which recorded matches may be added to the published totals: the ones played
 * **after** the league published them.
 *
 * A sheet from June is already inside those totals, so adding its goals would
 * count them twice and inflate somebody's season. Nothing loaded today is from
 * June, which is exactly why this has to be a rule and not a hope: the day
 * somebody loads a regular-phase sheet to replace the transcription, that sheet
 * must not silently double every goal in it.
 */
function playedAfterPublication(season: Season): Set<string> {
  const after = new Set<string>()
  for (const match of season.matches) {
    if (match.date > season.publishedOn) after.add(match.id)
  }
  return after
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

export interface SeasonTable<Row> {
  rows: readonly Row[]
  /** How many recorded sheets were added on top of the published totals. */
  addedMatches: number
}

/** Merges rows that name the same person; the rest keep their own line. */
function merged<Row extends { playerId: string | null }>(
  published: readonly Row[],
  computed: readonly Row[],
  add: (into: Row, from: Row) => Row,
): Row[] {
  const rows = published.map((row) => ({ ...row }))
  const byPlayer = new Map<string, Row>()
  for (const row of rows) {
    if (row.playerId !== null) byPlayer.set(row.playerId, row)
  }

  for (const row of computed) {
    const already =
      row.playerId === null ? undefined : byPlayer.get(row.playerId)
    if (already === undefined) {
      // Somebody the published totals never mentioned: a substitute, or a
      // person who only played after the sheets were published.
      rows.push({ ...row })
      continue
    }
    Object.assign(already, add(already, row))
  }

  return rows
}

export function seasonScoring(
  season: Season,
  competition: CompetitionKey,
  published: readonly PublishedScoringRow[],
): SeasonTable<PublishedScoringRow> {
  const additive = playedAfterPublication(season)
  const own = season.goals.filter(
    (goal) => goal.competition === competition && additive.has(goal.matchId),
  )
  if (own.length === 0) return { rows: published, addedMatches: 0 }

  const teamByPlayer = new Map<string, string>()
  for (const goal of own) {
    if (goal.scorerId !== null && !teamByPlayer.has(goal.scorerId)) {
      teamByPlayer.set(goal.scorerId, goal.teamId)
    }
  }

  const computed: PublishedScoringRow[] = scoringLeaders(own, {
    competition,
  }).map((row) => {
    const teamId = teamByPlayer.get(row.playerId)
    return {
      playerId: row.playerId,
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
  })

  const rows = merged(published, computed, (into, from) => ({
    ...into,
    assists: into.assists + from.assists,
    goals: into.goals + from.goals,
    points: into.points + from.points,
  })).sort(
    (a, b) =>
      b.points - a.points ||
      b.goals - a.goals ||
      a.name.localeCompare(b.name, 'es'),
  )

  return {
    rows,
    addedMatches: new Set(own.map((goal) => goal.matchId)).size,
  }
}

export function seasonGoalkeeping(
  season: Season,
  competition: CompetitionKey,
  published: readonly PublishedGoalkeepingRow[],
): SeasonTable<PublishedGoalkeepingRow> {
  const additive = playedAfterPublication(season)
  const own = season.goalieLines.filter(
    (line) => line.competition === competition && additive.has(line.matchId),
  )
  if (own.length === 0) return { rows: published, addedMatches: 0 }

  const computed: PublishedGoalkeepingRow[] = goalkeeping(own, {
    competition,
  }).map((row) => {
    const teamId = own.find((line) => line.playerId === row.playerId)?.teamId
    return {
      playerId: row.playerId,
      name: nameOf(season.players, row.playerId),
      nameIsPrinted: false,
      team: teamId === undefined ? null : teamOf(season.teams, teamId),
      isSubstitute: false,
      gamesPlayed: row.gamesPlayed,
      shotsFaced: row.shotsFaced,
      goalsAgainst: row.goalsAgainst,
      savePercentage: row.savePercentage,
    }
  })

  const rows = merged(published, computed, (into, from) => {
    const shotsFaced = into.shotsFaced + from.shotsFaced
    const goalsAgainst = into.goalsAgainst + from.goalsAgainst
    return {
      ...into,
      gamesPlayed: into.gamesPlayed + from.gamesPlayed,
      shotsFaced,
      goalsAgainst,
      // Recomputed from the sum, never averaged: a percentage of percentages is
      // not a percentage. `savePercentage` is the one function that owns this.
      savePercentage: savePercentage(shotsFaced, goalsAgainst),
    }
  }).sort(
    (a, b) =>
      (b.savePercentage ?? -1) - (a.savePercentage ?? -1) ||
      b.shotsFaced - a.shotsFaced ||
      a.name.localeCompare(b.name, 'es'),
  )

  return {
    rows,
    addedMatches: new Set(own.map((line) => line.matchId)).size,
  }
}
