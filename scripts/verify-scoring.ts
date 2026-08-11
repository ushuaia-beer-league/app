/**
 * Runs the public scoring table against the live database, without a browser.
 *
 * The bug of 2026-08-11 hid in the difference between the two paths: the seed
 * carried the player id and the database path dropped it, so every test that
 * mocked the client passed. This asks the real API with the real select and runs
 * the real functions over the answer.
 */

import { publishedScoringTable } from '../src/utils/published-statistics'
import { seasonScoring } from '../src/utils/season-statistics'
import {
  PUBLISHED_PLAYER_STATS_SELECT,
  SEASON_GOALS_SELECT,
} from '../src/data/queries'
import { SEED_2026 } from '../src/data/seed-2026'

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_PUBLISHABLE_KEY!

const ask = async (table: string, select: string) => {
  const response = await fetch(
    `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}`,
    { headers: { apikey: key } },
  )
  if (!response.ok) throw new Error(`${table}: ${response.status}`)
  return (await response.json()) as Record<string, unknown>[]
}

const [publishedRows, goalRows, matchRows] = await Promise.all([
  ask('published_player_stats', PUBLISHED_PLAYER_STATS_SELECT),
  ask('match_goals', SEASON_GOALS_SELECT),
  ask('matches', 'id, match_date, competition_key'),
])

const lines = publishedRows.map((row) => ({
  competition: row.competition_key as 'beer' | 'wubl',
  sourceFile: row.source_file as string,
  printedPlayerName: row.printed_player_name as string,
  printedTeam: row.printed_team as string | null,
  playerSlug: row.player_id as string | null,
  teamSlug: null,
  resolvedName: (row.player as { full_name: string } | null)?.full_name ?? null,
  assists: row.assists as number,
  goals: row.goals as number,
  points: row.points as number,
}))

const goals = goalRows.flatMap((row) => {
  const match = row.matches as { competition_key: string } | null
  return match === null
    ? []
    : [
        {
          matchId: row.match_id as string,
          competition: match.competition_key as 'beer' | 'wubl',
          teamId: row.team_id as string,
          scorerId: row.scorer_id as string | null,
          assistId: row.assist_id as string | null,
        },
      ]
})

const publishedOn = publishedRows
  .map((row) => row.published_on as string)
  .reduce((latest, date) => (date > latest ? date : latest))

const season = {
  teams: SEED_2026.teams,
  players: [] as { slug: string; name: string; printedName: string }[],
  goals,
  goalieLines: [],
  matches: matchRows.map((row) => ({
    id: row.id as string,
    date: row.match_date as string,
  })) as never,
  publishedOn,
}

const table = seasonScoring(
  season as never,
  'beer',
  publishedScoringTable(lines, { competition: 'beer' }),
)

console.log(
  'publicado el:',
  publishedOn,
  '| partidos sumados:',
  table.addedMatches,
)
console.log(
  'con jugador resuelto:',
  lines.filter((l) => l.playerSlug !== null).length,
  'de',
  lines.length,
)
for (const row of table.rows.slice(0, 6)) {
  console.log(
    ` ${String(row.points).padStart(3)} pts  ${row.goals}g ${row.assists}a  ${row.name}`,
  )
}
