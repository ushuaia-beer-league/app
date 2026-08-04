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
import type { AdminRecord, AdminRow } from './adminsDraft'
import type {
  PhotoRecord,
  PhotoWrites,
  PhotosPage,
  PhotosSaveReport,
  SponsorRecord,
  SponsorWrites,
  SponsorsPage,
} from './contentDrafts'
import {
  MEDIA_BUCKET,
  MEDIA_MAX_BYTES,
  mediaObjectPath,
  mediaRejection,
  resizedForUpload,
  tooHeavy,
} from './mediaFiles'
import {
  partsOf,
  type MatchSheetData,
  type MatchSheetPart,
  type MatchSheetSaveReport,
  type MatchSheetWrites,
  type SheetPlayer,
  type SheetRosterEntry,
} from './matchSheetDraft'
import {
  STOOD_DOWN_STATUS,
  type CompetitionRecord,
  type SeasonRecord,
  type SeasonSavePlan,
  type SeasonSaveReport,
  type SeasonStatus,
} from './seasonsDraft'
import type { AdminRole } from './useAdminSession'

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

// ---------------------------------------------------------------------------
// The administrator list
// ---------------------------------------------------------------------------

/**
 * Why the database said no about `admins`, in the panel's own language.
 *
 * Only the general administrator may write this table, so a refusal is a
 * permission rather than a bug, and it is worded as one. No message repeats the
 * address: it is personal data, and a sentence that quotes it travels further
 * than the screen it was written for.
 */
function becauseOfAdmins(error: { code?: string; message: string }): string {
  if (error.code === '42501') {
    return 'La base rechazó el cambio: solo la administración general puede modificar quién administra la liga.'
  }
  if (error.code === '23505') {
    return 'Esa dirección ya está en la lista. Cambiale el rol en su fila, o devolvele el acceso si se lo retiraron.'
  }
  if (error.code === '23514') {
    return 'La base rechazó la dirección: tiene que ir en minúscula y tener algo antes de la arroba.'
  }
  if (error.code === '23502') {
    return 'La base rechazó la fila porque le falta el rol.'
  }
  return error.message
}

/** The same silent refusal the match sheet has to watch for, worded for here. */
const ADMINS_CHANGED_NOTHING =
  'La base no aplicó el cambio. Puede que tu rol no tenga permiso para modificar la lista de administradores.'

/**
 * Everybody the league has ever given access to, withdrawn or not.
 *
 * `anon` holds no privilege at all on this table and no policy names it, so this
 * only ever answers a signed-in request; `admins_select_self_or_admin` then lets
 * an administrator read the whole list and everybody else read their own row.
 * The list is legitimately empty when the only administrator is the founding
 * owner, whose access is a constant in `private.admin_role()` rather than a row.
 */
export async function loadAdmins(): Promise<Result<AdminRecord[]>> {
  const client = await getSupabaseClient()
  if (!client) return { ok: false, because: NO_CONNECTION }

  const { data, error } = await client
    .from('admins')
    .select('email, role, display_name, active')

  if (error) return { ok: false, because: becauseOfAdmins(error) }

  const rows = (data ?? []) as {
    email: string
    role: string
    display_name: string | null
    active: boolean
  }[]

  return {
    ok: true,
    data: rows.map((row) => ({
      email: row.email,
      role: row.role as AdminRole,
      displayName: row.display_name,
      active: row.active,
    })),
  }
}

/**
 * One more administrator.
 *
 * An INSERT rather than an upsert on purpose: an address already in the table
 * belongs to somebody whose row should be changed, not overwritten by whatever
 * this form happened to hold, so the primary key refusing it is the right answer
 * and `becauseOfAdmins` says what to do instead.
 *
 * The address travels in the request body, never in the query string. It is
 * personal data and a query string is the part of a request that ends up in an
 * access log.
 */
export async function addAdmin(row: AdminRow): Promise<Result<null>> {
  const client = await getSupabaseClient()
  if (!client) return { ok: false, because: NO_CONNECTION }

  const { data, error } = await client.from('admins').insert(row).select('role')

  if (error) return { ok: false, because: becauseOfAdmins(error) }
  if ((data ?? []).length === 0) {
    return { ok: false, because: ADMINS_CHANGED_NOTHING }
  }

  return { ok: true, data: null }
}

/**
 * An administrator's row, changed: a different role, or access withdrawn and
 * given back.
 *
 * There is no delete here and none anywhere else. Withdrawing access clears
 * `active` and leaves the row, because the history of who could write has to
 * survive; the column comment in the migration says so.
 *
 * An upsert on the primary key rather than an UPDATE, so the address stays in
 * the body: PostgREST puts an UPDATE's filter in the query string, and this
 * column holds personal data. The row is always complete, so the insert half of
 * the upsert is a legal row too.
 */
export async function changeAdmin(row: AdminRow): Promise<Result<null>> {
  const client = await getSupabaseClient()
  if (!client) return { ok: false, because: NO_CONNECTION }

  const { data, error } = await client
    .from('admins')
    .upsert(row, { onConflict: 'email' })
    .select('role')

  if (error) return { ok: false, because: becauseOfAdmins(error) }
  if ((data ?? []).length === 0) {
    return { ok: false, because: ADMINS_CHANGED_NOTHING }
  }

  return { ok: true, data: null }
}

// ---------------------------------------------------------------------------
// Seasons and competitions
// ---------------------------------------------------------------------------

/** Why the database said no about a season. */
function becauseOfSeasons(error: { code?: string; message: string }): string {
  if (error.code === '42501') {
    return 'La base rechazó el cambio: solo la administración general puede crear o editar temporadas.'
  }
  if (error.code === '23505') {
    // Two unique things can collide here and the answer is different for each,
    // so the constraint's own name is what decides which sentence to say.
    return error.message.includes('seasons_one_active_idx')
      ? 'La base rechazó el cambio porque ya hay otra temporada en curso. Solo puede haber una: hay que finalizar la otra primero.'
      : 'Ya hay una temporada con ese año. Editá esa en lugar de crear otra.'
  }
  if (error.code === '23514') {
    return 'La base rechazó los datos: el año va entre 2023 y 2100, y la fecha de cierre no puede ser anterior a la de inicio.'
  }
  return error.message
}

const SEASONS_CHANGED_NOTHING =
  'La base no aplicó el cambio. Puede que tu rol no tenga permiso para editar temporadas, o que otra persona la haya cambiado antes.'

export interface SeasonsAndCompetitions {
  seasons: SeasonRecord[]
  competitions: CompetitionRecord[]
}

/**
 * The seasons and the competitions, in one read.
 *
 * Both are publicly readable, so this works signed out too; what needs a role is
 * writing them. The competitions come back so the screen can show the two that
 * exist, which is all anybody can do with them: their keys are the same literals
 * as `CompetitionKey`, and a third one is a change to that union, to
 * `competitions_key_allowed` and to a migration, in one commit.
 */
export async function loadSeasonsAndCompetitions(): Promise<
  Result<SeasonsAndCompetitions>
> {
  const client = await getSupabaseClient()
  if (!client) return { ok: false, because: NO_CONNECTION }

  const [seasons, competitions] = await Promise.all([
    client
      .from('seasons')
      .select('id, year, starts_on, ends_on, status')
      .order('year', { ascending: false }),
    client
      .from('competitions')
      .select('key, name, description, active')
      .order('key'),
  ])

  if (seasons.error)
    return { ok: false, because: becauseOfSeasons(seasons.error) }
  if (competitions.error) {
    return { ok: false, because: competitions.error.message }
  }

  const seasonRows = (seasons.data ?? []) as {
    id: string
    year: number
    starts_on: string | null
    ends_on: string | null
    status: string
  }[]

  const competitionRows = (competitions.data ?? []) as {
    key: string
    name: string
    description: string | null
    active: boolean
  }[]

  return {
    ok: true,
    data: {
      seasons: seasonRows.map((row) => ({
        id: row.id,
        year: row.year,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        status: row.status as SeasonStatus,
      })),
      competitions: competitionRows.map((row) => ({
        key: row.key as CompetitionRecord['key'],
        name: row.name,
        description: row.description,
        active: row.active,
      })),
    },
  }
}

/**
 * A season, created or edited, and the one it replaces as the current season.
 *
 * Two steps, in this order and no other: `seasons_one_active_idx` is a unique
 * index, so a second active row is refused rather than preferred, and the season
 * in the way has to be finished before this one can take its place. Reported
 * separately because they are refused separately, and because an operator whose
 * second step failed has to know the first one already happened.
 *
 * If standing the current season down is refused, the season itself is not
 * attempted: the same policy governs both writes, so the second one would be
 * refused too, and trying it would only add a second sentence saying the same
 * thing.
 */
export async function saveSeason(
  plan: SeasonSavePlan,
): Promise<SeasonSaveReport> {
  const client = await getSupabaseClient()
  if (!client) {
    return {
      stoodDown: null,
      saved: false,
      failed: [{ step: 'season', because: NO_CONNECTION }],
    }
  }

  const report: SeasonSaveReport = { stoodDown: null, saved: false, failed: [] }

  if (plan.standDown !== null) {
    const { data, error } = await client
      .from('seasons')
      .update({ status: STOOD_DOWN_STATUS })
      .eq('id', plan.standDown.id)
      .select('id')

    if (error) {
      report.failed.push({
        step: 'stand-down',
        because: becauseOfSeasons(error),
      })
      return report
    }
    if ((data ?? []).length === 0) {
      report.failed.push({
        step: 'stand-down',
        because: SEASONS_CHANGED_NOTHING,
      })
      return report
    }

    report.stoodDown = plan.standDown.year
  }

  const written =
    plan.seasonId === null
      ? await client.from('seasons').insert(plan.row).select('id')
      : await client
          .from('seasons')
          .update(plan.row)
          .eq('id', plan.seasonId)
          .select('id')

  if (written.error) {
    report.failed.push({
      step: 'season',
      because: becauseOfSeasons(written.error),
    })
    return report
  }
  if ((written.data ?? []).length === 0) {
    report.failed.push({ step: 'season', because: SEASONS_CHANGED_NOTHING })
    return report
  }

  report.saved = true
  return report
}

// ---------------------------------------------------------------------------
// Sponsors and photographs
// ---------------------------------------------------------------------------

/**
 * The one refusal these two screens exist to explain properly.
 *
 * Communications and the general administrator may write `sponsors`, `photos`
 * and the `media` bucket; the sporting management may not, which is
 * `private.can_manage_content()` and the first time the communications role
 * means anything at all. A sporting manager reaching this screen and being told
 * no is a normal afternoon, not a bug, and it has to read like one.
 */
const CONTENT_REFUSED =
  'La base rechazó el cambio: tu rol no tiene permiso para editar sponsors ni fotos. Comunicación y la administración general pueden; la gestión deportiva, no.'

/** Why the database said no about a sponsor or a photograph. */
function becauseOfContent(error: { code?: string; message: string }): string {
  if (error.code === '42501') return CONTENT_REFUSED
  if (error.code === '23505') {
    return 'Esa foto ya está en la galería: la base guarda un archivo una sola vez y no acepta dos filas apuntando a la misma imagen.'
  }
  if (error.code === '23514') {
    return `La base rechazó los datos porque no cumplen una regla (${error.message}).`
  }
  if (error.code === '23503') {
    return 'La base rechazó el cambio porque nombra una temporada que ya no existe.'
  }
  return error.message
}

/** Why storage said no, which answers with HTTP statuses rather than SQLSTATEs. */
function becauseOfUpload(error: { message: string }): string {
  const said = error.message.toLowerCase()

  if (said.includes('row-level security') || said.includes('unauthorized')) {
    return CONTENT_REFUSED
  }
  if (said.includes('maximum allowed size') || said.includes('too large')) {
    return 'El depósito rechazó el archivo por tamaño: el máximo es 5 MB por imagen.'
  }
  if (said.includes('mime type')) {
    return 'El depósito solo acepta imágenes JPG, PNG, WEBP o AVIF.'
  }
  if (said.includes('already exists')) {
    return 'Ya hay un archivo en esa ruta del depósito. Volvé a intentar: cada subida usa una ruta nueva.'
  }
  return error.message
}

/** The same silent refusal the match sheet watches for, worded for here. */
const CONTENT_CHANGED_NOTHING =
  'La base no aplicó el cambio. Puede que tu rol no tenga permiso para editar sponsors ni fotos, o que otra persona lo haya cambiado antes.'

/**
 * The season's own id, which every row these screens write has to name.
 *
 * Read by year rather than held anywhere, the same way the matches list does it:
 * the panel knows the year it is working on, and the uuid is the database's.
 */
async function seasonIdForYear(
  client: SupabaseClient,
  year: number,
): Promise<Result<string>> {
  const { data, error } = await client
    .from('seasons')
    .select('id')
    .eq('year', year)
    .maybeSingle()

  if (error) return { ok: false, because: error.message }
  if (!data) {
    return {
      ok: false,
      because: `La temporada ${year} no está cargada en la base.`,
    }
  }

  return { ok: true, data: (data as { id: string }).id }
}

/**
 * A season's sponsors, retired ones included.
 *
 * The retired are here because retiring is reversible and a screen that hides
 * what it deactivated cannot undo it; the public site is what filters on
 * `active`. Ordered by `display_order` and then by name, which is how a column
 * that is deliberately not unique is read: ties are ordinary, so they are broken
 * by something stable rather than left to chance.
 */
export async function loadSponsors(
  year: number,
): Promise<Result<SponsorsPage>> {
  const client = await getSupabaseClient()
  if (!client) return { ok: false, because: NO_CONNECTION }

  const season = await seasonIdForYear(client, year)
  if (!season.ok) return season

  const { data, error } = await client
    .from('sponsors')
    .select('id, name, url, logo_path, display_order, active')
    .eq('season_id', season.data)
    .order('display_order')
    .order('name')

  if (error) return { ok: false, because: becauseOfContent(error) }

  const rows = (data ?? []) as {
    id: string
    name: string
    url: string | null
    logo_path: string | null
    display_order: number
    active: boolean
  }[]

  return {
    ok: true,
    data: {
      seasonId: season.data,
      sponsors: rows.map((row): SponsorRecord => ({
        id: row.id,
        name: row.name,
        url: row.url,
        logoPath: row.logo_path,
        displayOrder: row.display_order,
        active: row.active,
      })),
    },
  }
}

/**
 * The sponsors, written.
 *
 * One upsert on the primary key, holding only the rows that changed. The id of a
 * sponsor the operator added was generated in the panel, so the insert half of
 * the upsert covers a new sponsor and the update half covers an edit, a reorder
 * and a retirement, and pressing save twice writes the same rows twice and
 * doubles nothing.
 *
 * There is no delete. Retiring sets `active = false`, because last season still
 * has to show who backed it.
 */
export async function saveSponsors(
  writes: SponsorWrites,
): Promise<Result<null>> {
  if (writes.upsert.length === 0) return { ok: true, data: null }

  const client = await getSupabaseClient()
  if (!client) return { ok: false, because: NO_CONNECTION }

  const { data, error } = await client
    .from('sponsors')
    .upsert(writes.upsert, { onConflict: 'id' })
    .select('id')

  if (error) return { ok: false, because: becauseOfContent(error) }
  if ((data ?? []).length < writes.upsert.length) {
    return { ok: false, because: CONTENT_CHANGED_NOTHING }
  }

  return { ok: true, data: null }
}

/**
 * A season's gallery, in the order it is shown. `created_at` breaks the ties
 * `display_order` allows, so a gallery nobody has ordered yet still comes back
 * the same way on every read.
 */
export async function loadPhotos(year: number): Promise<Result<PhotosPage>> {
  const client = await getSupabaseClient()
  if (!client) return { ok: false, because: NO_CONNECTION }

  const season = await seasonIdForYear(client, year)
  if (!season.ok) return season

  const { data, error } = await client
    .from('photos')
    .select('id, storage_path, caption, taken_on, display_order')
    .eq('season_id', season.data)
    .order('display_order')
    .order('created_at')

  if (error) return { ok: false, because: becauseOfContent(error) }

  const rows = (data ?? []) as {
    id: string
    storage_path: string
    caption: string | null
    taken_on: string | null
    display_order: number
  }[]

  return {
    ok: true,
    data: {
      seasonId: season.data,
      photos: rows.map((row): PhotoRecord => ({
        id: row.id,
        storagePath: row.storage_path,
        caption: row.caption,
        takenOn: row.taken_on,
        displayOrder: row.display_order,
      })),
    },
  }
}

/**
 * The gallery, written.
 *
 * Three writes, reported apart because they are refused apart, and in this order
 * for a reason: the rows first, because a row is what publishes a photograph;
 * then the rows the operator took out; then the objects behind them, since a
 * file left in a one-gigabyte bucket for ever is a cost, and deleting it before
 * the row is gone would leave the gallery pointing at nothing.
 *
 * The bucket cleanup is the only part nobody asked for, so it is reported only
 * when it fails, and it says the photographs did come off the gallery. That is
 * the truth of that state and it is not urgent.
 */
export async function savePhotos(
  writes: PhotoWrites,
): Promise<PhotosSaveReport> {
  const report: PhotosSaveReport = { saved: [], failed: [] }
  if (writes.upsert.length === 0 && writes.removeIds.length === 0) return report

  const client = await getSupabaseClient()
  if (!client) {
    if (writes.upsert.length > 0) {
      report.failed.push({ part: 'rows', because: NO_CONNECTION })
    }
    if (writes.removeIds.length > 0) {
      report.failed.push({ part: 'removed', because: NO_CONNECTION })
    }
    return report
  }

  if (writes.upsert.length > 0) {
    const { data, error } = await client
      .from('photos')
      .upsert(writes.upsert, { onConflict: 'id' })
      .select('id')

    if (error) {
      report.failed.push({ part: 'rows', because: becauseOfContent(error) })
    } else if ((data ?? []).length < writes.upsert.length) {
      report.failed.push({ part: 'rows', because: CONTENT_CHANGED_NOTHING })
    } else {
      report.saved.push('rows')
    }
  }

  if (writes.removeIds.length > 0) {
    const { data, error } = await client
      .from('photos')
      .delete()
      .in('id', writes.removeIds)
      .select('id')

    if (error) {
      report.failed.push({ part: 'removed', because: becauseOfContent(error) })
      return report
    }
    if ((data ?? []).length < writes.removeIds.length) {
      report.failed.push({ part: 'removed', because: CONTENT_CHANGED_NOTHING })
      return report
    }

    report.saved.push('removed')

    if (writes.removePaths.length > 0) {
      const { error: failed } = await client.storage
        .from(MEDIA_BUCKET)
        .remove(writes.removePaths)

      if (failed) {
        report.failed.push({
          part: 'files',
          because: becauseOfUpload(failed),
        })
      } else {
        report.saved.push('files')
      }
    }
  }

  return report
}

/**
 * One image into the `media` bucket, and the path it landed on.
 *
 * The path is what the row stores, never a URL. It is refused here before
 * anything is spent if the bucket would refuse it anyway, resized so a phone
 * photograph does not cost several megabytes of a one-gigabyte tier, and
 * uploaded to a fresh random path: `upsert` is off precisely because that path
 * cannot already exist, so a collision is worth hearing about rather than
 * silently overwriting somebody else's logo.
 */
export async function uploadMedia(
  folder: 'sponsors' | 'photos',
  year: number,
  file: File,
): Promise<Result<string>> {
  const rejection = mediaRejection(file)
  if (rejection !== null) return { ok: false, because: rejection }

  const client = await getSupabaseClient()
  if (!client) return { ok: false, because: NO_CONNECTION }

  const image = await resizedForUpload(file)
  if (image.size > MEDIA_MAX_BYTES) {
    return { ok: false, because: tooHeavy(file, image.size) }
  }

  const path = mediaObjectPath(folder, year, file, crypto.randomUUID())
  const { error } = await client.storage
    .from(MEDIA_BUCKET)
    .upload(path, image, {
      contentType: file.type,
      upsert: false,
      // A year, because the object at a path never changes: a replacement gets a
      // path of its own.
      cacheControl: '31536000',
    })

  if (error) return { ok: false, because: becauseOfUpload(error) }
  return { ok: true, data: path }
}
