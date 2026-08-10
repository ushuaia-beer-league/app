/**
 * The match sheet as a draft, and the writes that draft becomes.
 *
 * Everything here is pure, so the rules that decide whether a sheet may be saved
 * can be read and tested without a database and without a browser. The screen
 * renders this vocabulary; `adminQueries.ts` issues the rows it produces.
 *
 * Two ideas run through the whole file.
 *
 * The first is that the database's CHECK constraints are the real rules, and this
 * module exists so a form cannot offer a state they would reject. Both goal
 * columns or neither (`matches_score_complete`), a draw only when the goals are
 * level (`matches_draw_is_level`), a regulation or shootout result only when they
 * are not (`matches_decided_is_not_level`), a goalkeeper who never conceded more
 * than they faced (`goalie_lines_goals_within_shots`), one franchise appearance
 * per match (`match_players_one_franchise_per_match_idx`), a goal whose scorer is
 * not also its assist (`match_goals_scorer_is_not_assist`). Each of those has a
 * problem below, in Spanish, so the panel explains instead of failing.
 *
 * The second is that a gap is not a problem. A goal whose scorer nobody wrote
 * down, a sheet with no goalkeepers yet, goals that do not add up to the score:
 * all of those save. The league's own data is like that, and refusing the save
 * would lose what the operator does know. `matchGaps` and `goalsExceedScore` name
 * them; nothing here blocks them.
 *
 * No aggregate is ever built for storage. The save percentage below is computed
 * for the operator to look at while typing and is never part of a write, because
 * `goalie_lines` has no column for it.
 */

import { matchFromRow, type MatchRow } from '../data/season-source'
import type { Match, MatchResolution } from '../data/types'
import { savePercentage } from '../utils/goalkeeping'
import type { MatchRecordCounts } from '../utils/match-completeness'

// ---------------------------------------------------------------------------
// What the panel loaded
// ---------------------------------------------------------------------------

/** A person the sheet can name. */
export interface SheetPlayer {
  /** The uuid `match_players`, `match_goals` and `goalie_lines` point at. */
  id: string
  name: string
  /**
   * Retired players stay nameable, because a sheet that already lists one has
   * to keep reading; only active people are offered in a picker.
   */
  active: boolean
}

/** One of the two sides of this match. */
export interface SheetTeam {
  id: string
  slug: string
  shortName: string
}

/** A roster entry of one of the two sides, for the season and competition. */
export interface SheetRosterEntry {
  playerId: string
  teamId: string
  jerseyNumber: number | null
}

/**
 * One appearance, a row of `match_players`.
 *
 * A substitute is not a roster player, so `isSubstitute` can be true for
 * somebody with no roster entry at all.
 */
export interface DraftAppearance {
  playerId: string
  teamId: string
  isSubstitute: boolean
  isFranchise: boolean
}

/**
 * One goal, a row of `match_goals`.
 *
 * `scorerId` and `assistId` are empty strings when nobody was written down, and
 * they are independent: a goal with a scorer and no assist, or with neither, is
 * a goal the sheet actually records.
 */
export interface DraftGoal {
  /**
   * Generated here rather than by the database, so saving the same draft twice
   * upserts the same row instead of inserting a second goal.
   */
  id: string
  teamId: string
  scorerId: string
  assistId: string
}

/**
 * One goalkeeper's line, a row of `goalie_lines`. The two numbers are held as
 * text so a field nobody has filled stays distinguishable from a zero, which is
 * a real value: a keeper can face no shots.
 */
export interface DraftGoalieLine {
  playerId: string
  teamId: string
  shotsFaced: string
  goalsAgainst: string
}

/** Everything the sheet screen needs, as the database handed it over. */
export interface MatchSheetData {
  matchId: string
  /**
   * The match row itself, kept raw so the rule that turns two goal columns and a
   * resolution into a score stays `matchFromRow`'s and is never restated.
   */
  row: MatchRow
  home: SheetTeam | null
  away: SheetTeam | null
  /** Every player the panel may name, not only the two rosters. */
  players: readonly SheetPlayer[]
  /** The season roster of each side. Substitutes are absent by definition. */
  roster: readonly SheetRosterEntry[]
  appearances: readonly DraftAppearance[]
  goals: readonly DraftGoal[]
  goalieLines: readonly DraftGoalieLine[]
}

// ---------------------------------------------------------------------------
// The draft
// ---------------------------------------------------------------------------

/** What the operator has typed, which is not yet what the database holds. */
/** A person invented on the sheet: an id generated here, and their name. */
export interface NewSheetPerson {
  id: string
  fullName: string
}

export interface MatchSheetDraft {
  /** As typed. Empty means unreported, which is not the same as zero. */
  homeGoals: string
  awayGoals: string
  /** Empty means the sheet does not say how it ended, which is a legal row. */
  resolution: MatchResolution | ''
  appearances: readonly DraftAppearance[]
  goals: readonly DraftGoal[]
  goalieLines: readonly DraftGoalieLine[]
  /**
   * Somebody the operator is inventing on this sheet, so a substitute who is
   * on nobody roster can be recorded at all. That is not an edge case: «el
   * Cuiti» is in the league own published statistics as `Suplente (Sucucho)`,
   * and until this existed the panel had no way to name him — the importer
   * creates no player row for a substitute, and the only other door, Equipos y
   * planteles, would also put him on a roster he does not belong to. Name and
   * nothing else: `players` carries no other personal column and this screen
   * offers no field for one.
   */
  newPeople: readonly NewSheetPerson[]
}

export function draftFromSheet(sheet: MatchSheetData): MatchSheetDraft {
  return {
    homeGoals:
      sheet.row.home_goals === null ? '' : String(sheet.row.home_goals),
    awayGoals:
      sheet.row.away_goals === null ? '' : String(sheet.row.away_goals),
    resolution: sheet.row.resolution ?? '',
    appearances: sheet.appearances.map((row) => ({ ...row })),
    goals: sheet.goals.map((row) => ({ ...row })),
    goalieLines: sheet.goalieLines.map((row) => ({ ...row })),
    newPeople: [],
  }
}

/**
 * A number field as typed: the number, null when the field is empty, or
 * `'invalid'` for anything else, which includes a negative sign. Every one of
 * these columns is a non-negative count.
 */
export function readCount(text: string): number | null | 'invalid' {
  const trimmed = text.trim()
  if (trimmed === '') return null
  return /^\d+$/.test(trimmed) ? Number(trimmed) : 'invalid'
}

function countOrNull(text: string): number | null {
  const value = readCount(text)
  return typeof value === 'number' ? value : null
}

/** The three columns of `matches` this screen writes. */
export interface DraftResult {
  home_goals: number | null
  away_goals: number | null
  resolution: MatchResolution | null
}

/**
 * The result as it would be written. Only meaningful once `draftProblems()` is
 * empty: a field that is not a count reads as null here, and the problem list is
 * what stops it from being saved.
 */
export function draftResult(draft: MatchSheetDraft): DraftResult {
  return {
    home_goals: countOrNull(draft.homeGoals),
    away_goals: countOrNull(draft.awayGoals),
    resolution: draft.resolution === '' ? null : draft.resolution,
  }
}

/**
 * The draft as a domain match, so the panel can ask `matchGaps` what is still
 * missing while the operator types. The score rule is `matchFromRow`'s, applied
 * to the row's own values replaced by the draft's.
 */
export function draftMatch(
  sheet: MatchSheetData,
  draft: MatchSheetDraft,
): Match {
  return matchFromRow({ ...sheet.row, ...draftResult(draft) })
}

/** The draft counted the way `matchGaps` counts the database. */
export function draftCounts(draft: MatchSheetDraft): MatchRecordCounts {
  return {
    players: draft.appearances.length,
    goals: draft.goals.length,
    goalieLines: draft.goalieLines.length,
  }
}

/**
 * How this match may be said to have ended, given the goals entered.
 *
 * Empty while the score is incomplete, because a resolution with no goals says
 * nothing. Level goals allow only a draw, which is a real result in this league;
 * different goals allow only regulation or shootout. This is the same pair of
 * CHECK constraints the database carries, offered as a list instead of as a
 * rejection.
 */
export function legalResolutions(draft: MatchSheetDraft): MatchResolution[] {
  const home = readCount(draft.homeGoals)
  const away = readCount(draft.awayGoals)
  if (typeof home !== 'number' || typeof away !== 'number') return []

  return home === away ? ['draw'] : ['regulation', 'shootout']
}

/**
 * The same appearances with one franchise player per side, or none.
 *
 * "En el caso de que soliciten un jugador franquicia, solo puede jugar uno por
 * partido" is a sentence about a team requesting one, and on 2026-08-10 the
 * league said plainly that a match may hold two, one for each side. Ticking a
 * box unticks that side's other one and leaves the opponent's alone, which is
 * exactly what `match_players_one_franchise_per_side_idx` allows.
 */
export function withFranchise(
  draft: MatchSheetDraft,
  playerId: string,
  on: boolean,
): MatchSheetDraft {
  const side = draft.appearances.find((row) => row.playerId === playerId)
  if (side === undefined) return draft

  return {
    ...draft,
    appearances: draft.appearances.map((row) =>
      row.teamId === side.teamId
        ? { ...row, isFranchise: on && row.playerId === playerId }
        : row,
    ),
  }
}

/**
 * The sheet with a substitute nobody has on a roster: a person invented here
 * and an appearance naming them, marked substitute, which is what they are.
 *
 * This is the door «el Cuiti» needed. The league's own published statistics
 * carry him as `Suplente (Sucucho)`, the importer creates no player row for a
 * substitute, and Equipos y planteles — the only other way in — would also put
 * him on a roster he does not belong to.
 */
export function withNewSubstitute(
  draft: MatchSheetDraft,
  teamId: string,
  fullName: string,
): MatchSheetDraft {
  const name = fullName.trim()
  if (name === '') return draft

  const id = crypto.randomUUID()
  return {
    ...draft,
    newPeople: [...draft.newPeople, { id, fullName: name }],
    appearances: [
      ...draft.appearances,
      { playerId: id, teamId, isSubstitute: true, isFranchise: false },
    ],
  }
}

/** A new goal with nobody named yet, which is how the sheet often has it. */
export function newGoal(teamId: string): DraftGoal {
  return { id: crypto.randomUUID(), teamId, scorerId: '', assistId: '' }
}

// ---------------------------------------------------------------------------
// What the database would refuse
// ---------------------------------------------------------------------------

export type DraftProblemKind =
  /** A goal field that is not a whole number, a negative sign included. */
  | 'score-not-a-count'
  /** One goal field filled and the other empty. */
  | 'half-score'
  /** A resolution chosen with no score to resolve. */
  | 'resolution-without-score'
  | 'draw-not-level'
  | 'decided-is-level'
  | 'player-listed-twice'
  | 'two-franchise'
  | 'scorer-is-assist'
  | 'goalie-listed-twice'
  | 'goalie-not-a-count'
  | 'goalie-line-incomplete'
  | 'goalie-goals-exceed-shots'

export interface DraftProblem {
  kind: DraftProblemKind
  /** What the panel says out loud, in Spanish. */
  message: string
}

/**
 * Every reason this draft cannot be saved, in the order the form reads.
 *
 * All of them are states a CHECK constraint, a primary key or a unique index in
 * the database would refuse. None of them is a gap: a goal with no scorer, a
 * missing goalkeeper or a goal count that disagrees with the score are all
 * saveable and none appears here.
 */
export function draftProblems(
  sheet: MatchSheetData,
  draft: MatchSheetDraft,
): DraftProblem[] {
  const problems: DraftProblem[] = []
  const name = (playerId: string) => nameIn(sheet, draft, playerId)
  // A bracket row can carry no teams at all, so both sides are nullable.
  const sideName = (teamId: string) =>
    [sheet.home, sheet.away].find((side) => side?.id === teamId)?.shortName ??
    'un equipo que no es de este partido'

  const home = readCount(draft.homeGoals)
  const away = readCount(draft.awayGoals)

  if (home === 'invalid' || away === 'invalid') {
    problems.push({
      kind: 'score-not-a-count',
      message: 'Los goles se cargan con un número entero y sin signo.',
    })
  } else if ((home === null) !== (away === null)) {
    problems.push({
      kind: 'half-score',
      message:
        'Cargá los dos goles o ninguno de los dos: media planilla de resultado no es un resultado.',
    })
  }

  if (draft.resolution !== '') {
    if (typeof home !== 'number' || typeof away !== 'number') {
      problems.push({
        kind: 'resolution-without-score',
        message:
          'Elegiste cómo terminó el partido pero no hay goles cargados. Cargá los dos goles, o dejá el final sin definir.',
      })
    } else if (draft.resolution === 'draw' && home !== away) {
      problems.push({
        kind: 'draw-not-level',
        message: `Un empate necesita el mismo gol de los dos lados, y el resultado dice ${home} a ${away}.`,
      })
    } else if (draft.resolution !== 'draw' && home === away) {
      problems.push({
        kind: 'decided-is-level',
        message: `Un partido que terminó ${home} a ${away} no tiene ganador, así que solo puede cargarse como empate.`,
      })
    }
  }

  const listed = new Set<string>()
  for (const appearance of draft.appearances) {
    if (listed.has(appearance.playerId)) {
      problems.push({
        kind: 'player-listed-twice',
        message: `${name(appearance.playerId)} está cargado dos veces. Cada persona figura una sola vez por partido, para un solo equipo.`,
      })
    }
    listed.add(appearance.playerId)
  }

  const franchiseBySide = new Map<string, number>()
  for (const row of draft.appearances) {
    if (!row.isFranchise) continue
    franchiseBySide.set(row.teamId, (franchiseBySide.get(row.teamId) ?? 0) + 1)
  }
  for (const [teamId, count] of franchiseBySide) {
    if (count > 1) {
      problems.push({
        kind: 'two-franchise',
        message: `Solo puede jugar un jugador franquicia por equipo, y ${sideName(teamId)} tiene ${count} marcados.`,
      })
    }
  }

  for (const goal of draft.goals) {
    if (goal.scorerId !== '' && goal.scorerId === goal.assistId) {
      problems.push({
        kind: 'scorer-is-assist',
        message: `Un gol no puede tener a ${name(goal.scorerId)} como goleador y como asistencia a la vez.`,
      })
    }
  }

  const keepers = new Set<string>()
  for (const line of draft.goalieLines) {
    if (keepers.has(line.playerId)) {
      problems.push({
        kind: 'goalie-listed-twice',
        message: `${name(line.playerId)} tiene dos líneas de arquero en este partido.`,
      })
    }
    keepers.add(line.playerId)

    const shots = readCount(line.shotsFaced)
    const against = readCount(line.goalsAgainst)

    if (shots === 'invalid' || against === 'invalid') {
      problems.push({
        kind: 'goalie-not-a-count',
        message: `Los tiros y los goles de ${name(line.playerId)} se cargan con un número entero y sin signo.`,
      })
      continue
    }

    if ((shots === null) !== (against === null)) {
      problems.push({
        kind: 'goalie-line-incomplete',
        message: `A ${name(line.playerId)} le falta uno de los dos números. Cargá los tiros recibidos y los goles recibidos, o quitá la línea.`,
      })
      continue
    }

    if (shots === null || against === null) {
      problems.push({
        kind: 'goalie-line-incomplete',
        message: `A ${name(line.playerId)} le faltan los tiros recibidos y los goles recibidos. Cargá los dos números, o quitá la línea.`,
      })
      continue
    }

    if (against > shots) {
      problems.push({
        kind: 'goalie-goals-exceed-shots',
        message: `${name(line.playerId)} no puede recibir ${against} goles de ${shots} tiros: todo gol recibido fue un tiro recibido.`,
      })
    }
  }

  return problems
}

/**
 * `(tiros - goles) / tiros` for one line while it is being typed, or null when
 * the two numbers do not yet make a percentage.
 *
 * The util throws on numbers it cannot divide, which is right for a table and
 * wrong for a field somebody is halfway through, so the guard is here. Nothing
 * this returns is ever written: `goalie_lines` has no percentage column.
 */
export function linePercentage(line: DraftGoalieLine): number | null {
  const shots = readCount(line.shotsFaced)
  const against = readCount(line.goalsAgainst)

  if (typeof shots !== 'number' || typeof against !== 'number') return null
  if (against > shots) return null

  return savePercentage(shots, against)
}

// ---------------------------------------------------------------------------
// Who the pickers may offer
// ---------------------------------------------------------------------------

/**
 * The side's roster, as appearances, added to what the sheet already holds.
 *
 * Loading a sheet used to mean picking fifteen people out of a dropdown one at
 * a time; the operator who does it asked for the opposite, in those words:
 * bring everybody in and take out the ones who did not play. Nobody is
 * duplicated and nothing already recorded is touched, so pressing it twice
 * changes nothing the second time.
 */
export function withWholeRoster(
  sheet: MatchSheetData,
  draft: MatchSheetDraft,
  teamId: string,
): MatchSheetDraft {
  const listed = new Set(draft.appearances.map((row) => row.playerId))
  const added = sheet.roster
    .filter(
      (entry) =>
        entry.teamId === teamId &&
        !listed.has(entry.playerId) &&
        isOffered(sheet, entry.playerId),
    )
    .map((entry) => ({
      playerId: entry.playerId,
      teamId,
      isSubstitute: false,
      isFranchise: false,
    }))

  return added.length === 0
    ? draft
    : { ...draft, appearances: [...draft.appearances, ...added] }
}

/** How many of a side's roster are not on the sheet yet. */
export function rosterMissing(
  sheet: MatchSheetData,
  draft: MatchSheetDraft,
  teamId: string,
): number {
  const listed = new Set(draft.appearances.map((row) => row.playerId))

  return sheet.roster.filter(
    (entry) =>
      entry.teamId === teamId &&
      !listed.has(entry.playerId) &&
      isOffered(sheet, entry.playerId),
  ).length
}

export interface PickOption {
  playerId: string
  name: string
  jerseyNumber: number | null
}

/** A player's name, or a marker rather than a blank where the panel lost them. */
export function nameOf(sheet: MatchSheetData, playerId: string): string {
  return (
    sheet.players.find((player) => player.id === playerId)?.name ??
    'Persona que no está en la base'
  )
}

/**
 * A person's name, the sheet's own inventions first.
 *
 * They come first because a person created on this sheet has no `players` row
 * until the save lands, so `sheet.players` cannot answer for them and the row
 * would read "Persona que no está en la base" about somebody just typed in.
 */
export function nameIn(
  sheet: MatchSheetData,
  draft: MatchSheetDraft,
  playerId: string,
): string {
  const invented = draft.newPeople.find((person) => person.id === playerId)
  return invented?.fullName ?? nameOf(sheet, playerId)
}

function byName(a: PickOption, b: PickOption): number {
  return a.name.localeCompare(b.name, 'es')
}

function optionFor(
  sheet: MatchSheetData,
  playerId: string,
  jerseyNumber: number | null = null,
  draft?: MatchSheetDraft,
): PickOption {
  return {
    playerId,
    name: draft ? nameIn(sheet, draft, playerId) : nameOf(sheet, playerId),
    jerseyNumber,
  }
}

function isOffered(sheet: MatchSheetData, playerId: string): boolean {
  const player = sheet.players.find((entry) => entry.id === playerId)
  return player !== undefined && player.active
}

/**
 * The season roster of one side, minus anybody already on the sheet.
 *
 * Excluding them is what keeps the primary key of `match_players` out of
 * reach: one appearance per person per match, for either side.
 */
export function rosterPicks(
  sheet: MatchSheetData,
  draft: MatchSheetDraft,
  teamId: string,
): PickOption[] {
  const listed = new Set(draft.appearances.map((row) => row.playerId))

  return sheet.roster
    .filter((entry) => entry.teamId === teamId && !listed.has(entry.playerId))
    .map((entry) => optionFor(sheet, entry.playerId, entry.jerseyNumber))
    .sort(byName)
}

/**
 * Everybody else in the league, which is how a substitute gets on the sheet.
 *
 * A substitute is not a roster player, so nothing in `team_players` will ever
 * offer them; without this list the panel could not record an appearance the
 * league's own published statistics already carry.
 */
export function leaguePicks(
  sheet: MatchSheetData,
  draft: MatchSheetDraft,
): PickOption[] {
  const listed = new Set(draft.appearances.map((row) => row.playerId))
  const onARoster = new Set(sheet.roster.map((entry) => entry.playerId))

  return sheet.players
    .filter(
      (player) =>
        player.active && !listed.has(player.id) && !onARoster.has(player.id),
    )
    .map((player) => optionFor(sheet, player.id))
    .sort(byName)
}

/**
 * Who a goal of this side may name: the people listed as having played for it,
 * plus its roster, because a sheet is often entered goals first.
 */
export function scorerPicks(
  sheet: MatchSheetData,
  draft: MatchSheetDraft,
  teamId: string,
): PickOption[] {
  const seen = new Set<string>()
  const options: PickOption[] = []

  for (const appearance of draft.appearances) {
    if (appearance.teamId !== teamId || seen.has(appearance.playerId)) continue
    seen.add(appearance.playerId)
    options.push(optionFor(sheet, appearance.playerId, null, draft))
  }

  for (const entry of sheet.roster) {
    if (entry.teamId !== teamId || seen.has(entry.playerId)) continue
    if (!isOffered(sheet, entry.playerId)) continue
    seen.add(entry.playerId)
    options.push(optionFor(sheet, entry.playerId, entry.jerseyNumber))
  }

  return options.sort(byName)
}

/** The same people, minus the keepers already on the sheet. */
export function goaliePicks(
  sheet: MatchSheetData,
  draft: MatchSheetDraft,
  teamId: string,
): PickOption[] {
  const keepers = new Set(draft.goalieLines.map((line) => line.playerId))

  return scorerPicks(sheet, draft, teamId).filter(
    (option) => !keepers.has(option.playerId),
  )
}

/**
 * The keepers this side can still be given from the rest of the league.
 *
 * A team turns up without its goalkeeper and borrows one, and until now the
 * sheet could not say so: the picker only ever offered the team's own roster
 * and whoever was already listed as having played. A borrowed keeper is a
 * substitute, which is exactly what `leaguePicks` is for, minus anybody who
 * already has a line here.
 */
export function substituteGoaliePicks(
  sheet: MatchSheetData,
  draft: MatchSheetDraft,
): PickOption[] {
  const keepers = new Set(draft.goalieLines.map((line) => line.playerId))

  return leaguePicks(sheet, draft).filter(
    (option) => !keepers.has(option.playerId),
  )
}

// ---------------------------------------------------------------------------
// The writes
// ---------------------------------------------------------------------------

/*
 * The three row shapes exactly as the tables hold them, snake case and all, so
 * a write can be read against the migration without a translation step. They
 * are type aliases rather than interfaces because a caller passes them straight
 * to a query builder that takes an indexable object.
 */

/** A person as `players` holds them: a name, and nothing else personal. */
export type PlayerRow = {
  id: string
  full_name: string
}

export type MatchPlayerRow = {
  match_id: string
  player_id: string
  team_id: string
  is_substitute: boolean
  is_franchise: boolean
}

export type MatchGoalRow = {
  id: string
  match_id: string
  team_id: string
  scorer_id: string | null
  assist_id: string | null
}

export type GoalieLineRow = {
  match_id: string
  player_id: string
  team_id: string
  shots_faced: number
  goals_against: number
}

/** The four groups the panel saves, and the four it reports on. */
export type MatchSheetPart =
  'result' | 'people' | 'players' | 'goals' | 'goalkeepers'

export interface MatchSheetWrites {
  matchId: string
  /** Null when the result has not changed, so an untouched score is not rewritten. */
  result: DraftResult | null
  /**
   * People this sheet is creating, written before the appearances that name
   * them so the foreign key resolves. A substitute nobody has on a roster has
   * no other way into the league's records.
   */
  people: PlayerRow[]
  players: { upsert: MatchPlayerRow[]; removePlayerIds: string[] }
  goals: { upsert: MatchGoalRow[]; removeIds: string[] }
  goalieLines: { upsert: GoalieLineRow[]; removePlayerIds: string[] }
}

export interface MatchSheetSaveReport {
  saved: MatchSheetPart[]
  failed: { part: MatchSheetPart; because: string }[]
}

function sameResult(a: DraftResult, b: DraftResult): boolean {
  return (
    a.home_goals === b.home_goals &&
    a.away_goals === b.away_goals &&
    a.resolution === b.resolution
  )
}

function goalRow(matchId: string, goal: DraftGoal): MatchGoalRow {
  return {
    id: goal.id,
    match_id: matchId,
    team_id: goal.teamId,
    // Independently nullable, both of them: the sheet sometimes records a goal
    // and not who scored it, and inventing a name is worse than the gap.
    scorer_id: goal.scorerId === '' ? null : goal.scorerId,
    assist_id: goal.assistId === '' ? null : goal.assistId,
  }
}

/**
 * What has to be written for the draft to become the truth.
 *
 * Compared against the baseline, which is what the database held the last time
 * this screen and it agreed, so a save issues the changed rows and nothing else.
 * Every upsert is keyed on the table's own key, so saving the same draft twice
 * writes the same rows twice and doubles nothing.
 *
 * Rows a CHECK constraint would refuse are skipped rather than sent: a goalkeeper
 * line missing one of its two numbers has no row to write. `draftProblems()` is
 * what tells the operator, and the screen will not submit while it says anything.
 */
export function matchSheetWrites(
  matchId: string,
  baseline: MatchSheetDraft,
  draft: MatchSheetDraft,
): MatchSheetWrites {
  const before = draftResult(baseline)
  const after = draftResult(draft)

  const playersBefore = new Map(
    baseline.appearances.map((row) => [row.playerId, row]),
  )
  const goalsBefore = new Map(baseline.goals.map((row) => [row.id, row]))
  const keepersBefore = new Map(
    baseline.goalieLines.map((row) => [row.playerId, row]),
  )

  const playerUpserts: MatchPlayerRow[] = []
  for (const appearance of draft.appearances) {
    const was = playersBefore.get(appearance.playerId)
    const unchanged =
      was !== undefined &&
      was.teamId === appearance.teamId &&
      was.isSubstitute === appearance.isSubstitute &&
      was.isFranchise === appearance.isFranchise
    if (unchanged) continue

    playerUpserts.push({
      match_id: matchId,
      player_id: appearance.playerId,
      team_id: appearance.teamId,
      is_substitute: appearance.isSubstitute,
      is_franchise: appearance.isFranchise,
    })
  }

  const goalUpserts: MatchGoalRow[] = []
  for (const goal of draft.goals) {
    const was = goalsBefore.get(goal.id)
    const unchanged =
      was !== undefined &&
      was.teamId === goal.teamId &&
      was.scorerId === goal.scorerId &&
      was.assistId === goal.assistId
    if (unchanged) continue

    goalUpserts.push(goalRow(matchId, goal))
  }

  const goalieUpserts: GoalieLineRow[] = []
  for (const line of draft.goalieLines) {
    const shots = readCount(line.shotsFaced)
    const against = readCount(line.goalsAgainst)
    if (typeof shots !== 'number' || typeof against !== 'number') continue

    const was = keepersBefore.get(line.playerId)
    const unchanged =
      was !== undefined &&
      was.teamId === line.teamId &&
      readCount(was.shotsFaced) === shots &&
      readCount(was.goalsAgainst) === against
    if (unchanged) continue

    goalieUpserts.push({
      match_id: matchId,
      player_id: line.playerId,
      team_id: line.teamId,
      shots_faced: shots,
      goals_against: against,
    })
  }

  const drafted = {
    players: new Set(draft.appearances.map((row) => row.playerId)),
    goals: new Set(draft.goals.map((row) => row.id)),
    keepers: new Set(draft.goalieLines.map((row) => row.playerId)),
  }

  // Only the invented people the sheet still names: somebody typed in and then
  // removed again is not created, and a blank name is not a person.
  const named = new Set(draft.appearances.map((row) => row.playerId))

  return {
    matchId,
    result: sameResult(before, after) ? null : after,
    people: draft.newPeople
      .filter((person) => named.has(person.id) && person.fullName.trim() !== '')
      .map((person) => ({ id: person.id, full_name: person.fullName.trim() })),
    players: {
      upsert: playerUpserts,
      removePlayerIds: [...playersBefore.keys()].filter(
        (playerId) => !drafted.players.has(playerId),
      ),
    },
    goals: {
      upsert: goalUpserts,
      removeIds: [...goalsBefore.keys()].filter((id) => !drafted.goals.has(id)),
    },
    goalieLines: {
      upsert: goalieUpserts,
      removePlayerIds: [...keepersBefore.keys()].filter(
        (playerId) => !drafted.keepers.has(playerId),
      ),
    },
  }
}

/** Which of the four groups this save would touch. */
export function partsOf(writes: MatchSheetWrites): MatchSheetPart[] {
  const parts: MatchSheetPart[] = []

  if (writes.result !== null) parts.push('result')
  if (writes.people.length > 0) parts.push('people')
  if (
    writes.players.upsert.length > 0 ||
    writes.players.removePlayerIds.length > 0
  ) {
    parts.push('players')
  }
  if (writes.goals.upsert.length > 0 || writes.goals.removeIds.length > 0) {
    parts.push('goals')
  }
  if (
    writes.goalieLines.upsert.length > 0 ||
    writes.goalieLines.removePlayerIds.length > 0
  ) {
    parts.push('goalkeepers')
  }

  return parts
}

/**
 * The baseline moved forward over the parts that saved, and left alone over the
 * parts that did not.
 *
 * This is what makes a refusal harmless. What the operator typed stays on
 * screen, the parts the database accepted are no longer pending, and pressing
 * save again retries exactly what failed.
 */
export function withSavedParts(
  baseline: MatchSheetDraft,
  draft: MatchSheetDraft,
  parts: readonly MatchSheetPart[],
): MatchSheetDraft {
  return {
    homeGoals: parts.includes('result') ? draft.homeGoals : baseline.homeGoals,
    awayGoals: parts.includes('result') ? draft.awayGoals : baseline.awayGoals,
    resolution: parts.includes('result')
      ? draft.resolution
      : baseline.resolution,
    appearances: parts.includes('players')
      ? draft.appearances
      : baseline.appearances,
    goals: parts.includes('goals') ? draft.goals : baseline.goals,
    goalieLines: parts.includes('goalkeepers')
      ? draft.goalieLines
      : baseline.goalieLines,
    // The invented people ride with the appearances that name them: the write
    // that creates a person is part of saving who played.
    newPeople: parts.includes('players') ? draft.newPeople : baseline.newPeople,
  }
}
