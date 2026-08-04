import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  COMPETITION_LABELS,
  competitionLabel,
} from '../components/competitions'
import { formatWeekdayDate } from '../components/dates'
import { RESOLUTION_NAMES, STAGE_NAMES, VENUE_NAMES } from './adminLabels'
import { loadFixture, saveMatch, type Result } from './adminQueries'
import { ROLE_NAMES } from './adminsDraft'
import {
  draftFromMatch,
  emptyFixtureDraft,
  fixtureDays,
  fixtureNotes,
  fixtureProblems,
  hasScore,
  MATCH_STAGES,
  matchSavePlan,
  STANDINGS_STAGE,
  teamPicks,
  VENUES,
  withCompetition,
  type FixtureDraft,
  type FixturePage,
  type MatchSavePlan,
} from './fixtureDraft'
import { can, type AdminRole } from './useAdminSession'
import './FixtureScreen.css'

interface FixtureScreenProps {
  /** The signed-in person's role, so the screen can say why it offers no form. */
  role: AdminRole
  /** The season whose fixture is being edited. */
  year: number
  /**
   * How the fixture reaches the database. Props, so the screen can be driven by
   * fakes: the slot key, the composite foreign keys and row level security all
   * refuse things here, and none of that can be exercised against a database a
   * test cannot reach.
   */
  load?: (year: number) => Promise<Result<FixturePage>>
  save?: (plan: MatchSavePlan) => Promise<Result<null>>
}

/** The outcome of the last write, in the language of the person who asked. */
interface Notice {
  tone: 'ok' | 'bad'
  text: string
}

/**
 * The season's fixture: when each match is, where, and between whom.
 *
 * The structural fact this screen exists to get right is that **two matches run at
 * the same time, one in each cabecera**. The slot key is `(season, date, time,
 * venue)`, so the list shows the two cabeceras of an hour next to each other, a
 * second match at the same hour is not a conflict, and a second match in the same
 * hour *and* cabecera reads as "ya hay un partido a esa hora en esa cabecera"
 * rather than as a constraint name. A form that assumed one match per hour would
 * refuse half of every round.
 *
 * Three gaps are stored rather than filled in, because the league's own fixture
 * contains all three. The cabecera is optional: the 2026 semifinals, the finals and
 * the five all-star slots have none, and two rows with no cabecera at the same time
 * do not collide because Postgres treats nulls as distinct. Both teams are
 * optional: round 1 of 2026 holds a slot with a time, a cabecera and no teams, and
 * storing that hole is the point. One team may be missing on its own too.
 *
 * The teams a match may name are its own competition's, which the composite foreign
 * keys enforce, so the pickers offer nothing else and changing the competition
 * clears them instead of carrying an illegal pair into a write.
 *
 * There is no score here. The result, who played, the goals and the goalkeepers are
 * the match sheet's, and two ways to write one number is how they end up
 * disagreeing; the score is shown, and the row links to the sheet. `notes` are the
 * importer's English record of a gap in the sources and are shown for the same
 * reason and written for none.
 *
 * Only `regular` feeds the standings. The stage picker names all eight and says
 * which one counts.
 */
export function FixtureScreen({
  role,
  year,
  load = loadFixture,
  save = saveMatch,
}: FixtureScreenProps) {
  const [page, setPage] = useState<FixturePage | null>(null)
  const [because, setBecause] = useState<string | null>(null)
  /** The match being edited, or null while the form is a new one. */
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<FixtureDraft>(() =>
    emptyFixtureDraft('beer'),
  )
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

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
    <header className="fixture__header">
      <h1 className="fixture__title">Fixture</h1>
      <p className="fixture__lead">
        Se juegan dos partidos a la vez, uno en cada cabecera: Bahía y Poli. Dos
        partidos a la misma hora son lo normal; lo que la base no acepta son dos
        a la misma hora en la misma cabecera.
      </p>
      <p className="fixture__lead">
        La cabecera puede faltar, y los equipos también. Las semifinales, las
        finales y el juego de estrellas se cargan sin cabecera, y la primera
        fecha de 2026 tiene un horario reservado sin equipos. Todo eso se guarda
        tal cual.
      </p>
      <p className="fixture__lead">
        El resultado no se carga acá: eso es la planilla de cada partido. Desde
        cada fila se entra a la suya.
      </p>
    </header>
  )

  if (because !== null) {
    return (
      <section className="fixture">
        {header}
        <p className="fixture__error" role="alert">
          No pudimos leer el fixture: {because}
        </p>
      </section>
    )
  }

  if (page === null) {
    return (
      <section className="fixture">
        {header}
        <p className="fixture__waiting" aria-live="polite">
          Cargando el fixture…
        </p>
      </section>
    )
  }

  const teamName = (teamId: string) =>
    page.teams.find((team) => team.id === teamId)?.shortName ??
    'Equipo que no está en la base'

  const days = fixtureDays(page.matches)
  const problems = fixtureProblems(draft, page, editing, teamName)
  const notes = fixtureNotes(draft, page, editing)
  const picks = teamPicks(page, draft)
  const editingMatch =
    page.matches.find((match) => match.id === editing) ?? null

  /** A form nobody has filled in yet is not a mistake, so it opens quiet. */
  const shown = draft.date === '' && draft.time === '' ? [] : problems

  const startNew = () => {
    setEditing(null)
    setDraft(emptyFixtureDraft(draft.competition))
    setNotice(null)
  }

  const onSubmit = async () => {
    if (busy || problems.length > 0) return

    const plan = matchSavePlan(draft, page, editing)
    if (plan === null) {
      setNotice({
        tone: 'ok',
        text: 'No cambiaste nada, así que no escribimos nada.',
      })
      return
    }

    setBusy(true)
    setNotice(null)
    const result = await save(plan)

    // Re-read rather than patch, and only when something moved: an insert
    // generated an id the panel never saw, and the row links to the match sheet
    // by that id. A refusal that changed nothing needs no request. If the read
    // fails the list stays as it was, so the refusal the operator has to act on
    // is not replaced by a loading error.
    if (result.ok) {
      const again = await load(year)
      if (again.ok) setPage(again.data)
    }

    setBusy(false)

    if (result.ok) {
      setNotice({
        tone: 'ok',
        text:
          plan.matchId === null
            ? 'Guardamos el partido nuevo.'
            : 'Guardamos los cambios del partido.',
      })
      setEditing(null)
      setDraft(emptyFixtureDraft(draft.competition))
    } else {
      setNotice({ tone: 'bad', text: result.because })
    }
  }

  return (
    <section className="fixture">
      {header}

      <h2 className="fixture__subtitle">
        Los partidos de {page.year} · {page.matches.length} en total
      </h2>

      {days.length === 0 && (
        <p className="fixture__empty">
          Todavía no hay partidos cargados en {page.year}.
        </p>
      )}

      {days.map((day) => (
        <div className="fixture__day" key={day.date}>
          <h3 className="fixture__date">{formatWeekdayDate(day.date)}</h3>

          <ul className="fixture__list">
            {day.matches.map((match) => (
              <li className="fixture__row" key={match.id}>
                <span className="fixture__time">{match.time}</span>

                <span className="fixture__venue">
                  {match.venue === null
                    ? 'Sin cabecera'
                    : VENUE_NAMES[match.venue]}
                </span>

                <span className="fixture__teams">
                  {match.homeTeamId === null && match.awayTeamId === null ? (
                    <span className="fixture__unknown">
                      Horario reservado, sin equipos
                    </span>
                  ) : (
                    <>
                      {match.homeTeamId === null
                        ? 'Sin definir'
                        : teamName(match.homeTeamId)}
                      <span className="fixture__versus"> vs </span>
                      {match.awayTeamId === null
                        ? 'Sin definir'
                        : teamName(match.awayTeamId)}
                    </>
                  )}
                </span>

                <span className="fixture__stage">
                  {competitionLabel(match.competition)} ·{' '}
                  {STAGE_NAMES[match.stage]}
                </span>

                <span className="fixture__score">
                  {hasScore(match) ? (
                    <>
                      <b>
                        {match.homeGoals} - {match.awayGoals}
                      </b>
                      {match.resolution !== null && (
                        <span className="fixture__how">
                          {RESOLUTION_NAMES[match.resolution]}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="fixture__how">Sin resultado</span>
                  )}
                </span>

                <Link
                  className="fixture__sheet"
                  to={`/admin/partidos/${match.id}`}
                >
                  Planilla
                </Link>

                {canWrite && (
                  <button
                    aria-label={`Editar el partido de ${formatWeekdayDate(match.date)} a las ${match.time}`}
                    className="fixture__edit"
                    disabled={busy}
                    onClick={() => {
                      setNotice(null)
                      setEditing(match.id)
                      setDraft(draftFromMatch(match))
                    }}
                    type="button"
                  >
                    Editar
                  </button>
                )}

                {match.notes !== null && (
                  <span className="fixture__note">
                    La planilla original dice: {match.notes}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {!canWrite && (
        <p className="fixture__blocked">
          Tu rol es {ROLE_NAMES[role]}, así que podés ver el fixture y no
          editarlo: la base solo acepta esos cambios de la gestión deportiva y
          de la administración general. No es el panel escondiendo un botón, es
          la política de la tabla.
        </p>
      )}

      {canWrite && (
        <form
          className="fixture__form"
          onSubmit={(event) => {
            event.preventDefault()
            void onSubmit()
          }}
        >
          <h2 className="fixture__subtitle">
            {editingMatch === null ? 'Nuevo partido' : 'Editar el partido'}
          </h2>

          <fieldset className="fixture__choices">
            <legend>Competencia</legend>
            {COMPETITION_LABELS.map((each) => (
              <label
                className="fixture__choice"
                htmlFor={`fixture-competition-${each.key}`}
                key={each.key}
              >
                <input
                  checked={draft.competition === each.key}
                  id={`fixture-competition-${each.key}`}
                  name="fixture-competition"
                  onChange={() =>
                    setDraft((current) => withCompetition(current, each.key))
                  }
                  type="radio"
                />
                {each.label}
              </label>
            ))}
          </fieldset>

          <p className="fixture__hint">
            Cambiar la competencia vacía los dos equipos: un partido solo puede
            nombrar equipos de su propia competencia, y la base lo verifica con
            una clave compuesta.
          </p>

          <p className="fixture__field">
            <label htmlFor="fixture-date">Fecha</label>
            <input
              id="fixture-date"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
              type="date"
              value={draft.date}
            />
          </p>

          <p className="fixture__field">
            <label htmlFor="fixture-time">Hora</label>
            <input
              id="fixture-time"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  time: event.target.value,
                }))
              }
              type="time"
              value={draft.time}
            />
          </p>

          <p className="fixture__field">
            <label htmlFor="fixture-venue">Cabecera</label>
            <select
              id="fixture-venue"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  venue: event.target.value as FixtureDraft['venue'],
                }))
              }
              value={draft.venue}
            >
              <option value="">Sin asignar</option>
              {VENUES.map((venue) => (
                <option key={venue} value={venue}>
                  {VENUE_NAMES[venue]}
                </option>
              ))}
            </select>
          </p>

          <p className="fixture__field">
            <label htmlFor="fixture-stage">Instancia</label>
            <select
              id="fixture-stage"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  stage: event.target.value as FixtureDraft['stage'],
                }))
              }
              value={draft.stage}
            >
              {MATCH_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_NAMES[stage]}
                  {stage === STANDINGS_STAGE ? ' (suma puntos)' : ''}
                </option>
              ))}
            </select>
          </p>

          <p className="fixture__hint">
            Solo {STAGE_NAMES[STANDINGS_STAGE].toLowerCase()} entra en la tabla
            de posiciones. El repechaje define un lugar en los playoffs y la
            liga no lo cuenta como un séptimo partido de la fase regular.
          </p>

          <p className="fixture__field">
            <label htmlFor="fixture-home">Local</label>
            <select
              id="fixture-home"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  homeTeamId: event.target.value,
                }))
              }
              value={draft.homeTeamId}
            >
              <option value="">Sin definir</option>
              {picks.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.shortName}
                </option>
              ))}
            </select>
          </p>

          <p className="fixture__field">
            <label htmlFor="fixture-away">Visitante</label>
            <select
              id="fixture-away"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  awayTeamId: event.target.value,
                }))
              }
              value={draft.awayTeamId}
            >
              <option value="">Sin definir</option>
              {picks.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.shortName}
                </option>
              ))}
            </select>
          </p>

          {editingMatch !== null && (
            <p className="fixture__hint">
              El resultado de este partido se carga en su planilla, no acá.{' '}
              <Link to={`/admin/partidos/${editingMatch.id}`}>
                Abrir la planilla
              </Link>
              .
            </p>
          )}

          {notes.length > 0 && (
            <div className="fixture__warning">
              <ul>
                {notes.map((note) => (
                  <li key={note.kind}>{note.message}</li>
                ))}
              </ul>
            </div>
          )}

          {shown.length > 0 && (
            <div className="fixture__problems">
              <ul>
                {shown.map((problem) => (
                  <li key={problem.kind}>{problem.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="fixture__actions">
            <button
              className="fixture__save"
              disabled={busy || problems.length > 0}
              type="submit"
            >
              {busy
                ? 'Guardando…'
                : editingMatch === null
                  ? 'Crear el partido'
                  : 'Guardar el partido'}
            </button>

            {editingMatch !== null && (
              <button
                className="fixture__cancel"
                disabled={busy}
                onClick={startNew}
                type="button"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {notice !== null && (
        <p
          className={
            notice.tone === 'ok' ? 'fixture__saved' : 'fixture__refused'
          }
          role={notice.tone === 'ok' ? 'status' : 'alert'}
        >
          {notice.text}
        </p>
      )}
    </section>
  )
}
