/**
 * A season as a draft, and the writes that draft becomes.
 *
 * Pure, like `matchSheetDraft.ts` and for the same reason: the rules here are the
 * database's, and a form must not offer a state they would refuse.
 *
 * `seasons` carries a year, two nullable dates and a status, and three
 * constraints decide what is legal. `seasons_year_range` wants a year between
 * 2023, when the league was founded, and 2100, which is only a typo guard.
 * `seasons_year_unique` allows one row per year. `seasons_dates_ordered` allows
 * either date to be missing, because a season is created before its calendar is
 * fixed, and never allows the end to precede the start.
 *
 * The fourth rule is not a constraint but a partial unique index,
 * `seasons_one_active_idx`, and it is the one that shapes this module.
 * "The current season is selected automatically" only has an answer if at most
 * one season is active, so making a season active means standing the current one
 * down first. Postgres refuses the second active row rather than choosing
 * between them, so `seasonStandingDown()` names the season in the way and the
 * screen says out loud what pressing the button will do to it.
 *
 * Competitions are absent from everything below on purpose. They are a two-row
 * vocabulary whose keys are the same literals as `CompetitionKey`, so adding one
 * is a change to that union, to `competitions_key_allowed` and to a migration,
 * in one commit. That is not a form, and there is no draft for it here.
 */

import type { CompetitionKey } from '../data/types'
import { readCount } from './matchSheetDraft'

/** Where a season sits. `seasons_status_allowed` lists exactly these three. */
export type SeasonStatus = 'upcoming' | 'active' | 'finished'

export const SEASON_STATUSES: readonly SeasonStatus[] = [
  'upcoming',
  'active',
  'finished',
]

export const SEASON_STATUS_NAMES: Record<SeasonStatus, string> = {
  upcoming: 'Por comenzar',
  active: 'En curso',
  finished: 'Finalizada',
}

/** The league was founded in 2023 (knowledge base 1). */
export const FIRST_SEASON_YEAR = 2023
/** Only a typo guard, the same one `seasons_year_range` carries. */
export const LAST_SEASON_YEAR = 2100

/**
 * What a season that is stood down becomes.
 *
 * A season that was the current one and is being replaced by another has run its
 * course, so it is finished rather than sent back to being upcoming. The screen
 * says this before the operator presses anything, because it is a decision and
 * not an obvious consequence.
 */
export const STOOD_DOWN_STATUS: SeasonStatus = 'finished'

/** One row of `seasons`. */
export interface SeasonRecord {
  id: string
  year: number
  /** `YYYY-MM-DD`, or null while the calendar is not fixed. */
  startsOn: string | null
  endsOn: string | null
  status: SeasonStatus
}

/**
 * One row of `competitions`, read only. The panel shows these and offers no way
 * to create one.
 */
export interface CompetitionRecord {
  key: CompetitionKey
  name: string
  description: string | null
  active: boolean
}

/** What the operator has typed. Every field is text, as the form holds it. */
export interface SeasonDraft {
  year: string
  /** Empty means unfixed, which is a legal row rather than a gap to fill in. */
  startsOn: string
  endsOn: string
  status: SeasonStatus
}

/**
 * A new season with nothing filled in. The year is not guessed: the next unused
 * one is arithmetic, not a fact, and the operator knows which year they mean.
 */
export function emptySeasonDraft(): SeasonDraft {
  return { year: '', startsOn: '', endsOn: '', status: 'upcoming' }
}

export function draftFromSeason(season: SeasonRecord): SeasonDraft {
  return {
    year: String(season.year),
    startsOn: season.startsOn ?? '',
    endsOn: season.endsOn ?? '',
    status: season.status,
  }
}

export type SeasonProblemKind =
  | 'year-missing'
  | 'year-not-a-number'
  | 'year-out-of-range'
  | 'year-taken'
  | 'dates-inverted'

export interface SeasonProblem {
  kind: SeasonProblemKind
  /** What the panel says out loud, in Spanish. */
  message: string
}

/**
 * Every reason this draft cannot be saved.
 *
 * All of them are states the database would refuse. Two things that look like
 * problems are not here: a season with no dates at all saves, because both
 * columns are nullable and a season is created before its calendar exists, and a
 * season being made active while another one is saves too, because standing the
 * other one down is a step of the write rather than a reason to refuse it.
 *
 * `editingId` is the season being edited, so its own year and its own active
 * status do not count as being in its way.
 */
export function seasonProblems(
  draft: SeasonDraft,
  seasons: readonly SeasonRecord[],
  editingId: string | null,
): SeasonProblem[] {
  const problems: SeasonProblem[] = []
  const year = readCount(draft.year)

  if (year === null) {
    problems.push({
      kind: 'year-missing',
      message: 'Escribí el año de la temporada.',
    })
  } else if (year === 'invalid') {
    problems.push({
      kind: 'year-not-a-number',
      message: 'El año se carga con un número entero, sin puntos ni signo.',
    })
  } else if (year < FIRST_SEASON_YEAR || year > LAST_SEASON_YEAR) {
    problems.push({
      kind: 'year-out-of-range',
      message: `La liga se fundó en ${FIRST_SEASON_YEAR}, así que el año va entre ${FIRST_SEASON_YEAR} y ${LAST_SEASON_YEAR}.`,
    })
  } else if (
    seasons.some((season) => season.year === year && season.id !== editingId)
  ) {
    problems.push({
      kind: 'year-taken',
      message: `Ya hay una temporada ${year} cargada. Editá esa en lugar de crear otra.`,
    })
  }

  if (
    draft.startsOn !== '' &&
    draft.endsOn !== '' &&
    draft.endsOn < draft.startsOn
  ) {
    problems.push({
      kind: 'dates-inverted',
      message:
        'La temporada no puede cerrar antes de empezar: la fecha de cierre es anterior a la de inicio.',
    })
  }

  return problems
}

/**
 * The season that has to be stood down for this draft to be the active one, or
 * null when nothing is in the way.
 *
 * `seasons_one_active_idx` is a unique index, so without this the write is simply
 * refused. Naming the season is what lets the screen warn instead of failing.
 */
export function seasonStandingDown(
  draft: SeasonDraft,
  seasons: readonly SeasonRecord[],
  editingId: string | null,
): SeasonRecord | null {
  if (draft.status !== 'active') return null

  return (
    seasons.find(
      (season) => season.status === 'active' && season.id !== editingId,
    ) ?? null
  )
}

/** The four columns of `seasons` this screen writes. */
export type SeasonRow = {
  year: number
  starts_on: string | null
  ends_on: string | null
  status: SeasonStatus
}

/**
 * The draft as a row, or null when the year is not a year.
 *
 * Null rather than a zero, because a season with year zero is not a season and a
 * placeholder that reaches an INSERT is worse than a caller forced to check.
 * `seasonProblems()` is what tells the operator; this only refuses to invent.
 */
export function seasonRow(draft: SeasonDraft): SeasonRow | null {
  const year = readCount(draft.year)
  if (typeof year !== 'number') return null

  return {
    year,
    starts_on: draft.startsOn === '' ? null : draft.startsOn,
    ends_on: draft.endsOn === '' ? null : draft.endsOn,
    status: draft.status,
  }
}

/** The two steps a save can take, and be refused at, separately. */
export type SeasonSaveStep = 'stand-down' | 'season'

/**
 * What a save is asked to do. Kept as a value so the screen can describe it
 * before it happens and the query can issue it in the only order the unique
 * index allows: stand the current season down, then write this one.
 */
export interface SeasonSavePlan {
  /** Null when this is a new season. */
  seasonId: string | null
  row: SeasonRow
  /** The active season in the way, which this save will finish first. */
  standDown: { id: string; year: number } | null
}

export interface SeasonSaveReport {
  /** The year of the season this save stood down, when it stood one down. */
  stoodDown: number | null
  /** Whether the season itself was written. */
  saved: boolean
  failed: { step: SeasonSaveStep; because: string }[]
}

/** The plan a screen state describes, or null when the draft has no row. */
export function seasonSavePlan(
  draft: SeasonDraft,
  seasons: readonly SeasonRecord[],
  editingId: string | null,
): SeasonSavePlan | null {
  const row = seasonRow(draft)
  if (row === null) return null

  const standing = seasonStandingDown(draft, seasons, editingId)

  return {
    seasonId: editingId,
    row,
    standDown:
      standing === null ? null : { id: standing.id, year: standing.year },
  }
}

/** The list in the order the screen shows it: the most recent season first. */
export function sortedSeasons(
  seasons: readonly SeasonRecord[],
): SeasonRecord[] {
  return [...seasons].sort((a, b) => b.year - a.year)
}
