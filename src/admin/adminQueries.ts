/**
 * What the panel reads and writes.
 *
 * Every one of these goes through the same publishable key a visitor has, and
 * every write is allowed or refused by row level security in the database. This
 * file cannot grant anybody anything: at most it can ask, and be told no.
 */

import type { Match } from '../data/types'
import { getSupabaseClient } from '../data/supabase-client'
import { matchFromRow, type MatchRow } from '../data/season-source'
import type { MatchRecordCounts } from '../utils/match-completeness'

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
