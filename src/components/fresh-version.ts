/**
 * Whether the page somebody is looking at is still the one that is published.
 *
 * This exists because of a support loop, not a hypothesis. The league's operator
 * reported the same missing fix three times over two days; each time the deploy
 * was live, verified against the production bundle, and his phone was still
 * running the JavaScript of the day before. A single page application never
 * reloads itself: he navigated between tabs of the site for hours without the
 * browser ever asking for a new document, and nothing on screen could tell him
 * so. Every one of those exchanges cost more than this file.
 *
 * The build writes `version.txt` with the name of its entry script. The running
 * page knows its own script's name, so the two can be compared. Both halves are
 * pure so the comparison is tested rather than trusted.
 */

/** The entry script the running page was built with, from its own URL. */
export function runningVersion(moduleUrl: string): string | null {
  return /\/assets\/(index-[A-Za-z0-9_-]+\.js)/.exec(moduleUrl)?.[1] ?? null
}

/**
 * Whether a reload would bring something different.
 *
 * False whenever either side is unknown, and that is deliberate: a failed fetch,
 * a development build with no hashed asset, or a `version.txt` that answered
 * with the SPA rewrite's HTML must never nag somebody about a version that may
 * not exist. The banner is a courtesy, and a courtesy that cries wolf is worse
 * than none.
 */
export function isStale(
  running: string | null,
  published: string | null,
): boolean {
  if (running === null || published === null) return false
  if (!published.startsWith('index-') || !published.endsWith('.js'))
    return false

  return running !== published
}

/** Asks the site which build it is serving. Null when it cannot say. */
export async function publishedVersion(): Promise<string | null> {
  try {
    // `no-store`, or the answer would be as stale as the problem it detects.
    const response = await fetch('/version.txt', { cache: 'no-store' })
    if (!response.ok) return null

    const body = (await response.text()).trim()
    // One line, short: anything else is the rewrite answering with a page.
    return body.length > 0 && body.length < 80 ? body : null
  } catch {
    return null
  }
}
