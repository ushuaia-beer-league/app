import type { PublishedScoringRow } from '../utils/published-statistics'
import { formatDate } from './dates'
import {
  PublishedMarksLegend,
  PublishedName,
  PublishedTeam,
} from './published-cells'
import './data-table.css'
import './ScoringTable.css'
import { useT } from '../i18n/useLanguage'

type ScoringTableProps = {
  /** Already ordered by `publishedScoringTable()`: points, then goals. */
  rows: readonly PublishedScoringRow[]
  /** The day the league published these totals, `YYYY-MM-DD`. */
  publishedOn: string
}

/**
 * The scoring leaders, as the league published them.
 *
 * This table is a transcription, not an aggregate: the sources carry season
 * totals per player and no record of a single goal, so there is nothing to derive
 * them from and no way to check them against our own matches. That is why the
 * table says the date they were published on instead of presenting them as
 * current, and why the two gaps in every line stay marked.
 *
 * The columns are the league's own, from its player statistics sheet: assists,
 * goals, points, in that order, with points being goals plus assists.
 */
export function ScoringTable({ rows, publishedOn }: ScoringTableProps) {
  const t = useT()
  if (rows.length === 0) {
    return (
      <p className="data-table__empty">
        {t('Todavía no hay goleadores publicados en esta competencia.')}
      </p>
    )
  }

  return (
    <div className="scoring">
      <p className="data-table__published">
        Totales publicados por la liga el {formatDate(publishedOn)}. No se
        calculan a partir de los partidos cargados en el sitio.
      </p>

      <div
        className="data-table-scroll"
        role="region"
        aria-label={t('Tabla de goleadores')}
        tabIndex={0}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{t('Jugador')}</th>
              <th scope="col">{t('Equipo')}</th>
              <th className="data-table__number" scope="col">
                A
              </th>
              <th className="data-table__number" scope="col">
                G
              </th>
              <th className="data-table__number" scope="col">
                PTS
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={`${row.name}-${row.team ?? 'sin-equipo'}`}>
                <th className="scoring__player" scope="row">
                  <PublishedName row={row} />
                </th>
                <td className="scoring__team">
                  <PublishedTeam row={row} />
                </td>
                <td className="data-table__number">{row.assists}</td>
                <td className="data-table__number">{row.goals}</td>
                <td className="data-table__number data-table__lead">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="data-table__legend">
        <li>
          <b>A · G · PTS</b> Asistencias, goles y puntos. Los puntos son los
          goles más las asistencias.
        </li>
        <PublishedMarksLegend />
      </ul>
    </div>
  )
}
