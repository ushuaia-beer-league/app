/**
 * The playoff bracket, filled from results, and the champion of a competition.
 *
 * Two rules shape this module, and both come from the source material rather
 * than from bracket convention.
 *
 * **Never name a participant that is not decided.** A slot whose deciding match
 * has not been played resolves to nothing, with the reason attached. Publishing
 * a guessed semifinalist is the worst thing this module could do: the league
 * would read it as a draw sheet and a team would turn up on the wrong night.
 *
 * **Never read the printed sides.** The 2026 bracket rows carry no teams; the
 * sheet printed their sides as positions inside `notes` ("3er Lugar (hanta)",
 * "Ganador 6to 7to (t9)", "Semifinal 1 (verde)", "Por determinar"). Parsing that
 * prose would be a fragile importer hidden inside a table, so the structure is
 * derived from the stages and the seeding instead, and the printed text is
 * passed through untouched as `printed` for a view to show beside it.
 *
 * What is derived here:
 *
 * - the seeding, from `standings()` and nothing else;
 * - which position or which earlier match feeds each side of each bracket row,
 *   from the shape of the bracket (see `BRACKET_PLANS`);
 * - who won and who lost a bracket match, from its score;
 * - the champion, the runner-up, third place and fifth place.
 *
 * What is only passed through, never interpreted:
 *
 * - `match.notes`, exposed as `ResolvedBracketMatch.printed`;
 * - a team already recorded on a bracket row, which is a fact and outranks any
 *   derivation (this is what happens once the back office fills the rows in).
 *
 * Everything is pure: match records in, rows out. No clock, no database.
 */

import type {
  CompetitionKey,
  Match,
  MatchScore,
  StandingsRow,
} from '../data/types'
import { BRACKET_STAGES, bracketRounds } from './fixture'
import { outcomeFor, standings } from './standings'

export type BracketStage = (typeof BRACKET_STAGES)[number]

export interface BracketOptions {
  competition: CompetitionKey
  /**
   * Teams that must be seeded even before they play, so a bracket drawn on a
   * league that has not started still lists positions. Passed straight to
   * `standings()`; teams found in the matches are seeded regardless.
   */
  teamIds?: readonly string[]
}

/* ------------------------------------------------------------------ seeding */

export interface SeedingRow {
  /** 1 is the first seed. */
  position: number
  teamId: string
  /** The standings row the position came from, so a view can show why. */
  standing: StandingsRow
}

/**
 * Who is 1st, 2nd, and so on in a competition.
 *
 * The order is the league's own and comes entirely from `standings()`: points,
 * then PGR, then goal difference, with no mini-table among tied teams. That is
 * what puts Rock Choppers 3rd and Blanco 4th in 2026 although Blanco has the
 * better goal difference, and the brackets the league drew agree.
 *
 * The 4 July play-in is `stage: 'playin'`, so `standings()` already leaves it
 * out: winning it is a bracket fact and never a seventh regular-season game.
 * Tipo Nine won it and is still the sixth seed.
 */
export function seeding(
  matches: readonly Match[],
  { competition, teamIds }: BracketOptions,
): SeedingRow[] {
  return standings(matches, { competition, teamIds }).map(
    (standing, order) => ({
      position: order + 1,
      teamId: standing.teamId,
      standing,
    }),
  )
}

/* ---------------------------------------------------------- knockout result */

/**
 * A bracket match names a winner and a loser, or it names neither and says why.
 *
 * `ended-level` is the reason a knockout can have no winner despite having a
 * score. A draw is a real result in this league — Mujeres Birra del Fuego 4-4
 * Mujeres Tipo Nine, 28 June 2026 — so a bracket match could be recorded level,
 * and this module reports that instead of tossing a coin. The type keeps the
 * winner out of reach until `decided` is true, so a caller cannot mistake a
 * level match for a win.
 */
export interface KnockoutDecided {
  decided: true
  winnerTeamId: string
  loserTeamId: string
}

export interface KnockoutUndecided {
  decided: false
  because:
    | 'not-played'
    /** On record as a draw: nobody advances, and the league has to say what now. */
    | 'ended-level'
    /** Played, but who played it is not known, so the winner cannot be named. */
    | 'sides-unknown'
}

export type KnockoutResult = KnockoutDecided | KnockoutUndecided

/**
 * Who won a knockout match, from its score and the sides that are known.
 *
 * The sides are arguments rather than read off the match because the 2026
 * play-in has a score and no teams on the row: its sides come from the seeding,
 * and the winner has to be read against those.
 *
 * A shootout win is a win. It pays the same 2 points in the table and it
 * advances a team here; PGR only ever matters for the seeding above.
 *
 * The score is read through `outcomeFor`, the one function in the project that
 * turns a score into an outcome, so a contradictory record (a draw whose goals
 * differ, a decided match that ended level) throws here exactly as it does in
 * the standings rather than resolving to something plausible.
 */
export function knockoutResult(
  score: MatchScore | null,
  homeTeamId: string | null,
  awayTeamId: string | null,
): KnockoutResult {
  if (!score) return { decided: false, because: 'not-played' }

  const outcome = outcomeFor(score, 'home')

  // Checked before the sides, because a level match names no winner whoever
  // played it, and that is the more useful thing to report.
  if (outcome === 'draw') return { decided: false, because: 'ended-level' }

  if (homeTeamId === null || awayTeamId === null) {
    return { decided: false, because: 'sides-unknown' }
  }

  const homeWon = outcome === 'regulation-win' || outcome === 'shootout-win'

  return {
    decided: true,
    winnerTeamId: homeWon ? homeTeamId : awayTeamId,
    loserTeamId: homeWon ? awayTeamId : homeTeamId,
  }
}

/* -------------------------------------------------------- bracket structure */

/**
 * One bracket row, addressed by its stage and its position inside that stage.
 *
 * The index is the order `bracketRounds` lists the stage in, which is date then
 * time and, for the two matches that share a time slot in the two cabeceras,
 * the order the source lists them. That is the only stable identity a bracket
 * row has before it names teams: match ids belong to an import, not to the
 * league. The 2026 tests pin the assumption by checking each derived side
 * against the nickname the sheet printed for it.
 */
export interface BracketSlotRef {
  stage: BracketStage
  index: number
}

/** Where a side comes from when the row itself does not name a team. */
export type PlanOrigin =
  | { kind: 'seed'; position: number }
  | { kind: 'winner-of'; of: BracketSlotRef }
  | { kind: 'loser-of'; of: BracketSlotRef }
  /**
   * The source says an earlier winner takes this slot but not which one. This
   * is the men's semifinals of 2026: the sheet prints "Semifinal 1 (verde) vs
   * Por determinar", so the first seed is known and the pairing of the two
   * quarterfinal winners to the two semifinals is not published anywhere.
   * Guessing it is exactly the invention this module refuses, so both
   * quarterfinals are carried as candidates and the side stays undecided.
   */
  | { kind: 'unpublished-pairing'; candidates: readonly BracketSlotRef[] }

export type SlotOrigin =
  | PlanOrigin
  /** The row names the team. A recorded fact outranks every derivation. */
  | { kind: 'recorded' }
  /** No plan covers this row, so nothing at all can be said about the side. */
  | { kind: 'unknown-structure' }

export type UndecidedReason =
  /** The match that decides this side has no score yet. */
  | 'not-played'
  /** That match is on record as a draw, so it names no winner and no loser. */
  | 'ended-level'
  /** That match was played, but its own sides are not known either. */
  | 'sides-unknown'
  /** The standings do not reach that position yet. */
  | 'seed-unavailable'
  /** The source does not say which earlier winner takes this slot. */
  | 'pairing-not-published'
  /** The bracket is not a shape this module has a plan for. */
  | 'structure-not-known'

/**
 * The bracket shapes the league has actually drawn.
 *
 * A shape is recognised, never assumed: an unfamiliar bracket resolves every
 * side to nothing with `structure-not-known`, which is a visible gap rather
 * than a plausible bracket built out of hockey convention.
 */
export type BracketShape = 'six-team-with-playin' | 'four-team' | 'unknown'

type BracketPlan = Readonly<
  Record<string, readonly [home: PlanOrigin, away: PlanOrigin]>
>

function slotKey(stage: BracketStage, index: number): string {
  return `${stage}#${index}`
}

const seed = (position: number): PlanOrigin => ({ kind: 'seed', position })

const winnerOf = (stage: BracketStage, index: number): PlanOrigin => ({
  kind: 'winner-of',
  of: { stage, index },
})

const loserOf = (stage: BracketStage, index: number): PlanOrigin => ({
  kind: 'loser-of',
  of: { stage, index },
})

const QUARTERFINALS: readonly BracketSlotRef[] = [
  { stage: 'quarterfinal', index: 0 },
  { stage: 'quarterfinal', index: 1 },
]

/**
 * The men's 2026 bracket: seven teams in the league, six in the bracket.
 *
 * The 6th plays the 7th in the play-in of 4 July and the winner reaches the
 * playoffs. On 8 August the 21:30 pair are quarterfinals — the 3rd seed against
 * the play-in winner, the 4th against the 5th — and the 23:30 pair are the
 * semifinals, where the 1st and the 2nd seed wait for those winners. The two
 * quarterfinal losers are 5th and 6th, which is what the fifth-place match of
 * 15 August decides; the play-in loser is 7th and plays no more.
 *
 * Only the semifinal pairing is unknown, and it stays unknown here.
 */
const SIX_TEAM_WITH_PLAYIN: BracketPlan = {
  [slotKey('playin', 0)]: [seed(6), seed(7)],
  [slotKey('quarterfinal', 0)]: [seed(3), winnerOf('playin', 0)],
  [slotKey('quarterfinal', 1)]: [seed(4), seed(5)],
  [slotKey('semifinal', 0)]: [
    seed(1),
    { kind: 'unpublished-pairing', candidates: QUARTERFINALS },
  ],
  [slotKey('semifinal', 1)]: [
    seed(2),
    { kind: 'unpublished-pairing', candidates: QUARTERFINALS },
  ],
  [slotKey('third-place', 0)]: [
    loserOf('semifinal', 0),
    loserOf('semifinal', 1),
  ],
  [slotKey('fifth-place', 0)]: [
    loserOf('quarterfinal', 0),
    loserOf('quarterfinal', 1),
  ],
  [slotKey('final', 0)]: [winnerOf('semifinal', 0), winnerOf('semifinal', 1)],
}

/**
 * The women's 2026 bracket: four teams, straight into the semifinals of 8
 * August at 22:30 — 1st against 4th, 2nd against 3rd, as the sheet prints them
 * — then third place and the final on 15 August. Nothing is unpublished here.
 */
const FOUR_TEAM: BracketPlan = {
  [slotKey('semifinal', 0)]: [seed(1), seed(4)],
  [slotKey('semifinal', 1)]: [seed(2), seed(3)],
  [slotKey('third-place', 0)]: [
    loserOf('semifinal', 0),
    loserOf('semifinal', 1),
  ],
  [slotKey('final', 0)]: [winnerOf('semifinal', 0), winnerOf('semifinal', 1)],
}

const BRACKET_PLANS: Readonly<
  Record<Exclude<BracketShape, 'unknown'>, BracketPlan>
> = {
  'six-team-with-playin': SIX_TEAM_WITH_PLAYIN,
  'four-team': FOUR_TEAM,
}

function countByStage(
  matches: readonly Match[],
  competition: CompetitionKey,
): Map<string, number> {
  const counts = new Map<string, number>()

  for (const match of matches) {
    if (match.competition !== competition) continue
    counts.set(match.stage, (counts.get(match.stage) ?? 0) + 1)
  }

  return counts
}

/**
 * Which bracket the competition is playing, from the rounds it has drawn.
 *
 * The two shapes are told apart by their early rounds: a play-in and two
 * quarterfinals mean six teams came from a seven-team league, two semifinals on
 * their own mean four teams. Third place, fifth place and the final add nothing
 * to the recognition and are allowed to be absent, because the women's bracket
 * has no fifth-place match.
 */
export function bracketShape(
  matches: readonly Match[],
  { competition }: { competition: CompetitionKey },
): BracketShape {
  const counts = countByStage(matches, competition)
  const playin = counts.get('playin') ?? 0
  const quarterfinals = counts.get('quarterfinal') ?? 0
  const semifinals = counts.get('semifinal') ?? 0

  if (playin === 1 && quarterfinals === 2 && semifinals === 2) {
    return 'six-team-with-playin'
  }
  if (playin === 0 && quarterfinals === 0 && semifinals === 2) {
    return 'four-team'
  }
  return 'unknown'
}

/* ---------------------------------------------------------- resolved bracket */

export interface BracketSide {
  /** The team on this side, or null when nothing may be shown for it. */
  teamId: string | null
  /** Where the side comes from, whether or not it is known. */
  origin: SlotOrigin
  /** Why `teamId` is null. Null when the side is known. */
  undecided: UndecidedReason | null
}

export interface ResolvedBracketMatch {
  match: Match
  stage: BracketStage
  /** Position inside the stage; what a `BracketSlotRef` points at. */
  index: number
  home: BracketSide
  away: BracketSide
  /** Who won, from the score and the resolved sides. */
  result: KnockoutResult
  /**
   * `match.notes` verbatim: the sheet's own words for this row, including the
   * sides it printed as positions. Passed through, never parsed. A view shows
   * it so "3er Lugar (hanta)" reads as itself instead of as a blank.
   */
  printed: string | null
}

export interface ResolvedBracketRound {
  stage: BracketStage
  matches: readonly ResolvedBracketMatch[]
}

/**
 * The bracket of one competition with every side resolved as far as the results
 * allow, in playing order.
 *
 * One forward pass is enough because `bracketRounds` returns the stages in
 * `BRACKET_STAGES` order and every dependency points backwards: a quarterfinal
 * waits on the play-in, a semifinal on a quarterfinal, third and fifth place on
 * the losers of rounds already passed, the final on the semifinals.
 */
export function resolveBracket(
  matches: readonly Match[],
  options: BracketOptions,
): ResolvedBracketRound[] {
  const rounds = bracketRounds(matches, { competition: options.competition })
  const shape = bracketShape(matches, { competition: options.competition })
  const plan = shape === 'unknown' ? null : BRACKET_PLANS[shape]
  const seeds = seeding(matches, options)
  const resolved = new Map<string, ResolvedBracketMatch>()

  const fromPlan = (origin: PlanOrigin): BracketSide => {
    switch (origin.kind) {
      case 'seed': {
        const row = seeds.find(
          (candidate) => candidate.position === origin.position,
        )
        return row
          ? { teamId: row.teamId, origin, undecided: null }
          : { teamId: null, origin, undecided: 'seed-unavailable' }
      }
      case 'winner-of':
      case 'loser-of': {
        const decider = resolved.get(slotKey(origin.of.stage, origin.of.index))
        // The plan asked for a match this bracket has not got. The shape check
        // makes that unreachable for the two known shapes, and saying nothing
        // is still the right answer if a third shape ever slips through.
        if (!decider) {
          return { teamId: null, origin, undecided: 'structure-not-known' }
        }
        if (!decider.result.decided) {
          return { teamId: null, origin, undecided: decider.result.because }
        }
        return {
          teamId:
            origin.kind === 'winner-of'
              ? decider.result.winnerTeamId
              : decider.result.loserTeamId,
          origin,
          undecided: null,
        }
      }
      case 'unpublished-pairing':
        return { teamId: null, origin, undecided: 'pairing-not-published' }
    }
  }

  const sideOf = (
    match: Match,
    stage: BracketStage,
    index: number,
    side: 'home' | 'away',
  ): BracketSide => {
    const recorded = side === 'home' ? match.homeTeamId : match.awayTeamId
    if (recorded !== null) {
      return { teamId: recorded, origin: { kind: 'recorded' }, undecided: null }
    }

    const slots = plan?.[slotKey(stage, index)]
    if (!slots) {
      return {
        teamId: null,
        origin: { kind: 'unknown-structure' },
        undecided: 'structure-not-known',
      }
    }

    return fromPlan(side === 'home' ? slots[0] : slots[1])
  }

  return rounds.map(({ stage, matches: rows }) => ({
    stage,
    matches: rows.map((match, index) => {
      const home = sideOf(match, stage, index, 'home')
      const away = sideOf(match, stage, index, 'away')
      const entry: ResolvedBracketMatch = {
        match,
        stage,
        index,
        home,
        away,
        result: knockoutResult(match.score, home.teamId, away.teamId),
        printed: match.notes,
      }

      resolved.set(slotKey(stage, index), entry)
      return entry
    }),
  }))
}

/* -------------------------------------------------------------- the placings */

export interface BracketPlacings {
  /** The winner of the final, or null while the final has no winner. */
  champion: string | null
  runnerUp: string | null
  /** The winner of the third-place match. */
  thirdPlace: string | null
  /** The winner of the fifth-place match, which the two beaten quarterfinalists play. */
  fifthPlace: string | null
}

/**
 * The first match of a stage, whose winner the placings read. The league plays
 * one match per placing, never a series, so index 0 is the whole round.
 */
function decidedResultOf(
  rounds: readonly ResolvedBracketRound[],
  stage: BracketStage,
): KnockoutDecided | null {
  const match = rounds
    .find((round) => round.stage === stage)
    ?.matches.find((candidate) => candidate.index === 0)

  return match?.result.decided ? match.result : null
}

/**
 * Who finished where, from a bracket already resolved.
 *
 * Every placing is null until the match that decides it names a winner, which
 * includes a final that ended level: a competition with no winner on record has
 * no champion, and the resolved round carries `ended-level` to say why.
 */
export function bracketPlacings(
  rounds: readonly ResolvedBracketRound[],
): BracketPlacings {
  const final = decidedResultOf(rounds, 'final')

  return {
    champion: final?.winnerTeamId ?? null,
    runnerUp: final?.loserTeamId ?? null,
    thirdPlace: decidedResultOf(rounds, 'third-place')?.winnerTeamId ?? null,
    fifthPlace: decidedResultOf(rounds, 'fifth-place')?.winnerTeamId ?? null,
  }
}

/** The champion of a competition, or null while its final is undecided. */
export function champion(
  rounds: readonly ResolvedBracketRound[],
): string | null {
  return bracketPlacings(rounds).champion
}
