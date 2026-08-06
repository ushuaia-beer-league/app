import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { LanguageContext, type LanguageContextValue } from './context'
import {
  LANGUAGE_KEY,
  resolveLanguage,
  translator,
  type Language,
} from './language'

/** Storage is wrapped: reaching it throws outright in a private window in Safari. */
function readStored(): string | null {
  try {
    return window.localStorage.getItem(LANGUAGE_KEY)
  } catch {
    return null
  }
}

function store(language: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, language)
  } catch {
    // A browser that refuses storage asks again on the next visit, which is a small
    // annoyance and not a reason to fail.
  }
}

/**
 * Holds the chosen language and hands down the translator.
 *
 * The choice is remembered in the visitor's own browser and nowhere else. It is not
 * sent anywhere, it is not a preference the league can see, and it is not part of the
 * visit counters: what somebody reads the site in is their business.
 *
 * `<html lang>` is updated along with it, which is not decoration. It is what tells a
 * screen reader which voice to use, and reading Spanish text with an English voice is
 * close to unintelligible.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    resolveLanguage(readStored()),
  )

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const choose = useCallback((next: Language) => {
    setLanguage(next)
    store(next)
  }, [])

  const value = useMemo<LanguageContextValue>(
    () => ({ language, t: translator(language), choose }),
    [language, choose],
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}
