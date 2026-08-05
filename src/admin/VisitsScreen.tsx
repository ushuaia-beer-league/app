import { useEffect, useState } from 'react'

import { loadVisits, type Result } from './adminQueries'
import { summariseVisits, type ViewCount } from './visitsSummary'
import './VisitsScreen.css'

/**
 * Visitas: whether anybody is using this.
 *
 * The site is static on GitHub Pages, so there are no server logs anywhere and
 * this table is the only answer the league can get. It counts a path and a day
 * and nothing else: no address, no browser, no session, nothing that could be
 * traced to a person, which is why the public site asks nobody for permission to
 * be counted.
 *
 * The screen says out loud what the numbers are worth. They are indicative: the
 * counter is a function anybody may call, a visitor whose browser blocks the
 * request is never counted, and the panel counts itself too. Presenting them as
 * audited traffic would be the dishonest part, not the counting.
 */
export function VisitsScreen({
  load = loadVisits,
}: {
  /** Test seam, and the same shape the other screens use. */
  load?: (days?: number) => Promise<Result<ViewCount[]>>
}) {
  const [counts, setCounts] = useState<readonly ViewCount[] | null>(null)
  const [because, setBecause] = useState<string | null>(null)

  useEffect(() => {
    let current = true

    void load(30).then((result) => {
      if (!current) return
      if (result.ok) setCounts(result.data)
      else setBecause(result.because)
    })

    return () => {
      current = false
    }
  }, [load])

  if (because !== null) {
    return (
      <p className="admin__error" role="alert">
        No pudimos leer las visitas: {because}
      </p>
    )
  }

  if (counts === null) {
    return (
      <p className="admin__waiting" aria-live="polite">
        Cargando las visitas…
      </p>
    )
  }

  const summary = summariseVisits(counts)

  return (
    <section className="visits">
      <h2 className="visits__title">Visitas</h2>

      <p className="visits__note">
        Últimos 30 días. Se cuenta qué pantalla se abrió y en qué día, nada más:
        no se guarda ninguna dirección, ningún navegador ni nada que se pueda
        atribuir a una persona. Por eso el sitio no le pide permiso a nadie.
      </p>

      {summary.rows.length === 0 ? (
        <p className="visits__empty">
          Todavía no hay ninguna visita registrada. Si el sitio se publicó
          recién, es lo esperable: solo se cuenta desde que esta versión está en
          línea.
        </p>
      ) : (
        <>
          <p className="visits__total">
            {summary.total === 1
              ? '1 visita en total'
              : `${summary.total} visitas en total`}
            {summary.latestDay !== null &&
              `, la última el ${summary.latestDay}`}
          </p>

          <div className="visits__scroll">
            <table className="visits__table">
              <caption className="data-table__reader-only">
                Visitas por pantalla en los últimos 30 días
              </caption>
              <thead>
                <tr>
                  <th scope="col">Pantalla</th>
                  <th scope="col">Total</th>
                  <th scope="col">Último día</th>
                  <th scope="col">Visto por última vez</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.total}</td>
                    <td>{row.today}</td>
                    <td>
                      {row.lastSeen ?? (
                        <span className="visits__gap">Nunca</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="visits__note visits__note--quiet">
        Los números son indicativos, no auditados. El contador es una función
        que cualquiera puede llamar, a quien tenga el navegador bloqueando
        pedidos no se lo cuenta, y el panel también se cuenta a sí mismo. Sirven
        para saber si la liga está usando el sitio, no para medir con precisión.
      </p>
    </section>
  )
}
