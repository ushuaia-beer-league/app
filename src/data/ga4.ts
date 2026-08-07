/**
 * Google Analytics 4, and what it costs.
 *
 * The league asked for it on 6 August 2026 and it is a reasonable thing to want: it
 * answers questions the counters in this repository cannot, it is what everybody
 * else uses, and it is free.
 *
 * It is also the first thing on this site that tells somebody else about a visitor.
 * That is written here rather than in a commit message because the rest of the
 * codebase argues the opposite at length, and a reader deserves to know the argument
 * was lost on purpose rather than forgotten:
 *
 * - `visit_facts` recognises a returning visitor without ever creating an
 *   identifier. GA4 creates one, stores it in the browser and sends it to Google.
 * - `page_views` holds a path, a day and a number. GA4 holds a session, a device, a
 *   location and a history, on Google's servers, under Google's terms.
 * - The site used to say, in the panel and in `ADMIN.md`, that it stored nothing
 *   attributable to a person and therefore asked nobody for permission. Both
 *   sentences were changed in the same commit that added this file, because leaving
 *   them would have been the actual problem: a promise that quietly stopped being
 *   true.
 *
 * The two counters stay. They are not redundant with this: they know the league's
 * own vocabulary, they work when Google is blocked, which on a phone with an ad
 * blocker is often, and they belong to the league rather than to an account that can
 * be closed.
 *
 * Nothing here loads unless `VITE_GA4_ID` is set, so a build without it is the site
 * exactly as it was, and the test suite never reaches Google.
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA4_ID as string | undefined

/** `G-` followed by the account's own characters. Anything else is a typo. */
const ID_SHAPE = /^G-[A-Z0-9]{6,}$/

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/** Whether this build has a measurement id worth loading. */
export function ga4Id(): string | null {
  const id = MEASUREMENT_ID?.trim()
  return id !== undefined && ID_SHAPE.test(id) ? id : null
}

let started = false

/**
 * Loads gtag once, and never twice.
 *
 * `send_page_view: false` is the one setting that matters here. This site is a single
 * page: the first load would be the only page view GA4 ever recorded, and every
 * screen a visitor opened afterwards would be invisible. The router reports them
 * instead, through `trackPageView`.
 */
export function startGa4(): void {
  const id = ga4Id()
  if (id === null || started) return
  started = true

  try {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?${new URLSearchParams(
      {
        id,
      },
    ).toString()}`
    document.head.appendChild(script)

    window.dataLayer = window.dataLayer ?? []
    // gtag's own shape: it pushes `arguments` verbatim, so a spread would change what
    // Google receives.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments)
    }

    window.gtag('js', new Date())
    window.gtag('config', id, { send_page_view: false })
  } catch {
    // An analytics tag may never break a page. Same rule as the counters beside it.
    started = false
  }
}

/**
 * Reports one screen. Silent when GA4 is not configured or was blocked.
 *
 * The path is the router's, not the address bar's, so a query string somebody was
 * sent in a link does not become part of the report.
 */
export function trackPageView(path: string): void {
  if (ga4Id() === null) return

  try {
    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_title: document.title,
    })
  } catch {
    // Deliberately empty. See above.
  }
}
