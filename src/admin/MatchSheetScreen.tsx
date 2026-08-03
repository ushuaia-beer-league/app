import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatWeekdayDate } from '../components/dates'
import { goalsExceedScore, matchGaps } from '../utils/match-completeness'
import { formatSavePercentage } from '../utils/published-statistics'
import { RESOLUTION_NAMES, STAGE_NAMES, VENUE_NAMES } from './adminLabels'
import {
  draftCounts,
  draftFromSheet,
  draftMatch,
  draftProblems,
  goaliePicks,
  leaguePicks,
  legalResolutions,
  linePercentage,
  matchSheetWrites,
  nameOf,
  newGoal,
  partsOf,
  rosterPicks,
  scorerPicks,
  withFranchise,
  withSavedParts,
  type DraftGoal,
  type MatchSheetData,
  type MatchSheetDraft,
  type MatchSheetPart,
  type MatchSheetSaveReport,
  type MatchSheetWrites,
  type PickOption,
  type SheetTeam,
} from './matchSheetDraft'
import './MatchSheetScreen.css'

interface MatchSheetScreenProps {
  sheet: MatchSheetData
  /**
   * How the sheet reaches the database. A prop, so the screen can be driven by
   * a fake: every one of these writes is allowed or refused by row level
   * security and both outcomes have to be exercised.
   */
  save: (writes: MatchSheetWrites) => Promise<MatchSheetSaveReport>
}

const PART_NAMES: Record<MatchSheetPart, string> = {
  result: 'el resultado',
  players: 'quiénes jugaron',
  goals: 'los goles',
  goalkeepers: 'los arqueros',
}

/** "el resultado, los goles y los arqueros". */
function listed(items: readonly string[]): string {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

function pickLabel(pick: PickOption): string {
  return pick.jerseyNumber === null
    ? pick.name
    : `${pick.jerseyNumber} ${pick.name}`
}

/**
 * One match, as the person holding the paper sheet enters it.
 *
 * Four things, in the order the sheet is read: how it ended, who played, the
 * goals, the goalkeepers. Nothing else, because nothing else is written down. In
 * particular there is no penalty minute and no sanction anywhere on this screen:
 * discipline in this league is a penalty shot or leaving the game, and the
 * database has no column for either.
 *
 * What the screen refuses and what it merely says out loud are two different
 * things, and the difference is the whole design.
 *
 * It refuses to submit a state the database would reject: half a score, a draw
 * whose goals are not level, a decided result whose goals are, a second franchise
 * player, a goalkeeper who conceded more than they faced. Those come back from
 * `draftProblems()` as sentences, and the save button stays disabled while any of
 * them is true.
 *
 * It says out loud, and saves anyway, everything that is only a gap: a goal
 * nobody recorded a scorer for, a sheet with no goalkeepers yet, goals that do
 * not add up to the score. The league's data is like that, and refusing the save
 * would throw away what the operator does know.
 *
 * No total is ever written. The save percentage next to each goalkeeper is
 * computed while the numbers are typed and stored nowhere, because
 * `goalie_lines` has shots faced and goals against and no third column.
 */
export function MatchSheetScreen({ sheet, save }: MatchSheetScreenProps) {
  /** What the database held the last time it and this screen agreed. */
  const [baseline, setBaseline] = useState<MatchSheetDraft>(() =>
    draftFromSheet(sheet),
  )
  const [draft, setDraft] = useState<MatchSheetDraft>(() =>
    draftFromSheet(sheet),
  )
  const [saving, setSaving] = useState(false)
  const [report, setReport] = useState<MatchSheetSaveReport | null>(null)
  /** The person each side's picker is pointing at, before it is added. */
  const [pickedPlayer, setPickedPlayer] = useState<Record<string, string>>({})
  const [pickedGoalie, setPickedGoalie] = useState<Record<string, string>>({})

  /** Any edit makes the last save report stale, so it goes. */
  const edit = (change: (current: MatchSheetDraft) => MatchSheetDraft) => {
    setReport(null)
    setDraft(change)
  }

  const match = draftMatch(sheet, draft)
  const counts = draftCounts(draft)
  const gaps = matchGaps(match, counts)
  const contradiction = goalsExceedScore(match, counts)
  const problems = draftProblems(sheet, draft)
  const writes = matchSheetWrites(sheet.matchId, baseline, draft)
  const pending = partsOf(writes)

  const when = `${formatWeekdayDate(match.date)} · ${match.time}${
    match.venue === null ? '' : ` · ${VENUE_NAMES[match.venue]}`
  } · ${STAGE_NAMES[match.stage]}`

  const onSubmit = async () => {
    if (saving || problems.length > 0) return

    setSaving(true)
    const result = await save(writes)
    setBaseline((current) => withSavedParts(current, draft, result.saved))
    setReport(result)
    setSaving(false)
  }

  const header = (
    <header className="sheet__header">
      <Link className="sheet__back" to="/admin">
        Volver a los partidos
      </Link>
      <h1 className="sheet__title">
        {sheet.home === null || sheet.away === null
          ? 'Partido sin equipos'
          : `${sheet.home.shortName} vs ${sheet.away.shortName}`}
      </h1>
      <p className="sheet__when">{when}</p>
      {sheet.row.notes !== null && (
        <p className="sheet__note">La planilla dice: {sheet.row.notes}</p>
      )}
    </header>
  )

  // Nothing on this sheet can be entered without knowing who played whom: every
  // appearance, goal and goalkeeper line names a side. The fixture row exists and
  // is published with the gap showing; filling it is the organisation's call, not
  // the operator's.
  if (sheet.home === null || sheet.away === null) {
    return (
      <section className="sheet">
        {header}
        <p className="sheet__blocked">
          Esta fila del fixture todavía no tiene los dos equipos, así que no hay
          planilla que cargar. Los equipos se definen en el fixture; hasta
          entonces el partido se publica con el hueco a la vista.
        </p>
      </section>
    )
  }

  const sides: SheetTeam[] = [sheet.home, sheet.away]
  const sideName = (teamId: string) =>
    sides.find((side) => side.id === teamId)?.shortName ?? 'Equipo desconocido'

  const legal = legalResolutions(draft)

  const addPlayer = (side: SheetTeam, playerId: string) => {
    if (playerId === '') return

    // Somebody who is not on this season's roster is a substitute: that is what
    // a substitute is in this league, not a lesser kind of player.
    const onTheRoster = sheet.roster.some(
      (entry) => entry.teamId === side.id && entry.playerId === playerId,
    )

    edit((current) => ({
      ...current,
      appearances: [
        ...current.appearances,
        {
          playerId,
          teamId: side.id,
          isSubstitute: !onTheRoster,
          isFranchise: false,
        },
      ],
    }))
    setPickedPlayer((current) => ({ ...current, [side.id]: '' }))
  }

  const changeGoal = (goalId: string, change: Partial<DraftGoal>) =>
    edit((current) => ({
      ...current,
      goals: current.goals.map((goal) =>
        goal.id === goalId ? { ...goal, ...change } : goal,
      ),
    }))

  const addGoalie = (side: SheetTeam, playerId: string) => {
    if (playerId === '') return

    edit((current) => ({
      ...current,
      goalieLines: [
        ...current.goalieLines,
        { playerId, teamId: side.id, shotsFaced: '', goalsAgainst: '' },
      ],
    }))
    setPickedGoalie((current) => ({ ...current, [side.id]: '' }))
  }

  return (
    <section className="sheet">
      {header}

      <ul className="sheet__gaps">
        {contradiction && (
          <li className="sheet__gap sheet__gap--wrong">
            Hay más goles cargados que los del resultado
          </li>
        )}
        {gaps.map((gap) => (
          <li
            className={
              gap.needsTheLeague
                ? 'sheet__gap sheet__gap--league'
                : 'sheet__gap'
            }
            key={gap.kind}
          >
            {gap.label}
          </li>
        ))}
        {gaps.length === 0 && !contradiction && (
          <li className="sheet__gap sheet__gap--done">
            No falta nada en esta planilla
          </li>
        )}
      </ul>

      {match.venue === null && (
        <p className="sheet__hint">
          La cabecera de este partido se asigna en el fixture, no acá.
        </p>
      )}

      <form
        className="sheet__form"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit()
        }}
      >
        <fieldset className="sheet__block">
          <legend className="sheet__block-title">Resultado</legend>

          <div className="sheet__score">
            {sides.map((side, index) => (
              <p className="sheet__field" key={side.id}>
                <label htmlFor={`sheet-goals-${side.id}`}>
                  Goles de {side.shortName}
                </label>
                <input
                  id={`sheet-goals-${side.id}`}
                  inputMode="numeric"
                  min={0}
                  onChange={(event) =>
                    edit((current) =>
                      index === 0
                        ? { ...current, homeGoals: event.target.value }
                        : { ...current, awayGoals: event.target.value },
                    )
                  }
                  type="number"
                  value={index === 0 ? draft.homeGoals : draft.awayGoals}
                />
              </p>
            ))}
          </div>

          <p className="sheet__hint">
            Los dos goles o ninguno de los dos. Un partido que no se jugó o que
            nadie reportó queda sin resultado, y eso es una fila válida.
          </p>

          <fieldset className="sheet__resolutions">
            <legend>Cómo terminó</legend>

            <label className="sheet__choice" htmlFor="sheet-resolution-none">
              <input
                checked={draft.resolution === ''}
                id="sheet-resolution-none"
                name="sheet-resolution"
                onChange={() =>
                  edit((current) => ({ ...current, resolution: '' }))
                }
                type="radio"
              />
              Sin definir
            </label>

            {legal.map((resolution) => (
              <label
                className="sheet__choice"
                htmlFor={`sheet-resolution-${resolution}`}
                key={resolution}
              >
                <input
                  checked={draft.resolution === resolution}
                  id={`sheet-resolution-${resolution}`}
                  name="sheet-resolution"
                  onChange={() =>
                    edit((current) => ({ ...current, resolution }))
                  }
                  type="radio"
                />
                {RESOLUTION_NAMES[resolution]}
              </label>
            ))}

            {legal.length === 0 && (
              <p className="sheet__hint">
                Cargá los dos goles y el panel ofrece cómo terminó.
              </p>
            )}
            {legal.length === 1 && legal[0] === 'draw' && (
              <p className="sheet__hint">
                Los goles quedaron iguales, así que este partido terminó
                empatado. El empate es un resultado real de esta liga.
              </p>
            )}
          </fieldset>
        </fieldset>

        <fieldset className="sheet__block">
          <legend className="sheet__block-title">Quiénes jugaron</legend>

          <p className="sheet__hint">
            Los suplentes no están en el plantel: se buscan en el resto de la
            liga y quedan marcados como suplentes. De jugador franquicia solo
            puede haber uno en todo el partido.
          </p>

          <div className="sheet__sides">
            {sides.map((side) => {
              const listedHere = draft.appearances.filter(
                (appearance) => appearance.teamId === side.id,
              )
              const roster = rosterPicks(sheet, draft, side.id)
              const league = leaguePicks(sheet, draft)

              return (
                <div className="sheet__side" key={side.id}>
                  <h3 className="sheet__side-title">{side.shortName}</h3>

                  {listedHere.length === 0 && (
                    <p className="sheet__empty">
                      Todavía no cargaste a nadie de {side.shortName}.
                    </p>
                  )}

                  <ul className="sheet__rows">
                    {listedHere.map((appearance) => {
                      const person = nameOf(sheet, appearance.playerId)

                      return (
                        <li className="sheet__row" key={appearance.playerId}>
                          <span className="sheet__person">{person}</span>

                          <label className="sheet__flag">
                            <input
                              checked={appearance.isSubstitute}
                              onChange={(event) =>
                                edit((current) => ({
                                  ...current,
                                  appearances: current.appearances.map((row) =>
                                    row.playerId === appearance.playerId
                                      ? {
                                          ...row,
                                          isSubstitute: event.target.checked,
                                        }
                                      : row,
                                  ),
                                }))
                              }
                              type="checkbox"
                            />
                            Suplente
                          </label>

                          <label className="sheet__flag">
                            <input
                              checked={appearance.isFranchise}
                              onChange={(event) =>
                                edit((current) =>
                                  withFranchise(
                                    current,
                                    appearance.playerId,
                                    event.target.checked,
                                  ),
                                )
                              }
                              type="checkbox"
                            />
                            Franquicia
                          </label>

                          <button
                            aria-label={`Quitar a ${person}`}
                            className="sheet__remove"
                            onClick={() =>
                              edit((current) => ({
                                ...current,
                                appearances: current.appearances.filter(
                                  (row) => row.playerId !== appearance.playerId,
                                ),
                              }))
                            }
                            type="button"
                          >
                            Quitar
                          </button>
                        </li>
                      )
                    })}
                  </ul>

                  <p className="sheet__field">
                    <label htmlFor={`sheet-add-player-${side.id}`}>
                      Agregar a {side.shortName}
                    </label>
                    <select
                      id={`sheet-add-player-${side.id}`}
                      onChange={(event) =>
                        setPickedPlayer((current) => ({
                          ...current,
                          [side.id]: event.target.value,
                        }))
                      }
                      value={pickedPlayer[side.id] ?? ''}
                    >
                      <option value="">Elegí una persona</option>
                      {roster.length > 0 && (
                        <optgroup label="Plantel">
                          {roster.map((pick) => (
                            <option key={pick.playerId} value={pick.playerId}>
                              {pickLabel(pick)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {league.length > 0 && (
                        <optgroup label="Resto de la liga (suplente)">
                          {league.map((pick) => (
                            <option key={pick.playerId} value={pick.playerId}>
                              {pickLabel(pick)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </p>

                  <button
                    className="sheet__add"
                    onClick={() => addPlayer(side, pickedPlayer[side.id] ?? '')}
                    type="button"
                  >
                    Agregar jugador de {side.shortName}
                  </button>
                </div>
              )
            })}
          </div>

          <p className="sheet__hint">
            Si la persona no está en ninguna de las dos listas, hay que crearla
            en Equipos y planteles.
          </p>
        </fieldset>

        <fieldset className="sheet__block">
          <legend className="sheet__block-title">Goles</legend>

          <p className="sheet__hint">
            Si la planilla no dice quién hizo el gol, cargá el gol igual y dejá
            el goleador sin registrar. El hueco publicado es mejor que un nombre
            inventado.
          </p>

          {draft.goals.length === 0 && (
            <p className="sheet__empty">Todavía no cargaste ningún gol.</p>
          )}

          <ul className="sheet__rows">
            {draft.goals.map((goal, index) => {
              const options = scorerPicks(sheet, draft, goal.teamId)

              return (
                <li className="sheet__row sheet__row--goal" key={goal.id}>
                  <span className="sheet__person">{sideName(goal.teamId)}</span>

                  <span className="sheet__field">
                    <label htmlFor={`sheet-scorer-${goal.id}`}>Goleador</label>
                    <select
                      id={`sheet-scorer-${goal.id}`}
                      onChange={(event) =>
                        changeGoal(goal.id, { scorerId: event.target.value })
                      }
                      value={goal.scorerId}
                    >
                      <option value="">Sin registrar</option>
                      {options.map((pick) => (
                        <option key={pick.playerId} value={pick.playerId}>
                          {pick.name}
                        </option>
                      ))}
                    </select>
                  </span>

                  <span className="sheet__field">
                    <label htmlFor={`sheet-assist-${goal.id}`}>
                      Asistencia
                    </label>
                    <select
                      id={`sheet-assist-${goal.id}`}
                      onChange={(event) =>
                        changeGoal(goal.id, { assistId: event.target.value })
                      }
                      value={goal.assistId}
                    >
                      <option value="">Sin registrar</option>
                      {options
                        .filter((pick) => pick.playerId !== goal.scorerId)
                        .map((pick) => (
                          <option key={pick.playerId} value={pick.playerId}>
                            {pick.name}
                          </option>
                        ))}
                    </select>
                  </span>

                  {goal.scorerId === '' && (
                    <span className="sheet__gap">Gol sin goleador</span>
                  )}

                  <button
                    aria-label={`Quitar el gol ${index + 1} de ${sideName(goal.teamId)}`}
                    className="sheet__remove"
                    onClick={() =>
                      edit((current) => ({
                        ...current,
                        goals: current.goals.filter(
                          (row) => row.id !== goal.id,
                        ),
                      }))
                    }
                    type="button"
                  >
                    Quitar
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="sheet__adders">
            {sides.map((side) => (
              <button
                className="sheet__add"
                key={side.id}
                onClick={() =>
                  edit((current) => ({
                    ...current,
                    goals: [...current.goals, newGoal(side.id)],
                  }))
                }
                type="button"
              >
                Agregar gol de {side.shortName}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="sheet__block">
          <legend className="sheet__block-title">Arqueros</legend>

          <p className="sheet__hint">
            Los tiros recibidos están en la planilla. El porcentaje de atajadas
            no se guarda: se calcula sobre esos dos números cada vez que se lee.
          </p>

          <div className="sheet__sides">
            {sides.map((side) => {
              const linesHere = draft.goalieLines.filter(
                (line) => line.teamId === side.id,
              )
              const options = goaliePicks(sheet, draft, side.id)

              return (
                <div className="sheet__side" key={side.id}>
                  <h3 className="sheet__side-title">{side.shortName}</h3>

                  {linesHere.length === 0 && (
                    <p className="sheet__empty">
                      Todavía no cargaste el arquero de {side.shortName}.
                    </p>
                  )}

                  <ul className="sheet__rows">
                    {linesHere.map((line) => {
                      const person = nameOf(sheet, line.playerId)

                      return (
                        <li
                          className="sheet__row sheet__row--goalie"
                          key={line.playerId}
                        >
                          <span className="sheet__person">{person}</span>

                          <span className="sheet__field">
                            <label htmlFor={`sheet-shots-${line.playerId}`}>
                              Tiros recibidos
                            </label>
                            <input
                              id={`sheet-shots-${line.playerId}`}
                              inputMode="numeric"
                              min={0}
                              onChange={(event) =>
                                edit((current) => ({
                                  ...current,
                                  goalieLines: current.goalieLines.map((row) =>
                                    row.playerId === line.playerId
                                      ? {
                                          ...row,
                                          shotsFaced: event.target.value,
                                        }
                                      : row,
                                  ),
                                }))
                              }
                              type="number"
                              value={line.shotsFaced}
                            />
                          </span>

                          <span className="sheet__field">
                            <label htmlFor={`sheet-against-${line.playerId}`}>
                              Goles recibidos
                            </label>
                            <input
                              id={`sheet-against-${line.playerId}`}
                              inputMode="numeric"
                              min={0}
                              onChange={(event) =>
                                edit((current) => ({
                                  ...current,
                                  goalieLines: current.goalieLines.map((row) =>
                                    row.playerId === line.playerId
                                      ? {
                                          ...row,
                                          goalsAgainst: event.target.value,
                                        }
                                      : row,
                                  ),
                                }))
                              }
                              type="number"
                              value={line.goalsAgainst}
                            />
                          </span>

                          <span className="sheet__computed">
                            Atajadas{' '}
                            {formatSavePercentage(linePercentage(line))}
                          </span>

                          <button
                            aria-label={`Quitar el arquero ${person}`}
                            className="sheet__remove"
                            onClick={() =>
                              edit((current) => ({
                                ...current,
                                goalieLines: current.goalieLines.filter(
                                  (row) => row.playerId !== line.playerId,
                                ),
                              }))
                            }
                            type="button"
                          >
                            Quitar
                          </button>
                        </li>
                      )
                    })}
                  </ul>

                  <p className="sheet__field">
                    <label htmlFor={`sheet-add-goalie-${side.id}`}>
                      Agregar arquero de {side.shortName}
                    </label>
                    <select
                      id={`sheet-add-goalie-${side.id}`}
                      onChange={(event) =>
                        setPickedGoalie((current) => ({
                          ...current,
                          [side.id]: event.target.value,
                        }))
                      }
                      value={pickedGoalie[side.id] ?? ''}
                    >
                      <option value="">Elegí una persona</option>
                      {options.map((pick) => (
                        <option key={pick.playerId} value={pick.playerId}>
                          {pickLabel(pick)}
                        </option>
                      ))}
                    </select>
                  </p>

                  <button
                    className="sheet__add"
                    onClick={() => addGoalie(side, pickedGoalie[side.id] ?? '')}
                    type="button"
                  >
                    Agregar arquero de {side.shortName}
                  </button>
                </div>
              )
            })}
          </div>
        </fieldset>

        <div className="sheet__actions">
          {problems.length > 0 && (
            <div className="sheet__problems">
              <p className="sheet__problems-title">
                Antes de guardar hay que corregir esto:
              </p>
              <ul>
                {problems.map((problem, index) => (
                  // Two goalkeepers can raise the same kind, so the message's
                  // place in the list is what makes the key unique.
                  <li key={`${problem.kind}-${index}`}>{problem.message}</li>
                ))}
              </ul>
            </div>
          )}

          {contradiction && (
            <p className="sheet__warning">
              Los goles cargados no coinciden con el resultado. Podés guardar
              igual: la planilla de la liga a veces no cierra, y perder lo que
              sí sabés sería peor.
            </p>
          )}

          <button
            className="sheet__save"
            disabled={saving || problems.length > 0}
            type="submit"
          >
            {saving ? 'Guardando…' : 'Guardar la planilla'}
          </button>

          <p className="sheet__pending">
            {pending.length === 0
              ? 'No hay cambios sin guardar.'
              : `Falta guardar ${listed(pending.map((part) => PART_NAMES[part]))}.`}
          </p>

          {report !== null && report.saved.length > 0 && (
            <p className="sheet__saved" role="status">
              Guardamos {listed(report.saved.map((part) => PART_NAMES[part]))}.
            </p>
          )}

          {report !== null &&
            report.saved.length === 0 &&
            report.failed.length === 0 && (
              <p className="sheet__saved" role="status">
                No había nada nuevo para guardar.
              </p>
            )}

          {report !== null && report.failed.length > 0 && (
            <div className="sheet__refused" role="alert">
              {report.failed.map((failure) => (
                <p key={failure.part}>
                  No pudimos guardar {PART_NAMES[failure.part]}:{' '}
                  {failure.because}
                </p>
              ))}
              <p>
                Lo que cargaste sigue en pantalla. Podés volver a intentar sin
                cargarlo de nuevo.
              </p>
            </div>
          )}
        </div>
      </form>
    </section>
  )
}
