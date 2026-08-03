/**
 * What the panel reads and writes.
 *
 * Every one of these goes through the same publishable key a visitor has, and
 * every write is allowed or refused by row level security in the database. This
 * file cannot grant anybody anything: at most it can ask, and be told no.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Match } from '../data/types'
import { getSupabaseClient } from '../data/supabase-client'
import { matchFromRow, type MatchRow } from '../data/season-source'
import type { MatchRecordCounts } from '../utils/match-completeness'
import {
  partsOf,
  type MatchSheetData,
  type MatchSheetPart,
  type MatchSheetSaveReport,
  type MatchSheetWrites,
  type SheetPlayer,
  type SheetRosterEntry,
} from './matchSheetDraft'

export interface AdminMatch {
  /** The uuid, which the panel needs because it writes back to this row. */
  id: string
  match: Match
  counts: MatchRecordCounts
}

/** The one shape a caller has to handle: it worked, or it did not and why. */
export type Result<T> = { ok: true; data: T } | { ok: false; because: string }

const NO_CONNECTION =
  'Esta versión del sitio se publicó sin la conexión a la base.'

/**
 * PostgREST answers an embedded `count` as an array holding one object. It is a
 * shape rather than a number, so it is unwrapped once, here, instead of at every
 * call site.
 */
function countOf(value: unknown): number {
  if (!Array.isArray(value)) return 0
  const first: unknown = value[0]
  if (typeof first !== 'object' || first === null) return 0
  const count = (first as { count?: unknown }).count
  return typeof count === 'number' ? count : 0
}

/**
 * Every match of a season with the counts the panel needs to say what each one is
 * still missing. One request: the free tier is the whole budget, and a request
 * per match would spend it on a list.
 */
export async function loadAdminMatches(
  year: number,
): Promise<Result<AdminMatch[]>> {
  const client = await getSupabaseClient()
  if (!client) return { ok: false, because: NO_CONNECTION }

  const season = await client
    .from('seasons')
    .select('id')
    .eq('year', year)
    .maybeSingle()

  if (season.error) return { ok: false, because: season.error.message }
  if (!season.data) {
    return {
      ok: false,
      because: `La temporada ${year} no está cargada en la base.`,
    }
  }

  const { data, error } = await client
    .from('matches')
    .select(
      'id, competition_key, stage, match_date, start_time, venue, home_goals, away_goals, resolution, notes, home_team:home_team_id (slug), away_team:away_team_id (slug), match_players(count), match_goals(count), goalie_lines(count)',
    )
    .eq('season_id', (season.data as { id: string }).id)
    .order('match_date')
    .order('start_time')

  if (error) return { ok: false, because: error.message }

  const rows = (data ?? []) as unknown as (MatchRow & {
    match_players: unknown
    match_goals: unknown
    goalie_lines: unknown
  })[]

  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.id,
      match: matchFromRow(row),
      counts: {
        players: countOf(row.match_players),
        goals: countOf(row.match_goals),
        goalieLines: countOf(row.goalie_lines),
      },
    })),
  }
}

/** The teams of a season, for a form that has to name one. */
export async function loadAdminTeams(): Promise<
  Result<{ id: string; slug: string; shortName: string; competition: string }[]>
> {
  const client = await getSupabaseClient()
  if (!client) return { ok: false, because: NO_CONNECTION }

  const { data, error } = await client
    .from('teams')
    .select('id, slug, short_name, competition_key')
    .order('short_name')

  if (error) return { ok: false, because: error.message }

  const rows = (data ?? []) as {
    id: string
    slug: string
    short_name: string
    competition_key: string
  }[]

  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      shortName: row.short_name,
      competition: row.competition_key,
    })),
  }
}

// ---------------------------------------------------------------------------
// The match sheet
// ---------------------------------------------------------------------------

/** The match row plus every child row of its sheet, in one request. */
interface MatchSheetQueryRow extends MatchRow {
  season_id: string
  home_team: { id: string; slug: string; short_name: string } | null
  away_team: { id: string; slug: string; short_name: string } | null
  match_players: {
    player_id: string
    team_id: string
    is_substitute: boolean
    is_franchise: boolean
  }[]
  match_goals: {
    id: string
    team_id: string
    scorer_id: string | null
    assist_id: string | null
  }[]
  goalie_lines: {
    player_id: string
    team_id: string
    shots_faced: number
    goals_against: number
  }[]
}

const MATCH_SHEET_SELECT = `
  id, season_id, competition_key, stage, match_date, start_time, venue,
  home_goals, away_goals, resolution, notes,
  home_team:home_team_id (id, slug, short_name),
  away_team:away_team_id (id, slug, short_name),
  match_players (player_id, team_id, is_substitute, is_franchise),
  match_goals (id, team_id, scorer_id, assist_id),
  goalie_lines (player_id, team_id, shots_faced, goals_against)
`

const NO_SUCH_MATCH = 'Este partido no está en la base.'

/**
 * One match with everything its sheet holds.
 *
 * Three requests, and no more: the match with its child rows embedded, the two
 * rosters, and the people the league knows. The last one is what lets a
 * substitute be entered at all, since a substitute has no roster row by
 * definition.
 */
export async function loadMatchSheet(
  matchId: string,
): Promise<Result<MatchSheetData>> {
  const client = await getSupabaseClient()
  if (!client) return { ok: false, because: NO_CONNECTION }
  if (matchId.trim() === '') return { ok: false, because: NO_SUCH_MATCH }

  const match = await client
    .from('matches')
    .select(MATCH_SHEET_SELECT)
    .eq('id', matchId)
    .maybeSingle()

  if (match.error) {
    // An id that is not a uuid is a wrong link, not a broken database.
    return {
      ok: false,
      because:
        match.error.code === '22P02' ? NO_SUCH_MATCH : match.error.message,
    }
  }
  if (!match.data) return { ok: false, because: NO_SUCH_MATCH }

  const row = match.data as unknown as MatchSheetQueryRow
  const teamIds = [row.home_team?.id, row.away_team?.id].filter(
    (id): id is string => typeof id === 'string',
  )

  const [roster, players] = await Promise.all([
    teamIds.length === 0
      ? null
      : client
          .from('team_players')
          .select('player_id, team_id, jersey_number')
          .eq('season_id', row.season_id)
          .eq('competition_key', row.competition_key)
          .in('team_id', teamIds),
    // Every person, not only the active ones: a sheet already naming somebody
    // who has since been deactivated has to keep reading their name.
    client.from('players').select('id, full_name, active'),
  ])

  if (roster?.error) return { ok: false, because: roster.error.message }
  if (players.error) return { ok: false, because: players.error.message }

  const rosterRows = (roster?.data ?? []) as {
    player_id: string
    team_id: string
    jersey_number: number | null
  }[]

  const playerRows = (players.data ?? []) as {
    id: string
    full_name: string
    active: boolean
  }[]

  const people: SheetPlayer[] = playerRows.map((player) => ({
    id: player.id,
    name: player.full_name,
    active: player.active,
  }))

  const nameOf = (playerId: string) =>
    people.find((person) => person.id === playerId)?.name ?? playerId

  const byName = (a: { playerId: string }, b: { playerId: string }) =>
    nameOf(a.playerId).localeCompare(nameOf(b.playerId), 'es')

  const rosterEntries: SheetRosterEntry[] = rosterRows.map((entry) => ({
    playerId: entry.player_id,
    teamId: entry.team_id,
    jerseyNumber: entry.jersey_number,
  }))

  return {
    ok: true,
    data: {
      matchId: row.id,
      // Only the match's own columns, so the shape the score rule reads is
      // exactly the one `matchFromRow` was written for.
      row: {
        id: row.id,
        competition_key: row.competition_key,
        stage: row.stage,
        match_date: row.match_date,
        start_time: row.start_time,
        venue: row.venue,
        home_goals: row.home_goals,
        away_goals: row.away_goals,
        resolution: row.resolution,
        notes: row.notes,
        home_team: row.home_team,
        away_team: row.away_team,
      },
      home:
        row.home_team === null
          ? null
          : {
              id: row.home_team.id,
              slug: row.home_team.slug,
              shortName: row.home_team.short_name,
            },
      away:
        row.away_team === null
          ? null
          : {
              id: row.away_team.id,
              slug: row.away_team.slug,
              shortName: row.away_team.short_name,
            },
      players: people,
      roster: rosterEntries,
      appearances: row.match_players
        .map((entry) => ({
          playerId: entry.player_id,
          teamId: entry.team_id,
          isSubstitute: entry.is_substitute,
          isFranchise: entry.is_franchise,
        }))
        .sort(byName),
      // The league sheet records no minute, period or order for a goal, so
      // there is no column to sort by; sorting by side and then by identity at
      // least makes the list the same on every read.
      goals: row.match_goals
        .map((goal) => ({
          id: goal.id,
          teamId: goal.team_id,
          scorerId: goal.scorer_id ?? '',
          assistId: goal.assist_id ?? '',
        }))
        .sort(
          (a, b) =>
            teamIds.indexOf(a.teamId) - teamIds.indexOf(b.teamId) ||
            a.id.localeCompare(b.id),
        ),
      goalieLines: row.goalie_lines
        .map((line) => ({
          playerId: line.player_id,
          teamId: line.team_id,
          shotsFaced: String(line.shots_faced),
          goalsAgainst: String(line.goals_against),
        }))
        .sort(byName),
    },
  }
}

/**
 * Why the database said no, in the panel's own language.
 *
 * A refusal is not a bug. Sporting management may write these tables and
 * communications may not, so a role opening a sheet it cannot save is a normal
 * afternoon, and it has to read as a permission rather than as a crash.
 */
function becauseOf(error: { code?: string; message: string }): string {
  if (error.code === '42501') {
    return 'La base rechazó el cambio: tu rol no tiene permiso para editar planillas. La gestión deportiva puede cargar resultados; comunicación, no.'
  }
  if (error.code === '23514') {
    return `La base rechazó los datos porque no cumplen una regla de la liga (${error.message}).`
  }
  if (error.code === '23505') {
    return 'La base rechazó el cambio porque duplicaría una fila: revisá que nadie figure dos veces y que haya un solo jugador franquicia.'
  }
  if (error.code === '23503') {
    return 'La base rechazó el cambio porque nombra a alguien o a un equipo que ya no existe.'
  }
  return error.message
}

/**
 * A write that the database quietly did nothing with.
 *
 * Row level security filters an UPDATE or a DELETE whose USING clause fails
 * instead of raising, so a save that touched no row is a refusal and has to be
 * reported as one rather than as a success.
 */
const CHANGED_NOTHING =
  'La base no aplicó el cambio. Puede que tu rol no tenga permiso para editar planillas, o que otra persona lo haya cambiado antes.'

/** Null when the group saved, otherwise why it did not. */
type PartFailure = string | null

async function saveResult(
  client: SupabaseClient,
  writes: MatchSheetWrites,
): Promise<PartFailure> {
  if (writes.result === null) return null

  const { data, error } = await client
    .from('matches')
    .update(writes.result)
    .eq('id', writes.matchId)
    .select('id')

  if (error) return becauseOf(error)
  return (data ?? []).length === 0 ? CHANGED_NOTHING : null
}

async function upsertRows(
  client: SupabaseClient,
  table: string,
  rows: readonly Record<string, unknown>[],
  onConflict: string,
  returning: string,
): Promise<PartFailure> {
  if (rows.length === 0) return null

  const { data, error } = await client
    .from(table)
    .upsert(rows, { onConflict })
    .select(returning)

  if (error) return becauseOf(error)
  return (data ?? []).length < rows.length ? CHANGED_NOTHING : null
}

async function deleteRows(
  client: SupabaseClient,
  table: string,
  matchId: string,
  column: string,
  values: readonly string[],
): Promise<PartFailure> {
  if (values.length === 0) return null

  const { data, error } = await client
    .from(table)
    .delete()
    .eq('match_id', matchId)
    .in(column, values)
    .select(column)

  if (error) return becauseOf(error)
  return (data ?? []).length < values.length ? CHANGED_NOTHING : null
}

async function savePlayers(
  client: SupabaseClient,
  writes: MatchSheetWrites,
): Promise<PartFailure> {
  return (
    (await upsertRows(
      client,
      'match_players',
      writes.players.upsert,
      // The table's own primary key, so saving the same sheet twice writes the
      // same appearance twice and lists nobody twice.
      'match_id,player_id',
      'player_id',
    )) ??
    (await deleteRows(
      client,
      'match_players',
      writes.matchId,
      'player_id',
      writes.players.removePlayerIds,
    ))
  )
}

async function saveGoals(
  client: SupabaseClient,
  writes: MatchSheetWrites,
): Promise<PartFailure> {
  return (
    (await upsertRows(
      client,
      'match_goals',
      writes.goals.upsert,
      // A surrogate key, generated by the panel when the goal row is added, which
      // is what keeps a second save from inserting the same goal again.
      'id',
      'id',
    )) ??
    (await deleteRows(
      client,
      'match_goals',
      writes.matchId,
      'id',
      writes.goals.removeIds,
    ))
  )
}

async function saveGoalkeepers(
  client: SupabaseClient,
  writes: MatchSheetWrites,
): Promise<PartFailure> {
  return (
    (await upsertRows(
      client,
      'goalie_lines',
      writes.goalieLines.upsert,
      'match_id,player_id',
      'player_id',
    )) ??
    (await deleteRows(
      client,
      'goalie_lines',
      writes.matchId,
      'player_id',
      writes.goalieLines.removePlayerIds,
    ))
  )
}

/**
 * The sheet, written.
 *
 * Four groups, saved and reported separately, because they are refused
 * separately: a role may be allowed one table and not another, a CHECK
 * constraint concerns one group at a time, and an operator who filled in three
 * things has to be told which of them landed. Nothing here is an aggregate:
 * the score is the sheet's own number, the goals are rows, and the save
 * percentage is not stored anywhere.
 */
export async function saveMatchSheet(
  writes: MatchSheetWrites,
): Promise<MatchSheetSaveReport> {
  const pending = partsOf(writes)
  if (pending.length === 0) return { saved: [], failed: [] }

  const client = await getSupabaseClient()
  if (!client) {
    return {
      saved: [],
      failed: pending.map((part) => ({ part, because: NO_CONNECTION })),
    }
  }

  const save: Record<
    MatchSheetPart,
    (client: SupabaseClient, writes: MatchSheetWrites) => Promise<PartFailure>
  > = {
    result: saveResult,
    players: savePlayers,
    goals: saveGoals,
    goalkeepers: saveGoalkeepers,
  }

  const report: MatchSheetSaveReport = { saved: [], failed: [] }

  for (const part of pending) {
    const because = await save[part](client, writes)
    if (because === null) report.saved.push(part)
    else report.failed.push({ part, because })
  }

  return report
}
