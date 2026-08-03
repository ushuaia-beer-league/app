import { Link } from 'react-router-dom'
import { formatWeekdayDate } from '../components/dates'
import { goalsExceedScore, matchGaps } from '../utils/match-completeness'
import type { AdminMatch } from './adminQueries'
import './MatchesScreen.css'

const VENUES = { bahia: 'Bahía', poli: 'Poli' } as const

const STAGES: Record<string, string> = {
  regular: 'Fase regular',
  playin: 'Repechaje',
  quarterfinal: 'Cuartos',
  semifinal: 'Semifinal',
  final: 'Final',
  'third-place': 'Tercer puesto',
  'fifth-place': 'Quinto puesto',
  'all-star': 'Juego de estrellas',
}

interface MatchesScreenProps {
  matches: readonly AdminMatch[]
  teamName: (teamId: string) => string
}

/**
 * The panel's front page: every match, and what each one still needs.
 *
 * Organised by match rather than by table, which is the shape already proven with
 * real operators on the CFM panel. Somebody sits down with a paper sheet and
 * wants to know where to start, so the matches missing something come first and
 * the ones nobody can fill without the league are marked as such rather than
 * shown as work.
 */
export function MatchesScreen({ matches, teamName }: MatchesScreenProps) {
  const rows = [...matches]
    .map((entry) => ({
      entry,
      gaps: matchGaps(entry.match, entry.counts),
      contradiction: goalsExceedScore(entry.match, entry.counts),
    }))
    .sort((a, b) => {
      // A contradiction is worse than a gap, and a gap an operator can close is
      // more urgent than one that needs the organisation to answer first.
      const rank = (row: typeof a) =>
        row.contradiction
          ? 0
          : row.gaps.some((gap) => !gap.needsTheLeague)
            ? 1
            : row.gaps.length > 0
              ? 2
              : 3

      return (
        rank(a) - rank(b) ||
        a.entry.match.date.localeCompare(b.entry.match.date) ||
        a.entry.match.time.localeCompare(b.entry.match.time)
      )
    })

  const pending = rows.filter(
    (row) => row.gaps.length > 0 || row.contradiction,
  ).length

  return (
    <section className="matches">
      <header className="matches__header">
        <h1 className="matches__title">Partidos</h1>
        <p className="matches__count">
          {pending === 0
            ? `${rows.length} partidos, todos completos.`
            : `${pending} de ${rows.length} partidos necesitan algo.`}
        </p>
      </header>

      {rows.length === 0 && (
        <p className="matches__empty">
          Todavía no hay partidos cargados en esta temporada.
        </p>
      )}

      <ul className="matches__list">
        {rows.map(({ entry, gaps, contradiction }) => {
          const { match } = entry
          const home =
            match.homeTeamId === null ? null : teamName(match.homeTeamId)
          const away =
            match.awayTeamId === null ? null : teamName(match.awayTeamId)

          return (
            <li className="matches__item" key={entry.id}>
              <Link
                className="matches__link"
                to={`/admin/partidos/${entry.id}`}
              >
                <span className="matches__when">
                  {formatWeekdayDate(match.date)} · {match.time}
                  {match.venue === null ? '' : ` · ${VENUES[match.venue]}`}
                </span>

                <span className="matches__teams">
                  {home === null || away === null ? (
                    <span className="matches__unknown">
                      Sin equipos en la planilla
                    </span>
                  ) : (
                    <>
                      {home}
                      {match.score === null ? (
                        <span className="matches__versus"> vs </span>
                      ) : (
                        <b className="matches__score">
                          {' '}
                          {match.score.home} - {match.score.away}{' '}
                        </b>
                      )}
                      {away}
                    </>
                  )}
                </span>

                <span className="matches__stage">
                  {STAGES[match.stage] ?? match.stage}
                </span>

                <span className="matches__gaps">
                  {contradiction && (
                    <b className="matches__gap matches__gap--wrong">
                      Hay más goles cargados que los del resultado
                    </b>
                  )}

                  {gaps.map((gap) => (
                    <span
                      className={
                        gap.needsTheLeague
                          ? 'matches__gap matches__gap--league'
                          : 'matches__gap'
                      }
                      key={gap.kind}
                    >
                      {gap.label}
                    </span>
                  ))}

                  {gaps.length === 0 && !contradiction && (
                    <span className="matches__gap matches__gap--done">
                      Completo
                    </span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      <p className="matches__legend">
        Lo marcado en gris necesita que la organización defina algo antes: los
        equipos de una fila que la planilla dejó en blanco, o los cruces que
        todavía dependen de un resultado.
      </p>
    </section>
  )
}
