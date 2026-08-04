/**
 * The one Supabase client, and the only place a key is read.
 *
 * One instance, memoised, because two clients mean two auth sessions: the panel
 * would sign in on one and the reads would happen on the other, and the bug that
 * produces looks like row level security misbehaving.
 *
 * There is no key in this file. It comes from the environment at build time, and
 * with no key configured this module answers null, which is what lets the public
 * site fall back to the versioned seed instead of failing.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

/**
 * The client, carrying the schema it talks to.
 *
 * This is what makes a wrong column name a build failure instead of a blank
 * screen: the library reads the select string at the type level, so
 * `select('short_nme')` stops `npm run typecheck`. The tests mock the client, so
 * without this nothing in the repository would notice.
 *
 * `src/data/database.types.ts` is generated from the live database and is a
 * snapshot, exactly like the seed. Regenerate it after every migration, or it
 * starts vouching for a schema that has moved:
 * `supabase gen types typescript --project-id wqgmdjmdobgcrioxlhkl`, or the MCP's
 * `generate_typescript_types`, then `npx prettier --write` on it.
 * `supabase/tests/query-columns.sql` is the check that does not rely on anybody
 * remembering, because it reads the catalogue itself.
 */
export type LeagueClient = SupabaseClient<Database>

export interface SupabaseConfig {
  url: string
  key: string
}

/**
 * Reads the configuration from the environment. Both halves have to be present:
 * a URL with no key would fail on every request and a key with no URL has
 * nowhere to go, and either way the seed is the better answer.
 */
export function supabaseConfig(
  env: Record<string, string | undefined> = import.meta.env,
): SupabaseConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim()
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

  return url && key ? { url, key } : null
}

let client: LeagueClient | null = null

/**
 * The client, or null when Supabase is not configured.
 *
 * The library itself is imported dynamically, so a visitor who only reads the
 * public site never downloads it: with no key there is nothing to talk to, and
 * the chunk is never fetched.
 */
export async function getSupabaseClient(
  config: SupabaseConfig | null = supabaseConfig(),
): Promise<LeagueClient | null> {
  if (!config) return null
  if (client) return client

  const { createClient } = await import('@supabase/supabase-js')
  client = createClient<Database>(config.url, config.key, {
    auth: {
      // Sign-in comes back from Google as a fragment on the panel's own URL, so
      // the client has to read it once and then keep the session.
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  return client
}

/** Test seam: drops the memoised client so a case can configure its own. */
export function resetSupabaseClient(): void {
  client = null
}
