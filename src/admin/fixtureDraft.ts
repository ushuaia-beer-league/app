/**
 * The fixture as a draft, and the writes that draft becomes.
 *
 * Pure, like the other draft modules, so the rules can be read and tested without
 * a database. `FixtureScreen` renders this vocabulary and `adminQueries.ts` issues
 * the rows.
 *
 * Four of this table's decisions shape everything below, and getting any of them
 * wrong silently corrupts a season.
 *
 * **Two matches run at the same time, one in each cabecera.** The slot key is
 * `(season_id, match_date, start_time, venue)`, which is `matches_slot_unique`. A
 * form that assumed one match per hour would refuse half of every round in the
 * fixture, so a second match at the same hour is not a conflict here unless it is
 * in the same cabecera, and when it is, the panel says which one is already there.
 *
 * **The venue is optional.** The 2026 semifinals, the finals and the five all-star
 * slots carry a date and a time and no cabecera. Postgres treats nulls as distinct
 * in a unique constraint, so two rows with no venue at the same time do not
 * collide, and that is exactly right: they are two matches whose rinks nobody has
 * assigned yet.
 *
 * **Both teams are optional.** Round 1 of 2026 holds a row with a time, a cabecera
 * and no teams at all. Under the default MATCH SIMPLE semantics a null team id
 * makes the composite foreign key pass unchecked, which is what lets that gap be
 * stored instead of invented. Storing it is the point.
 *
 * **A match's teams must belong to its competition**, which the composite foreign
 * keys `matches_home_team_fkey` and `matches_away_team_fkey` enforce. So the
 * pickers only ever offer that competition's teams, and changing the competition
 * clears them rather than carrying an illegal pair into a write.
 *
 * The score is absent from this module on purpose. `home_goals`, `away_goals` and
 * `resolution` belong to the match sheet, and two forms writing one number is how
 * they end up disagreeing. So is `notes`: the importer writes them in English for
 * the gaps the sources leave, and a Spanish-speaking panel offered a free-text box
 * would quietly turn that column into a second language. Both are shown here and
 * neither is written.
 */

import type {
  CompetitionKey,
  MatchResolution,
  MatchStage,
  Venue,
} from '../data/types'
import { STAGE_NAMES } from './adminLabels'

/**
 * The eight stages, in bracket order. Only the first feeds the standings: the
 * play-in of 4 July 2026 decides a playoff berth and the league does not count it
 * as a seventh regular game.
 */
export const MATCH_STAGES: readonly MatchStage[] = [
  'regular',
  'playin',
  'quarterfinal',
  'semifinal',
  'final',
  'third-place',
  'fifth-place',
  'all-star',
]

/** The one stage `standingsFor` reads. */
export const STANDINGS_STAGE: MatchStage = 'regular'

/** The two cabeceras. Two matches run at once, one in each. */
export const VENUES: readonly Venue[] = ['bahia', 'poli']

// ---------------------------------------------------------------------------
// What the panel loaded
// ---------------------------------------------------------------------------

/** A team a match may name, as the pickers need it. */
export interface FixtureTeam {
  id: string
  competition: CompetitionKey
  shortName: string
  active: boolean
}

/**
 * One row of `matches`, as this screen reads it. The score is here to be shown
 * and linked to, never to be edited: that is the match sheet's job.
 */
export interface FixtureMatch {
  id: string
  competition: CompetitionKey
  stage: MatchStage
  /** `YYYY-MM-DD`. */
  date: string
  /** `HH:MM`. */
  time: string
  /** Null while the cabecera is unassigned, which is a legal and common row. */
  venue: Venue | null
  homeTeamId: string | null
  awayTeamId: string | null
  homeGoals: number | null
  awayGoals: number | null
  resolution: MatchResolution | null
  /** What the sheet said where a fact is missing. Written by the importer. */
  notes: string | null
}

/** Everything the fixture screen reads, for one season. */
export interface FixturePage {
  seasonId: string
  year: number
  teams: readonly FixtureTeam[]
  matches: readonly FixtureMatch[]
}

// ---------------------------------------------------------------------------
// The draft
// ---------------------------------------------------------------------------

/** What the operator has typed. Every optional column is an empty string here. */
export interface FixtureDraft {
  competition: CompetitionKey
  stage: MatchStage
  /** `YYYY-MM-DD`, as an `<input type="date">` gives it. */
  date: string
  /** `HH:MM`, as an `<input type="time">` gives it. */
  time: string
  /** Empty means the cabecera is not assigned yet, which is legal. */
  venue: Venue | ''
  /** Empty means no team yet, which is legal for either side. */
  homeTeamId: string
  awayTeamId: string
}

export function emptyFixtureDraft(competition: CompetitionKey): FixtureDraft {
  return {
    competition,
    stage: STANDINGS_STAGE,
    date: '',
    time: '',
    venue: '',
    homeTeamId: '',
    awayTeamId: '',
  }
}

export function draftFromMatch(match: FixtureMatch): FixtureDraft {
  return {
    competition: match.competition,
    stage: match.stage,
    date: match.date,
    time: match.time,
    venue: match.venue ?? '',
    homeTeamId: match.homeTeamId ?? '',
    awayTeamId: match.awayTeamId ?? '',
  }
}

/**
 * The draft in another competition, with both teams cleared.
 *
 * The composite foreign keys tie a match's teams to its own competition, so a
 * team picked before the competition moved would be refused on write. Clearing
 * them is the honest answer: the panel does not know which team of the new
 * competition was meant.
 */
export function withCompetition(
  draft: FixtureDraft,
  competition: CompetitionKey,
): FixtureDraft {
  if (competition === draft.competition) return draft
  return { ...draft, competition, homeTeamId: '', awayTeamId: '' }
}

/** Whether this match already carries a score, so the screen can link to it. */
export function hasScore(match: FixtureMatch): boolean {
  return match.homeGoals !== null && match.awayGoals !== null
}

// ---------------------------------------------------------------------------
// What the database would refuse
// ---------------------------------------------------------------------------

export type FixtureProblemKind =
  | 'date-missing'
  | 'time-missing'
  | 'time-shape'
  | 'same-team'
  | 'team-outside-competition'
  /** Another match already holds this date, time and cabecera. */
  | 'slot-taken'

export interface FixtureProblem {
  kind: FixtureProblemKind
  /** What the panel says out loud, in Spanish. */
  message: string
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** The match already in this slot, or null when the slot is free. */
export function slotHolder(
  draft: FixtureDraft,
  matches: readonly FixtureMatch[],
  editingId: string | null,
): FixtureMatch | null {
  // Two rows with no cabecera at the same time never collide: Postgres treats
  // nulls as distinct, and the two 21:30 semifinals of 2026 are genuinely two
  // matches whose rinks nobody has assigned.
  if (draft.venue === '') return null

  return (
    matches.find(
      (match) =>
        match.id !== editingId &&
        match.date === draft.date &&
        match.time === draft.time &&
        match.venue === draft.venue,
    ) ?? null
  )
}

/** The other match at the same hour, in the other cabecera. Normal, not a clash. */
export function slotNeighbours(
  draft: FixtureDraft,
  matches: readonly FixtureMatch[],
  editingId: string | null,
): FixtureMatch[] {
  if (draft.date === '' || draft.time === '') return []

  return matches.filter(
    (match) =>
      match.id !== editingId &&
      match.date === draft.date &&
      match.time === draft.time &&
      match.venue !== draft.venue,
  )
}

/**
 * Every reason this match cannot be saved.
 *
 * Three things that look like reasons are deliberately absent, because all three
 * are legal rows the league's own fixture contains: no cabecera, no teams, and
 * only one of the two teams. `fixtureNotes()` says them out loud instead.
 */
export function fixtureProblems(
  draft: FixtureDraft,
  page: Pick<FixturePage, 'teams' | 'matches'>,
  editingId: string | null,
  teamName: (teamId: string) => string,
): FixtureProblem[] {
  const problems: FixtureProblem[] = []

  if (draft.date === '') {
    problems.push({
      kind: 'date-missing',
      message: 'Elegí la fecha del partido: la base la pide siempre.',
    })
  }

  if (draft.time === '') {
    problems.push({
      kind: 'time-missing',
      message: 'Elegí la hora del partido: la base la pide siempre.',
    })
  } else if (!TIME.test(draft.time)) {
    problems.push({
      kind: 'time-shape',
      message: 'La hora se carga como HH:MM, de 00:00 a 23:59.',
    })
  }

  if (draft.homeTeamId !== '' && draft.homeTeamId === draft.awayTeamId) {
    problems.push({
      kind: 'same-team',
      message: 'Un equipo no puede jugar contra sí mismo.',
    })
  }

  for (const teamId of [draft.homeTeamId, draft.awayTeamId]) {
    if (teamId === '') continue
    const team = page.teams.find((each) => each.id === teamId)
    if (team !== undefined && team.competition === draft.competition) continue

    problems.push({
      kind: 'team-outside-competition',
      message:
        'Uno de los equipos elegidos no es de esta competencia. Un partido solo puede nombrar equipos de su propia competencia, y la base lo verifica.',
    })
    break
  }

  const holder = slotHolder(draft, page.matches, editingId)
  if (holder !== null) {
    const who =
      holder.homeTeamId === null || holder.awayTeamId === null
        ? 'una fila sin equipos'
        : `${teamName(holder.homeTeamId)} vs ${teamName(holder.awayTeamId)}`

    problems.push({
      kind: 'slot-taken',
      message: `Ya hay un partido a esa hora en esa cabecera: ${who}. Cambiá la hora, o poné este partido en la otra cabecera.`,
    })
  }

  return problems
}

export type FixtureNoteKind =
  | 'venue-unassigned'
  | 'no-teams'
  | 'one-team'
  | 'stage-not-regular'
  | 'slot-shared'

export interface FixtureNote {
  kind: FixtureNoteKind
  message: string
}

/**
 * What is worth saying about this match without refusing it. All five are facts
 * of this league rather than mistakes.
 */
export function fixtureNotes(
  draft: FixtureDraft,
  page: Pick<FixturePage, 'teams' | 'matches'>,
  editingId: string | null,
): FixtureNote[] {
  const notes: FixtureNote[] = []

  if (draft.venue === '') {
    notes.push({
      kind: 'venue-unassigned',
      message:
        'Sin cabecera: se guarda igual. Las semifinales, las finales y el juego de estrellas de 2026 están así, y dos partidos sin cabecera a la misma hora no se pisan.',
    })
  }

  if (draft.homeTeamId === '' && draft.awayTeamId === '') {
    notes.push({
      kind: 'no-teams',
      message:
        'Sin equipos: se guarda igual. La primera fecha de 2026 tiene un horario con cabecera y sin equipos, y guardar ese hueco es justamente el punto.',
    })
  } else if (draft.homeTeamId === '' || draft.awayTeamId === '') {
    notes.push({
      kind: 'one-team',
      message:
        'Falta uno de los dos equipos: se guarda igual, y queda a la vista que falta.',
    })
  }

  if (draft.stage !== STANDINGS_STAGE) {
    notes.push({
      kind: 'stage-not-regular',
      message: `${STAGE_NAMES[draft.stage]} no cuenta para la tabla de posiciones: solo ${STAGE_NAMES[STANDINGS_STAGE].toLowerCase()} suma puntos.`,
    })
  }

  const neighbours = slotNeighbours(draft, page.matches, editingId)
  if (neighbours.length > 0) {
    notes.push({
      kind: 'slot-shared',
      message: `A esa misma hora ya hay ${neighbours.length === 1 ? 'otro partido' : `otros ${neighbours.length} partidos`} en la otra cabecera. Es lo normal: se juegan dos partidos a la vez, uno en Bahía y otro en Poli.`,
    })
  }

  return notes
}

// ---------------------------------------------------------------------------
// The writes
// ---------------------------------------------------------------------------

/**
 * The columns of `matches` this screen writes, snake case and all.
 *
 * No `home_goals`, no `away_goals`, no `resolution`, no `status` and no `notes`.
 * The score is the match sheet's, and there is deliberately no second way to
 * write it.
 */
export type MatchEdit = {
  competition_key: CompetitionKey
  stage: MatchStage
  match_date: string
  start_time: string
  venue: Venue | null
  home_team_id: string | null
  away_team_id: string | null
}

/** The same columns plus the season, which only a new row gets to choose. */
export type MatchRow = MatchEdit & { season_id: string }

export type MatchSavePlan =
  { matchId: null; row: MatchRow } | { matchId: string; row: MatchEdit }

export function matchEdit(draft: FixtureDraft): MatchEdit {
  return {
    competition_key: draft.competition,
    stage: draft.stage,
    match_date: draft.date,
    start_time: draft.time,
    // Null rather than an empty string: an unassigned cabecera is an absent
    // value, and `matches_venue_allowed` refuses anything that is not bahia,
    // poli or null.
    venue: draft.venue === '' ? null : draft.venue,
    home_team_id: draft.homeTeamId === '' ? null : draft.homeTeamId,
    away_team_id: draft.awayTeamId === '' ? null : draft.awayTeamId,
  }
}

/** Whether this draft still says what the row says. */
export function sameMatch(match: FixtureMatch, draft: FixtureDraft): boolean {
  const edit = matchEdit(draft)

  return (
    edit.competition_key === match.competition &&
    edit.stage === match.stage &&
    edit.match_date === match.date &&
    edit.start_time === match.time &&
    edit.venue === match.venue &&
    edit.home_team_id === match.homeTeamId &&
    edit.away_team_id === match.awayTeamId
  )
}

/**
 * The plan this draft describes, or null when there is nothing to write.
 *
 * Null on an edit that changed nothing, so pressing save twice issues one
 * request, and null when the date or the time is missing, because both columns
 * are NOT NULL and a placeholder that reaches an INSERT is worse than a caller
 * forced to check. `fixtureProblems()` is what tells the operator.
 */
export function matchSavePlan(
  draft: FixtureDraft,
  page: Pick<FixturePage, 'seasonId' | 'matches'>,
  editingId: string | null,
): MatchSavePlan | null {
  if (draft.date === '' || draft.time === '') return null

  if (editingId === null) {
    return {
      matchId: null,
      row: { ...matchEdit(draft), season_id: page.seasonId },
    }
  }

  const match = page.matches.find((each) => each.id === editingId)
  if (match !== undefined && sameMatch(match, draft)) return null

  return { matchId: editingId, row: matchEdit(draft) }
}

// ---------------------------------------------------------------------------
// How the list reads
// ---------------------------------------------------------------------------

/** One calendar day of the fixture, with every match that runs on it. */
export interface FixtureDay {
  date: string
  matches: FixtureMatch[]
}

/**
 * The fixture grouped by day and ordered by time inside each one, with the two
 * cabeceras of an hour next to each other so the fact that two matches run at
 * once is visible rather than inferred.
 */
export function fixtureDays(matches: readonly FixtureMatch[]): FixtureDay[] {
  const days = new Map<string, FixtureMatch[]>()

  for (const match of matches) {
    days.set(match.date, [...(days.get(match.date) ?? []), match])
  }

  return [...days.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rows]) => ({
      date,
      matches: rows.sort(
        (a, b) =>
          a.time.localeCompare(b.time) ||
          // Nulls last, so an unassigned cabecera reads as the exception.
          (a.venue ?? 'zz').localeCompare(b.venue ?? 'zz'),
      ),
    }))
}

/**
 * The teams a picker may offer: the competition's own, active, plus any team the
 * match already names even if it has since been retired, because a fixture row
 * has to keep reading after a team is retired.
 */
export function teamPicks(
  page: Pick<FixturePage, 'teams'>,
  draft: FixtureDraft,
): FixtureTeam[] {
  return [...page.teams]
    .filter(
      (team) =>
        team.competition === draft.competition &&
        (team.active ||
          team.id === draft.homeTeamId ||
          team.id === draft.awayTeamId),
    )
    .sort((a, b) => a.shortName.localeCompare(b.shortName, 'es'))
}
