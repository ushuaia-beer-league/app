/**
 * The two cells the published tables share, and the note that explains them.
 *
 * The scoring table and the goalkeeping table carry the same two facts about the
 * person on the line: whether the name is the roster's spelling or the
 * truncation the sheet printed, and whether the line is a substitute rather than
 * a roster player. Both are marked, and a mark nobody can read is a decoration,
 * so the marks and their explanation live here together and cannot drift apart.
 *
 * Content only, never a `<td>`: the table that owns the column decides whether
 * the cell is a header or a data cell.
 */

import './data-table.css'

/** What both published row shapes have in common. */
type PublishedRow = {
  name: string
  nameIsPrinted: boolean
  team: string | null
  isSubstitute: boolean
}

/**
 * The person's name, marked when the name itself is unconfirmed. The statistics
 * sheets truncate ("Beltrami Ramir"), and a truncation nobody has checked is
 * shown as one instead of being passed off as the person's name.
 */
export function PublishedName({ row }: { row: PublishedRow }) {
  if (!row.nameIsPrinted) return row.name

  return (
    <>
      {row.name}
      <span className="data-table__mark" aria-hidden="true">
        *
      </span>
      {/* The asterisk means nothing out loud, so the mark is also spelled out for
       * a reader who cannot see it. The comma leads because the accessible name
       * of the cell is the two texts joined, and a comma reads as the pause the
       * join does not give. */}
      <span className="data-table__reader-only">, nombre sin confirmar</span>
    </>
  )
}

/**
 * The team cell exactly as the sheet printed it, plus the substitute badge.
 *
 * The printed text usually says it too ("Frozen Sucucho (sup)"), but not always
 * in the same words, so the badge is what a reader can rely on. A line with no
 * team at all is shown as the gap it is.
 */
export function PublishedTeam({ row }: { row: PublishedRow }) {
  return (
    <>
      {row.team === null ? (
        <span className="data-table__gap">Sin equipo</span>
      ) : (
        row.team
      )}
      {row.isSubstitute && (
        <>
          <span className="data-table__badge" aria-hidden="true">
            Sup
          </span>
          <span className="data-table__reader-only">, suplente</span>
        </>
      )}
    </>
  )
}

/**
 * What the two marks mean, as list items a table drops into its own legend.
 */
export function PublishedMarksLegend() {
  return (
    <>
      <li>
        <b>*</b> El nombre es el que imprime la planilla, que a veces lo corta.
        Nadie lo confirmó todavía.
      </li>
      <li>
        <b>Sup</b> Suplente: jugó ese partido sin integrar el plantel del
        equipo.
      </li>
    </>
  )
}
