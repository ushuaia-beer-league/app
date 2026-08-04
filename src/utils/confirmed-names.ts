/**
 * The spellings the league confirmed, on 4 August 2026.
 *
 * The sheets write nine people two ways each. Until the organisation answered,
 * every one of those pairs stayed unresolved on purpose: `findByTruncatedName`
 * refuses a surname that is spelled differently, because guessing which of
 * "Velazquez Luciano" and "Velasquez Lucia" is the real person would put
 * somebody else's goals on their line. This file is that answer, written down.
 *
 * It is the only place in the import allowed to overrule a source, and it may do
 * it because a person told us which spelling is theirs. Everything else the
 * sheets get wrong is still carried as a finding rather than corrected.
 *
 * Whole names, never tokens. A rule that turned every "Anita" into "Ana" would
 * rename the next Anita the league signs, who is a different person; a rule that
 * names "Carbone Anita" cannot reach anybody else.
 *
 * Two kinds of entry live here and they read the same way:
 *
 *   - the roster sheet has it wrong, so the person's own name and id change
 *     ("Contignola Flor" becomes "Cotignola Flor");
 *   - a statistics sheet has it wrong, so the published line finally reaches the
 *     person it was always about ("Badaraco Nico" reaches "Badaracco Nico").
 *
 * What this never touches is `printed_player_name`. The published rows keep the
 * name as printed, because that column exists to say what the sheet said, and a
 * corrected copy of it would destroy the only evidence that the sheet needed
 * correcting.
 */

import { matchKey } from './source-notation'

/**
 * Keyed by `matchKey`, so case, accents and punctuation do not have to be
 * guessed at the call site: `matchKey('Muñoz')` is `munoz`.
 *
 * The right-hand side is the name as the league spells it, and it is what gets
 * displayed and what the person's id is derived from.
 */
export const CONFIRMED_SPELLINGS: Readonly<Record<string, string>> = {
  // The surname was the blocker. The statistics sheets cut a given name to five
  // characters, which is why the printed line reads "lucia" for Luciano, and the
  // truncation matcher joins them once the surname agrees.
  'velasquez lucia': 'Velazquez Luciano',
  // The roster sheet adds an n the statistics sheets do not.
  'contignola flor': 'Cotignola Flor',
  // The roster sheet ends it with a z, the league with an s.
  'tabarez ian': 'Tabares Ian',
  // One c on the goalie sheet, two on the roster.
  'badaraco nico': 'Badaracco Nico',
  // The same goalkeeper on two women's sheets, spelled two ways. Neither line
  // reaches a roster, because the women's rosters are not published, so this
  // keeps her from appearing as two goalkeepers.
  'cavaliere milag': 'Cavalleri Milag',
  // A given name, not a surname: the roster writes it with an h.
  'nardi christina': 'Nardi Cristina',
  'munoz lauti': 'Muñoz Lauta',
  'carbone anita': 'Carbone Ana',
  // The roster's nickname is the one the league uses.
  'sueldo adolf': 'Sueldo Fito',
}

/**
 * The confirmed spelling of this name, or null when the league never spoke about
 * it.
 *
 * Null is the useful half: a view showing a name nobody has confirmed marks it as
 * unconfirmed, and one showing a name the league did confirm must not.
 */
export function confirmedSpelling(printed: string): string | null {
  return CONFIRMED_SPELLINGS[matchKey(printed)] ?? null
}

/**
 * The confirmed spelling of a name, or the name unchanged.
 *
 * Called on the roster sheet, so a person is created under the name that is
 * really theirs, and on every published statistics line before it is matched, so
 * a line the sheets spelled differently reaches them.
 */
export function confirmedName(printed: string): string {
  return confirmedSpelling(printed) ?? printed
}
