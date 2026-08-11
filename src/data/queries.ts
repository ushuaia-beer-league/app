/**
 * Every select the site sends, in one place and importable by anything.
 *
 * These live apart from the modules that use them for one reason: a select string
 * is the only part of this codebase that nothing in this codebase can check. The
 * unit tests mock the client, so they never send it. `tsc` reads it against the
 * generated schema and the library's parser is more permissive than the service.
 * `supabase/tests/query-columns.sql` proves the columns and the keys exist, which
 * is necessary and not sufficient. Only PostgREST can say whether a query is
 * legal, so `scripts/smoke-queries.ts` asks it, and it imports from here rather
 * than holding copies that would drift and then vouch for queries nobody runs.
 *
 * This file has no imports on purpose. The smoke check runs in Node, and it must
 * not have to drag a browser module, and the panel's image resizing, along for
 * the ride.
 *
 * The embeds are the dangerous part, and one of them is why this file exists. A
 * match reaches `teams` twice, so an embed has to say which way. The obvious
 * spelling, `home_team:home_team_id`, is invalid here: that shorthand only works
 * for a single-column key, and this key is the pair `(home_team_id,
 * competition_key)`, the constraint that stops a Beer League match from naming a
 * women's team. PostgREST answers `PGRST200` and fails the whole request, which
 * on the published site meant no fixture, no standings and no scorers. Naming the
 * constraint is what works.
 */

/** The fixture, as the public site reads it. */
export const SEASON_MATCHES_SELECT =
  'id, competition_key, stage, match_date, start_time, venue, home_goals, away_goals, resolution, notes, home_team:matches_home_team_fkey (slug), away_team:matches_away_team_fkey (slug)'

/**
 * The panel's matches list, with the child-row counts that let it say what each
 * sheet still needs without reading every row of every sheet.
 */
export const ADMIN_MATCHES_SELECT =
  'id, competition_key, stage, match_date, start_time, venue, home_goals, away_goals, resolution, notes, home_team:matches_home_team_fkey (slug, short_name), away_team:matches_away_team_fkey (slug, short_name), match_players(count), match_goals(count), goalie_lines(count)'

/** One match with every child row of its sheet, in a single request. */
export const MATCH_SHEET_SELECT =
  'id, season_id, competition_key, stage, match_date, start_time, venue, home_goals, away_goals, resolution, notes, home_team:matches_home_team_fkey (id, slug, short_name), away_team:matches_away_team_fkey (id, slug, short_name), match_players (player_id, team_id, is_substitute, is_franchise), match_goals (id, team_id, scorer_id, assist_id), goalie_lines (player_id, team_id, shots_faced, goals_against)'

/** The scoring table the league published, with the person it belongs to. */
/*
 * `player_id` and `published_on` are read as columns, not only through the
 * embed, and both matter for a reason that cost the league two days of
 * confusion. The season load used to drop the id — every published line arrived
 * with no person attached — so the table that adds the panel's own records to
 * these totals could never match a line to a scorer, and every recorded goal
 * became a second row instead of being added to the first. The top of the table
 * kept showing the totals of 4 July, and the operator was right to say so.
 *
 * The date is read for the same kind of reason: it is the cutoff that decides
 * which recorded matches may be added, and taking it from the versioned
 * snapshot instead of from the rows would double-count everything played
 * between the seeded date and a newer publication.
 */
export const PUBLISHED_PLAYER_STATS_SELECT =
  'competition_key, source_file, published_on, player_id, printed_player_name, printed_team, assists, goals, points, player:player_id (full_name)'

/** The goalkeeping table the league published. */
export const PUBLISHED_GOALIE_STATS_SELECT =
  'competition_key, source_file, published_on, player_id, printed_player_name, printed_team, games_played, shots_faced, goals_against, player:player_id (full_name)'

/** The teams, as both the public site and the panel list them. */
export const TEAMS_SELECT =
  'slug, competition_key, short_name, full_name, nickname, logo_url'

/** The panel-edited prose overrides, read by the public site and the panel. */
export const SITE_CONTENT_SELECT = 'key, language, title, body'

/** The published sponsors, as the public site shows them. */
export const PUBLIC_SPONSORS_SELECT = 'name, url, logo_path, display_order'

/** The published gallery. */
export const PUBLIC_PHOTOS_SELECT = 'storage_path, caption, display_order'

/** The league's contact channels, as the public site and the panel read them. */
export const PUBLIC_CONTACT_SELECT =
  'id, label, href, glyph, display_order, active'

/**
 * The public rosters: every active roster row of the season with its team's
 * slug, and the players by id. The player's uuid stands in for the seed's
 * `playerSlug` on both sides of the join — the public join is by string
 * equality and never prints the key, so an opaque one serves.
 */
export const SEASON_PLAYERS_SELECT = 'id, full_name'

export const SEASON_ROSTER_SELECT =
  'player_id, competition_key, jersey_number, active, teams (slug)'

/**
 * The goals and goalkeeper lines the panel records, for the public tables.
 *
 * The match is embedded for its competition, because a goal belongs to one
 * through its match and the tables are per competition.
 */
export const SEASON_GOALS_SELECT =
  'match_id, team_id, scorer_id, assist_id, matches (competition_key)'

export const SEASON_GOALIE_LINES_SELECT =
  'match_id, team_id, player_id, shots_faced, goals_against, matches (competition_key)'
