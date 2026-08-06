import { en } from './en'
import { es, type Catalogue, type StringKey } from './es'

/**
 * Which languages the site speaks, and how it decides.
 *
 * Pure, and apart from React, so the decision can be tested without a browser and
 * read without one either.
 */

/**
 * In the order a switcher should offer them. Spanish first because it is the
 * league's language, not because of the alphabet.
 *
 * Italian, French and Portuguese are the ones the league asked for next: each is one
 * more entry here plus one file typed as `Catalogue`, and `tsc` then lists every
 * string that file is missing.
 */
export const LANGUAGES = ['es', 'en'] as const

export type Language = (typeof LANGUAGES)[number]

/** What each language calls itself, which is how a language menu should read. */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  es: 'Castellano',
  en: 'English',
}

/**
 * Spanish, always, until somebody chooses otherwise.
 *
 * The browser's own `Accept-Language` is deliberately **not** consulted, which is
 * unusual enough to write down. The league asked for Spanish to be the default
 * always, and they are right for their own site: it is an Argentine league, a phone
 * bought abroad or a browser left in English does not mean the person in front of it
 * wants an English page, and a visitor from Ushuaia landing on an English site would
 * read it as a fault.
 */
export const DEFAULT_LANGUAGE: Language = 'es'

const CATALOGUES: Readonly<Record<Language, Catalogue>> = { es, en }

/** Where a chosen language is remembered, in the visitor's own browser. */
export const LANGUAGE_KEY = 'ubl.lang'

/** Whether a stored or requested value is a language this site speaks. */
export function isLanguage(value: unknown): value is Language {
  return (
    typeof value === 'string' &&
    (LANGUAGES as readonly string[]).includes(value)
  )
}

/**
 * The language to use: what was chosen before, or Spanish.
 *
 * Anything unrecognised is Spanish rather than an error. A value in storage comes
 * from an older version of this site or from somebody editing their own storage, and
 * neither is worth breaking a page over.
 */
export function resolveLanguage(stored: unknown): Language {
  return isLanguage(stored) ? stored : DEFAULT_LANGUAGE
}

/**
 * The translator for a language.
 *
 * A missing translation is impossible by construction: the key type comes from the
 * Spanish catalogue and every other catalogue is typed against it, so this cannot be
 * handed a key that some language lacks.
 */
export function translator(language: Language): (key: StringKey) => string {
  const catalogue = CATALOGUES[language]
  return (key) => catalogue[key]
}

export type { StringKey }
