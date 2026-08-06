import { useContext } from 'react'

import { LanguageContext } from './context'

/**
 * The language, the translator, and how to change it.
 *
 * Its own file rather than beside the provider because the lint rule that keeps a
 * module of components from also exporting other things is right: a file that exports
 * a component and a hook cannot be hot-reloaded reliably.
 */
export function useLanguage() {
  return useContext(LanguageContext)
}

/** Just the translator, which is all most components want. */
export function useT() {
  return useContext(LanguageContext).t
}
