import {
  formatSavePercentage,
  type PublishedGoalkeepingRow,
} from '../utils/published-statistics'
import { formatDate } from './dates'
import {
  PublishedMarksLegend,
  PublishedName,
  PublishedTeam,
} from './published-cells'
import './data-table.css'
import './GoalkeepingTable.css'
import { useT } from '../i18n/useLanguage'

type GoalkeepingTableProps = {
  /** Already ordered by `publishedGoalkeepingTable()`: percentage, then shots. */
  rows: readonly PublishedGoalkeepingRow[]
  /** The day the league published these totals, `YYYY-MM-DD`. */
  publishedOn: string
}

/**
 * The goalkeepers, as the league published them.
 *
 * The percentage is never printed from the sheet and never rounded here:
 * `formatSavePercentage()` turns the ratio `publishedGoalkeepingTable()`
 * computed from shots faced and goals against into the whole number the league
 * prints, and a keeper who faced nothing gets a dash rather than a zero or a
 * hundred.
 *
 * The column names are the sheet's own, except the first: its statistics sheet
 * heads this table "Jugadores", which is the heading of the outfield table too,
 * so the goalkeepers get called goalkeepers here.
 */
export function GoalkeepingTable({ rows, publishedOn }: GoalkeepingTableProps) {
  const t = useT()
  if (rows.length === 0) {
    return (
      <p className="data-table__empty">
        {t('Todavía no hay arqueros publicados en esta competencia.')}
      </p>
    )
  }

  return (
    <div className="goalkeeping">
      <p className="data-table__published">
        Totales publicados por la liga el {formatDate(publishedOn)}. No se
        calculan a partir de los partidos cargados en el sitio.
      </p>

      <div
        className="data-table-scroll"
        role="region"
        aria-label={t('Tabla de arqueros')}
        tabIndex={0}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{t('Arquero')}</th>
              <th scope="col">{t('Equipo')}</th>
              <th className="data-table__number" scope="col">
                PJ
              </th>
              <th className="data-table__number" scope="col">
                Tiros recibidos
              </th>
              <th className="data-table__number" scope="col">
                Goles recibidos
              </th>
              <th className="data-table__number" scope="col">
                PA
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={`${row.name}-${row.team ?? 'sin-equipo'}`}>
                <th className="goalkeeping__player" scope="row">
                  <PublishedName row={row} />
                </th>
                <td className="goalkeeping__team">
                  <PublishedTeam row={row} />
                </td>
                <td className="data-table__number">{row.gamesPlayed}</td>
                <td className="data-table__number">{row.shotsFaced}</td>
                <td className="data-table__number">{row.goalsAgainst}</td>
                <td className="data-table__number data-table__lead">
                  {formatSavePercentage(row.savePercentage)}
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
          <b>PA</b> Porcentaje de atajadas sobre los tiros recibidos. Un arquero
          que no recibió tiros no tiene porcentaje y la tabla muestra un guión.
        </li>
        <PublishedMarksLegend />
      </ul>
    </div>
  )
}
