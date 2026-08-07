import type { Match, MatchResolution, Venue } from '../data/types'
import { splitFixtureByDate, type FixtureRound } from '../utils/fixture'
import { competitionLabel } from './competitions'
import { formatWeekdayDate } from './dates'
import './data-table.css'
import './FixtureList.css'
import { useT } from '../i18n/useLanguage'
import { teamLogo } from './team-logos'
import { fill } from '../i18n/language'

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

/** What the bracket resolver knows about a match the sheet left teamless. */
export type ResolvedSides = ReadonlyMap<
  string,
  { home: string | null; away: string | null }
>

type FixtureListProps = {
  /**
   * Sides the playoff resolver derived from the standings — the 1st and 2nd
   * seeds waiting in the semifinals, a played-out quarterfinal's winner. The
   * fixture shows them where the sheet printed only a placeholder, because a
   * visitor reading "Semifinal 1 (verde)" deserves the team the seeding already
   * names. Sides the resolver refuses stay exactly as printed: deriving is the
   * resolver's job, never this list's.
   */
  resolvedSides?: ResolvedSides
  rounds: readonly FixtureRound[]
  teamName: (teamId: string) => string
  /**
   * The crest for a team id, preferring the panel's upload like every other
   * view. Defaults to the bundled artwork so a caller without season teams
   * still shows badges.
   */
  teamCrest?: (teamId: string) => string | null
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
): { text: string | null; printed: boolean } {
  const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
  if (teamId !== null) return { text: teamName(teamId), printed: false }

  const printed = printedSide(match.notes, side === 'home' ? 'Home' : 'Away')
  // A row with neither a team nor a printed side is a slot the sheet left blank.
  // It is still published, as the gap it is.
  return { text: printed, printed: true }
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
  resolvedSides,
  teamCrest = teamLogo,
}: FixtureListProps) {
  const t = useT()
  if (rounds.length === 0) {
    return (
      <p className="data-table__empty">
        {t('Todavía no hay fechas cargadas para esta competencia.')}
      </p>
    )
  }

  const { upcoming, past } = splitFixtureByDate(rounds, today)

  return (
    <div className="fixture-split">
      <section aria-labelledby="fixture-proximos">
        <h3 className="fixture-split__title" id="fixture-proximos">
          {t('Próximos partidos')}
        </h3>

        {upcoming.length === 0 ? (
          <p className="data-table__empty">
            No quedan partidos por jugar en esta competencia. Abajo está todo lo
            que se jugó.
          </p>
        ) : (
          <Rounds
            resolvedSides={resolvedSides}
            rounds={upcoming}
            teamName={teamName}
            teamCrest={teamCrest}
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
              ? t('Ver la fecha ya jugada')
              : fill(t('Ver las {n} fechas ya jugadas'), { n: past.length })}
          </summary>

          <Rounds
            resolvedSides={resolvedSides}
            rounds={past}
            teamName={teamName}
            teamCrest={teamCrest}
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
  teamCrest,
  showCompetition,
  resolvedSides,
}: {
  rounds: readonly FixtureRound[]
  teamName: (teamId: string) => string
  teamCrest: (teamId: string) => string | null
  showCompetition: boolean
  resolvedSides?: ResolvedSides
}) {
  const t = useT()

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
                    // The sheet's side, or the one the resolver derived where
                    // the sheet printed a placeholder. A derived side is a real
                    // team: named and badged, not grey.
                    const derived = resolvedSides?.get(match.id)
                    const homeId = match.homeTeamId ?? derived?.home ?? null
                    const awayId = match.awayTeamId ?? derived?.away ?? null
                    const home =
                      match.homeTeamId === null && homeId !== null
                        ? { text: teamName(homeId), printed: false }
                        : sideLabel(match, 'home', teamName)
                    const away =
                      match.awayTeamId === null && awayId !== null
                        ? { text: teamName(awayId), printed: false }
                        : sideLabel(match, 'away', teamName)
                    const resolution =
                      match.score === null
                        ? null
                        : RESOLUTIONS[match.score.resolution]

                    return (
                      <li
                        className={`fixture__match fixture__match--${match.competition}`}
                        key={match.id}
                      >
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
                            {teamCrest(homeId ?? '') !== null && (
                              <img
                                className="fixture__crest"
                                src={teamCrest(homeId ?? '')!}
                                alt=""
                                width={64}
                                height={64}
                                loading="lazy"
                              />
                            )}
                            {home.text ?? t('Sin registrar')}
                          </span>

                          {match.score === null ? (
                            <span className="fixture__score fixture__score--pending">
                              {match.time}
                              <span className="fixture__pending-note">
                                {t('Sin resultado')}
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
                            {teamCrest(awayId ?? '') !== null && (
                              <img
                                className="fixture__crest"
                                src={teamCrest(awayId ?? '')!}
                                alt=""
                                width={64}
                                height={64}
                                loading="lazy"
                              />
                            )}
                            {away.text ?? t('Sin registrar')}
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
