import { createContext } from 'react'

import { translator, type Language, type StringKey } from './language'

export interface LanguageContextValue {
  language: Language
  /** Translates one of the site's strings. See `es.ts` for why the key is Spanish. */
  t: (key: StringKey) => string
  choose: (language: Language) => void
}

/**
 * Spanish, and a translator that answers in Spanish, so a component rendered outside
 * the provider still renders the site rather than throwing. That happens in tests all
 * the time and there is no reason for it to be an error: the default language is
 * Spanish anyway, so the fallback and the intent are the same thing.
 */
const FALLBACK: LanguageContextValue = {
  language: 'es',
  t: translator('es'),
  choose: () => {},
}

/**
 * Its own file, and not beside the provider, because the lint rule that keeps a module
 * of components from exporting anything else is right: a file that exports both cannot
 * be hot-reloaded reliably.
 */
export const LanguageContext = createContext<LanguageContextValue>(FALLBACK)
