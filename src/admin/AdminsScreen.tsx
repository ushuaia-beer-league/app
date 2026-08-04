import { useEffect, useState } from 'react'
import { addAdmin, changeAdmin, loadAdmins, type Result } from './adminQueries'
import {
  ADMIN_ROLES,
  adminLabel,
  adminProblems,
  adminRow,
  changedRow,
  emptyAdminDraft,
  isListed,
  ROLE_NAMES,
  ROLE_POWERS,
  sortedAdmins,
  type AdminDraft,
  type AdminRecord,
  type AdminRow,
} from './adminsDraft'
import type { AdminRole } from './useAdminSession'
import './AdminsScreen.css'

interface AdminsScreenProps {
  /** The signed-in person's role, so the screen can say why it offers no form. */
  role: AdminRole
  /**
   * Their own address. Used only to work out whether they are in the list they
   * are reading, and never printed: the panel's own bar already shows it once,
   * and once is enough for personal data.
   */
  email: string
  /**
   * How the list reaches the database. Props, so the screen can be driven by
   * fakes: every one of these is allowed or refused by row level security, and
   * both outcomes have to be exercised without a database to be refused by.
   */
  load?: () => Promise<Result<AdminRecord[]>>
  add?: (row: AdminRow) => Promise<Result<null>>
  change?: (row: AdminRow) => Promise<Result<null>>
}

/** The outcome of the last write, in the language of the person who asked. */
interface Notice {
  tone: 'ok' | 'bad'
  text: string
}

/**
 * Who administers the league, and with which of the three roles.
 *
 * Four things, and one of them deliberately missing. Somebody can be added by
 * their Google address, a role can be changed, access can be withdrawn and given
 * back, and nobody can be deleted. That last one is the table's decision:
 * `admins.active` carries the comment that access is withdrawn by clearing the
 * flag rather than by deleting the row, so the history of who could write
 * survives. There is no delete button below and no delete in `adminQueries.ts`.
 *
 * Two things about this list read as broken and are not, so the screen says both
 * out loud. The founding owner has no row: `private.admin_role()` answers for
 * that address from a hardcoded constant, which is what lets an empty table still
 * admit the first administrator and keeps the league from locking itself out of
 * its own panel. So the list can be empty while somebody is signed in as a
 * general administrator, and the person reading it may not appear in it.
 *
 * Only the general administrator may write here and `admins_insert_league_admin`
 * and `admins_update_league_admin` are what enforce it. Any other administrator
 * gets the list, which `admins_select_self_or_admin` allows them, and an
 * explanation instead of a form that would fail on submit. Nobody who is not an
 * administrator gets this far: the panel is behind the gate, `anon` holds no
 * privilege on the table at all, and no policy names it.
 *
 * Every address on this screen is personal data. None of them reaches a log, a
 * route, a query string or a DOM id; the writes carry the address in the request
 * body, and the panel has no console call anywhere.
 */
export function AdminsScreen({
  role,
  email,
  load = loadAdmins,
  add = addAdmin,
  change = changeAdmin,
}: AdminsScreenProps) {
  const [admins, setAdmins] = useState<readonly AdminRecord[] | null>(null)
  const [because, setBecause] = useState<string | null>(null)
  const [draft, setDraft] = useState<AdminDraft>(emptyAdminDraft)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    let current = true

    void load().then((result) => {
      if (!current) return
      if (result.ok) setAdmins(result.data)
      else setBecause(result.because)
    })

    return () => {
      current = false
    }
  }, [load])

  const canWrite = role === 'general_administrator'

  const roles = (
    <table className="admins__roles-table">
      <caption>Los tres roles de la liga</caption>
      <thead>
        <tr>
          <th scope="col">Rol</th>
          <th scope="col">Qué puede hacer</th>
        </tr>
      </thead>
      <tbody>
        {ADMIN_ROLES.map((each) => (
          <tr key={each}>
            <th scope="row">{ROLE_NAMES[each]}</th>
            <td>{ROLE_POWERS[each]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const header = (
    <header className="admins__header">
      <h1 className="admins__title">Administradores</h1>
      <p className="admins__lead">
        Cada persona que administra la liga entra con su propia cuenta de
        Google. No hay contraseña compartida y no hay una cuenta que se pase de
        mano en mano.
      </p>
      <p className="admins__lead">
        Retirar el acceso no borra a nadie: la fila queda marcada sin acceso,
        porque la liga tiene que poder saber quién pudo escribir. Por eso acá no
        hay forma de borrar a nadie.
      </p>
    </header>
  )

  if (because !== null) {
    return (
      <section className="admins">
        {header}
        <p className="admins__error" role="alert">
          No pudimos leer la lista de administradores: {because}
        </p>
      </section>
    )
  }

  if (admins === null) {
    return (
      <section className="admins">
        {header}
        <p className="admins__waiting" aria-live="polite">
          Cargando la lista de administradores…
        </p>
      </section>
    )
  }

  const listed = isListed(admins, email)
  const rows = sortedAdmins(admins)
  const problems = adminProblems(draft, admins)

  /** A write, with its answer turned into one sentence either way. */
  const write = async (
    issue: () => Promise<Result<null>>,
    done: () => void,
    saidSo: string,
  ) => {
    if (busy) return

    setBusy(true)
    setNotice(null)
    const result = await issue()
    setBusy(false)

    if (result.ok) {
      done()
      setNotice({ tone: 'ok', text: saidSo })
    } else {
      setNotice({ tone: 'bad', text: result.because })
    }
  }

  const onAdd = async () => {
    if (problems.length > 0) return
    const row = adminRow(draft)

    await write(
      () => add(row),
      () => {
        // The database accepted exactly this row, so the list is caught up
        // without a second read. The free tier is the whole budget.
        setAdmins((current) => [
          ...(current ?? []),
          {
            email: row.email,
            role: row.role,
            displayName: row.display_name,
            active: row.active,
          },
        ])
        setDraft(emptyAdminDraft())
      },
      `Agregamos a la persona con el rol de ${ROLE_NAMES[row.role]}.`,
    )
  }

  const onChange = async (
    record: AdminRecord,
    moved: Partial<Pick<AdminRecord, 'role' | 'active'>>,
    saidSo: string,
  ) => {
    const row = changedRow(record, moved)

    await write(
      () => change(row),
      () =>
        setAdmins((current) =>
          (current ?? []).map((each) =>
            each.email === row.email
              ? { ...each, role: row.role, active: row.active }
              : each,
          ),
        ),
      saidSo,
    )
  }

  return (
    <section className="admins">
      {header}

      {roles}

      <h2 className="admins__subtitle">Quién administra hoy</h2>

      {rows.length === 0 && (
        <p className="admins__empty">
          La lista está vacía, y no es un error. La cuenta fundadora de la liga
          no tiene fila acá: su acceso está escrito en la base misma, para que
          la liga no pueda quedar afuera de su propio panel. Por eso una tabla
          vacía todavía admite a la primera persona.
        </p>
      )}

      {rows.length > 0 && !listed && (
        <p className="admins__empty">
          Tu cuenta no figura en esta lista, y está bien: ingresaste con la
          cuenta fundadora de la liga, cuyo acceso está escrito en la base en
          lugar de en esta tabla.
        </p>
      )}

      <ul className="admins__list">
        {rows.map((record) => {
          const who = adminLabel(record)

          return (
            <li className="admins__row" key={record.email}>
              <span className="admins__who">
                {who}
                {record.displayName !== null && (
                  <span className="admins__address">{record.email}</span>
                )}
              </span>

              <select
                aria-label={`Rol de ${who}`}
                className="admins__role"
                disabled={!canWrite || busy}
                onChange={(event) =>
                  void onChange(
                    record,
                    { role: event.target.value as AdminRole },
                    `Cambiamos el rol a ${ROLE_NAMES[event.target.value as AdminRole]}.`,
                  )
                }
                value={record.role}
              >
                {ADMIN_ROLES.map((each) => (
                  <option key={each} value={each}>
                    {ROLE_NAMES[each]}
                  </option>
                ))}
              </select>

              <span
                className={
                  record.active
                    ? 'admins__state admins__state--on'
                    : 'admins__state'
                }
              >
                {record.active ? 'Con acceso' : 'Sin acceso'}
              </span>

              {canWrite && (
                <button
                  aria-label={
                    record.active
                      ? `Retirar el acceso de ${who}`
                      : `Devolver el acceso a ${who}`
                  }
                  className="admins__toggle"
                  disabled={busy}
                  onClick={() =>
                    void onChange(
                      record,
                      { active: !record.active },
                      record.active
                        ? 'Retiramos el acceso. La fila queda en la lista.'
                        : 'Devolvimos el acceso.',
                    )
                  }
                  type="button"
                >
                  {record.active ? 'Retirar el acceso' : 'Devolver el acceso'}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {!canWrite && (
        <p className="admins__blocked">
          Tu rol es {ROLE_NAMES[role]}, así que podés ver esta lista y no
          modificarla: la base solo acepta cambios acá de la administración
          general. No es el panel escondiendo un botón, es la política de la
          tabla.
        </p>
      )}

      {canWrite && (
        <form
          className="admins__form"
          onSubmit={(event) => {
            event.preventDefault()
            void onAdd()
          }}
        >
          <h2 className="admins__subtitle">Agregar a alguien</h2>

          <p className="admins__hint">
            La dirección es la de Google con la que la persona va a ingresar. La
            guardamos en minúscula, que es como la base la pide.
          </p>

          <p className="admins__field">
            <label htmlFor="admins-email">Dirección de Google</label>
            <input
              autoComplete="off"
              id="admins-email"
              inputMode="email"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              type="email"
              value={draft.email}
            />
          </p>

          <p className="admins__field">
            <label htmlFor="admins-name">Nombre (opcional)</label>
            <input
              autoComplete="off"
              id="admins-name"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              type="text"
              value={draft.displayName}
            />
          </p>

          <fieldset className="admins__choices">
            <legend>Rol</legend>
            {ADMIN_ROLES.map((each) => (
              <label
                className="admins__choice"
                htmlFor={`admins-new-role-${each}`}
                key={each}
              >
                <input
                  checked={draft.role === each}
                  id={`admins-new-role-${each}`}
                  name="admins-new-role"
                  onChange={() =>
                    setDraft((current) => ({ ...current, role: each }))
                  }
                  type="radio"
                />
                {ROLE_NAMES[each]}
              </label>
            ))}
          </fieldset>

          {/* Only once something was typed: an empty form is not a mistake, and
              a form that opens complaining is not a panel. The button stays
              disabled either way. */}
          {draft.email.trim() !== '' && problems.length > 0 && (
            <div className="admins__problems">
              <ul>
                {problems.map((problem) => (
                  <li key={problem.kind}>{problem.message}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            className="admins__save"
            disabled={busy || problems.length > 0}
            type="submit"
          >
            {busy ? 'Guardando…' : 'Agregar'}
          </button>
        </form>
      )}

      {notice !== null && (
        <p
          className={notice.tone === 'ok' ? 'admins__saved' : 'admins__refused'}
          role={notice.tone === 'ok' ? 'status' : 'alert'}
        >
          {notice.text}
        </p>
      )}
    </section>
  )
}
