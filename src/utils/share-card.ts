/**
 * What a shared image says, decided before anything is drawn.
 *
 * The league shares its tables as screenshots into WhatsApp and Instagram,
 * where a link preview is respectively cached and nonexistent, so the site
 * offers a drawn card instead: fresh at the moment of tapping because it is
 * built from the data already on screen. This module is the deciding half —
 * which rows, cut where, marked how — and it is pure so the cut and the marks
 * can be tested without a canvas. The drawing half lives beside the
 * components and takes a `ShareCard` without adding to it.
 *
 * Wording comes in from the caller, already translated: this module composes
 * cards in whatever language the visitor is reading, and keeping it free of
 * literals is what keeps it out of the catalogue's way.
 */

import type {
  PublishedGoalkeepingRow,
  PublishedScoringRow,
} from './published-statistics'
import { formatSavePercentage } from './published-statistics'

/** One row of a drawn card. */
export interface ShareLine {
  /** A small image at the line's start: a team's crest, when there is one. */
  crest?: string | null
  /** The main text, left-aligned. */
  left: string
  /** A quieter second line under the main text. */
  sub?: string
  /** Right-aligned figures. */
  right?: string
}

/** Everything the painter needs, and nothing it may decide. */
export interface ShareCard {
  title: string
  subtitle: string
  /** A crest drawn beside the title, for cards about one team. */
  crest?: string | null
  lines: readonly ShareLine[]
  /** Small print explaining the marks, only when a line carries one. */
  notes: readonly string[]
  /** The last line, which always names the site. */
  footer: string
}

/** The translated strings the builders compose with. */
export interface ShareWording {
  /** "y {n} más en ubl.com.ar" — the `{n}` hole arrives unfilled, because only
   * the builder knows how many rows the cut left out. */
  andMore: string
  /** The site's address alone, for a card that cut nothing. */
  site: string
  /** What the `*` mark means, the site's own legend wording. */
  printedNote: string
  /** What the substitute mark means. */
  substituteNote: string
  /** The substitute mark itself, e.g. "Sup". */
  substituteMark: string
  /** A row whose team cell the sheet left empty. */
  noTeam: string
}

function fillCount(text: string, n: number): string {
  return text.replaceAll('{n}', String(n))
}

/**
 * The footer: the site's address, saying how much was cut when something was.
 * A card that shows ten of twelve rows and does not say so passes itself off
 * as complete, which is the kind of quiet lie this repository does not print.
 */
function footerFor(
  total: number,
  shown: number,
  wording: ShareWording,
): string {
  return total > shown
    ? fillCount(wording.andMore, total - shown)
    : wording.site
}

/** The site's two marks, spelled out only when a shown line carries one. */
function notesFor(
  rows: readonly { nameIsPrinted: boolean; isSubstitute: boolean }[],
  wording: ShareWording,
): string[] {
  const notes: string[] = []
  if (rows.some((row) => row.nameIsPrinted)) notes.push(wording.printedNote)
  if (rows.some((row) => row.isSubstitute)) notes.push(wording.substituteNote)
  return notes
}

/** A published name, wearing the same `*` the tables wear. */
function markedName(row: { name: string; nameIsPrinted: boolean }): string {
  return row.nameIsPrinted ? `${row.name}*` : row.name
}

function teamCell(
  row: { team: string | null; isSubstitute: boolean },
  wording: ShareWording,
): string {
  const team = row.team ?? wording.noTeam
  return row.isSubstitute ? `${team} · ${wording.substituteMark}` : team
}

export interface TableCardOptions {
  title: string
  subtitle: string
  /** How many rows the image shows. Ten reads well at phone size. */
  limit?: number
  wording: ShareWording
}

/** The scoring leaders, cut to what a phone-sized image can say. */
export function scoringShareCard(
  rows: readonly PublishedScoringRow[],
  { title, subtitle, limit = 10, wording }: TableCardOptions,
): ShareCard {
  const shown = rows.slice(0, limit)
  return {
    title,
    subtitle,
    lines: shown.map((row, index) => ({
      left: `${index + 1}. ${markedName(row)}`,
      sub: teamCell(row, wording),
      right: `${row.points} · ${row.goals}G ${row.assists}A`,
    })),
    notes: notesFor(shown, wording),
    footer: footerFor(rows.length, shown.length, wording),
  }
}

/** The goalkeepers, save percentage first because it is the column that ranks. */
export function goalkeepingShareCard(
  rows: readonly PublishedGoalkeepingRow[],
  { title, subtitle, limit = 10, wording }: TableCardOptions,
): ShareCard {
  const shown = rows.slice(0, limit)
  return {
    title,
    subtitle,
    lines: shown.map((row, index) => ({
      left: `${index + 1}. ${markedName(row)}`,
      sub: teamCell(row, wording),
      right: `${formatSavePercentage(row.savePercentage)} · ${row.shotsFaced}-${row.goalsAgainst}`,
    })),
    notes: notesFor(shown, wording),
    footer: footerFor(rows.length, shown.length, wording),
  }
}

export interface TeamCardOptions {
  title: string
  subtitle: string
  crest: string | null
  wording: ShareWording
  /** Rosters run to twenty lines; the image caps them and says so. */
  limit?: number
}

/**
 * One team: crest by the title, the roster below it, numbers as the sheet
 * prints them — a missing number stays visibly missing rather than becoming
 * a zero.
 */
export function teamShareCard(
  roster: readonly { name: string; jerseyNumber: number | null }[],
  { title, subtitle, crest, limit = 18, wording }: TeamCardOptions,
): ShareCard {
  const shown = roster.slice(0, limit)
  return {
    title,
    subtitle,
    crest,
    lines: shown.map((line) => ({
      left:
        line.jerseyNumber === null
          ? line.name
          : `${line.jerseyNumber}  ${line.name}`,
    })),
    notes: [],
    footer: footerFor(roster.length, shown.length, wording),
  }
}

export interface FixtureCardOptions {
  title: string
  subtitle: string
  wording: ShareWording
  /** Two venues twice a night makes four matches a round; twelve is playoffs room. */
  limit?: number
}

/**
 * One round of the fixture. The caller builds the lines — it already knows
 * names, crests, venues and resolved playoff sides — and this keeps only the
 * cut and the footer honest.
 */
export function fixtureShareCard(
  lines: readonly ShareLine[],
  { title, subtitle, limit = 12, wording }: FixtureCardOptions,
): ShareCard {
  const shown = lines.slice(0, limit)
  return {
    title,
    subtitle,
    lines: shown,
    notes: [],
    footer: footerFor(lines.length, shown.length, wording),
  }
}
