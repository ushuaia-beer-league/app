import type { StandingsRow } from '../data/types'
import './data-table.css'
import './StandingsTable.css'
import { useT } from '../i18n/useLanguage'

/**
 * The one-point column, which is a different column in each competition rather
 * than the same one renamed. The Beer League sheet prints PPSO, games lost in a
 * shootout; the women's sheet prints "empate", games drawn. They count different
 * results, so the caller says which column its sheet has.
 */
type OnePointColumn = 'ppso' | 'empate'

type StandingsTableProps = {
  /** Already ordered by `standings()`: points, then PGR, then goal difference. */
  rows: readonly StandingsRow[]
  /** A team id as the league writes the team. */
  teamName: (teamId: string) => string
  onePointColumn?: OnePointColumn
}

/** The goal difference as the sheet writes it, with its sign. */
function withSign(goalDifference: number): string {
  return goalDifference > 0 ? `+${goalDifference}` : String(goalDifference)
}

function differenceClass(goalDifference: number): string {
  if (goalDifference > 0) return ' standings__difference--positive'
  if (goalDifference < 0) return ' standings__difference--negative'
  return ''
}

/**
 * The standings, in the league's own ten columns and in its own order.
 *
 * Nothing here counts anything. Every number in a row was produced by
 * `standings()` in `src/utils/standings.ts`, which owns the league's scale and
 * its tiebreakers; this file decides where the numbers sit and what the headers
 * are called. The headers are the sheet's own, down to the lower-case "empate".
 *
 * Ten columns do not fit a phone and none of them is dropped, because a reader
 * on a phone is entitled to the same table as a reader on a laptop. The columns
 * keep their width, the wrapper scrolls, and the team column stays put while it
 * does, so a row never loses the team it belongs to.
 */
export function StandingsTable({
  rows,
  teamName,
  onePointColumn = 'ppso',
}: StandingsTableProps) {
  const t = useT()
  if (rows.length === 0) {
    return (
      <p className="data-table__empty">
        {t('Todavía no hay partidos jugados en esta competencia.')}
      </p>
    )
  }

  return (
    <div className="standings">
      <p className="standings__hint">
        {t('Deslizá la tabla para ver todas las columnas.')}
      </p>

      <div
        className="data-table-scroll"
        role="region"
        aria-label={t('Tabla de posiciones')}
        tabIndex={0}
      >
        <table className="data-table standings__table">
          <thead>
            <tr>
              <th className="standings__team" scope="col">
                {t('Equipo')}
              </th>
              <th className="data-table__number" scope="col">
                PJ
              </th>
              <th className="data-table__number" scope="col">
                PUNTOS
              </th>
              <th className="data-table__number" scope="col">
                PG
              </th>
              <th className="data-table__number" scope="col">
                PP
              </th>
              <th className="data-table__number" scope="col">
                {onePointColumn === 'empate' ? 'empate' : 'PPSO'}
              </th>
              <th className="data-table__number" scope="col">
                PGR
              </th>
              <th className="data-table__number" scope="col">
                GA
              </th>
              <th className="data-table__number" scope="col">
                GE
              </th>
              <th className="data-table__number" scope="col">
                DIF
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.teamId}>
                <th className="standings__team" scope="row">
                  {teamName(row.teamId)}
                </th>
                <td className="data-table__number">{row.played}</td>
                <td className="data-table__number data-table__lead">
                  {row.points}
                </td>
                <td className="data-table__number">{row.wins}</td>
                <td className="data-table__number">{row.losses}</td>
                <td className="data-table__number">
                  {onePointColumn === 'empate' ? row.draws : row.shootoutLosses}
                </td>
                <td className="data-table__number">{row.regulationWins}</td>
                <td className="data-table__number">{row.goalsFor}</td>
                <td className="data-table__number">{row.goalsAgainst}</td>
                <td
                  className={`data-table__number${differenceClass(row.goalDifference)}`}
                >
                  {withSign(row.goalDifference)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="data-table__legend">
        <li>
          <b>PJ</b> Partidos jugados.
        </li>
        <li>
          <b>PG</b> Partidos ganados, en tiempo o en shootout.
        </li>
        <li>
          <b>PP</b> Partidos perdidos en tiempo.
        </li>
        {onePointColumn === 'empate' ? (
          <li>
            <b>empate</b> Partidos empatados. La planilla de la Women&apos;s
            Beer League tiene esta columna en lugar de PPSO.
          </li>
        ) : (
          <li>
            <b>PPSO</b> Partidos perdidos en el shootout (penales), que igual
            suman.
          </li>
        )}
        <li>
          <b>PGR</b> Partidos ganados fuera del shootout. Es el primer criterio
          de desempate.
        </li>
        <li>
          <b>GA · GE · DIF</b> Goles a favor, goles en contra y la diferencia
          entre los dos.
        </li>
        <li>
          El orden de la tabla es puntos, después PGR y después diferencia de
          gol.
        </li>
      </ul>
    </div>
  )
}
