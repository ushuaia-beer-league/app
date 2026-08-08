import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { SEED_2026 } from '../data/seed-2026'
import { AdminGate } from './AdminGate'
import { AdminsScreen } from './AdminsScreen'
import { FixtureScreen } from './FixtureScreen'
import { MatchesScreen } from './MatchesScreen'
import { MatchSheetRoute } from './MatchSheetRoute'
import { PhotosScreen } from './PhotosScreen'
import { SeasonsScreen } from './SeasonsScreen'
import { SponsorsScreen } from './SponsorsScreen'
import { TeamsAdminScreen } from './TeamsAdminScreen'
import { VisitsScreen } from './VisitsScreen'
import { loadAdminMatches, type AdminMatch } from './adminQueries'
import { can, useAdminSession } from './useAdminSession'
import './AdminApp.css'
import { TextsScreen } from './TextsScreen'
import { ContactScreen } from './ContactScreen'

/**
 * The back office.
 *
 * Behind Google sign-in, and behind row level security, which is the part that
 * actually decides anything: this file hides what a role cannot use, and the
 * database refuses what a role cannot write. If the two ever disagree, the
 * database is right.
 *
 * The matches list, the match sheet, the teams and their rosters, the fixture, the
 * seasons, the administrator list, the sponsors and the gallery are built.
 *
 * The season every screen works on is the seed's, which is the year the panel and
 * the public site already agree about. When the seasons screen can make another
 * year current, this is the one line that has to read it from there instead.
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
              {can(status.role, 'sport') && (
                <NavLink to="/admin/fixture">Fixture</NavLink>
              )}
              {can(status.role, 'content') && (
                <NavLink to="/admin/sponsors">Sponsors</NavLink>
              )}
              {can(status.role, 'content') && (
                <NavLink to="/admin/fotos">Fotos</NavLink>
              )}
              {can(status.role, 'content') && (
                <NavLink to="/admin/textos">Textos</NavLink>
              )}
              {can(status.role, 'content') && (
                <NavLink to="/admin/contacto">Contacto</NavLink>
              )}
              {can(status.role, 'league') && (
                <NavLink to="/admin/temporadas">Temporadas</NavLink>
              )}
              {can(status.role, 'league') && (
                <NavLink to="/admin/administradores">Administradores</NavLink>
              )}
              {/* Every role may look: whether the site is used is not a sporting
               * decision and not a content one. */}
              <NavLink to="/admin/visitas">Visitas</NavLink>
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

          {/*
            Relative paths, every one of them, and that is not a style choice.
            `main.tsx` mounts this component under `/admin/*`, so this `Routes`
            is a descendant and matches against what is left of the path after
            the parent consumed `/admin`. An absolute `path="/admin/equipos"`
            here can never match anything, and the whole panel answers with the
            catch-all instead: every screen reads "todavía no construimos esta
            pantalla" while being perfectly built. It shipped that way once.
            The nav links stay absolute, because a link is resolved against the
            router's basename rather than against this route.
          */}
          <main className="admin__main">
            <Routes>
              <Route index element={<MatchesRoute />} />
              <Route path="partidos/:matchId" element={<MatchSheetRoute />} />
              <Route
                path="equipos"
                element={
                  <TeamsAdminScreen
                    role={status.role}
                    year={SEED_2026.season}
                  />
                }
              />
              {/* The team screens: `nuevo` and each team's slug resolve inside
                  the same component, which reads the param. */}
              <Route
                path="equipos/:slug"
                element={
                  <TeamsAdminScreen
                    role={status.role}
                    year={SEED_2026.season}
                  />
                }
              />
              <Route
                path="fixture"
                element={
                  <FixtureScreen role={status.role} year={SEED_2026.season} />
                }
              />
              <Route path="sponsors" element={<SponsorsScreen />} />
              <Route path="fotos" element={<PhotosScreen />} />
              <Route path="textos" element={<TextsScreen />} />
              <Route path="contacto" element={<ContactScreen />} />
              <Route
                path="temporadas"
                element={<SeasonsScreen role={status.role} />}
              />
              <Route
                path="administradores"
                element={
                  <AdminsScreen email={status.email} role={status.role} />
                }
              />
              <Route path="visitas" element={<VisitsScreen />} />
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

  // Named by the rows the database just answered, never by the seed: a team
  // renamed in the panel keeps its list naming it right, and a brand-new team
  // needs no redeploy to have a name.
  const names = new Map(
    (matches ?? []).flatMap((row) => {
      const pairs: [string, string][] = []
      if (row.match.homeTeamId !== null && row.names.home !== null)
        pairs.push([row.match.homeTeamId, row.names.home])
      if (row.match.awayTeamId !== null && row.names.away !== null)
        pairs.push([row.match.awayTeamId, row.names.away])
      return pairs
    }),
  )
  const teamName = (teamId: string) => names.get(teamId) ?? teamId

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
