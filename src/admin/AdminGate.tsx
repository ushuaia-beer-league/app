import type { AdminStatus } from './useAdminSession'
import './AdminGate.css'

interface AdminGateProps {
  status: AdminStatus
  error: string | null
  onSignIn: () => void
  onSignOut: () => void
  children: React.ReactNode
}

/**
 * The five states the door can be in, and the one that lets somebody through.
 *
 * Hiding the panel is not what keeps the league's data safe: row level security
 * does that, in the database, for every write. This component only decides what
 * is worth putting on screen, which is why it can afford to be plain.
 */
export function AdminGate({
  status,
  error,
  onSignIn,
  onSignOut,
  children,
}: AdminGateProps) {
  if (status.state === 'loading') {
    return (
      <p className="admin-gate__waiting" aria-live="polite">
        Verificando tu ingreso…
      </p>
    )
  }

  if (status.state === 'unconfigured') {
    return (
      <div className="admin-gate">
        <h1 className="admin-gate__title">Panel de administración</h1>
        <p className="admin-gate__message">
          Esta versión del sitio se publicó sin la conexión a la base, así que
          todavía no hay nada a lo que ingresar. El sitio público funciona: está
          mostrando la última copia guardada de la temporada.
        </p>
      </div>
    )
  }

  if (status.state === 'not-an-admin') {
    return (
      <div className="admin-gate">
        <h1 className="admin-gate__title">Panel de administración</h1>
        <p className="admin-gate__message">
          Ingresaste con <b>{status.email}</b>, que no figura entre las personas
          que administran la liga. Si tendría que figurar, pedile a la
          administración general que te agregue.
        </p>
        <button
          className="admin-gate__button"
          type="button"
          onClick={onSignOut}
        >
          Salir
        </button>
      </div>
    )
  }

  if (status.state === 'signed-out') {
    return (
      <div className="admin-gate">
        <h1 className="admin-gate__title">Panel de administración</h1>
        <p className="admin-gate__message">
          Ingresá con la cuenta de Google que usás en la liga.
        </p>
        <button className="admin-gate__button" type="button" onClick={onSignIn}>
          Ingresar con Google
        </button>
        {error !== null && (
          <p className="admin-gate__error" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  return <>{children}</>
}
