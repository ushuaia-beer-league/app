import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { SEED_2026 } from '../data/seed-2026'
import { AdminGate } from './AdminGate'
import { AdminsScreen } from './AdminsScreen'
import { MatchesScreen } from './MatchesScreen'
import { MatchSheetRoute } from './MatchSheetRoute'
import { PhotosScreen } from './PhotosScreen'
import { SeasonsScreen } from './SeasonsScreen'
import { SponsorsScreen } from './SponsorsScreen'
import { loadAdminMatches, type AdminMatch } from './adminQueries'
import { can, useAdminSession } from './useAdminSession'
import './AdminApp.css'

/**
 * The back office.
 *
 * Behind Google sign-in, and behind row level security, which is the part that
 * actually decides anything: this file hides what a role cannot use, and the
 * database refuses what a role cannot write. If the two ever disagree, the
 * database is right.
 *
 * The matches list, the match sheet, the seasons, the administrator list, the
 * sponsors and the gallery are built. TODO phase 4: the team, roster and fixture
 * forms. That screen is stubbed below so the route, the permissions and the shape
 * of the panel are real while it lands.
 */
export function AdminApp() {
  const { status, signIn, signOut, error } = useAdminSession()

  return (
    <AdminGate
      status={status}
      error={error}
      onSignIn={signIn}
      onSignOut={signOut}
    >
      {status.state === 'ready' && (
        <div className="admin">
          <header className="admin__bar">
            <p className="admin__brand">
              UBL <span className="admin__brand-rest">Administración</span>
            </p>

            <nav className="admin__nav" aria-label="Secciones del panel">
              <NavLink to="/admin" end>
                Partidos
              </NavLink>
              {can(status.role, 'sport') && (
                <NavLink to="/admin/equipos">Equipos</NavLink>
              )}
              {can(status.role, 'content') && (
                <NavLink to="/admin/sponsors">Sponsors</NavLink>
              )}
              {can(status.role, 'content') && (
                <NavLink to="/admin/fotos">Fotos</NavLink>
              )}
              {can(status.role, 'league') && (
                <NavLink to="/admin/temporadas">Temporadas</NavLink>
              )}
              {can(status.role, 'league') && (
                <NavLink to="/admin/administradores">Administradores</NavLink>
              )}
            </nav>

            <p className="admin__who">
              {status.email}
              <button
                className="admin__signout"
                type="button"
                onClick={() => void signOut()}
              >
                Salir
              </button>
            </p>
          </header>

          <main className="admin__main">
            <Routes>
              <Route path="/admin" element={<MatchesRoute />} />
              <Route
                path="/admin/partidos/:matchId"
                element={<MatchSheetRoute />}
              />
              <Route
                path="/admin/equipos"
                element={<Pending name="equipos y planteles" />}
              />
              <Route path="/admin/sponsors" element={<SponsorsScreen />} />
              <Route path="/admin/fotos" element={<PhotosScreen />} />
              <Route
                path="/admin/temporadas"
                element={<SeasonsScreen role={status.role} />}
              />
              <Route
                path="/admin/administradores"
                element={
                  <AdminsScreen email={status.email} role={status.role} />
                }
              />
              <Route path="*" element={<Pending name="esta pantalla" />} />
            </Routes>
          </main>
        </div>
      )}
    </AdminGate>
  )
}

/** The matches list, with its own loading and its own failure. */
function MatchesRoute() {
  const [matches, setMatches] = useState<readonly AdminMatch[] | null>(null)
  const [because, setBecause] = useState<string | null>(null)

  useEffect(() => {
    let current = true

    void loadAdminMatches(SEED_2026.season).then((result) => {
      if (!current) return
      if (result.ok) setMatches(result.data)
      else setBecause(result.because)
    })

    return () => {
      current = false
    }
  }, [])

  const teamName = (teamId: string) =>
    SEED_2026.teams.find((team) => team.slug === teamId)?.shortName ?? teamId

  if (because !== null) {
    return (
      <p className="admin__error" role="alert">
        No pudimos leer los partidos: {because}
      </p>
    )
  }

  if (matches === null) {
    return (
      <p className="admin__waiting" aria-live="polite">
        Cargando los partidos…
      </p>
    )
  }

  return <MatchesScreen matches={matches} teamName={teamName} />
}

function Pending({ name }: { name: string }) {
  return (
    <p className="admin__pending">
      Todavía no construimos {name}. La pantalla existe y la ruta funciona; lo
      que falta es el formulario.
    </p>
  )
}
