import { en } from './en'
import { ptBR } from './pt-BR'
import type { Catalogue, StringKey } from './es'

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
export const LANGUAGES = ['es', 'en', 'pt-BR'] as const

export type Language = (typeof LANGUAGES)[number]

/** What each language calls itself, which is how a language menu should read. */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  es: 'Castellano',
  en: 'English',
  'pt-BR': 'Português',
}

/**
 * The flag shown beside each language, chosen by the league.
 *
 * A flag is a country and a language is not, which is the usual argument against
 * this, and it loses here: the people these flags are for are visitors deciding in
 * one second which of three words to press, and a flag reads faster than a word they
 * cannot read. The league picked which country stands for which language, and these
 * are its choices, not a guess: Argentina for Spanish because that is whose league
 * this is, the United States for English, Brazil for Portuguese because that is
 * where Ushuaia's Portuguese speakers come from.
 *
 * Windows does not draw flag emoji at all: it falls back to the two letters of the
 * country code. That is why the name of the language is always beside it rather than
 * instead of it, and why the flag is `aria-hidden`.
 */
export const LANGUAGE_FLAGS: Readonly<Record<Language, string>> = {
  es: '🇦🇷',
  en: '🇺🇸',
  'pt-BR': '🇧🇷',
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

/**
 * Spanish is absent on purpose: its catalogue would map every string to itself, so
 * `translator('es')` returns the key instead of looking anything up.
 */
const CATALOGUES: Readonly<Partial<Record<Language, Catalogue>>> = {
  en,
  'pt-BR': ptBR,
}

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
  return catalogue === undefined ? (key) => key : (key) => catalogue[key]
}

export type { StringKey }

/**
 * Fills the holes in a string that carries a number or a name.
 *
 * `fill(t('{n} jugadores en el plantel'), { n: 10 })`. Kept this plain on purpose:
 * the alternative is a library that knows about plural categories, and this league
 * needs two forms in four languages, all of which mark plural the same way. The
 * singular and the plural are separate entries, which is how the code already read
 * before any of this existed.
 *
 * A hole with no value is left as it is rather than replaced by "undefined": a
 * visible `{n}` is a bug somebody fixes, and the word "undefined" in the middle of a
 * sentence is a bug somebody screenshots.
 */
export function fill(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  )
}
