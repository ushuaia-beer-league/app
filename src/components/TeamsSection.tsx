import { useMemo } from 'react'
import type { SeasonData } from '../data/season-source'
import { COMPETITION_LABELS } from './competitions'
import { teamRoster } from './rosters'
import { Section } from './Section'
import { TeamCard } from './TeamCard'
import './TeamsSection.css'
import { anchorFor } from '../utils/site-routes'
import { fill } from '../i18n/language'
import { useT } from '../i18n/useLanguage'

/**
 * The two competitions that have teams, in the order the league lists them.
 *
 * The labels are the organisation's own proper names, from the competitions row
 * of `docs/sources/ubl-functional-doc.md`, and they stay in English for the same
 * reason the commandments stay in Spanish. `CompetitionTabs` names them the same
 * way in a list of its own; the two should become one exported list, which is a
 * follow-up for whoever owns that file rather than an edit from here.
 *
 * MilkShake and All-Stars are left out because the league has not run them: they
 * have no teams, so they would only add two empty headings.
 */
// The same list the selector above the tables uses, so the two screens cannot
// end up calling one competition two things.
const COMPETITIONS = COMPETITION_LABELS

type TeamsSectionProps = {
  /** The season, from Supabase or from the versioned seed. */
  season: SeasonData
}

/**
 * Equipos: every team of the season, grouped by competition, each with its
 * roster.
 *
 * Both competitions are on the page at once rather than behind a selector. The
 * women's teams have no published roster and that gap is one of the things this
 * section exists to show, so putting it behind a click would hide the very fact
 * the organisation has to act on.
 *
 * Three things this section refuses to invent, all of them said in words on
 * screen rather than only in this comment:
 *
 * - the sponsored names were inferred by cross-checking the roster sheet against
 *   the standings and the playoff brackets, and the league has not confirmed one
 *   of them (open questions 1 and 2). Said once, here, instead of on seven
 *   cards;
 * - every crest is the league's own artwork, eleven of them, so no card is left
 *   with an empty frame. No sheet carries a team colour, so a colour is shown only
 *   where somebody confirmed one and nothing is inferred from the artwork: the same
 *   measurement that reads the women's badges correctly calls Blanco brown, because
 *   its identity is the palest thing in it;
 * - the four women's rosters are published nowhere, which is why their cards say
 *   so and still show the team.
 *
 * The roster itself is assembled by `teamRoster()`, which owns the ordering and
 * the two gaps the sheet leaves. Nothing is counted here.
 */
export function TeamsSection({ season }: TeamsSectionProps) {
  const t = useT()
  const blocks = useMemo(
    () =>
      COMPETITIONS.map((competition) => {
        const teams = season.teams
          .filter((team) => team.competition === competition.key)
          .map((team) => ({ team, roster: teamRoster(season, team) }))

        const withRoster = teams.filter(({ roster }) => roster.lines.length > 0)

        return {
          ...competition,
          teams,
          /**
           * True when not one team of the competition has a published roster.
           * Derived rather than hardcoded for the women's competition: the day
           * the league publishes those rosters, the notice goes away on its own.
           */
          noRosterPublished:
            teams.length > 0 &&
            teams.every(({ roster }) => roster.lines.length === 0),
          /**
           * True when the competition has rosters and not one number among them.
           *
           * That is what a roster taken from the statistics looks like: the league
           * publishes a roster sheet only for the Beer League, so the women's
           * rosters were assembled from the lines of the published tables, which
           * name a player and her team and never a number. Derived from the data
           * rather than declared, so it stops being said the day a real roster
           * sheet arrives with numbers on it.
           */
          rosterFromStatistics:
            withRoster.length > 0 &&
            withRoster.every(({ roster }) =>
              roster.lines.every((line) => line.jerseyNumber === null),
            ),
        }
      }),
    [season],
  )

  const someNameInferred = season.teams.some((team) => team.mappingInferred)

  return (
    <Section
      id={anchorFor('equipos')}
      eyebrow={fill(t('Temporada {year}'), { year: season.season })}
      title={t('Equipos')}
      tone="alt"
    >
      {someNameInferred && (
        <p className="teams__note">
          Los nombres con sponsor se dedujeron cruzando la planilla de planteles
          con la tabla de posiciones y las llaves de playoffs. La liga todavía
          no confirmó ninguno.
        </p>
      )}

      <p className="teams__note teams__note--quiet">
        Los once escudos son los que mandó la liga. El color de cada equipo no
        lo registra ninguna planilla: está cargado donde alguien lo confirmó y
        vacío donde no, y no lo deducimos del escudo.
      </p>

      {blocks.map((block) => (
        <section
          className="teams__competition"
          key={block.key}
          aria-labelledby={`equipos-${block.key}`}
        >
          <h3
            className={`teams__competition-title teams__competition-title--${block.key}`}
            id={`equipos-${block.key}`}
          >
            {block.label}
          </h3>

          {block.noRosterPublished && (
            <p className="teams__unpublished">
              {fill(
                t(
                  'Ninguna planilla de la liga publica los planteles de la {competition}.',
                ),
                { competition: block.label },
              )}
              {block.key === 'wubl' &&
                ' Cada equipo toma jugadoras de varios equipos de la Beer League, así que tampoco se pueden deducir de los planteles de arriba.'}
            </p>
          )}

          {block.rosterFromStatistics && (
            <p className="teams__unpublished">
              Ninguna planilla publica estos planteles: están armados con las
              líneas de las tablas de goleadoras y arqueras, que nombran a cada
              jugadora y a su equipo. Por eso no tienen números de camiseta, y
              algunos nombres aparecen cortados como los cortó la planilla.
              Falta quien no haya sumado ningún punto.
            </p>
          )}

          {block.teams.length === 0 ? (
            <p className="teams__empty">
              {t('Todavía no hay equipos cargados en esta competencia.')}
            </p>
          ) : (
            <ul className="teams__grid">
              {block.teams.map(({ team, roster }) => (
                <TeamCard key={team.slug} team={team} roster={roster} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </Section>
  )
}
