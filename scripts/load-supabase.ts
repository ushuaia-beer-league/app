/**
 * Step three of the import: turn the reconciled seed into the SQL that loads the
 * season into Supabase.
 *
 *   npm run build:load
 *
 * This writes `supabase/seed/season-2026.sql` and applies nothing. The file is
 * reviewed and then applied, so a load is never a side effect of running a
 * script.
 *
 * Two decisions worth knowing before reading the SQL.
 *
 * Identifiers. The application's identity for a team or a player is its slug:
 * that is what the seed carries, what a URL can show, and what the site keys on
 * whether it read from Supabase or from the seed. The database keeps uuid primary
 * keys, so every slug is hashed into a stable uuid here. The same slug always
 * produces the same uuid, which is what makes re-running the load an update
 * rather than a second copy of the season.
 *
 * Idempotency. Every statement is an upsert. The league corrects its sheet and
 * re-exports, so an import has to be repeatable without doubling anything, and
 * `on conflict do nothing` would silently keep the stale row instead.
 *
 * What an upsert cannot do is notice a **renamed** person. A slug is hashed into
 * the row's id, so correcting a spelling produces a new id: the load inserts the
 * corrected person and their roster row, and the old pair survives untouched.
 * That happened on 4 August 2026, when the league confirmed nine spellings and
 * five people changed name, and it was finished by hand:
 *
 *   delete from public.team_players tp using public.players p
 *   where p.id = tp.player_id and p.full_name in (<the old spellings>);
 *   delete from public.players where full_name in (<the old spellings>);
 *
 * Children first, because every reference to a player is `on delete restrict`.
 * This file deliberately does not emit those deletes: a general "remove every
 * player this season does not name" would also remove the people an
 * administrator entered through the panel, which is a worse failure than a
 * leftover row. So a rename is a two-step job, and this is the note that says so.
 */

import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEED_2026 } from '../src/data/seed-2026'
import type { Seed } from '../src/data/seed'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OUT = join(ROOT, 'supabase', 'seed', 'season-2026.sql')

const seed: Seed = SEED_2026

/**
 * A uuid derived from a name, so the same slug is always the same row.
 *
 * The version nibble is set to 8, which RFC 9562 reserves for exactly this: a
 * uuid whose bits are laid out by the application rather than by a timestamp or
 * a random source.
 */
function idFor(kind: string, name: string): string {
  const digest = createHash('sha256')
    .update(`ubl:${kind}:${name}`)
    .digest('hex')
  const bytes = digest.slice(0, 32).split('')

  // Version 8 and the RFC variant bits.
  bytes[12] = '8'
  bytes[16] = ['8', '9', 'a', 'b'][parseInt(digest[16] ?? '0', 16) % 4] ?? '8'

  const hex = bytes.join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

const seasonId = idFor('season', String(seed.season))
const teamId = (slug: string) => idFor('team', slug)
const playerId = (slug: string) => idFor('player', slug)

/** A SQL literal. Everything that reaches the file goes through this. */
function literal(value: string | number | null): string {
  if (value === null) return 'null'
  if (typeof value === 'number') return String(value)
  return `'${value.replace(/'/g, "''")}'`
}

const rows = (values: string[]) => values.join(',\n  ')

const statements: string[] = []

// ---------------------------------------------------------------------------
// The season
// ---------------------------------------------------------------------------

statements.push(`-- The season. Active: the 2026 playoffs had not been played when this was written.
insert into public.seasons (id, year, starts_on, ends_on, status)
values (${literal(seasonId)}, ${seed.season}, '2026-05-23', '2026-08-22', 'active')
on conflict (id) do update set
  year = excluded.year,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  status = excluded.status;`)

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

statements.push(`-- The seven Beer League teams and the four women's teams. The sponsored names
-- are an inferred mapping the organisation has not confirmed, so a team whose
-- full name is unknown keeps it null rather than repeating the short name.
insert into public.teams (id, competition_key, slug, short_name, full_name, nickname)
values
  ${rows(
    seed.teams.map(
      (team) =>
        `(${literal(teamId(team.slug))}, ${literal(team.competition)}, ${literal(team.slug)}, ${literal(team.shortName)}, ${literal(team.fullName)}, ${literal(team.nickname)})`,
    ),
  )}
on conflict (id) do update set
  competition_key = excluded.competition_key,
  slug = excluded.slug,
  short_name = excluded.short_name,
  full_name = excluded.full_name,
  nickname = excluded.nickname;`)

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

statements.push(`-- Every player the roster sheet lists, named as the sheet names them with only
-- the capitalisation normalised. A missing accent stays missing: correcting the
-- spelling of somebody's name is not the importer's call.
insert into public.players (id, full_name)
values
  ${rows(
    seed.players.map(
      (player) =>
        `(${literal(playerId(player.slug))}, ${literal(player.name)})`,
    ),
  )}
on conflict (id) do update set full_name = excluded.full_name;`)

// ---------------------------------------------------------------------------
// Rosters
// ---------------------------------------------------------------------------

statements.push(`-- The roster, per season and per competition. One player has no jersey number on
-- the sheet and one number is worn by two players; both are loaded as they are.
insert into public.team_players (id, season_id, competition_key, team_id, player_id, jersey_number)
values
  ${rows(
    seed.rosters.map(
      (entry) =>
        `(${literal(idFor('roster', `${seed.season}:${entry.teamSlug}:${entry.playerSlug}`))}, ${literal(seasonId)}, ${literal(entry.competition)}, ${literal(teamId(entry.teamSlug))}, ${literal(playerId(entry.playerSlug))}, ${literal(entry.jerseyNumber)})`,
    ),
  )}
on conflict (id) do update set
  team_id = excluded.team_id,
  competition_key = excluded.competition_key,
  jersey_number = excluded.jersey_number;`)

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

statements.push(`-- The fixture, played and unplayed. A match with no teams, no score or no
-- cabecera is stored with the gap showing; the notes column carries what the
-- sheet said where a fact is missing, so the gap is readable rather than merely
-- null.
insert into public.matches (
  id, season_id, competition_key, stage, match_date, start_time, venue,
  home_team_id, away_team_id, home_goals, away_goals, resolution, status, notes
)
values
  ${rows(
    seed.matches.map((match) => {
      return `(${[
        literal(idFor('match', `${seed.season}:${match.id}`)),
        literal(seasonId),
        literal(match.competition),
        literal(match.stage),
        literal(match.date),
        literal(match.time),
        literal(match.venue),
        literal(match.homeTeamId === null ? null : teamId(match.homeTeamId)),
        literal(match.awayTeamId === null ? null : teamId(match.awayTeamId)),
        literal(match.score?.home ?? null),
        literal(match.score?.away ?? null),
        literal(match.score?.resolution ?? null),
        literal(match.score === null ? 'scheduled' : 'played'),
        literal(match.notes),
      ].join(', ')})`
    }),
  )}
on conflict (id) do update set
  stage = excluded.stage,
  match_date = excluded.match_date,
  start_time = excluded.start_time,
  venue = excluded.venue,
  home_team_id = excluded.home_team_id,
  away_team_id = excluded.away_team_id,
  home_goals = excluded.home_goals,
  away_goals = excluded.away_goals,
  resolution = excluded.resolution,
  status = excluded.status,
  notes = excluded.notes;`)

// ---------------------------------------------------------------------------
// The published totals
// ---------------------------------------------------------------------------

statements.push(`-- The scoring table the league published, transcribed. A line the importer
-- could not match to a player or a team keeps its printed text and a null
-- reference, which is the visible gap the organisation has to close.
insert into public.published_player_stats (
  id, season_id, competition_key, published_on, source_file,
  printed_player_name, printed_team, player_id, team_id, assists, goals, points
)
values
  ${rows(
    seed.publishedPlayerStats.map(
      (line) =>
        `(${[
          literal(
            idFor(
              'published-player',
              `${seed.season}:${line.competition}:${seed.publishedOn}:${line.printedPlayerName}`,
            ),
          ),
          literal(seasonId),
          literal(line.competition),
          literal(seed.publishedOn),
          literal(line.sourceFile),
          literal(line.printedPlayerName),
          literal(line.printedTeam),
          literal(line.playerSlug === null ? null : playerId(line.playerSlug)),
          literal(line.teamSlug === null ? null : teamId(line.teamSlug)),
          literal(line.assists),
          literal(line.goals),
          literal(line.points),
        ].join(', ')})`,
    ),
  )}
on conflict (id) do update set
  printed_team = excluded.printed_team,
  player_id = excluded.player_id,
  team_id = excluded.team_id,
  assists = excluded.assists,
  goals = excluded.goals,
  points = excluded.points;`)

statements.push(`-- The goalkeeper table the league published. No percentage column: it is
-- (shots - goals) / shots, computed on read.
insert into public.published_goalie_stats (
  id, season_id, competition_key, published_on, source_file,
  printed_player_name, printed_team, player_id, team_id,
  games_played, shots_faced, goals_against
)
values
  ${rows(
    seed.publishedGoalieStats.map(
      (line) =>
        `(${[
          literal(
            idFor(
              'published-goalie',
              `${seed.season}:${line.competition}:${seed.publishedOn}:${line.printedPlayerName}`,
            ),
          ),
          literal(seasonId),
          literal(line.competition),
          literal(seed.publishedOn),
          literal(line.sourceFile),
          literal(line.printedPlayerName),
          literal(line.printedTeam),
          literal(line.playerSlug === null ? null : playerId(line.playerSlug)),
          literal(line.teamSlug === null ? null : teamId(line.teamSlug)),
          literal(line.gamesPlayed),
          literal(line.shotsFaced),
          literal(line.goalsAgainst),
        ].join(', ')})`,
    ),
  )}
on conflict (id) do update set
  printed_team = excluded.printed_team,
  player_id = excluded.player_id,
  team_id = excluded.team_id,
  games_played = excluded.games_played,
  shots_faced = excluded.shots_faced,
  goals_against = excluded.goals_against;`)

const header = `-- The ${seed.season} season, generated by \`npm run build:load\` from
-- src/data/seed-2026.ts. Do not edit by hand: regenerate it.
--
-- Every statement is an upsert keyed by an identifier derived from the slug, so
-- applying this file twice loads the season once. Totals published
-- ${seed.publishedOn}, read from ${seed.sources.length} files under docs/sources/.
--
-- What this file deliberately does not contain: match_goals, match_players and
-- goalie_lines. The sources carry no per-match record of who scored or who kept
-- goal, so those tables stay empty until the back office enters the paper
-- sheets, and the published totals live in published_player_stats and
-- published_goalie_stats instead.

`

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${header}${statements.join('\n\n')}\n`, 'utf8')

console.log(`Wrote ${OUT.replace(ROOT, '.')}`)
console.log(
  `  1 season, ${seed.teams.length} teams, ${seed.players.length} players`,
)
console.log(
  `  ${seed.rosters.length} roster entries, ${seed.matches.length} matches`,
)
console.log(
  `  ${seed.publishedPlayerStats.length} published skater lines, ${seed.publishedGoalieStats.length} goalkeeper lines`,
)
