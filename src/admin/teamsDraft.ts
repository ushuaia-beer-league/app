/**
 * Teams and their per-season rosters as drafts, and the writes those drafts
 * become.
 *
 * Pure, like `matchSheetDraft.ts` and `seasonsDraft.ts` and for the same reason:
 * the rules are the database's, and a form must not offer a state they would
 * refuse. `TeamsAdminScreen` renders this vocabulary and `adminQueries.ts` issues
 * the rows.
 *
 * Four of the schema's decisions shape everything below.
 *
 * A team belongs to exactly one competition, and `teams_id_competition_unique`
 * exists so the rosters and the fixture can point at the pair `(id,
 * competition_key)` rather than at the id alone. That is what keeps a WUBL roster
 * row from naming a Beer League team, and it is also why **the competition of an
 * existing team is not offered as an edit**: moving it would leave every
 * `team_players` and `matches` row that references the old pair pointing at a pair
 * that no longer exists. `teamEdit()` has no `competition_key` column at all, so
 * the change is not merely hidden, it is unwritable from here.
 *
 * `teams_slug_unique` is global and `teams_short_name_unique` is per competition,
 * so the same short name in the two competitions is legal and the same slug never
 * is. Both are caught here, in Spanish, rather than left to come back as a
 * constraint name.
 *
 * A team is retired by clearing `active`, never deleted: `players` and
 * `team_players` reference `teams` with `on delete restrict`, and a season that
 * already happened has to keep showing who played in it. There is no delete in
 * this module and none on the screen.
 *
 * The roster is per season *and* per competition, and two things the sources force
 * are deliberately allowed by the schema: a jersey number may repeat inside a team
 * (28 appears twice in the Hantachoppers roster) and a roster entry may have no
 * number at all (Coria Omar). Neither is a problem here. They are warnings, and
 * `rosterProblems()` never carries them, because refusing either would mean
 * inventing a number the league did not write.
 *
 * What is refused is a second row for the same person in the same competition and
 * season, which is `team_players_one_team_per_competition_unique`. A woman on a
 * Beer League roster and on a WUBL roster is two legal rows; the same person twice
 * in one competition is not, and the form says so before the key does.
 *
 * `players` holds a name and nothing else personal. There is no national ID, date
 * of birth, phone number, home address or payment column in the table and there is
 * no field for one here: the privacy section of CLAUDE.md rules them out and the
 * registration sheets the league works from are full of them.
 */

import type { CompetitionKey } from '../data/types'
import { competitionLabel } from '../components/competitions'
import { readCount } from './matchSheetDraft'

/** `team_players_jersey_range` allows a number between these two, or none. */
export const JERSEY_MIN = 0
export const JERSEY_MAX = 99

// ---------------------------------------------------------------------------
// What the panel loaded
// ---------------------------------------------------------------------------

/** One row of `teams`. */
export interface TeamRecord {
  id: string
  /** Fixed for the life of the row. See the note at the top of this file. */
  competition: CompetitionKey
  slug: string
  shortName: string
  /** The sponsored name the roster sheet uses. Null while unconfirmed. */
  fullName: string | null
  /** The label the playoff bracket uses: verde, azul, hanta, vitox, suc, t9. */
  nickname: string | null
  /** Free text, because the sources give colours as words rather than as hex. */
  colour: string | null
  logoUrl: string | null
  active: boolean
}

/**
 * A person, as `players` holds them: a name, and whether the league still counts
 * them in. Nothing else is stored and nothing else is offered.
 */
export interface RosterPerson {
  id: string
  fullName: string
  active: boolean
}

/** One row of `team_players`: somebody's membership of one team, one season. */
export interface RosterRecord {
  id: string
  competition: CompetitionKey
  teamId: string
  playerId: string
  /** Null when the sheet gives no number, which happens and is legal. */
  jerseyNumber: number | null
  active: boolean
}

/** Everything the teams screen reads, for one season. */
export interface TeamsPage {
  seasonId: string
  year: number
  teams: readonly TeamRecord[]
  /** Every person the league knows, so a roster can name one without inventing. */
  people: readonly RosterPerson[]
  /** Every roster row of the season, both competitions. */
  roster: readonly RosterRecord[]
}

// ---------------------------------------------------------------------------
// The team form
// ---------------------------------------------------------------------------

/**
 * What the operator has typed. `competition` is here because a new team needs
 * one; an edit carries it unchanged and `teamEdit()` refuses to write it.
 */
export interface TeamDraft {
  competition: CompetitionKey
  slug: string
  shortName: string
  fullName: string
  nickname: string
  colour: string
  logoUrl: string
  active: boolean
}

export function emptyTeamDraft(competition: CompetitionKey): TeamDraft {
  return {
    competition,
    slug: '',
    shortName: '',
    fullName: '',
    nickname: '',
    colour: '',
    logoUrl: '',
    active: true,
  }
}

export function draftFromTeam(team: TeamRecord): TeamDraft {
  return {
    competition: team.competition,
    slug: team.slug,
    shortName: team.shortName,
    fullName: team.fullName ?? '',
    nickname: team.nickname ?? '',
    colour: team.colour ?? '',
    logoUrl: team.logoUrl ?? '',
    active: team.active,
  }
}

/**
 * A slug proposed from a name: lower case, accents dropped, anything else a
 * hyphen. Only ever a suggestion. The operator can correct it, because the slug
 * is what the seed and the sources already use to identify a team and a generated
 * one may not be the one they mean.
 */
export function slugFor(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type TeamProblemKind =
  | 'short-name-missing'
  | 'slug-missing'
  | 'slug-shape'
  | 'slug-taken'
  | 'short-name-taken'

export interface TeamProblem {
  kind: TeamProblemKind
  /** What the panel says out loud, in Spanish. */
  message: string
}

/**
 * Every reason this team cannot be saved. All of them are states the database
 * would refuse, and both unique constraints are among them: the slug is unique
 * across the whole league and the short name is unique inside one competition,
 * so the same short name in the two competitions is not a problem and never
 * appears here.
 *
 * A team with no sponsored name, no nickname, no colour and no logo saves. Every
 * one of those columns is nullable on purpose, and the short-name to sponsored-name
 * mapping is an open question the league has not answered.
 */
export function teamProblems(
  draft: TeamDraft,
  teams: readonly TeamRecord[],
  editingId: string | null,
): TeamProblem[] {
  const problems: TeamProblem[] = []
  const shortName = draft.shortName.trim()
  const slug = draft.slug.trim()

  if (shortName === '') {
    problems.push({
      kind: 'short-name-missing',
      message: 'Escribí el nombre corto, que es el que usa el fixture.',
    })
  }

  if (slug === '') {
    problems.push({
      kind: 'slug-missing',
      message:
        'El identificador no puede quedar vacío. Te proponemos uno a partir del nombre y lo podés corregir.',
    })
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    problems.push({
      kind: 'slug-shape',
      message:
        'El identificador va en minúscula, con letras, números y guiones: sin espacios, sin acentos y sin guiones al principio ni al final.',
    })
  } else {
    const clash = teams.find(
      (team) => team.slug === slug && team.id !== editingId,
    )
    if (clash !== undefined) {
      problems.push({
        kind: 'slug-taken',
        message: `El identificador «${slug}» ya es el de ${clash.shortName}, en ${competitionLabel(clash.competition)}. Es único en toda la liga, así que este equipo necesita otro.`,
      })
    }
  }

  if (shortName !== '') {
    const clash = teams.find(
      (team) =>
        team.competition === draft.competition &&
        team.shortName.trim().toLowerCase() === shortName.toLowerCase() &&
        team.id !== editingId,
    )
    if (clash !== undefined) {
      problems.push({
        kind: 'short-name-taken',
        message: `«${clash.shortName}» ya es el nombre corto de un equipo de ${competitionLabel(draft.competition)}. Dentro de una competencia no puede repetirse; en la otra sí.`,
      })
    }
  }

  return problems
}

/**
 * The columns of `teams` an edit may move.
 *
 * `competition_key` is deliberately absent. The rosters and the fixture reference
 * `(id, competition_key)`, so moving a team between competitions would orphan
 * every row that names it; leaving the column out of this type means the change
 * cannot be written from the panel at all rather than merely not being offered.
 */
export type TeamEdit = {
  slug: string
  short_name: string
  full_name: string | null
  nickname: string | null
  colour: string | null
  logo_url: string | null
  active: boolean
}

/** The same columns plus the one only a new team gets to choose. */
export type TeamRow = TeamEdit & { competition_key: CompetitionKey }

/** Empty means absent, not an empty string: a gap stays a gap in the column. */
function orNull(text: string): string | null {
  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

export function teamEdit(draft: TeamDraft): TeamEdit {
  return {
    slug: draft.slug.trim(),
    short_name: draft.shortName.trim(),
    full_name: orNull(draft.fullName),
    nickname: orNull(draft.nickname),
    colour: orNull(draft.colour),
    logo_url: orNull(draft.logoUrl),
    active: draft.active,
  }
}

export function teamRow(draft: TeamDraft): TeamRow {
  return { ...teamEdit(draft), competition_key: draft.competition }
}

/**
 * A save, as the query will issue it: an INSERT for a new team, an UPDATE for an
 * existing one. Two shapes rather than one upsert, so the update carries no
 * `competition_key` to move.
 */
export type TeamSavePlan =
  { teamId: null; row: TeamRow } | { teamId: string; row: TeamEdit }

/** Whether this draft still says what the row says. */
export function sameTeam(team: TeamRecord, draft: TeamDraft): boolean {
  const edit = teamEdit(draft)

  return (
    edit.slug === team.slug &&
    edit.short_name === team.shortName &&
    edit.full_name === team.fullName &&
    edit.nickname === team.nickname &&
    edit.colour === team.colour &&
    edit.logo_url === team.logoUrl &&
    edit.active === team.active
  )
}

/**
 * The plan this draft describes, or null when there is nothing to write.
 *
 * Null on an edit that changed nothing, so pressing save twice issues one
 * request. `teamProblems()` is what tells the operator why a draft is illegal;
 * this only refuses to write what is already written.
 */
export function teamSavePlan(
  draft: TeamDraft,
  teams: readonly TeamRecord[],
  editingId: string | null,
): TeamSavePlan | null {
  if (editingId === null) return { teamId: null, row: teamRow(draft) }

  const team = teams.find((each) => each.id === editingId)
  if (team !== undefined && sameTeam(team, draft)) return null

  return { teamId: editingId, row: teamEdit(draft) }
}

/** The list in the order the screen shows it: retired teams last, then by name. */
export function sortedTeams(teams: readonly TeamRecord[]): TeamRecord[] {
  return [...teams].sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      a.shortName.localeCompare(b.shortName, 'es'),
  )
}

// ---------------------------------------------------------------------------
// The roster
// ---------------------------------------------------------------------------

/** One roster row as the form holds it. The number is text so none is not zero. */
export interface RosterEntryDraft {
  /**
   * `team_players.id`, generated here for a row the operator just added, so
   * saving the same roster twice upserts the same row instead of inserting a
   * second one.
   */
  id: string
  playerId: string
  /** Empty means no number, which the column allows and the sheet uses. */
  jerseyNumber: string
  active: boolean
}

/**
 * Somebody the operator is inventing along with their roster row. The id is
 * generated here for the same reason as above, and the name is the only thing
 * `players` will hold.
 */
export interface NewPerson {
  id: string
  fullName: string
}

/** One team's roster for the season, as the operator has it. */
export interface RosterDraft {
  entries: readonly RosterEntryDraft[]
  newPeople: readonly NewPerson[]
}

/** The roster of one team as the database handed it over. */
export function rosterDraftFor(
  page: TeamsPage,
  teamId: string | null,
): RosterDraft {
  if (teamId === null) return { entries: [], newPeople: [] }

  return {
    entries: page.roster
      .filter((entry) => entry.teamId === teamId)
      .map((entry) => ({
        id: entry.id,
        playerId: entry.playerId,
        jerseyNumber:
          entry.jerseyNumber === null ? '' : String(entry.jerseyNumber),
        active: entry.active,
      })),
    newPeople: [],
  }
}

/**
 * A person's name: the draft's own invented people first, then the league's.
 *
 * The invented ones come first because they have no row yet, so `page.people`
 * cannot answer for them until the save lands.
 */
export function personName(
  page: TeamsPage,
  draft: RosterDraft,
  playerId: string,
): string {
  const invented = draft.newPeople.find((person) => person.id === playerId)
  if (invented !== undefined) return invented.fullName

  return (
    page.people.find((person) => person.id === playerId)?.fullName ??
    'Persona que no está en la base'
  )
}

/** What the add-somebody form holds. */
export interface RosterAddDraft {
  /** A person the league already knows. Empty means `name` is the one that counts. */
  playerId: string
  /** A person the league does not know yet. Only their name is ever stored. */
  name: string
  jerseyNumber: string
}

export function emptyRosterAddDraft(): RosterAddDraft {
  return { playerId: '', name: '', jerseyNumber: '' }
}

export type RosterAddProblemKind =
  | 'nobody-chosen'
  | 'already-in-this-team'
  | 'already-in-competition'
  | 'jersey-not-a-count'
  | 'jersey-out-of-range'

export type RosterAddWarningKind = 'name-already-known'

export interface RosterAddProblem {
  kind: RosterAddProblemKind
  message: string
}

export interface RosterAddWarning {
  kind: RosterAddWarningKind
  message: string
}

function jerseyProblems<K extends string>(
  text: string,
  notACount: K,
  outOfRange: K,
  who: string,
): { kind: K; message: string }[] {
  const number = readCount(text)

  if (number === 'invalid') {
    return [
      {
        kind: notACount,
        message: `El número de ${who} se carga con un número entero y sin signo, o se deja vacío.`,
      },
    ]
  }
  if (
    typeof number === 'number' &&
    (number < JERSEY_MIN || number > JERSEY_MAX)
  ) {
    return [
      {
        kind: outOfRange,
        message: `El número de ${who} va entre ${JERSEY_MIN} y ${JERSEY_MAX}, que es lo que acepta la base.`,
      },
    ]
  }

  return []
}

/**
 * Every reason this person cannot be added to this roster.
 *
 * The one that matters is `already-in-competition`:
 * `team_players_one_team_per_competition_unique` allows one team per person per
 * competition per season, so somebody already on another roster of the same
 * competition cannot simply be added here. It is caught with the list the screen
 * already has, and it names the team, because "the key refused it" is not an
 * answer anybody can act on.
 *
 * A number that repeats inside the team is not here. It is legal, it happens, and
 * `rosterAddWarnings` says so instead.
 */
export function rosterAddProblems(
  add: RosterAddDraft,
  page: TeamsPage,
  team: TeamRecord,
): RosterAddProblem[] {
  const problems: RosterAddProblem[] = []

  if (add.playerId === '' && add.name.trim() === '') {
    problems.push({
      kind: 'nobody-chosen',
      message:
        'Elegí a alguien de la lista, o escribí el nombre de una persona nueva.',
    })
  }

  if (add.playerId !== '') {
    const held = page.roster.find(
      (entry) =>
        entry.competition === team.competition &&
        entry.playerId === add.playerId,
    )

    if (held !== undefined && held.teamId === team.id) {
      problems.push({
        kind: 'already-in-this-team',
        message: held.active
          ? 'Esa persona ya está en este plantel.'
          : 'Esa persona ya tiene una fila en este plantel, marcada fuera. Devolvela al plantel desde su fila en lugar de agregarla otra vez.',
      })
    } else if (held !== undefined) {
      const other = page.teams.find((each) => each.id === held.teamId)
      problems.push({
        kind: 'already-in-competition',
        message: `Esa persona ya está en el plantel de ${other?.shortName ?? 'otro equipo'} en ${competitionLabel(team.competition)} ${page.year}. La base admite un solo equipo por persona, por competencia y por temporada, así que primero hay que sacarla de ahí. En la otra competencia sí puede jugar, con otro equipo y otro número.`,
      })
    }
  }

  problems.push(
    ...jerseyProblems(
      add.jerseyNumber,
      'jersey-not-a-count' as const,
      'jersey-out-of-range' as const,
      'camiseta',
    ),
  )

  return problems
}

/**
 * What is worth saying about this addition without refusing it.
 *
 * A typed name that the league already knows is almost always the same person
 * twice, and `players.full_name` carries no unique constraint precisely because
 * two people may share a name. So it warns and saves: refusing would make an
 * honest namesake impossible to register.
 */
export function rosterAddWarnings(
  add: RosterAddDraft,
  page: TeamsPage,
): RosterAddWarning[] {
  const name = add.name.trim()
  if (add.playerId !== '' || name === '') return []

  const known = page.people.find(
    (person) => person.fullName.toLowerCase() === name.toLowerCase(),
  )
  if (known === undefined) return []

  return [
    {
      kind: 'name-already-known',
      message: `La liga ya tiene a alguien con el nombre «${known.fullName}». Si es la misma persona, elegila de la lista en lugar de crearla otra vez; si son dos personas distintas con el mismo nombre, seguí adelante.`,
    },
  ]
}

/** The roster with one more row, and the person it names if they are new. */
export function withAddedPerson(
  draft: RosterDraft,
  add: RosterAddDraft,
): RosterDraft {
  const name = add.name.trim()
  const invented = add.playerId === '' && name !== ''
  const playerId = invented ? crypto.randomUUID() : add.playerId

  return {
    entries: [
      ...draft.entries,
      {
        id: crypto.randomUUID(),
        playerId,
        jerseyNumber: add.jerseyNumber.trim(),
        active: true,
      },
    ],
    newPeople: invented
      ? [...draft.newPeople, { id: playerId, fullName: name }]
      : draft.newPeople,
  }
}

export type RosterProblemKind =
  'jersey-not-a-count' | 'jersey-out-of-range' | 'person-twice'

export interface RosterProblem {
  kind: RosterProblemKind
  /** Unique per problem, so a list can key on it. */
  key: string
  message: string
}

export type RosterWarningKind = 'jersey-repeated' | 'jersey-missing'

export interface RosterWarning {
  kind: RosterWarningKind
  key: string
  message: string
}

/**
 * Every reason this roster cannot be saved: a number that is not a number, a
 * number outside what `team_players_jersey_range` allows, and the same person
 * twice, which `team_players_roster_unique` would refuse.
 *
 * Two things a roster form usually refuses are missing on purpose. A repeated
 * number is legal. No number at all is legal. Both are in `rosterWarnings`.
 */
export function rosterProblems(
  page: TeamsPage,
  draft: RosterDraft,
): RosterProblem[] {
  const problems: RosterProblem[] = []
  const seen = new Set<string>()

  for (const entry of draft.entries) {
    const who = personName(page, draft, entry.playerId)

    if (seen.has(entry.playerId)) {
      problems.push({
        kind: 'person-twice',
        key: `person-twice-${entry.playerId}`,
        message: `${who} está dos veces en este plantel. Cada persona figura una sola vez por equipo y por temporada.`,
      })
    }
    seen.add(entry.playerId)

    for (const problem of jerseyProblems(
      entry.jerseyNumber,
      'jersey-not-a-count' as const,
      'jersey-out-of-range' as const,
      who,
    )) {
      problems.push({ ...problem, key: `${problem.kind}-${entry.playerId}` })
    }
  }

  return problems
}

/**
 * What is worth saying about this roster without refusing it.
 *
 * Both of these are facts of the league's own sheets. Number 28 appears twice in
 * the Hantachoppers roster and Coria Omar has no number at all, and the column is
 * nullable and deliberately not unique per team so the importer publishes the gap
 * instead of inventing a number. A form that blocked either would be wrong about
 * this league.
 */
export function rosterWarnings(
  page: TeamsPage,
  draft: RosterDraft,
): RosterWarning[] {
  const warnings: RosterWarning[] = []
  const active = draft.entries.filter((entry) => entry.active)

  const byNumber = new Map<number, string[]>()
  for (const entry of active) {
    const number = readCount(entry.jerseyNumber)
    if (typeof number !== 'number') continue

    byNumber.set(number, [
      ...(byNumber.get(number) ?? []),
      personName(page, draft, entry.playerId),
    ])
  }

  for (const [number, people] of [...byNumber].sort((a, b) => a[0] - b[0])) {
    if (people.length < 2) continue
    warnings.push({
      kind: 'jersey-repeated',
      key: `jersey-repeated-${number}`,
      message: `El número ${number} lo llevan ${people.join(' y ')}. La liga lo permite (la planilla 2026 repite el 28 en un plantel), así que lo guardamos igual.`,
    })
  }

  for (const entry of active) {
    if (entry.jerseyNumber.trim() !== '') continue
    warnings.push({
      kind: 'jersey-missing',
      key: `jersey-missing-${entry.playerId}`,
      message: `${personName(page, draft, entry.playerId)} queda sin número. La planilla 2026 tiene un caso así, así que se guarda como está.`,
    })
  }

  return warnings
}

// ---------------------------------------------------------------------------
// The roster writes
// ---------------------------------------------------------------------------

/*
 * The two row shapes exactly as the tables hold them, snake case and all, so a
 * write can be read against the migration without a translation step.
 */

/**
 * A person, and nothing about them but their name. There is no national ID, date
 * of birth, phone number, home address or payment column in `players` and none
 * may be added here.
 */
export type PlayerRow = {
  id: string
  full_name: string
}

export type TeamPlayerRow = {
  id: string
  season_id: string
  competition_key: CompetitionKey
  team_id: string
  player_id: string
  jersey_number: number | null
  active: boolean
}

/** The two groups a roster save writes, and is refused at, separately. */
export type RosterPart = 'people' | 'roster'

export interface RosterWrites {
  seasonId: string
  teamId: string
  people: PlayerRow[]
  roster: TeamPlayerRow[]
}

export interface RosterSaveReport {
  saved: RosterPart[]
  failed: { part: RosterPart; because: string }[]
}

/**
 * What has to be written for this roster to become the truth.
 *
 * Compared against the baseline, so a save issues the rows that changed and
 * nothing else, and a second save with nothing touched writes nothing at all.
 * Every write is an upsert on the table's own primary key, so issuing the same
 * roster twice writes the same rows twice and doubles nobody.
 *
 * A row whose number is not a number is skipped rather than sent with a guessed
 * value; `rosterProblems()` is what stops the save while one exists.
 */
export function rosterWrites(
  page: TeamsPage,
  team: TeamRecord,
  baseline: RosterDraft,
  draft: RosterDraft,
): RosterWrites {
  const before = new Map(baseline.entries.map((entry) => [entry.id, entry]))
  const known = new Map(
    baseline.newPeople.map((person) => [person.id, person.fullName]),
  )

  const roster: TeamPlayerRow[] = []
  for (const entry of draft.entries) {
    const number = readCount(entry.jerseyNumber)
    if (number === 'invalid') continue

    const was = before.get(entry.id)
    const unchanged =
      was !== undefined &&
      was.playerId === entry.playerId &&
      was.jerseyNumber.trim() === entry.jerseyNumber.trim() &&
      was.active === entry.active
    if (unchanged) continue

    roster.push({
      id: entry.id,
      season_id: page.seasonId,
      competition_key: team.competition,
      team_id: team.id,
      player_id: entry.playerId,
      jersey_number: number,
      active: entry.active,
    })
  }

  const people: PlayerRow[] = draft.newPeople
    .filter(
      (person) =>
        person.fullName.trim() !== '' &&
        known.get(person.id) !== person.fullName,
    )
    .map((person) => ({ id: person.id, full_name: person.fullName.trim() }))

  return { seasonId: page.seasonId, teamId: team.id, people, roster }
}

/** Which of the two groups this save would touch. */
export function rosterPartsOf(writes: RosterWrites): RosterPart[] {
  const parts: RosterPart[] = []
  if (writes.people.length > 0) parts.push('people')
  if (writes.roster.length > 0) parts.push('roster')
  return parts
}

/**
 * The baseline moved forward over the parts that saved and left alone over the
 * parts that did not, so what the operator typed stays on screen and pressing
 * save again retries exactly what failed.
 */
export function withSavedRosterParts(
  baseline: RosterDraft,
  draft: RosterDraft,
  parts: readonly RosterPart[],
): RosterDraft {
  return {
    entries: parts.includes('roster') ? draft.entries : baseline.entries,
    newPeople: parts.includes('people') ? draft.newPeople : baseline.newPeople,
  }
}

/** The roster in the order the screen shows it: numbers first, then by name. */
export function sortedRoster(
  page: TeamsPage,
  draft: RosterDraft,
): RosterEntryDraft[] {
  return [...draft.entries].sort((a, b) => {
    if (a.active !== b.active) return Number(b.active) - Number(a.active)

    const first = readCount(a.jerseyNumber)
    const second = readCount(b.jerseyNumber)
    const hasFirst = typeof first === 'number'
    const hasSecond = typeof second === 'number'

    if (hasFirst && hasSecond && first !== second) return first - second
    if (hasFirst !== hasSecond) return hasFirst ? -1 : 1

    return personName(page, draft, a.playerId).localeCompare(
      personName(page, draft, b.playerId),
      'es',
    )
  })
}

/**
 * Who the add-somebody picker may offer: everybody active who is not already on
 * a roster of this competition this season.
 *
 * Excluding them is what keeps
 * `team_players_one_team_per_competition_unique` out of reach, and it is per
 * competition rather than per season, so a woman on a Beer League roster is still
 * offered for a WUBL team.
 */
export function personPicks(
  page: TeamsPage,
  team: TeamRecord,
  draft: RosterDraft,
): RosterPerson[] {
  const held = new Set(
    page.roster
      .filter((entry) => entry.competition === team.competition)
      .map((entry) => entry.playerId),
  )
  for (const entry of draft.entries) held.add(entry.playerId)

  return [...page.people]
    .filter((person) => person.active && !held.has(person.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
}
