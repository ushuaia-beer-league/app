/**
 * Counting a visit, and the two rules that matter more than the count.
 *
 * The first: this can never break the page. A counter is the least important
 * thing on the site, so every failure here is swallowed. A paused database, a
 * blocked request, an ad blocker that eats the call: all of them mean the number
 * is lower than the truth, which is a fine outcome, and none of them may cost a
 * visitor the fixture.
 *
 * The second: nothing about the person is sent. Only a path goes over the wire.
 * No identifier, no referrer, nothing that could be joined back to anybody, which
 * is also why there is nothing to consent to and no banner asking for it.
 *
 * The numbers are indicative. Anybody can call the function in a loop, and a
 * visitor who never loads the JavaScript is never counted, so this answers
 * "is the site being used" and not "exactly how many".
 */

import { getSupabaseClient } from './supabase-client'

/**
 * What gets counted, from a router path.
 *
 * The database refuses anything that is not `[a-z0-9/-]`, so the shape is decided
 * here rather than discovered as a rejection: the leading slash goes, a query
 * string or a fragment goes with it, and the empty string that the home page
 * produces becomes `/` so the public site has a name of its own.
 *
 * Everything is lower-cased and anything left over is dropped, which keeps a path
 * that somebody types by hand from inventing a key in the table.
 */
export function viewKey(pathname: string): string | null {
  const trimmed = pathname.split('?')[0]?.split('#')[0] ?? ''
  const cleaned = trimmed.toLowerCase().replace(/^\/+|\/+$/g, '')

  if (cleaned === '') return '/'
  if (!/^[a-z0-9/-]{1,60}$/.test(cleaned)) return null

  return cleaned
}

/**
 * Adds one to the counter for a path. Answers nothing and throws nothing.
 *
 * With no Supabase configuration there is nowhere to count, and that is silent
 * too: the site still serves the season from the versioned seed, and a build with
 * no key is a working site rather than a broken one.
 */
export async function recordView(pathname: string): Promise<void> {
  const page = viewKey(pathname)
  if (page === null) return

  try {
    const client = await getSupabaseClient()
    if (!client) return
    await client.rpc('record_view', { page })
  } catch {
    // Deliberately empty. See the first rule at the top of this file.
  }
}
