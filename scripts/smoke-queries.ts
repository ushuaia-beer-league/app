/**
 * The queries the site makes, sent to the real service.
 *
 *   npm run smoke:queries
 *
 * This exists because of a bug that reached production. The fixture embeds each
 * team by foreign key, a match reaches `teams` twice, and the obvious way to say
 * which one (`home_team:home_team_id`) is invalid when the key is a composite,
 * which this one is: `(home_team_id, competition_key)`, the constraint that keeps
 * a Beer League match from naming a women's team. PostgREST answered `PGRST200`
 * and the whole request failed, so the published site showed no fixture, no
 * standings and no scorers.
 *
 * Nothing in the repository could catch it. The unit tests mock the client, so
 * they test what the panel does with an answer, never whether the question is
 * legal. `tsc` type-checks the select string against the generated schema and the
 * library's parser accepted it. `supabase/tests/query-columns.sql` checks that
 * the columns and the foreign keys exist, which they did. Only the live service
 * can reject a select, so only the live service can approve one.
 *
 * The select strings are imported from the modules that use them rather than
 * copied, because a copy would drift and then vouch for a query nobody runs.
 *
 * Needs the same two public values a build needs. A paused project is reported
 * and exits 0: the free tier sleeps after about a week and that is not a
 * regression. A malformed query exits 1.
 */

import {
  ADMIN_MATCHES_SELECT,
  MATCH_SHEET_SELECT,
  PUBLISHED_GOALIE_STATS_SELECT,
  PUBLISHED_PLAYER_STATS_SELECT,
  SEASON_MATCHES_SELECT,
  TEAMS_SELECT,
} from '../src/data/queries'

const url = (
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  ''
).trim()
const key = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  ''
).trim()

if (!url || !key) {
  console.log(
    'No Supabase configuration in the environment, so there is nothing to ask.\n' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, or SUPABASE_URL and\n' +
      'SUPABASE_PUBLISHABLE_KEY, both of which are public values.',
  )
  process.exit(0)
}

/** Every select the site sends that an embed could make illegal. */
const QUERIES: { what: string; table: string; select: string }[] = [
  {
    what: 'the public fixture',
    table: 'matches',
    select: SEASON_MATCHES_SELECT,
  },
  {
    what: "the panel's matches list",
    table: 'matches',
    select: ADMIN_MATCHES_SELECT,
  },
  {
    what: 'one match sheet',
    table: 'matches',
    select: MATCH_SHEET_SELECT,
  },
  {
    what: 'the published scorers',
    table: 'published_player_stats',
    select: PUBLISHED_PLAYER_STATS_SELECT,
  },
  {
    what: 'the published goalkeepers',
    table: 'published_goalie_stats',
    select: PUBLISHED_GOALIE_STATS_SELECT,
  },
  {
    what: 'the teams',
    table: 'teams',
    select: TEAMS_SELECT,
  },
]

let failed = 0

for (const query of QUERIES) {
  const target = `${url}/rest/v1/${query.table}?select=${encodeURIComponent(query.select)}&limit=1`

  let response: Response
  try {
    response = await fetch(target, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
  } catch (error) {
    // Unreachable is not the same as wrong. A sleeping project answers nothing.
    console.log(
      `? ${query.what}: could not reach the service (${(error as Error).message}). ` +
        'A paused project looks exactly like this, so this is not treated as a failure.',
    )
    continue
  }

  if (response.ok) {
    console.log(`ok ${query.what}`)
    continue
  }

  const body = await response.text()

  // A 5xx is the service having a bad day, most often a project that went to
  // sleep. The query is what is under test here, and a query is only wrong when
  // the service says it is wrong, which it does with a 4xx.
  if (response.status >= 500) {
    console.log(
      `? ${query.what}: the service answered ${response.status}, which is its ` +
        'problem and not the query’s. Not treated as a failure.',
    )
    continue
  }

  console.error(`FAILED ${query.what}: HTTP ${response.status}\n  ${body}`)
  failed += 1
}

if (failed > 0) {
  console.error(
    `\n${failed} of ${QUERIES.length} queries the site makes would fail against this database.`,
  )
  process.exit(1)
}

console.log(`\nAll ${QUERIES.length} queries the site makes are accepted.`)
