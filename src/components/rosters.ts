/**
 * A team's roster, joined and ordered the way a card prints it.
 *
 * Not in `src/utils` because there is no league rule here: nothing is added up
 * and nothing is ranked. What this module does is join the two lists the seed
 * keeps apart, put them in the sheet's own order, and name the two gaps the
 * sheet leaves. It is a module with tests rather than a loop inside a component
 * because those two gaps are exactly what a plain loop would quietly tidy away.
 *
 * A player belongs to a roster per season **and per competition**. The women's
 * teams draw their players from several Beer League teams and are named after
 * them, so a roster is selected by team and competition together; selecting by
 * team alone would drop a Beer League roster into a women's team that happens to
 * share its name.
 */

import type { Seed } from '../data/seed'
import type { TeamSeed } from '../data/teams-2026'
import { canonicalSlug } from '../data/teams-2026'

export interface RosterLine {
  playerSlug: string
  /**
   * The roster sheet's own spelling. Falls back to the slug when no player
   * answers for it, because a roster row pointing at nobody is a gap between two
   * sources and showing the slug keeps it visible.
   */
  name: string
  /**
   * Null where the sheet prints no number, which it does: Coria Omar of Blanco
   * has none. Nothing is filled in.
   */
  jerseyNumber: number | null
  /**
   * True when somebody else on the same roster wears this number. Number 28 is
   * worn twice in Hantachoppers and the league has not resolved it (open
   * question 7), so both lines are published and both are flagged.
   */
  numberShared: boolean
}

export interface TeamRoster {
  /** Ordered by jersey number, the numberless last, ties in the sheet's order. */
  lines: readonly RosterLine[]
  /** Every number worn by more than one player, ascending. Usually empty. */
  sharedNumbers: readonly number[]
}

/** What a roster needs from a season, so a test can pass two short lists. */
type RosterSource = Pick<Seed, 'players' | 'rosters'>

/**
 * Ascending by number, with the numberless last.
 *
 * A missing number sorts last rather than as a zero: the player is on the
 * roster, the sheet simply does not say what they wear.
 */
function byJerseyNumber(left: RosterLine, right: RosterLine): number {
  if (left.jerseyNumber === null) return right.jerseyNumber === null ? 0 : 1
  if (right.jerseyNumber === null) return -1

  return left.jerseyNumber - right.jerseyNumber
}

export function teamRoster(
  season: RosterSource,
  team: Pick<TeamSeed, 'slug' | 'competition'>,
): TeamRoster {
  // Both spellings of a renamed team resolve: the database was renamed to
  // sponsor slugs on 2026-08-07 while the seed's rosters kept the identity, and
  // without this bridge the four women's rosters vanished from their cards.
  const slug = canonicalSlug(team.slug)
  const entries = season.rosters.filter(
    (entry) =>
      canonicalSlug(entry.teamSlug) === slug &&
      entry.competition === team.competition,
  )

  const timesWorn = new Map<number, number>()
  for (const entry of entries) {
    if (entry.jerseyNumber === null) continue
    timesWorn.set(
      entry.jerseyNumber,
      (timesWorn.get(entry.jerseyNumber) ?? 0) + 1,
    )
  }

  const names = new Map(
    season.players.map((player) => [player.slug, player.name]),
  )

  const lines = entries
    .map((entry) => ({
      playerSlug: entry.playerSlug,
      name: names.get(entry.playerSlug) ?? entry.playerSlug,
      jerseyNumber: entry.jerseyNumber,
      numberShared:
        entry.jerseyNumber !== null &&
        (timesWorn.get(entry.jerseyNumber) ?? 0) > 1,
    }))
    // `sort` is stable, so two players wearing the same number stay in the order
    // the sheet lists them in.
    .sort(byJerseyNumber)

  const sharedNumbers = [...timesWorn]
    .filter(([, times]) => times > 1)
    .map(([number]) => number)
    .sort((left, right) => left - right)

  return { lines, sharedNumbers }
}
