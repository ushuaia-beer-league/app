/**
 * The two competitions, named as the league names them.
 *
 * "Beer League" and "Women's Beer League" are the organisation's own words, from
 * the competitions row of `docs/sources/ubl-functional-doc.md`. They are proper
 * names and stay in English for the same reason the ten commandments stay in
 * Spanish: they are a quote, not a string to translate.
 *
 * One declaration, because two views print them: the selector above the tables
 * and the Equipos section. Two copies of a proper name is how a site ends up
 * calling the same competition two things on two screens.
 *
 * Not in `src/utils` and not in `src/data`: no league rule is computed here and
 * nothing is stored, it is only how the names are spelled on screen.
 */

import type { CompetitionKey } from '../data/types'

export interface CompetitionLabel {
  key: CompetitionKey
  label: string
  /** The mark the reference site puts before each name in the selector. */
  glyph: string
}

export const COMPETITION_LABELS: readonly CompetitionLabel[] = [
  { key: 'beer', label: 'Beer League', glyph: '🏒' },
  { key: 'wubl', label: "Women's Beer League", glyph: '⚡' },
]

/** The name of one competition, for a sentence rather than a list. */
export function competitionLabel(key: CompetitionKey): string {
  return COMPETITION_LABELS.find((entry) => entry.key === key)?.label ?? key
}

/**
 * What the selector can be set to: one competition, or all of them at once.
 *
 * `all` is not a competition and never becomes one. It is a way of looking, and
 * what it means changes per table, which is the whole reason it needs a name of
 * its own rather than being a third key in `COMPETITION_LABELS`:
 *
 * - the fixture merges, because the league really does play both at once. Two
 *   matches run at the same time in Bahía and Poli, and on a shared Saturday one
 *   of them can be a women's match. Showing one competition hides half of that
 *   night;
 * - every table stays split, one per competition, stacked and labelled. Points,
 *   goals and save percentages belong to the competition they were earned in, and
 *   a single table mixing them would be a number nobody scored.
 */
export type CompetitionChoice = CompetitionKey | 'all'

/** The label for the option that shows everything. */
export const ALL_COMPETITIONS_LABEL = 'Todas'
