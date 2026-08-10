/**
 * Where the site gets a season from.
 *
 * Two sources, one shape. Supabase when it is configured and awake, the
 * versioned seed otherwise, and the caller cannot tell which it got except by
 * reading `source`. That is not a nicety: the free tier pauses a project after
 * about a week of inactivity and this league plays every two to four weeks, so a
 * sleeping database is a normal Tuesday, not an incident, and the site has to
 * keep showing the season anyway.
 *
 * The identity the application uses is the slug, in both sources. Supabase keeps
 * uuid primary keys and this module never lets one escape: every row is mapped
 * back to the slug the seed already uses, so a component can be written once.
 *
 * There is no key in this file and none in the repository. The publishable key
 * arrives through the environment; with no key the seed is simply the only
 * source, which is a working site rather than a broken one.
 */

import {
  PUBLISHED_GOALIE_STATS_SELECT,
  PUBLISHED_PLAYER_STATS_SELECT,
  SEASON_GOALIE_LINES_SELECT,
  SEASON_GOALS_SELECT,
  SEASON_MATCHES_SELECT,
  SEASON_PLAYERS_SELECT,
  SEASON_ROSTER_SELECT,
  TEAMS_SELECT,
} from './queries'
import { SEED_2026 } from './seed-2026'
import {
  getSupabaseClient,
  supabaseConfig,
  type SupabaseConfig,
} from './supabase-client'
import type { Seed } from './seed'
import type {
  CompetitionKey,
  Match,
  MatchResolution,
  MatchStage,
  Venue,
} from './types'

export interface SeasonData extends Seed {
  /** Which of the two answered, so the site can say so out loud. */
  source: 'supabase' | 'seed'
  /** Why the seed was used, when it was. */
  fellBackBecause: string | null
}

/** The row shapes the queries below ask for, named so the mapping reads. */
interface TeamRow {
  slug: string
  competition_key: CompetitionKey
  short_name: string
  full_name: string | null
  nickname: string | null
  logo_url: string | null
}

export interface MatchRow {
  id: string
  competition_key: CompetitionKey
  stage: MatchStage
  match_date: string
  start_time: string
  venue: Venue | null
  home_goals: number | null
  away_goals: number | null
  resolution: MatchResolution | null
  notes: string | null
  home_team: { slug: string } | null
  away_team: { slug: string } | null
}

interface PublishedPlayerRow {
  competition_key: CompetitionKey
  source_file: string
  printed_player_name: string
  printed_team: string | null
  assists: number
  goals: number
  points: number
  player: { full_name: string } | null
}

interface PublishedGoalieRow {
  competition_key: CompetitionKey
  source_file: string
  printed_player_name: string
  printed_team: string | null
  games_played: number
  shots_faced: number
  goals_against: number
  player: { full_name: string } | null
}

/** `HH:MM`, from the `HH:MM:SS` Postgres hands back for a time column. */
function trimSeconds(time: string): string {
  return time.slice(0, 5)
}

/**
 * One database row as a domain match. Exported because this is where a wrong
 * mapping would corrupt every table quietly: a uuid escaping as a team id, a
 * time keeping its seconds, or a half-filled score being read as a result.
 */
export function matchFromRow(row: MatchRow): Match {
  const scored = row.home_goals !== null && row.away_goals !== null

  return {
    id: row.id,
    competition: row.competition_key,
    stage: row.stage,
    date: row.match_date,
    time: trimSeconds(row.start_time),
    venue: row.venue,
    homeTeamId: row.home_team?.slug ?? null,
    awayTeamId: row.away_team?.slug ?? null,
    // A score with no resolution is a row the sheet left half-filled; the
    // standings leave it out rather than guess how it ended.
    score:
      scored && row.resolution !== null
        ? {
            home: row.home_goals as number,
            away: row.away_goals as number,
            resolution: row.resolution,
          }
        : null,
    notes: row.notes,
  }
}

/**
 * The season as Supabase holds it, or null when it cannot answer.
 *
 * Anything unexpected returns null instead of throwing: a paused project, a
 * network that dropped, a table that is empty because nobody has imported yet.
 * None of those is worth a blank page when the seed is right there.
 */
async function loadFromSupabase(
  config: SupabaseConfig,
  season: number,
): Promise<{ data: SeasonData | null; because: string | null }> {
  const client = await getSupabaseClient(config)
  if (!client) return { data: null, because: 'Supabase is not configured' }

  const seasonRow = await client
    .from('seasons')
    .select('id, year')
    .eq('year', season)
    .maybeSingle()

  if (seasonRow.error) return { data: null, because: seasonRow.error.message }
  if (!seasonRow.data)
    return { data: null, because: `no ${season} season in the database` }

  const seasonId = (seasonRow.data as { id: string }).id

  const [
    teams,
    matches,
    playerStats,
    goalieStats,
    players,
    roster,
    goals,
    goalieLines,
  ] = await Promise.all([
      client.from('teams').select(TEAMS_SELECT),
      // The two teams are embedded by **foreign key name**, not by column. A match
      // reaches `teams` twice, so the embed has to say which way, and the obvious
      // spelling of that (`home_team:home_team_id`) is wrong here: the key is the
      // pair `(home_team_id, competition_key)`, which is what keeps a Beer League
      // match from naming a women's team, and PostgREST only accepts the column
      // shorthand for a single-column key. It answers `PGRST200` otherwise, which
      // fails the whole request: no fixture, no standings, no scorers. This is not
      // catchable by the tests, which mock the client, so
      // `npm run smoke:queries` runs it against the real API instead.
      client
        .from('matches')
        .select(SEASON_MATCHES_SELECT)
        .eq('season_id', seasonId)
        .order('match_date')
        .order('start_time'),
      client
        .from('published_player_stats')
        .select(PUBLISHED_PLAYER_STATS_SELECT)
        .eq('season_id', seasonId),
      client
        .from('published_goalie_stats')
        .select(PUBLISHED_GOALIE_STATS_SELECT)
        .eq('season_id', seasonId),
      client.from('players').select(SEASON_PLAYERS_SELECT),
      client
        .from('team_players')
        .select(SEASON_ROSTER_SELECT)
        .eq('season_id', seasonId),
      // The panel's own records. A competition with any of these gets a
      // computed table instead of the league's transcribed totals.
      client.from('match_goals').select(SEASON_GOALS_SELECT),
      client.from('goalie_lines').select(SEASON_GOALIE_LINES_SELECT),
    ])

  const failure = [
    teams,
    matches,
    playerStats,
    goalieStats,
    players,
    roster,
    goals,
    goalieLines,
  ].find((result) => result.error)
  if (failure?.error) return { data: null, because: failure.error.message }

  const matchRows = (matches.data ?? []) as unknown as MatchRow[]
  if (matchRows.length === 0) {
    return {
      data: null,
      because: 'the database holds no matches for this season',
    }
  }

  const teamRows = (teams.data ?? []) as TeamRow[]
  const playerRows = (playerStats.data ?? []) as unknown as PublishedPlayerRow[]
  const goalieRows = (goalieStats.data ?? []) as unknown as PublishedGoalieRow[]
  const playerRosterRows = (players.data ?? []) as {
    id: string
    full_name: string
  }[]
  const goalRows = (goals.data ?? []) as unknown as {
    match_id: string
    team_id: string
    scorer_id: string | null
    assist_id: string | null
    matches: { competition_key: CompetitionKey } | null
  }[]
  const goalieRowsPanel = (goalieLines.data ?? []) as unknown as {
    match_id: string
    team_id: string
    player_id: string
    shots_faced: number
    goals_against: number
    matches: { competition_key: CompetitionKey } | null
  }[]
  const rosterRows = (roster.data ?? []) as unknown as {
    player_id: string
    competition_key: CompetitionKey
    jersey_number: number | null
    active: boolean
    teams: { slug: string } | null
  }[]

  return {
    because: null,
    data: {
      source: 'supabase',
      fellBackBecause: null,
      season,
      publishedOn: SEED_2026.publishedOn,
      sources: SEED_2026.sources,
      teams: teamRows.map((row) => ({
        slug: row.slug,
        competition: row.competition_key,
        shortName: row.short_name,
        fullName: row.full_name,
        nickname: row.nickname,
        aliases: [],
        mappingInferred: true,
        logoUrl: row.logo_url,
      })),
      // The rosters the panel edits, not the seed's copy: an operator who
      // fixes a name or moves a number has to see it on the public site, and
      // until 2026-08-07 this handed the seed even when the database answered.
      // The player's uuid stands in for the seed's slug on both sides of the
      // public join, which never prints the key.
      players: playerRosterRows.map((row) => ({
        slug: row.id,
        name: row.full_name,
        // The sheet's own spelling only exists for imported rows; for the
        // database's truth the display name is the record.
        printedName: row.full_name,
      })),
      rosters: rosterRows.flatMap((row) =>
        row.active && row.teams !== null
          ? [
              {
                playerSlug: row.player_id,
                teamSlug: row.teams.slug,
                competition: row.competition_key,
                jerseyNumber: row.jersey_number,
              },
            ]
          : [],
      ),
      matches: matchRows.map(matchFromRow),
      // A goal whose match answered nothing has no competition to belong to, so
      // it is left out rather than filed under a guess.
      goals: goalRows.flatMap((row) =>
        row.matches === null
          ? []
          : [
              {
                matchId: row.match_id,
                competition: row.matches.competition_key,
                teamId: row.team_id,
                scorerId: row.scorer_id,
                assistId: row.assist_id,
              },
            ],
      ),
      goalieLines: goalieRowsPanel.flatMap((row) =>
        row.matches === null
          ? []
          : [
              {
                matchId: row.match_id,
                competition: row.matches.competition_key,
                playerId: row.player_id,
                teamId: row.team_id,
                shotsFaced: row.shots_faced,
                goalsAgainst: row.goals_against,
              },
            ],
      ),
      publishedPlayerStats: playerRows.map((row) => ({
        competition: row.competition_key,
        sourceFile: row.source_file,
        printedPlayerName: row.printed_player_name,
        printedTeam: row.printed_team,
        playerSlug: null,
        teamSlug: null,
        resolvedName: row.player?.full_name ?? null,
        assists: row.assists,
        goals: row.goals,
        points: row.points,
      })),
      publishedGoalieStats: goalieRows.map((row) => ({
        competition: row.competition_key,
        sourceFile: row.source_file,
        printedPlayerName: row.printed_player_name,
        printedTeam: row.printed_team,
        playerSlug: null,
        teamSlug: null,
        resolvedName: row.player?.full_name ?? null,
        gamesPlayed: row.games_played,
        shotsFaced: row.shots_faced,
        goalsAgainst: row.goals_against,
      })),
      calendarNotes: SEED_2026.calendarNotes,
      findings: SEED_2026.findings,
    },
  }
}

/** The seed, dressed as a season and honest about why it is being used. */
function fromSeed(because: string | null): SeasonData {
  return { ...SEED_2026, source: 'seed', fellBackBecause: because }
}

/**
 * The season the site should render. Supabase first when configured, the seed
 * whenever Supabase cannot answer.
 */
export async function loadSeason(
  options: { season?: number; config?: SupabaseConfig | null } = {},
): Promise<SeasonData> {
  const season = options.season ?? SEED_2026.season
  const config =
    options.config === undefined ? supabaseConfig() : options.config

  if (!config) return fromSeed(null)

  try {
    const { data, because } = await loadFromSupabase(config, season)
    return data ?? fromSeed(because)
  } catch (error) {
    return fromSeed(
      error instanceof Error ? error.message : 'the request failed',
    )
  }
}
