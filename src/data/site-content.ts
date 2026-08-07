import type { Language } from '../i18n/language'
import { getSupabaseClient } from './supabase-client'
import { SITE_CONTENT_SELECT } from './queries'

/**
 * The panel-edited overrides for the site's prose.
 *
 * A block edited from the panel overrides the built-in text for that block in that
 * language; a block nobody edited, or a language nobody edited it in, keeps the
 * text shipped in the code. So editing the Spanish never blanks the English, and a
 * paused database is a site that still says everything (the same offline rule as
 * the season itself).
 *
 * The ten commandments have no key here and never get one: they are the league's
 * rulebook, quoted verbatim.
 */
export const CONTENT_KEYS = [
  'historia-nacimiento',
  'historia-beer-league',
  'historia-comienzo',
  'historia-apoyo',
  'historia-hoy',
] as const

export type ContentKey = (typeof CONTENT_KEYS)[number]

export interface ContentBlock {
  key: ContentKey
  language: Language
  title: string | null
  body: string
}

export type ContentOverrides = ReadonlyMap<string, ContentBlock>

const mapKey = (key: string, language: string) => `${key}#${language}`

/** The override for one block in one language, or null meaning use the built-in. */
export function overrideFor(
  overrides: ContentOverrides | undefined,
  key: ContentKey,
  language: Language,
): ContentBlock | null {
  return overrides?.get(mapKey(key, language)) ?? null
}

/** Body text split into the paragraphs the editor separated with blank lines. */
export function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
}

/**
 * Loads every override in one request. Empty on any failure, because a page that
 * falls back to its built-in prose is a working page.
 */
export async function loadContentOverrides(): Promise<ContentOverrides> {
  const empty = new Map<string, ContentBlock>()
  try {
    const client = await getSupabaseClient()
    if (!client) return empty
    const { data, error } = await client
      .from('site_content')
      .select(SITE_CONTENT_SELECT)
    if (error || !data) return empty
    for (const row of data as unknown as ContentBlock[]) {
      empty.set(mapKey(row.key, row.language), row)
    }
    return empty
  } catch {
    return empty
  }
}
