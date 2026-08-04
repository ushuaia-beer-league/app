/**
 * The tables the league published, turned into rows a view can render.
 *
 * These are not derived from our match records, because for 2026 there are none
 * to derive from: the sources carry season totals per player and no per-goal
 * record at all. So this module orders and formats a transcription, and the two
 * facts that matter are kept visible in every row: whether the name is the one
 * the roster spells or the truncation the sheet printed, and whether the line is
 * a substitute rather than a roster player.
 */

import type {
  SeedPublishedGoalieLine,
  SeedPublishedPlayerLine,
} from '../data/seed'
import type { CompetitionKey } from '../data/types'
import { confirmedSpelling } from './confirmed-names'
import { savePercentage } from './goalkeeping'
import { isSubstituteLine } from './source-notation'

interface PublishedRowBase {
  /** The best name known: the roster's spelling, or the printed text. */
  name: string
  /**
   * True when `name` is the sheet's own text because the line could not be
   * matched to a player. Those names are often truncated ("Beltrami Ramir"), so
   * a view can mark them as unconfirmed instead of pretending otherwise.
   */
  nameIsPrinted: boolean
  /** The team cell as printed, which is sometimes a substitute marker. */
  team: string | null
  isSubstitute: boolean
}

export interface PublishedScoringRow extends PublishedRowBase {
  assists: number
  goals: number
  points: number
}

export interface PublishedGoalkeepingRow extends PublishedRowBase {
  gamesPlayed: number
  shotsFaced: number
  goalsAgainst: number
  /** `(shots - goals) / shots`, or null when nothing was faced. */
  savePercentage: number | null
}

function base(line: {
  resolvedName: string | null
  printedPlayerName: string
  printedTeam: string | null
}): PublishedRowBase {
  // A line that reaches nobody can still have a name the league confirmed, and
  // one woman needs it: the women's rosters are not published, so her scoring
  // line and her goalkeeping line match no player and the two sheets spell her
  // surname differently. Showing the confirmed spelling puts one person in both
  // tables, and it is not marked as unconfirmed, because somebody confirmed it.
  const confirmed = confirmedSpelling(line.printedPlayerName)

  return {
    name: line.resolvedName ?? confirmed ?? line.printedPlayerName,
    nameIsPrinted: line.resolvedName === null && confirmed === null,
    team: line.printedTeam,
    isSubstitute:
      line.printedTeam !== null && isSubstituteLine(line.printedTeam),
  }
}

const byName = (a: PublishedRowBase, b: PublishedRowBase) =>
  a.name.localeCompare(b.name, 'es')

/**
 * The scoring table for one competition.
 *
 * Ordered by points, then by goals, which is the league's own order: eleven
 * assists do not outrank eleven goals. Players still level are ordered by name,
 * which is not a league rule and only keeps the table stable.
 */
export function publishedScoringTable(
  lines: readonly SeedPublishedPlayerLine[],
  { competition }: { competition: CompetitionKey },
): PublishedScoringRow[] {
  return lines
    .filter((line) => line.competition === competition)
    .map((line) => ({
      ...base(line),
      assists: line.assists,
      goals: line.goals,
      points: line.points,
    }))
    .sort((a, b) => b.points - a.points || b.goals - a.goals || byName(a, b))
}

/**
 * The goalkeeping table for one competition, with the percentage computed here
 * every time rather than read from the sheet.
 *
 * Ordered by percentage, then by shots faced, so one clean game does not outrank
 * a season. A keeper who faced nothing has no percentage and comes last.
 */
export function publishedGoalkeepingTable(
  lines: readonly SeedPublishedGoalieLine[],
  { competition }: { competition: CompetitionKey },
): PublishedGoalkeepingRow[] {
  return lines
    .filter((line) => line.competition === competition)
    .map((line) => ({
      ...base(line),
      gamesPlayed: line.gamesPlayed,
      shotsFaced: line.shotsFaced,
      goalsAgainst: line.goalsAgainst,
      savePercentage: savePercentage(line.shotsFaced, line.goalsAgainst),
    }))
    .sort(
      (a, b) =>
        (b.savePercentage ?? -1) - (a.savePercentage ?? -1) ||
        b.shotsFaced - a.shotsFaced ||
        byName(a, b),
    )
}

/**
 * A save percentage as the league prints it: a whole number and a per cent sign.
 * A keeper with no shots faced gets a dash, never a zero and never a hundred.
 */
export function formatSavePercentage(ratio: number | null): string {
  return ratio === null ? '—' : `${Math.round(ratio * 100)}%`
}
