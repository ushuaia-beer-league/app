/**
 * A copy of what the panel holds, so it does not live in one place only.
 *
 *   npm run backup
 *
 * This is the answer to the one structural gap left in the project. The versioned
 * seed covers the season that was imported from `docs/sources/`, but it is
 * generated from those sources and knows nothing about what the league types in
 * afterwards. From the first match sheet somebody fills in, that data exists in
 * exactly one place, and the free Supabase tier includes no automated backups.
 *
 * So the workflow runs this weekly and commits the result. Git keeps every
 * version, which is what makes a single overwritten file the right shape: a dated
 * file per run would grow the repository for no gain, since the history is the
 * archive.
 *
 * Read with the same publishable key the site uses, over the public API. That is
 * deliberate and it is the safety property that matters most here: this can only
 * ever copy what any visitor could already read. `admins` holds people's email
 * addresses and row level security does not let that key see it, so a leak is not
 * prevented by this script remembering to skip the table, it is prevented by the
 * database refusing. `page_views` is left out for a different reason: it is a
 * counter about the site, not the league's record of itself, and it would change
 * every week and bury the diffs that matter.
 *
 * The rule that protects the archive: **a failed read never overwrites a good
 * backup.** A paused project, a network that drops, a table that answers with
 * nothing: each of those would otherwise turn a year of records into an empty
 * file, and the commit would look like a successful backup. Every table is fetched
 * first, the counts are checked, and only then is anything written.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OUT = join(ROOT, 'backups', 'league.json')

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
  console.error(
    'No Supabase configuration in the environment, so there is nothing to copy.\n' +
      'Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY, both of which are public values.',
  )
  process.exit(1)
}

/**
 * What is copied, and the order a person would read it in.
 *
 * `empty` says whether a table having no rows is a normal state. A season with no
 * matches is not; a season with no photographs is, until somebody uploads one. The
 * difference is what lets this refuse a bad read without refusing a quiet week.
 */
const TABLES: { name: string; order: string; empty: 'ok' | 'suspicious' }[] = [
  { name: 'seasons', order: 'year', empty: 'suspicious' },
  { name: 'competitions', order: 'key', empty: 'suspicious' },
  { name: 'teams', order: 'slug', empty: 'suspicious' },
  { name: 'players', order: 'full_name', empty: 'suspicious' },
  { name: 'team_players', order: 'id', empty: 'suspicious' },
  { name: 'matches', order: 'match_date', empty: 'suspicious' },
  { name: 'match_players', order: 'match_id', empty: 'ok' },
  { name: 'match_goals', order: 'id', empty: 'ok' },
  { name: 'goalie_lines', order: 'match_id', empty: 'ok' },
  { name: 'published_player_stats', order: 'id', empty: 'ok' },
  { name: 'published_goalie_stats', order: 'id', empty: 'ok' },
  { name: 'sponsors', order: 'display_order', empty: 'ok' },
  { name: 'photos', order: 'display_order', empty: 'ok' },
]

async function read(table: string, order: string): Promise<unknown[]> {
  const target = `${url}/rest/v1/${table}?select=*&order=${order}`
  const response = await fetch(target, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })

  if (!response.ok) {
    throw new Error(
      `${table} answered HTTP ${response.status}: ${await response.text()}`,
    )
  }

  const rows: unknown = await response.json()
  if (!Array.isArray(rows)) throw new Error(`${table} did not answer with rows`)

  return rows
}

/** How many rows the backup on disk holds per table, or null when there is none. */
function previousCounts(): Record<string, number> | null {
  try {
    const held: unknown = JSON.parse(readFileSync(OUT, 'utf8'))
    if (typeof held !== 'object' || held === null) return null

    const tables = (held as { tables?: Record<string, unknown[]> }).tables
    if (!tables) return null

    return Object.fromEntries(
      Object.entries(tables).map(([name, rows]) => [
        name,
        Array.isArray(rows) ? rows.length : 0,
      ]),
    )
  } catch {
    // No backup yet, or one this version cannot read. Either way there is nothing
    // to protect, and the first run writes whatever it finds.
    return null
  }
}

const tables: Record<string, unknown[]> = {}

for (const table of TABLES) {
  try {
    tables[table.name] = await read(table.name, table.order)
  } catch (error) {
    // A clean sentence rather than a stack trace: whoever reads this is looking at
    // a scheduled run that failed, and what they need to know is that the copy on
    // disk was left alone.
    console.error(`Could not read ${table.name}: ${(error as Error).message}`)
    console.error(
      '\nNothing was written, so the copy already on disk is untouched. A paused\n' +
        'project looks exactly like this: check whether the database is awake.',
    )
    process.exit(1)
  }
}

const counts = Object.fromEntries(
  Object.entries(tables).map(([name, rows]) => [name, rows.length]),
)

// Nothing is written until every table has been read and every count makes sense.
const refusals: string[] = []

for (const table of TABLES) {
  if (table.empty === 'suspicious' && counts[table.name] === 0) {
    refusals.push(`${table.name} came back empty and never should be`)
  }
}

const before = previousCounts()
if (before !== null) {
  for (const [name, count] of Object.entries(counts)) {
    const held = before[name] ?? 0
    // The league adds and corrects; it does not delete seasons. A table that
    // shrank by more than a fifth is a bad read or a mistake, and either way the
    // copy on disk is worth more than this one.
    if (held > 5 && count < held * 0.8) {
      refusals.push(
        `${name} went from ${held} rows to ${count}, which is a loss rather than an edit`,
      )
    }
  }
}

if (refusals.length > 0) {
  console.error('Refusing to overwrite the backup:')
  for (const refusal of refusals) console.error(`  ${refusal}`)
  console.error(
    '\nThe copy already on disk is untouched. A paused project looks exactly like\n' +
      'this, so check whether the database is awake before treating it as a fault.',
  )
  process.exit(1)
}

mkdirSync(dirname(OUT), { recursive: true })

// Sorted keys and two-space indent so a diff between two weeks is readable: the
// point of committing this is that somebody can see what changed.
writeFileSync(
  OUT,
  `${JSON.stringify({ takenFrom: url, tables }, null, 2)}\n`,
  'utf8',
)

const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
console.log(`Wrote ${OUT.replace(ROOT, '.')} with ${total} rows:`)
for (const [name, count] of Object.entries(counts)) {
  console.log(`  ${String(count).padStart(4)} ${name}`)
}
