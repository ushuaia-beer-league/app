import { useEffect, useState } from 'react'
import {
  COMPETITION_LABELS,
  competitionLabel,
} from '../components/competitions'
import type { CompetitionKey } from '../data/types'
import {
  loadTeamsPage,
  saveRoster,
  saveTeam,
  type Result,
} from './adminQueries'
import { ROLE_NAMES } from './adminsDraft'
import {
  draftFromTeam,
  emptyRosterAddDraft,
  emptyTeamDraft,
  JERSEY_MAX,
  JERSEY_MIN,
  personName,
  personPicks,
  rosterAddProblems,
  rosterAddWarnings,
  rosterDraftFor,
  rosterPartsOf,
  rosterProblems,
  rosterWarnings,
  rosterWrites,
  slugFor,
  sortedRoster,
  sortedTeams,
  teamProblems,
  teamSavePlan,
  withAddedPerson,
  withSavedRosterParts,
  type RosterAddDraft,
  type RosterDraft,
  type RosterSaveReport,
  type RosterWrites,
  type TeamDraft,
  type TeamRecord,
  type TeamSavePlan,
  type TeamsPage,
} from './teamsDraft'
import { can, type AdminRole } from './useAdminSession'
import './TeamsAdminScreen.css'

interface TeamsAdminScreenProps {
  /** The signed-in person's role, so the screen can say why it offers no form. */
  role: AdminRole
  /** The season whose rosters are being edited. */
  year: number
  /**
   * How the teams reach the database. Props, so the screen can be driven by
   * fakes: every write here is allowed or refused by row level security and
   * refused again by two unique constraints, and none of that can be exercised
   * against a database this panel cannot reach from a test.
   */
  load?: (year: number) => Promise<Result<TeamsPage>>
  saveOne?: (plan: TeamSavePlan) => Promise<Result<null>>
  saveRosterRows?: (writes: RosterWrites) => Promise<RosterSaveReport>
}

/** The outcome of the last write, in the language of the person who asked. */
interface Notice {
  tone: 'ok' | 'bad'
  text: string
}

/**
 * Teams, and who is in each one this season.
 *
 * A team belongs to exactly one competition, and that is the fact the whole screen
 * is arranged around. `teams` carries a composite unique on `(id,
 * competition_key)` because the rosters and the fixture reference the pair, so
 * moving a team between competitions would leave every row that names it pointing
 * at a pair that no longer exists. The competition is therefore chosen once, when
 * the team is created, and the edit form says out loud why it cannot be changed
 * afterwards. `teamEdit()` has no such column, so it is unwritable rather than
 * merely unoffered.
 *
 * Nothing here deletes. A team is retired by clearing `active`, because `players`
 * and `team_players` reference it with `on delete restrict` and last season still
 * has to show who played in it.
 *
 * The roster is per season and per competition, and two things the league's own
 * sheets do are allowed rather than blocked: a jersey number that repeats inside a
 * team, which the 2026 Hantachoppers roster does with number 28, and a roster entry
 * with no number at all, which the 2026 Blancaspuma roster has. Both warn. Neither
 * refuses, because refusing would mean inventing a number the league never wrote.
 *
 * What is refused is the same person twice in one competition, which
 * `team_players_one_team_per_competition_unique` would refuse anyway; the form says
 * which team already holds them, because a constraint name is not an answer
 * anybody can act on. Across competitions it is legal and common: the four WUBL
 * teams draw their players from several Beer League teams, so a woman is on a Beer
 * League roster and on a WUBL roster at once, with different teams and possibly
 * different numbers.
 *
 * A person the league does not know yet is created from here, with a name and
 * nothing else. `players` has no national ID, date of birth, phone number, home
 * address or payment column, the registration sheets this data comes from are full
 * of them, and there is no field for one on this screen.
 */
export function TeamsAdminScreen({
  role,
  year,
  load = loadTeamsPage,
  saveOne = saveTeam,
  saveRosterRows = saveRoster,
}: TeamsAdminScreenProps) {
  const [page, setPage] = useState<TeamsPage | null>(null)
  const [because, setBecause] = useState<string | null>(null)
  const [competition, setCompetition] = useState<CompetitionKey>('beer')
  /** The team being edited, or null while the form is a new one. */
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<TeamDraft>(() => emptyTeamDraft('beer'))
  /** Whether the slug still follows the name, which it stops doing once touched. */
  const [slugTouched, setSlugTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  /** The team whose roster is open, or null while none is. */
  const [openRoster, setOpenRoster] = useState<string | null>(null)
  const [baseline, setBaseline] = useState<RosterDraft>({
    entries: [],
    newPeople: [],
  })
  const [roster, setRoster] = useState<RosterDraft>({
    entries: [],
    newPeople: [],
  })
  const [add, setAdd] = useState<RosterAddDraft>(emptyRosterAddDraft)
  const [rosterReport, setRosterReport] = useState<RosterSaveReport | null>(
    null,
  )

  useEffect(() => {
    let current = true

    void load(year).then((result) => {
      if (!current) return
      if (result.ok) setPage(result.data)
      else setBecause(result.because)
    })

    return () => {
      current = false
    }
  }, [load, year])

  const canWrite = can(role, 'sport')

  const header = (
    <header className="teams__header">
      <h1 className="teams__title">Equipos y planteles</h1>
      <p className="teams__lead">
        Cada equipo pertenece a una sola competencia, y el plantel es por
        temporada: acá se edita el de {year}.
      </p>
      <p className="teams__lead">
        Los equipos no se borran, se dan de baja. Los resultados y los planteles
        de las temporadas que ya pasaron los siguen nombrando, y la base no deja
        borrar una fila que otra fila necesita.
      </p>
    </header>
  )

  if (because !== null) {
    return (
      <section className="teams">
        {header}
        <p className="teams__error" role="alert">
          No pudimos leer los equipos: {because}
        </p>
      </section>
    )
  }

  if (page === null) {
    return (
      <section className="teams">
        {header}
        <p className="teams__waiting" aria-live="polite">
          Cargando los equipos…
        </p>
      </section>
    )
  }

  const rows = sortedTeams(
    page.teams.filter((team) => team.competition === competition),
  )
  const problems = teamProblems(draft, page.teams, editing)
  const editingTeam = page.teams.find((team) => team.id === editing) ?? null
  const rosterTeam = page.teams.find((team) => team.id === openRoster) ?? null

  /** Only once something was typed: a form that opens complaining is not a panel. */
  const shown =
    draft.shortName.trim() === '' && draft.slug.trim() === '' ? [] : problems

  const startNew = (key: CompetitionKey) => {
    setEditing(null)
    setDraft(emptyTeamDraft(key))
    setSlugTouched(false)
    setNotice(null)
  }

  const countOf = (teamId: string) =>
    page.roster.filter((entry) => entry.teamId === teamId && entry.active)
      .length

  const onSaveTeam = async () => {
    if (busy || problems.length > 0) return

    const plan = teamSavePlan(draft, page.teams, editing)
    if (plan === null) {
      setNotice({
        tone: 'ok',
        text: 'No cambiaste nada, así que no escribimos nada.',
      })
      return
    }

    setBusy(true)
    setNotice(null)
    const result = await saveOne(plan)

    // Re-read rather than patch: an insert generated an id the panel never saw,
    // and the roster below is edited by that id. If the read itself fails the
    // list stays as it was, so the message the operator has to act on survives.
    if (result.ok) {
      const again = await load(year)
      if (again.ok) setPage(again.data)
    }

    setBusy(false)

    if (result.ok) {
      setNotice({
        tone: 'ok',
        text:
          plan.teamId === null
            ? 'Guardamos el equipo nuevo.'
            : 'Guardamos los cambios del equipo.',
      })
      setEditing(null)
      setDraft(emptyTeamDraft(competition))
      setSlugTouched(false)
    } else {
      setNotice({ tone: 'bad', text: result.because })
    }
  }

  const openRosterOf = (team: TeamRecord) => {
    const fresh = rosterDraftFor(page, team.id)
    setOpenRoster(team.id)
    setBaseline(fresh)
    setRoster(fresh)
    setAdd(emptyRosterAddDraft())
    setRosterReport(null)
  }

  const onSaveRoster = async () => {
    if (busy || rosterTeam === null) return
    if (rosterProblems(page, roster).length > 0) return

    const writes = rosterWrites(page, rosterTeam, baseline, roster)
    if (rosterPartsOf(writes).length === 0) {
      setRosterReport({ saved: [], failed: [] })
      return
    }

    setBusy(true)
    setRosterReport(null)
    const result = await saveRosterRows(writes)
    setBaseline((current) =>
      withSavedRosterParts(current, roster, result.saved),
    )
    setRosterReport(result)
    setBusy(false)
  }

  const teamForm = (
    <form
      className="teams__form"
      onSubmit={(event) => {
        event.preventDefault()
        void onSaveTeam()
      }}
    >
      <h2 className="teams__subtitle">
        {editingTeam === null
          ? `Nuevo equipo de ${competitionLabel(draft.competition)}`
          : `Editar ${editingTeam.shortName}`}
      </h2>

      {/* The competition is the selector above the list, not a second pair of
          radios here: a team belongs to exactly one, it is chosen when the team
          is created, and after that it is not an edit at all. */}
      {editingTeam === null ? (
        <p className="teams__locked">
          Competencia: <b>{competitionLabel(draft.competition)}</b>. Se elige
          arriba, con el equipo todavía sin crear, porque después no se puede
          cambiar.
        </p>
      ) : (
        <p className="teams__locked">
          Competencia: <b>{competitionLabel(editingTeam.competition)}</b>. No se
          puede cambiar. Los planteles y el fixture apuntan al par equipo más
          competencia, así que mover un equipo de competencia dejaría huérfana
          cada fila que lo nombra. Si el equipo está en la competencia
          equivocada, dalo de baja y creá el correcto.
        </p>
      )}

      <p className="teams__field">
        <label htmlFor="teams-short-name">Nombre corto</label>
        <input
          autoComplete="off"
          id="teams-short-name"
          onChange={(event) => {
            const shortName = event.target.value
            setDraft((current) => ({
              ...current,
              shortName,
              // The slug follows the name until somebody corrects it, and then
              // it stops: an identifier the sources already use is not ours to
              // overwrite.
              slug: slugTouched ? current.slug : slugFor(shortName),
            }))
          }}
          type="text"
          value={draft.shortName}
        />
      </p>

      <p className="teams__field">
        <label htmlFor="teams-slug">Identificador</label>
        <input
          autoComplete="off"
          id="teams-slug"
          onChange={(event) => {
            setSlugTouched(true)
            setDraft((current) => ({ ...current, slug: event.target.value }))
          }}
          type="text"
          value={draft.slug}
        />
      </p>

      <p className="teams__hint">
        El identificador sale del nombre y se puede corregir. Es único en toda
        la liga, no solo en la competencia.
      </p>

      <p className="teams__field">
        <label htmlFor="teams-full-name">Nombre con sponsor (opcional)</label>
        <input
          autoComplete="off"
          id="teams-full-name"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              fullName: event.target.value,
            }))
          }
          type="text"
          value={draft.fullName}
        />
      </p>

      <p className="teams__field">
        <label htmlFor="teams-nickname">Apodo del cuadro (opcional)</label>
        <input
          autoComplete="off"
          id="teams-nickname"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              nickname: event.target.value,
            }))
          }
          type="text"
          value={draft.nickname}
        />
      </p>

      <p className="teams__field">
        <label htmlFor="teams-colour">Color (opcional)</label>
        <input
          autoComplete="off"
          id="teams-colour"
          onChange={(event) =>
            setDraft((current) => ({ ...current, colour: event.target.value }))
          }
          type="text"
          value={draft.colour}
        />
      </p>

      <p className="teams__hint">
        El color va como lo dicen las planillas, con palabras: «verde», «azul».
      </p>

      <p className="teams__field teams__field--wide">
        <label htmlFor="teams-logo">Dirección del escudo (opcional)</label>
        <input
          autoComplete="off"
          id="teams-logo"
          inputMode="url"
          onChange={(event) =>
            setDraft((current) => ({ ...current, logoUrl: event.target.value }))
          }
          type="text"
          value={draft.logoUrl}
        />
      </p>

      <label className="teams__choice" htmlFor="teams-active">
        <input
          checked={draft.active}
          id="teams-active"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              active: event.target.checked,
            }))
          }
          type="checkbox"
        />
        El equipo juega esta temporada
      </label>

      <p className="teams__hint">
        Destildar esto da el equipo de baja y no lo borra: sigue apareciendo en
        las temporadas que ya jugó.
      </p>

      {shown.length > 0 && (
        <div className="teams__problems">
          <ul>
            {shown.map((problem) => (
              <li key={problem.kind}>{problem.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="teams__actions">
        <button
          className="teams__save"
          disabled={busy || problems.length > 0}
          type="submit"
        >
          {busy
            ? 'Guardando…'
            : editingTeam === null
              ? 'Crear el equipo'
              : 'Guardar el equipo'}
        </button>

        {editingTeam !== null && (
          <button
            className="teams__cancel"
            disabled={busy}
            onClick={() => startNew(competition)}
            type="button"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )

  const rosterSection = (team: TeamRecord) => {
    const entries = sortedRoster(page, roster)
    const listProblems = rosterProblems(page, roster)
    const listWarnings = rosterWarnings(page, roster)
    const addProblems = rosterAddProblems(add, page, team)
    const addWarnings = rosterAddWarnings(add, page)
    const picks = personPicks(page, team, roster)
    const pending = rosterPartsOf(rosterWrites(page, team, baseline, roster))
    const addTouched = add.playerId !== '' || add.name.trim() !== ''

    return (
      <section className="teams__roster">
        <h2 className="teams__subtitle">
          Plantel de {team.shortName} · {page.year}
        </h2>

        <p className="teams__hint">
          Una persona juega en un solo equipo por competencia y por temporada.
          En la otra competencia sí puede jugar, con otro equipo y otro número:
          los planteles de la Women&apos;s Beer League se arman con jugadoras de
          varios equipos de la Beer League.
        </p>

        {entries.length === 0 && (
          <p className="teams__empty">
            Este plantel está vacío para {page.year}.
          </p>
        )}

        {entries.length > 0 && (
          <table className="teams__table">
            <caption>
              {entries.filter((entry) => entry.active).length} personas en el
              plantel
            </caption>
            <thead>
              <tr>
                <th scope="col">Número</th>
                <th scope="col">Persona</th>
                <th scope="col">En el plantel</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const who = personName(page, roster, entry.playerId)

                return (
                  <tr key={entry.id}>
                    <td>
                      <input
                        aria-label={`Número de ${who}`}
                        className="teams__number"
                        disabled={!canWrite || busy}
                        inputMode="numeric"
                        max={JERSEY_MAX}
                        min={JERSEY_MIN}
                        onChange={(event) => {
                          const jerseyNumber = event.target.value
                          setRosterReport(null)
                          setRoster((current) => ({
                            ...current,
                            entries: current.entries.map((each) =>
                              each.id === entry.id
                                ? { ...each, jerseyNumber }
                                : each,
                            ),
                          }))
                        }}
                        type="number"
                        value={entry.jerseyNumber}
                      />
                    </td>
                    <th scope="row">{who}</th>
                    <td>
                      {canWrite ? (
                        <button
                          aria-label={
                            entry.active
                              ? `Quitar a ${who} del plantel`
                              : `Devolver a ${who} al plantel`
                          }
                          className="teams__toggle"
                          disabled={busy}
                          onClick={() => {
                            setRosterReport(null)
                            setRoster((current) => ({
                              ...current,
                              entries: current.entries.map((each) =>
                                each.id === entry.id
                                  ? { ...each, active: !each.active }
                                  : each,
                              ),
                            }))
                          }}
                          type="button"
                        >
                          {entry.active ? 'Quitar' : 'Devolver'}
                        </button>
                      ) : (
                        <span className="teams__state">
                          {entry.active ? 'Sí' : 'Fuera'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {listWarnings.length > 0 && (
          <div className="teams__warning">
            <ul>
              {listWarnings.map((warning) => (
                <li key={warning.key}>{warning.message}</li>
              ))}
            </ul>
          </div>
        )}

        {listProblems.length > 0 && (
          <div className="teams__problems" role="alert">
            <ul>
              {listProblems.map((problem) => (
                <li key={problem.key}>{problem.message}</li>
              ))}
            </ul>
          </div>
        )}

        {canWrite && (
          <>
            <form
              className="teams__add"
              onSubmit={(event) => {
                event.preventDefault()
                if (addProblems.length > 0) return
                setRosterReport(null)
                setRoster((current) => withAddedPerson(current, add))
                setAdd(emptyRosterAddDraft())
              }}
            >
              <h3 className="teams__subtitle">Agregar al plantel</h3>

              <p className="teams__field">
                <label htmlFor="teams-person">Persona de la liga</label>
                <select
                  disabled={busy || add.name.trim() !== ''}
                  id="teams-person"
                  onChange={(event) =>
                    setAdd((current) => ({
                      ...current,
                      playerId: event.target.value,
                    }))
                  }
                  value={add.playerId}
                >
                  <option value="">Elegir…</option>
                  {picks.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.fullName}
                    </option>
                  ))}
                </select>
              </p>

              <p className="teams__field">
                <label htmlFor="teams-new-person">
                  O una persona nueva: nombre y apellido
                </label>
                <input
                  autoComplete="off"
                  disabled={busy || add.playerId !== ''}
                  id="teams-new-person"
                  onChange={(event) =>
                    setAdd((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  type="text"
                  value={add.name}
                />
              </p>

              <p className="teams__hint">
                De cada persona guardamos el nombre y nada más. No hay DNI, ni
                fecha de nacimiento, ni teléfono, ni dirección, ni estado de
                pago: la base no tiene esas columnas y este formulario tampoco.
              </p>

              <p className="teams__field">
                <label htmlFor="teams-new-number">Número (opcional)</label>
                <input
                  disabled={busy}
                  id="teams-new-number"
                  inputMode="numeric"
                  max={JERSEY_MAX}
                  min={JERSEY_MIN}
                  onChange={(event) =>
                    setAdd((current) => ({
                      ...current,
                      jerseyNumber: event.target.value,
                    }))
                  }
                  type="number"
                  value={add.jerseyNumber}
                />
              </p>

              <p className="teams__hint">
                El número puede faltar y puede repetirse dentro del equipo. Las
                dos cosas pasan en las planillas de la liga, así que las
                avisamos y las guardamos.
              </p>

              {addWarnings.length > 0 && (
                <div className="teams__warning">
                  <ul>
                    {addWarnings.map((warning) => (
                      <li key={warning.kind}>{warning.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {addTouched && addProblems.length > 0 && (
                <div className="teams__problems">
                  <ul>
                    {addProblems.map((problem) => (
                      <li key={problem.kind}>{problem.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                className="teams__cancel"
                disabled={busy || addProblems.length > 0}
                type="submit"
              >
                Sumar al plantel
              </button>
            </form>

            <div className="teams__actions">
              <button
                className="teams__save"
                disabled={busy || listProblems.length > 0}
                onClick={() => void onSaveRoster()}
                type="button"
              >
                {busy ? 'Guardando…' : 'Guardar el plantel'}
              </button>
            </div>

            {rosterReport !== null &&
              rosterReport.saved.length === 0 &&
              rosterReport.failed.length === 0 && (
                <p className="teams__saved" role="status">
                  No cambiaste nada, así que no escribimos nada.
                </p>
              )}

            {rosterReport !== null && rosterReport.saved.length > 0 && (
              <p className="teams__saved" role="status">
                Guardamos el plantel.
                {rosterReport.saved.includes('people') &&
                  ' Las personas nuevas quedaron creadas.'}
              </p>
            )}

            {rosterReport !== null && rosterReport.failed.length > 0 && (
              <div className="teams__refused" role="alert">
                {rosterReport.failed.map((failure) => (
                  <p key={failure.part}>
                    {failure.part === 'people'
                      ? `No pudimos crear a las personas nuevas, así que no tocamos el plantel: ${failure.because}`
                      : `No pudimos guardar el plantel: ${failure.because}`}
                  </p>
                ))}
                <p>Lo que cargaste sigue en pantalla.</p>
              </div>
            )}

            {pending.length > 0 && rosterReport === null && (
              <p className="teams__pending-note">
                Hay cambios sin guardar en este plantel.
              </p>
            )}
          </>
        )}
      </section>
    )
  }

  return (
    <section className="teams">
      {header}

      <fieldset className="teams__choices">
        <legend>Competencia</legend>
        {COMPETITION_LABELS.map((each) => (
          <label
            className="teams__choice"
            htmlFor={`teams-competition-${each.key}`}
            key={each.key}
          >
            <input
              checked={competition === each.key}
              id={`teams-competition-${each.key}`}
              name="teams-competition"
              onChange={() => {
                setCompetition(each.key)
                setOpenRoster(null)
                startNew(each.key)
              }}
              type="radio"
            />
            {each.label}
          </label>
        ))}
      </fieldset>

      <h2 className="teams__subtitle">
        Equipos de {competitionLabel(competition)}
      </h2>

      {rows.length === 0 && (
        <p className="teams__empty">
          Todavía no hay ningún equipo en {competitionLabel(competition)}. El
          primero es el que después sostiene el plantel y el fixture.
        </p>
      )}

      <ul className="teams__list">
        {rows.map((team) => (
          <li className="teams__row" key={team.id}>
            <span className="teams__name">
              {team.shortName}
              {team.fullName !== null && (
                <span className="teams__full">{team.fullName}</span>
              )}
            </span>

            <span className="teams__slug">{team.slug}</span>

            <span className="teams__count">
              {countOf(team.id)} en el plantel {page.year}
            </span>

            {!team.active && <span className="teams__state">De baja</span>}

            <button
              aria-label={`Ver el plantel de ${team.shortName}`}
              className="teams__edit"
              disabled={busy}
              onClick={() => openRosterOf(team)}
              type="button"
            >
              Plantel
            </button>

            {canWrite && (
              <button
                aria-label={`Editar ${team.shortName}`}
                className="teams__edit"
                disabled={busy}
                onClick={() => {
                  setNotice(null)
                  setEditing(team.id)
                  setDraft(draftFromTeam(team))
                  setSlugTouched(true)
                }}
                type="button"
              >
                Editar
              </button>
            )}
          </li>
        ))}
      </ul>

      {!canWrite && (
        <p className="teams__blocked">
          Tu rol es {ROLE_NAMES[role]}, así que podés ver los equipos y los
          planteles y no editarlos: la base solo acepta esos cambios de la
          gestión deportiva y de la administración general. No es el panel
          escondiendo un botón, es la política de la tabla.
        </p>
      )}

      {canWrite && teamForm}

      {notice !== null && (
        <p
          className={notice.tone === 'ok' ? 'teams__saved' : 'teams__refused'}
          role={notice.tone === 'ok' ? 'status' : 'alert'}
        >
          {notice.text}
        </p>
      )}

      {rosterTeam !== null && rosterSection(rosterTeam)}
    </section>
  )
}
