import type { TeamSeed } from '../data/teams-2026'
import type { TeamRoster } from './rosters'
import './TeamCard.css'

/** "28" alone, "28 y 30" for two, "28, 30 y 7" for more. */
const NUMBER_LIST = new Intl.ListFormat('es-AR', {
  style: 'long',
  type: 'conjunction',
})

/** What the card prints where the sheet prints no number: sin número. */
const NO_NUMBER = 'S/N'

type TeamCardProps = {
  /**
   * The team as the sources name it. There is no colour and no crest on this
   * type because no source carries either: the `teams` table has the columns and
   * every one of them is empty, so the card leaves a frame instead of painting a
   * swatch it would have to invent.
   */
  team: TeamSeed
  /** Already joined and ordered by `teamRoster()`. */
  roster: TeamRoster
}

/**
 * One team: its name, the sponsored name under it, and its roster.
 *
 * A list item, because the grid that holds these is a list of teams.
 *
 * Three facts about the 2026 rosters are load-bearing and none of them is tidied
 * away here. Number 28 is worn by two Hantachoppers players, so both lines show
 * 28, both are marked, and a note names the number rather than leaving the
 * repetition looking like a rendering fault. One Blanco player has no number at
 * all, so that line says so instead of borrowing a zero. And the four women's
 * teams have no published roster, so their cards say the roster is unpublished
 * and still show the team, which is a gap in the sources rather than an empty
 * state to hide.
 */
export function TeamCard({ team, roster }: TeamCardProps) {
  const { lines, sharedNumbers } = roster
  const someNumberMissing = lines.some((line) => line.jerseyNumber === null)

  return (
    <li className="team-card">
      <div className="team-card__head">
        {/* The crest that does not exist yet. Decorative, so it is hidden from
         * the accessibility tree: an empty frame has nothing to announce, and
         * the section says in words that no team has a crest on file. */}
        <span className="team-card__crest" aria-hidden="true" />

        <div className="team-card__names">
          <h4 className="team-card__name">{team.shortName}</h4>
          {team.fullName !== null && (
            <p className="team-card__sponsored">{team.fullName}</p>
          )}
        </div>
      </div>

      {lines.length === 0 ? (
        <p className="team-card__unpublished">
          El plantel de este equipo no está publicado en las planillas de la
          liga.
        </p>
      ) : (
        <>
          <p className="team-card__count">
            {lines.length === 1
              ? '1 jugador en el plantel'
              : `${lines.length} jugadores en el plantel`}
          </p>

          {/* Named, so a screen reader can be told which of the card's two
           * lists it has landed in. */}
          <ul className="team-card__roster" aria-label="Plantel">
            {lines.map((line, index) => (
              <li
                className="team-card__line"
                key={`${line.playerSlug}-${index}`}
              >
                <span
                  className={`team-card__number${
                    line.jerseyNumber === null
                      ? ' team-card__number--missing'
                      : line.numberShared
                        ? ' team-card__number--shared'
                        : ''
                  }`}
                >
                  {line.jerseyNumber ?? NO_NUMBER}
                </span>
                <span className="team-card__player">{line.name}</span>
              </li>
            ))}
          </ul>

          {(sharedNumbers.length > 0 || someNumberMissing) && (
            <ul className="team-card__notes">
              {sharedNumbers.length > 0 && (
                <li>
                  {sharedNumbers.length === 1
                    ? `El número ${sharedNumbers[0]} aparece más de una vez en la planilla de la liga. Se publica tal cual está, sin confirmar.`
                    : `Los números ${NUMBER_LIST.format(
                        sharedNumbers.map(String),
                      )} aparecen más de una vez en la planilla de la liga. Se publican tal cual están, sin confirmar.`}
                </li>
              )}
              {someNumberMissing && (
                <li>{`${NO_NUMBER}: la planilla de la liga no anota número para ese jugador.`}</li>
              )}
            </ul>
          )}
        </>
      )}
    </li>
  )
}
