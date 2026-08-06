/**
 * Four things about a visit, decided in the browser so they never become data
 * about a person.
 *
 * The league asked who comes back, from a phone or a computer, arriving from
 * where, and landing on which page. The ordinary way to answer the first one is
 * to give every browser an identifier, send it with each visit and store it,
 * which quietly converts an analytics table into a list of people. This module
 * exists so that never happens: the browser keeps one date in its own storage,
 * compares it to today, and sends the word `new` or `returning`. No identifier is
 * created, so none can be stored, and `visit_facts` stays four counters and a
 * date.
 *
 * The same applies to the rest. The referrer is classified here and only its
 * class travels, so no URL anybody came from is written down. The device is one
 * bit taken from a user-agent hint, never the user-agent itself. There is no
 * country and no city: that needs a service reading every visitor's address, and
 * the league chose free and private over precise.
 *
 * Everything here is swallowed on failure, like the page counter beside it. A
 * counter is the least important thing on the site and must never cost anybody
 * the fixture.
 */

import { viewKey } from './page-views'
import { getSupabaseClient } from './supabase-client'

/** Whether this browser had ever been here before, on an earlier day. */
export type VisitorKind = 'new' | 'returning'

/** Coarse enough to be useful and to say nothing about the machine. */
export type DeviceKind = 'phone' | 'computer'

/** How somebody arrived, in four buckets and never as a URL. */
export type ReferrerKind = 'direct' | 'search' | 'social' | 'other'

/**
 * The one thing kept in the visitor's browser: the league day they were last
 * here. Deliberately a date and not an identifier, so that anybody who opens
 * their own storage sees exactly what it is and it cannot be joined to anything.
 */
export const VISIT_MARK_KEY = 'ubl.visit'

export interface VisitorDecision {
  /** What to count, or null when today has already been counted. */
  kind: VisitorKind | null
  /** The date to keep in the browser, or null to leave what is there alone. */
  mark: string | null
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * The league's own day, in Ushuaia, whatever the visitor's clock says.
 *
 * It has to be the league's day and not the browser's, because the counter row is
 * stamped in Ushuaia: a visitor in Madrid comparing their own date against a row
 * dated here would count themselves as returning several hours early, every day.
 */
export function leagueDay(now: Date): string {
  // `en-CA` is the short way to get `YYYY-MM-DD` out of Intl, and the parts are
  // padded, which is what the comparisons below rely on.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Ushuaia',
  }).format(now)
}

/**
 * Reads the mark and says what to count.
 *
 * Nothing at all, or anything that is not a date, means this browser is here for
 * the first time. A date before today means it was here on an earlier day, which
 * is the entire definition of returning. Today's date means it has already been
 * counted today, and counting a second time would turn "how many came back" into
 * "how many pages they opened".
 *
 * A mark in the future is left exactly where it is. It means a clock is wrong, and
 * overwriting it would count that browser as returning on every load until the
 * date catches up.
 */
export function decideVisitor(
  stored: string | null,
  today: string,
): VisitorDecision {
  if (stored === null || !DAY.test(stored)) {
    return { kind: 'new', mark: today }
  }

  if (stored < today) return { kind: 'returning', mark: today }

  return { kind: null, mark: null }
}

/**
 * Phone or computer, from the hint rather than from the string.
 *
 * `userAgentData.mobile` is a boolean the browser publishes for exactly this
 * question, so it is asked first and nothing else is read. Where it does not exist
 * the user-agent is matched, and only matched: it is never sent anywhere.
 *
 * A tablet lands on `computer`, and an iPad deliberately reports a desktop
 * user-agent, so it lands there too. The league asked for phone or computer, and a
 * third bucket holding two devices in the whole league would say less than this.
 */
export function deviceKind(
  mobileHint: boolean | undefined,
  userAgent: string,
): DeviceKind {
  if (mobileHint === true) return 'phone'
  if (mobileHint === false) return 'computer'

  return /Mobi|Android|iPhone|iPod|Windows Phone/i.test(userAgent)
    ? 'phone'
    : 'computer'
}

/** Where a visit came from, by host. Only these names are recognised. */
const SEARCH_HOSTS = [
  'google.com',
  'google.com.ar',
  'bing.com',
  'duckduckgo.com',
  'yahoo.com',
  'ecosia.org',
  'search.brave.com',
  'yandex.com',
  'baidu.com',
  'startpage.com',
]

const SOCIAL_HOSTS = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'fb.me',
  'whatsapp.com',
  't.co',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'linkedin.com',
  'lnkd.in',
  'reddit.com',
  't.me',
  'threads.net',
]

/**
 * Which of the four buckets a referrer falls into. The URL itself goes no further
 * than this function.
 *
 * Our own host counts as direct. The site is a single page, so an internal click
 * never reloads and never reaches here; the same host means a reload or a
 * bookmark, and either way that person did not arrive from somewhere else.
 *
 * A WhatsApp link usually arrives with no referrer at all, so a good part of
 * `direct` is really "somebody shared it in a group". The panel says so, because
 * reading `direct` as "typed the address" would flatter the site.
 */
export function referrerKind(referrer: string, ownHost: string): ReferrerKind {
  if (referrer === '') return 'direct'

  let host: string
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return 'other'
  }

  const own =
    ownHost
      .toLowerCase()
      .replace(/^www\./, '')
      .split(':')[0] ?? ''
  if (host === own) return 'direct'

  const matches = (known: string) =>
    host === known || host.endsWith(`.${known}`)
  if (SEARCH_HOSTS.some(matches)) return 'search'
  if (SOCIAL_HOSTS.some(matches)) return 'social'

  return 'other'
}

/**
 * What one page load reports. Separated from the sending so a test can check the
 * four answers without a browser and without a database.
 */
export interface VisitFacts {
  visitor?: string
  device?: string
  referrer?: string
  entry?: string
}

/** What this module needs from a browser, and the whole of it. */
export interface VisitEnvironment {
  pathname: string
  referrer: string
  host: string
  userAgent: string
  mobileHint: boolean | undefined
  now: Date
  readMark: () => string | null
  writeMark: (day: string) => void
}

/**
 * Turns one page load into the facts to count, and updates the browser's mark.
 *
 * A key left out is a question this browser could not answer, and the function in
 * the database skips it rather than refusing the rest. An unreadable path is one
 * of those: `viewKey` returns null for anything a visitor typed by hand, and a
 * landing page nobody can name is better left uncounted than stored as junk.
 */
export function visitFacts(browser: VisitEnvironment): VisitFacts {
  const today = leagueDay(browser.now)
  const visitor = decideVisitor(browser.readMark(), today)
  if (visitor.mark !== null) browser.writeMark(visitor.mark)

  const entry = viewKey(browser.pathname)

  return {
    ...(visitor.kind !== null && { visitor: visitor.kind }),
    device: deviceKind(browser.mobileHint, browser.userAgent),
    referrer: referrerKind(browser.referrer, browser.host),
    ...(entry !== null && { entry }),
  }
}

/**
 * The browser, read once. Storage is wrapped because reaching it throws outright
 * in a private window in Safari, and a counter may not break a page.
 */
function thisBrowser(pathname: string): VisitEnvironment {
  const hinted: unknown = (
    navigator as { userAgentData?: { mobile?: boolean } }
  ).userAgentData

  return {
    pathname,
    referrer: document.referrer,
    host: window.location.host,
    userAgent: navigator.userAgent,
    mobileHint:
      typeof hinted === 'object' && hinted !== null && 'mobile' in hinted
        ? Boolean((hinted as { mobile?: boolean }).mobile)
        : undefined,
    now: new Date(),
    readMark: () => {
      try {
        return window.localStorage.getItem(VISIT_MARK_KEY)
      } catch {
        return null
      }
    },
    writeMark: (day) => {
      try {
        window.localStorage.setItem(VISIT_MARK_KEY, day)
      } catch {
        // A browser that refuses storage is counted as new every time it opens
        // the site. That is the honest failure: it cannot be recognised, so it
        // is not claimed to be.
      }
    },
  }
}

/**
 * Whether this page load has already reported. Module scope on purpose: these
 * four facts describe the load, not the screen, so a router change must not add
 * to them and `StrictMode` running an effect twice must not double them.
 */
let reported = false

/** Test seam. Nothing else may reset this. */
export function resetVisitReporting(): void {
  reported = false
}

/**
 * Counts this page load. Answers nothing, throws nothing, and runs once.
 *
 * With no Supabase configuration there is nowhere to count and this is silent,
 * the same way the site falls back to the versioned seed rather than breaking.
 */
export async function recordVisit(pathname: string): Promise<void> {
  if (reported) return
  reported = true

  try {
    const facts = visitFacts(thisBrowser(pathname))

    const client = await getSupabaseClient()
    if (!client) return
    await client.rpc('record_visit', facts)
  } catch {
    // Deliberately empty. See the last paragraph at the top of this file.
  }
}
