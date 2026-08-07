import type { TeamSeed } from '../data/teams-2026'
import { useState } from 'react'

import { playerBadge } from './player-badges'
import type { TeamRoster } from './rosters'
import { crestFor } from './team-logos'
import { competitionLabel } from './competitions'
import { ShareButton } from './ShareButton'
import { shareWording } from './share-wording'
import { teamShareCard } from '../utils/share-card'
import './TeamCard.css'
import { useT } from '../i18n/useLanguage'
import { fill } from '../i18n/language'

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
  const t = useT()
  const { lines, sharedNumbers } = roster
  const logo = crestFor(team)
  const someNumberMissing = lines.some((line) => line.jerseyNumber === null)
  // Which roster line is showing its badge, on a screen where hover does not
  // exist and a tap has to do hover's job. One at a time, per card.
  const [showing, setShowing] = useState<string | null>(null)

  return (
    // The id is the deep link: sharing a team points at #<slug>, and the
    // teams page scrolls the named card into view when it loads.
    <li className="team-card" id={team.slug}>
      <div className="team-card__head">
        {/* The team's own crest where the league sent one, and the empty frame
         * where it did not, which is every women's team. Decorative either way:
         * the name is right beside it, so announcing the logo would only repeat
         * it, and an empty frame has nothing to announce at all. */}
        {logo === null ? (
          <span className="team-card__crest" aria-hidden="true" />
        ) : (
          <img
            className="team-card__crest team-card__crest--real"
            src={logo}
            alt=""
            aria-hidden="true"
            width={256}
            height={256}
            loading="lazy"
            decoding="async"
          />
        )}

        <div className="team-card__names">
          <h4 className="team-card__name">{team.shortName}</h4>
          {team.fullName !== null && (
            <p className="team-card__sponsored">{team.fullName}</p>
          )}
        </div>
      </div>

      {/* Only a card with a roster has something to share: crest and name
       * alone are already on every phone that has the link. */}
      {lines.length > 0 && (
        <div className="team-card__share">
          <ShareButton
            build={() =>
              teamShareCard(lines, {
                title: team.shortName,
                subtitle: competitionLabel(team.competition),
                crest: logo,
                wording: shareWording(t),
              })
            }
            filename={`${team.slug}.png`}
            text={`${team.shortName} · https://ubl.com.ar/equipos#${team.slug}`}
            what={team.shortName}
          />
        </div>
      )}

      {lines.length === 0 ? (
        <p className="team-card__unpublished">
          El plantel de este equipo no está publicado en las planillas de la
          liga.
        </p>
      ) : (
        <>
          <p className="team-card__count">
            {lines.length === 1
              ? t('1 jugador en el plantel')
              : fill(t('{n} jugadores en el plantel'), { n: lines.length })}
          </p>

          {/* Named, so a screen reader can be told which of the card's two
           * lists it has landed in. */}
          <ul className="team-card__roster" aria-label={t('Plantel')}>
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
                {(() => {
                  const badge = playerBadge(team.slug, line.name)
                  if (badge === null) {
                    return (
                      <span className="team-card__player">{line.name}</span>
                    )
                  }
                  const open = showing === line.playerSlug
                  return (
                    <span className="team-card__player team-card__player--badged">
                      {/* A button, because on a phone the badge appears on tap and
                       * a tap needs a control; on desktop CSS shows it on hover
                       * and focus regardless of this state. */}
                      <button
                        type="button"
                        className="team-card__player-name"
                        aria-expanded={open}
                        onClick={() =>
                          setShowing(open ? null : line.playerSlug)
                        }
                      >
                        {line.name}
                      </button>
                      <span
                        className={`team-card__player-badge${open ? ' team-card__player-badge--open' : ''}`}
                      >
                        <img
                          src={badge}
                          alt=""
                          width={128}
                          height={128}
                          loading="lazy"
                        />
                      </span>
                    </span>
                  )
                })()}
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
