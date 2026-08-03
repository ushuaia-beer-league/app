import type { CompetitionKey, Match, MatchResolution } from '../data/types'
import type { BracketRound } from '../utils/fixture'
import {
  resolveBracket,
  type BracketSide as ResolvedSide,
} from '../utils/playoffs'
import { formatShortDate } from './dates'
import './PlayoffBracket.css'

/**
 * What the league calls each round, in Spanish because it is on screen.
 *
 * "Repechaje" is the play-in of 4 July: sixth against seventh for the last
 * playoff berth. It is a bracket round the sheet plays inside the regular phase,
 * so it opens the bracket rather than being hidden in the fixture.
 */
const ROUND_LABELS: Record<BracketRound['stage'], string> = {
  playin: 'Repechaje',
  quarterfinal: 'Cuartos de final',
  semifinal: 'Semifinales',
  'third-place': 'Tercer puesto',
  'fifth-place': 'Quinto puesto',
  final: 'Final',
}

/**
 * How the match ended, when that is worth saying. A regulation result needs no
 * badge; the other two do, because the sheet writes a shootout as `5 p` and the
 * women's competition really does allow a draw.
 */
const RESOLUTION_LABELS: Record<MatchResolution, string | null> = {
  regulation: null,
  shootout: 'Penales',
  draw: 'Empate',
}

/** Printed on a slot the sheet says nothing at all about. */
const UNDECIDED_LABEL = 'Por definir'

/**
 * `2026-08-08` as `8 ago`.
 *
 * A bracket column is narrow, so the date is abbreviated here where the fixture
 * spells it out: "8 de agosto de 2026" from `formatDate` in `./dates` wraps to
 * three lines inside a column and outweighs the two teams under it. The year is
 * left out for the same reason; the season is what the page is about.
 *
 * `UTC` for the reason that module gives: a calendar day parsed in the reader's
 * own zone moves, and at Ushuaia's offset 4 July becomes the evening of 3 July.
 * A date that is not a calendar day is printed as it arrived rather than
 * replaced by an apology.
 */
const SIDES = ['home', 'away'] as const

type SideKey = (typeof SIDES)[number]

/**
 * How the importer records a side the sheet printed as a position instead of as
 * a team: `Home side printed as "3er Lugar (hanta)".` Almost every bracket row
 * of 2026 carries its sides this way and no teams at all, so this is where the
 * bracket's text comes from.
 *
 * The rest of `notes` is not shown. It is the importer's English account of what
 * the sheet left unresolved, which belongs in the record and not on a Spanish
 * page. Only the quoted fragment is the league's own wording.
 *
 * If a second view ever needs this, it belongs beside the other notation rules
 * in `src/utils/source-notation.ts` rather than in a component.
 */
const PRINTED_SIDE_PATTERNS: Record<SideKey, RegExp> = {
  home: /Home side printed as "([^"]+)"/,
  away: /Away side printed as "([^"]+)"/,
}

function printedSide(match: Match, side: SideKey): string | null {
  if (match.notes === null) return null
  return PRINTED_SIDE_PATTERNS[side].exec(match.notes)?.[1] ?? null
}

type BracketSideProps = {
  match: Match
  side: SideKey
  /** What `resolveBracket` worked out about this slot. */
  resolved: ResolvedSide
  teamName: (teamId: string) => string
}

/**
 * One side of one bracket match.
 *
 * Three things can be true of a slot and all three are rendered as they are: a
 * team the record names, a position the sheet printed instead of a team, or
 * nothing at all. Nothing is inferred from a result: filling the bracket from
 * the matches played is step 18 of `docs/plan.md`, and guessing now would
 * publish a fixture the league has not played.
 */
function BracketSide({ match, side, resolved, teamName }: BracketSideProps) {
  const teamId = resolved.teamId
  const label =
    teamId === null
      ? (printedSide(match, side) ?? UNDECIDED_LABEL)
      : teamName(teamId)

  // A team the record names is a fact. A team this site worked out from the
  // table — the sixth seed in the play-in, the winner of a quarterfinal — is an
  // inference, and it says so, because the league has not written it down.
  const derived = teamId !== null && resolved.origin.kind !== 'recorded'

  const goals =
    match.score === null
      ? null
      : side === 'home'
        ? match.score.home
        : match.score.away
  // Only within this match, and only from the goals, which are the reliable
  // column on the sheet. It says who won a match, never who advances.
  const won =
    match.score !== null &&
    goals !== null &&
    goals > (side === 'home' ? match.score.away : match.score.home)

  const classes = ['playoff-bracket__side']
  if (teamId === null) classes.push('playoff-bracket__side--open')
  if (derived) classes.push('playoff-bracket__side--derived')
  if (won) classes.push('playoff-bracket__side--winner')

  return (
    <p className={classes.join(' ')}>
      <span className="playoff-bracket__team">
        {label}
        {derived && (
          <>
            <span aria-hidden="true"> ·</span>
            <span className="playoff-bracket__derived">por posición</span>
          </>
        )}
      </span>
      {goals !== null && (
        <span className="playoff-bracket__goals">{goals}</span>
      )}
    </p>
  )
}

type PlayoffBracketProps = {
  /** Every match of the season; the bracket picks its own rounds out of them. */
  matches: readonly Match[]
  competition: CompetitionKey
  /** A team id turned into the name to print. */
  teamName: (teamId: string) => string
}

/**
 * The playoff bracket, as the 2026 sheet actually holds it.
 *
 * Six teams reach the men's bracket, so the two 21:30 matches of 8 August are
 * quarterfinals and the 23:30 ones are the semifinals where the first and second
 * seeds wait; the women's four teams go straight to semifinals at 22:30. The
 * rounds come from `bracketRounds`, which lists them in playing order and skips
 * a round a competition does not have.
 */
export function PlayoffBracket({
  matches,
  competition,
  teamName,
}: PlayoffBracketProps) {
  const rounds = resolveBracket(matches, { competition })

  if (rounds.length === 0) {
    return (
      <p className="playoff-bracket__empty">
        Todavía no hay llaves publicadas para esta competencia.
      </p>
    )
  }

  return (
    <div className="playoff-bracket">
      <p className="playoff-bracket__legend">
        Donde dice <b>por posición</b>, el equipo no está escrito en la
        planilla: lo deduce el sitio de la tabla de posiciones o del resultado
        de un partido anterior. Un cruce que todavía no se puede deducir queda
        en blanco.
      </p>

      {rounds.map((round) => (
        <div className="playoff-bracket__round" key={round.stage}>
          <h3 className="playoff-bracket__round-title">
            {ROUND_LABELS[round.stage]}
          </h3>

          <ol className="playoff-bracket__matches">
            {round.matches.map(({ match, home, away }) => {
              const resolution =
                match.score === null
                  ? null
                  : RESOLUTION_LABELS[match.score.resolution]

              return (
                <li className="playoff-bracket__match" key={match.id}>
                  <p className="playoff-bracket__when">
                    <time dateTime={`${match.date}T${match.time}`}>
                      {`${formatShortDate(match.date)} · ${match.time}`}
                    </time>
                    {resolution !== null && (
                      <span className="playoff-bracket__resolution">
                        {resolution}
                      </span>
                    )}
                  </p>

                  {SIDES.map((side) => (
                    <BracketSide
                      key={side}
                      match={match}
                      side={side}
                      resolved={side === 'home' ? home : away}
                      teamName={teamName}
                    />
                  ))}
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </div>
  )
}
