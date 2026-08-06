import { useEffect, useState } from 'react'

import { loadVisitFacts, loadVisits, type Result } from './adminQueries'
import {
  summariseVisitFacts,
  summariseVisits,
  type FactRow,
  type ViewCount,
  type VisitFactCount,
} from './visitsSummary'
import './VisitsScreen.css'

/**
 * Visitas: whether anybody is using this, and who in the loosest sense.
 *
 * The site is static on GitHub Pages, so there are no server logs anywhere and
 * these two tables are the only answer the league can get. Between them they hold
 * paths, days and counters, and no identifier of any kind.
 *
 * Recognising somebody who comes back normally means storing an identifier per
 * browser. That is not what happens here and the screen says so, because the
 * promise is easy to make and easy to break quietly: the browser keeps one date in
 * its own storage, compares it to today and sends a single word. Nothing to join,
 * nothing to leak.
 *
 * The screen also says what the numbers are not. They are indicative: the counters
 * are functions anybody may call, a browser that blocks the request is never
 * counted, one person with a phone and a laptop is two browsers, and the panel
 * counts itself. Presenting them as audited traffic would be the dishonest part,
 * not the counting.
 */
export function VisitsScreen({
  load = loadVisits,
  loadFacts = loadVisitFacts,
}: {
  /** Test seam, and the same shape the other screens use. */
  load?: (days?: number) => Promise<Result<ViewCount[]>>
  loadFacts?: (days?: number) => Promise<Result<VisitFactCount[]>>
}) {
  const [counts, setCounts] = useState<readonly ViewCount[] | null>(null)
  const [because, setBecause] = useState<string | null>(null)
  const [facts, setFacts] = useState<readonly VisitFactCount[] | null>(null)

  useEffect(() => {
    let current = true

    void load(30).then((result) => {
      if (!current) return
      if (result.ok) setCounts(result.data)
      else setBecause(result.because)
    })

    // Read apart from the one above, and allowed to fail on its own: the screen is
    // worth showing with either half missing, and one request failing must not
    // blank the other.
    void loadFacts(30).then((result) => {
      if (!current) return
      if (result.ok) setFacts(result.data)
    })

    return () => {
      current = false
    }
  }, [load, loadFacts])

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
  const who = facts === null ? null : summariseVisitFacts(facts)

  return (
    <section className="visits">
      <h2 className="visits__title">Visitas</h2>

      <p className="visits__note">
        Últimos 30 días. La base guarda contadores y nada más: ninguna
        dirección, ningún navegador, nada que se pueda atribuir a una persona.
        Para saber quién vuelve, el sitio deja <strong>una sola fecha</strong>{' '}
        guardada en el navegador de quien entra, y esa fecha no viaja a ninguna
        parte: el navegador la compara con hoy y manda una palabra, «primera
        vez» o «volvió».
      </p>

      {who !== null && who.entries > 0 && (
        <>
          <div className="visits__cards">
            <p className="visits__card">
              <span className="visits__card-number">{who.firstTime}</span>
              <span className="visits__card-label">
                {who.firstTime === 1
                  ? 'navegador entró por primera vez'
                  : 'navegadores entraron por primera vez'}
              </span>
            </p>
            <p className="visits__card">
              <span className="visits__card-number">{who.returns}</span>
              <span className="visits__card-label">
                {who.returns === 1
                  ? 'vez que alguien volvió otro día'
                  : 'veces que alguien volvió otro día'}
              </span>
            </p>
            <p className="visits__card">
              <span className="visits__card-number">{who.entries}</span>
              <span className="visits__card-label">
                {who.entries === 1 ? 'entrada al sitio' : 'entradas al sitio'}
              </span>
            </p>
          </div>

          <p className="visits__note visits__note--quiet">
            Ojo con leer «volvió» como personas: se cuenta una vez por día, así
            que alguien que entra cinco días distintos suma cinco. Dice cada
            cuánto vuelve la gente, no cuánta vuelve.
          </p>

          <div className="visits__splits">
            <Split title="Desde qué aparato" rows={who.devices} />
            <Split title="Por dónde llegaron" rows={who.referrers} />
            <Split title="En qué página entraron" rows={who.landings} />
          </div>
        </>
      )}

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
        Los números son indicativos, no auditados. Los contadores son funciones
        que cualquiera puede llamar, a quien tenga el navegador bloqueando
        pedidos no se lo cuenta, una persona con teléfono y computadora cuenta
        como dos, y el panel también se cuenta a sí mismo. Sirven para saber si
        la liga está usando el sitio, no para medir con precisión.
      </p>

      <p className="visits__note visits__note--quiet">
        No hay país ni ciudad, y es una decisión: saber de dónde entra alguien
        exige un servicio que lea la dirección de cada visitante, que cuesta
        plata y cuesta privacidad. Preferimos que esto siga siendo gratis y sin
        datos de nadie.
      </p>
    </section>
  )
}

/**
 * One breakdown. A bar and a number, because three lines of percentages are read
 * at a glance and a pie chart would need a library the site does not have.
 */
function Split({ title, rows }: { title: string; rows: readonly FactRow[] }) {
  if (rows.length === 0) return null

  return (
    <div className="visits__split">
      <h3 className="visits__split-title">{title}</h3>
      <ul className="visits__split-list">
        {rows.map((row) => (
          <li className="visits__split-row" key={row.value}>
            <span className="visits__split-label">{row.label}</span>
            <span
              className="visits__split-bar"
              // The bar is decoration; the number beside it is the fact, so a
              // reader with no styles loses nothing.
              style={{ width: `${row.share}%` }}
              aria-hidden="true"
            />
            <span className="visits__split-count">
              {row.visits}{' '}
              <span className="visits__split-share">({row.share}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
