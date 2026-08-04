import { useEffect, useState } from 'react'
import { formatDate } from '../components/dates'
import {
  loadSeasonsAndCompetitions,
  saveSeason,
  type Result,
  type SeasonsAndCompetitions,
} from './adminQueries'
import { ROLE_NAMES } from './adminsDraft'
import {
  draftFromSeason,
  emptySeasonDraft,
  FIRST_SEASON_YEAR,
  LAST_SEASON_YEAR,
  SEASON_STATUS_NAMES,
  SEASON_STATUSES,
  seasonProblems,
  seasonSavePlan,
  seasonStandingDown,
  sortedSeasons,
  type CompetitionRecord,
  type SeasonDraft,
  type SeasonRecord,
  type SeasonSavePlan,
  type SeasonSaveReport,
} from './seasonsDraft'
import type { AdminRole } from './useAdminSession'
import './SeasonsScreen.css'

interface SeasonsScreenProps {
  /** The signed-in person's role, so the screen can say why it offers no form. */
  role: AdminRole
  /**
   * How the seasons reach the database. Props, so the screen can be driven by
   * fakes: the write is allowed or refused by row level security and refused
   * again by a unique index, and all of that has to be exercised without a
   * database.
   */
  load?: () => Promise<Result<SeasonsAndCompetitions>>
  save?: (plan: SeasonSavePlan) => Promise<SeasonSaveReport>
}

/** A season's calendar as far as it is known, which is often not at all. */
function when(season: SeasonRecord): string {
  const { startsOn, endsOn } = season

  if (startsOn === null) {
    return endsOn === null
      ? 'Sin fechas definidas'
      : `Hasta el ${formatDate(endsOn)}`
  }
  if (endsOn === null) return `Desde el ${formatDate(startsOn)}`

  return `Del ${formatDate(startsOn)} al ${formatDate(endsOn)}`
}

/**
 * The seasons, and the two competitions.
 *
 * A season is a year, two dates that may not be known yet, and a status. The
 * dates are nullable because a season is created before its calendar is fixed,
 * and the year is bounded at 2023 because that is when the league was founded.
 *
 * The interesting rule is that at most one season may be in curso, enforced by
 * `seasons_one_active_idx`. Postgres refuses the second active row rather than
 * choosing between them, so making a season active means finishing the current
 * one first. The screen says which season that is and what will happen to it
 * before the operator presses anything, the write does it in that order, and the
 * report says whether each of the two steps landed, because they are refused
 * separately.
 *
 * The competitions are shown and cannot be created. They are a two-row
 * vocabulary whose keys are the same literals as `CompetitionKey`, so a third one
 * is a change to that union, to `competitions_key_allowed` and to a migration, in
 * one commit. A form would not be able to do any of that.
 *
 * Only the general administrator may write either table, and
 * `seasons_insert_league_admin` and `seasons_update_league_admin` are what
 * enforce it. Any other administrator gets the list, which is public anyway, and
 * an explanation instead of a form that would fail on submit.
 */
export function SeasonsScreen({
  role,
  load = loadSeasonsAndCompetitions,
  save = saveSeason,
}: SeasonsScreenProps) {
  const [seasons, setSeasons] = useState<readonly SeasonRecord[] | null>(null)
  const [competitions, setCompetitions] = useState<
    readonly CompetitionRecord[]
  >([])
  const [because, setBecause] = useState<string | null>(null)
  /** The season being edited, or null while the form is a new one. */
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<SeasonDraft>(emptySeasonDraft)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<SeasonSaveReport | null>(null)

  useEffect(() => {
    let current = true

    void load().then((result) => {
      if (!current) return
      if (result.ok) {
        setSeasons(result.data.seasons)
        setCompetitions(result.data.competitions)
      } else {
        setBecause(result.because)
      }
    })

    return () => {
      current = false
    }
  }, [load])

  const canWrite = role === 'general_administrator'

  const header = (
    <header className="seasons__header">
      <h1 className="seasons__title">Temporadas y competencias</h1>
      <p className="seasons__lead">
        Una temporada es un año, sus fechas si ya están definidas, y en qué
        estado está. Las fechas pueden faltar: una temporada se crea antes de
        que el calendario exista.
      </p>
      <p className="seasons__lead">
        Solo una temporada puede estar en curso. El sitio elige sola la
        temporada actual, y eso únicamente tiene respuesta si hay una.
      </p>
    </header>
  )

  if (because !== null) {
    return (
      <section className="seasons">
        {header}
        <p className="seasons__error" role="alert">
          No pudimos leer las temporadas: {because}
        </p>
      </section>
    )
  }

  if (seasons === null) {
    return (
      <section className="seasons">
        {header}
        <p className="seasons__waiting" aria-live="polite">
          Cargando las temporadas…
        </p>
      </section>
    )
  }

  const rows = sortedSeasons(seasons)
  const problems = seasonProblems(draft, seasons, editing)
  const standing = seasonStandingDown(draft, seasons, editing)
  const editingYear = rows.find((season) => season.id === editing)?.year ?? null

  /* An empty year is not yet a mistake, so the form does not open complaining
   * about it. The save button is disabled either way. */
  const shown = problems.filter((problem) => problem.kind !== 'year-missing')

  const onSubmit = async () => {
    if (busy || problems.length > 0) return

    const plan = seasonSavePlan(draft, seasons, editing)
    if (plan === null) return

    setBusy(true)
    setReport(null)
    const result = await save(plan)

    // Re-read rather than patch, and only when something moved: an insert
    // generated an id the panel never saw, and standing a season down changed a
    // row this form was not editing, so after either of those the database is the
    // only thing that knows what the list looks like. A refusal that changed
    // nothing needs no request. If the read itself fails the list stays as it
    // was: replacing the screen with an error would throw away the report the
    // operator has to read.
    if (result.saved || result.stoodDown !== null) {
      const again = await load()
      if (again.ok) {
        setSeasons(again.data.seasons)
        setCompetitions(again.data.competitions)
      }
    }

    setReport(result)
    setBusy(false)

    if (result.saved) {
      setEditing(null)
      setDraft(emptySeasonDraft())
    }
  }

  return (
    <section className="seasons">
      {header}

      <h2 className="seasons__subtitle">Las temporadas cargadas</h2>

      {rows.length === 0 && (
        <p className="seasons__empty">
          Todavía no hay ninguna temporada cargada. La primera es la que después
          sostiene los equipos, el fixture y los resultados.
        </p>
      )}

      <ul className="seasons__list">
        {rows.map((season) => (
          <li className="seasons__row" key={season.id}>
            <span className="seasons__year">{season.year}</span>
            <span className="seasons__when">{when(season)}</span>
            <span
              className={
                season.status === 'active'
                  ? 'seasons__state seasons__state--active'
                  : 'seasons__state'
              }
            >
              {SEASON_STATUS_NAMES[season.status]}
            </span>
            {canWrite && (
              <button
                aria-label={`Editar la temporada ${season.year}`}
                className="seasons__edit"
                disabled={busy}
                onClick={() => {
                  setReport(null)
                  setEditing(season.id)
                  setDraft(draftFromSeason(season))
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
        <p className="seasons__blocked">
          Tu rol es {ROLE_NAMES[role]}, así que podés ver las temporadas y no
          crearlas ni editarlas: la base solo acepta esos cambios de la
          administración general. No es el panel escondiendo un botón, es la
          política de la tabla.
        </p>
      )}

      {canWrite && (
        <form
          className="seasons__form"
          onSubmit={(event) => {
            event.preventDefault()
            void onSubmit()
          }}
        >
          <h2 className="seasons__subtitle">
            {editingYear === null
              ? 'Nueva temporada'
              : `Editar la temporada ${editingYear}`}
          </h2>

          <p className="seasons__field">
            <label htmlFor="seasons-year">Año</label>
            <input
              id="seasons-year"
              inputMode="numeric"
              max={LAST_SEASON_YEAR}
              min={FIRST_SEASON_YEAR}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  year: event.target.value,
                }))
              }
              type="number"
              value={draft.year}
            />
          </p>

          <p className="seasons__field">
            <label htmlFor="seasons-starts">Empieza (opcional)</label>
            <input
              id="seasons-starts"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  startsOn: event.target.value,
                }))
              }
              type="date"
              value={draft.startsOn}
            />
          </p>

          <p className="seasons__field">
            <label htmlFor="seasons-ends">Termina (opcional)</label>
            <input
              id="seasons-ends"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  endsOn: event.target.value,
                }))
              }
              type="date"
              value={draft.endsOn}
            />
          </p>

          <fieldset className="seasons__choices">
            <legend>Estado</legend>
            {SEASON_STATUSES.map((status) => (
              <label
                className="seasons__choice"
                htmlFor={`seasons-status-${status}`}
                key={status}
              >
                <input
                  checked={draft.status === status}
                  id={`seasons-status-${status}`}
                  name="seasons-status"
                  onChange={() =>
                    setDraft((current) => ({ ...current, status }))
                  }
                  type="radio"
                />
                {SEASON_STATUS_NAMES[status]}
              </label>
            ))}
          </fieldset>

          {standing !== null && (
            <p className="seasons__warning">
              Al guardar, la temporada {standing.year} deja de estar en curso y
              queda finalizada. Solo puede haber una en curso a la vez, y la
              base rechaza la segunda en lugar de elegir cuál vale.
            </p>
          )}

          {shown.length > 0 && (
            <div className="seasons__problems">
              <ul>
                {shown.map((problem) => (
                  <li key={problem.kind}>{problem.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="seasons__actions">
            <button
              className="seasons__save"
              disabled={busy || problems.length > 0}
              type="submit"
            >
              {busy
                ? 'Guardando…'
                : editingYear === null
                  ? 'Crear la temporada'
                  : 'Guardar la temporada'}
            </button>

            {editing !== null && (
              <button
                className="seasons__cancel"
                disabled={busy}
                onClick={() => {
                  setEditing(null)
                  setDraft(emptySeasonDraft())
                  setReport(null)
                }}
                type="button"
              >
                Cancelar
              </button>
            )}
          </div>

          {report !== null && report.saved && (
            <p className="seasons__saved" role="status">
              Guardamos la temporada.
              {report.stoodDown !== null &&
                ` La temporada ${report.stoodDown} quedó finalizada, porque solo puede haber una en curso.`}
            </p>
          )}

          {report !== null && report.failed.length > 0 && (
            <div className="seasons__refused" role="alert">
              {report.failed.map((failure) => (
                <p key={failure.step}>
                  {failure.step === 'stand-down'
                    ? `No pudimos finalizar la temporada que estaba en curso, así que no tocamos la que estabas guardando: ${failure.because}`
                    : `No pudimos guardar la temporada: ${failure.because}`}
                </p>
              ))}
              {report.stoodDown !== null && !report.saved && (
                <p>
                  Ojo: la temporada {report.stoodDown} ya quedó finalizada. Si
                  no era eso lo que querías, volvé a ponerla en curso.
                </p>
              )}
              <p>Lo que cargaste sigue en pantalla.</p>
            </div>
          )}
        </form>
      )}

      <h2 className="seasons__subtitle">Competencias</h2>

      <p className="seasons__hint">
        Las competencias son un vocabulario fijo y no se crean desde acá:
        agregar una es cambiar el tipo <code>CompetitionKey</code>, la
        restricción de la base y la migración en el mismo commit, y eso no es un
        formulario.
      </p>

      {competitions.length === 0 && (
        <p className="seasons__empty">
          La base no devolvió ninguna competencia. Las dos que existen se cargan
          con la migración, así que si no están es que esta copia de la base
          todavía no la corrió.
        </p>
      )}

      <ul className="seasons__competitions">
        {competitions.map((competition) => (
          <li className="seasons__competition" key={competition.key}>
            <b className="seasons__competition-name">{competition.name}</b>
            {competition.description !== null && (
              <span className="seasons__competition-note">
                {competition.description}
              </span>
            )}
            {!competition.active && (
              <span className="seasons__state">Inactiva</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
