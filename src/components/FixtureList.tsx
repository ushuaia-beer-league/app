import type { Match, MatchResolution, Venue } from '../data/types'
import { splitFixtureByDate, type FixtureRound } from '../utils/fixture'
import { competitionLabel } from './competitions'
import { formatWeekdayDate } from './dates'
import './data-table.css'
import './FixtureList.css'

/** The two cabeceras, spelled as the league spells them. */
const VENUES: Record<Venue, string> = {
  bahia: 'Bahía',
  poli: 'Poli',
}

/** Only a result that is not the plain one is worth saying out loud. */
const RESOLUTIONS: Record<MatchResolution, string | null> = {
  regulation: null,
  shootout: 'Penales',
  draw: 'Empate',
}

type FixtureListProps = {
  rounds: readonly FixtureRound[]
  teamName: (teamId: string) => string
  /**
   * Today, as `YYYY-MM-DD`. A parameter rather than a reading of the clock, so a
   * test can sit on a match day, and so the whole page agrees on what day it is
   * instead of each component asking separately.
   */
  today: string
  /**
   * Whether each match says which competition it belongs to.
   *
   * True only when both are listed together, which is the one place the fixture
   * merges them. With a single competition chosen, repeating its name on all forty
   * rows tells the reader nothing they did not already choose.
   */
  showCompetition?: boolean
}

/**
 * What the sheet printed where a team should be.
 *
 * A bracket row names a position rather than a team, and one round-1 row names
 * nobody at all. The importer records that gap in `Match.notes` and quotes the
 * sheet's own words while doing it: `scripts/parse-sources.ts` writes `Home side
 * printed as "3er Lugar (hanta)"`. Reading the quotation back is what lets the
 * row show "3er Lugar (hanta)" instead of a blank, without any of it being
 * inferred here.
 */
function printedSide(
  notes: string | null,
  side: 'Home' | 'Away',
): string | null {
  if (notes === null) return null

  const quoted = new RegExp(`${side} side printed as "([^"]+)"`).exec(notes)
  return quoted?.[1] ?? null
}

function sideLabel(
  match: Match,
  side: 'home' | 'away',
  teamName: (teamId: string) => string,
): { text: string; printed: boolean } {
  const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
  if (teamId !== null) return { text: teamName(teamId), printed: false }

  const printed = printedSide(match.notes, side === 'home' ? 'Home' : 'Away')
  // A row with neither a team nor a printed side is a slot the sheet left blank.
  // It is still published, as the gap it is.
  return { text: printed ?? 'Sin registrar', printed: true }
}

/**
 * The fixture, one block per date and one row per time slot.
 *
 * Two matches run at the same time in the two cabeceras, so a slot holds both of
 * them and the venue is on every row. A list that showed one match per time
 * would silently drop half of every round.
 *
 * A match with no score shows its time where the score goes, never a 0-0: an
 * unreported result is not a goalless draw. A note the importer left on the row
 * is shown verbatim, in the English it was written in, because it is a record of
 * what the source does not say and paraphrasing it would be inventing the
 * missing fact.
 */
export function FixtureList({
  rounds,
  teamName,
  today,
  showCompetition = false,
}: FixtureListProps) {
  if (rounds.length === 0) {
    return (
      <p className="data-table__empty">
        Todavía no hay fechas cargadas para esta competencia.
      </p>
    )
  }

  const { upcoming, past } = splitFixtureByDate(rounds, today)

  return (
    <div className="fixture-split">
      <section aria-labelledby="fixture-proximos">
        <h3 className="fixture-split__title" id="fixture-proximos">
          Próximos partidos
        </h3>

        {upcoming.length === 0 ? (
          <p className="data-table__empty">
            No quedan partidos por jugar en esta competencia. Abajo está todo lo
            que se jugó.
          </p>
        ) : (
          <Rounds
            rounds={upcoming}
            teamName={teamName}
            showCompetition={showCompetition}
          />
        )}
      </section>

      {past.length > 0 && (
        <details className="fixture-split__past">
          {/* Closed by default, and a count in the summary so it is obvious there
           * is something behind it. Somebody looking for a result asks for it;
           * somebody looking for the next match should not have to scroll past
           * a season to find it. */}
          <summary className="fixture-split__summary">
            {past.length === 1
              ? 'Ver la fecha ya jugada'
              : `Ver las ${past.length} fechas ya jugadas`}
          </summary>

          <Rounds
            rounds={past}
            teamName={teamName}
            showCompetition={showCompetition}
          />
        </details>
      )}
    </div>
  )
}

/** One list of rounds, in whatever order it was handed. */
function Rounds({
  rounds,
  teamName,
  showCompetition,
}: {
  rounds: readonly FixtureRound[]
  teamName: (teamId: string) => string
  showCompetition: boolean
}) {
  return (
    <ol className="fixture">
      {rounds.map((round) => (
        <li className="fixture__round" key={round.date}>
          <h4 className="fixture__date">{formatWeekdayDate(round.date)}</h4>

          <ol className="fixture__slots">
            {round.slots.map((slot) => (
              <li className="fixture__slot" key={slot.time}>
                <p className="fixture__time">{slot.time}</p>

                <ul className="fixture__venues">
                  {slot.matches.map((match) => {
                    const home = sideLabel(match, 'home', teamName)
                    const away = sideLabel(match, 'away', teamName)
                    const resolution =
                      match.score === null
                        ? null
                        : RESOLUTIONS[match.score.resolution]

                    return (
                      <li className="fixture__match" key={match.id}>
                        <p className="fixture__venue">
                          {match.venue === null
                            ? 'Cabecera a definir'
                            : VENUES[match.venue]}
                          {showCompetition && (
                            <span className="fixture__competition">
                              {competitionLabel(match.competition)}
                            </span>
                          )}
                        </p>

                        <div className="fixture__teams">
                          <span
                            className={`fixture__team fixture__team--home${home.printed ? ' fixture__team--printed' : ''}`}
                          >
                            {home.text}
                          </span>

                          {match.score === null ? (
                            <span className="fixture__score fixture__score--pending">
                              {match.time}
                              <span className="fixture__pending-note">
                                Sin resultado
                              </span>
                            </span>
                          ) : (
                            <span className="fixture__score">
                              {match.score.home} - {match.score.away}
                              {resolution !== null && (
                                <span className="fixture__resolution">
                                  {resolution}
                                </span>
                              )}
                            </span>
                          )}

                          <span
                            className={`fixture__team${away.printed ? ' fixture__team--printed' : ''}`}
                          >
                            {away.text}
                          </span>
                        </div>

                        {/*
                         * `match.notes` is deliberately not printed here. It is
                         * the importer's own account of a gap, written in English
                         * like everything else in this repository, and this is a
                         * Spanish page. What a visitor needs from it is already
                         * on screen in their language: the side the sheet printed
                         * as a position, and "Sin registrar" where it printed
                         * nothing. The full note stays in the database and in the
                         * seed, for the panel and for anyone auditing the import.
                         */}
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  )
}
