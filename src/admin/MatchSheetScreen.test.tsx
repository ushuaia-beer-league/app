import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MatchRow } from '../data/season-source'
import { MatchSheetScreen } from './MatchSheetScreen'
import {
  partsOf,
  type MatchSheetData,
  type MatchSheetSaveReport,
  type MatchSheetWrites,
} from './matchSheetDraft'

const HOME = 'team-rock'
const AWAY = 'team-sucucho'
const MATCH = 'match-1'

const row = (overrides: Partial<MatchRow> = {}): MatchRow => ({
  id: MATCH,
  competition_key: 'beer',
  stage: 'regular',
  match_date: '2026-05-23',
  start_time: '21:30:00',
  venue: 'bahia',
  home_goals: null,
  away_goals: null,
  resolution: null,
  notes: null,
  home_team: { slug: 'rock-choppers' },
  away_team: { slug: 'sucucho' },
  ...overrides,
})

const sheet = (overrides: Partial<MatchSheetData> = {}): MatchSheetData => ({
  matchId: MATCH,
  row: row(),
  home: { id: HOME, slug: 'rock-choppers', shortName: 'Rock Choppers' },
  away: { id: AWAY, slug: 'sucucho', shortName: 'Sucucho' },
  players: [
    { id: 'p1', name: 'Aguirre Nahuel', active: true },
    { id: 'p2', name: 'Barrientos Luz', active: true },
    { id: 'p3', name: 'Cárdenas Ivo', active: true },
    { id: 'p4', name: 'Duarte Sol', active: true },
    { id: 'sub', name: 'Zapata Rocío', active: true },
  ],
  roster: [
    { playerId: 'p1', teamId: HOME, jerseyNumber: 9 },
    { playerId: 'p2', teamId: HOME, jerseyNumber: null },
    { playerId: 'p3', teamId: AWAY, jerseyNumber: 28 },
    { playerId: 'p4', teamId: AWAY, jerseyNumber: 1 },
  ],
  appearances: [],
  goals: [],
  goalieLines: [],
  ...overrides,
})

type Saver = (writes: MatchSheetWrites) => Promise<MatchSheetSaveReport>

/** A database that accepts everything, which is what row level security does
 * for the sporting management. */
const accepting = () =>
  vi.fn<Saver>(async (writes) => ({ saved: partsOf(writes), failed: [] }))

/** A database that answers with a fixed report, refusals included. */
const answering = (report: MatchSheetSaveReport) =>
  vi.fn<Saver>().mockResolvedValue(report)

const show = (
  data: MatchSheetData,
  save: ReturnType<typeof accepting> = accepting(),
) => {
  render(
    <MemoryRouter>
      <MatchSheetScreen save={save} sheet={data} />
    </MemoryRouter>,
  )
  return save
}

const saveButton = () =>
  screen.getByRole('button', { name: /Guardar la planilla|Guardando/ })

/** One of the four blocks of the sheet, by the heading the operator reads. */
const block = (title: string) => screen.getByRole('group', { name: title })

/** The row of the sheet that names somebody, inside the block that lists them. */
const rowIn = (title: string, person: string) =>
  within(block(title)).getByText(person).closest('li') as HTMLElement

/** Enters a result the way an operator would: two numbers and how it ended. */
const enterResult = (home: string, away: string, ending?: string) => {
  fireEvent.change(screen.getByLabelText('Goles de Rock Choppers'), {
    target: { value: home },
  })
  fireEvent.change(screen.getByLabelText('Goles de Sucucho'), {
    target: { value: away },
  })
  if (ending !== undefined) {
    fireEvent.click(screen.getByRole('radio', { name: ending }))
  }
}

const addFromPicker = (label: string, playerId: string, button: string) => {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value: playerId },
  })
  fireEvent.click(screen.getByRole('button', { name: button }))
}

describe('MatchSheetScreen', () => {
  it('names the match and everything its sheet still needs', () => {
    show(
      sheet({
        row: row({ home_goals: 9, away_goals: 6, resolution: 'regulation' }),
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Rock Choppers vs Sucucho' }),
    ).toBeVisible()
    expect(screen.getByText(/Sábado, 23 de mayo de 2026/)).toBeVisible()
    expect(screen.getByText('Falta quiénes jugaron')).toBeVisible()
    expect(screen.getByText('Faltan los 15 goles')).toBeVisible()
    expect(screen.getByText('Faltan los arqueros')).toBeVisible()
  })

  it('says so when a sheet is fully entered, and that there is nothing to save', () => {
    show(
      sheet({
        row: row({ home_goals: 1, away_goals: 0, resolution: 'regulation' }),
        appearances: [
          {
            playerId: 'p1',
            teamId: HOME,
            isSubstitute: false,
            isFranchise: false,
          },
          {
            playerId: 'p3',
            teamId: AWAY,
            isSubstitute: false,
            isFranchise: false,
          },
        ],
        goals: [{ id: 'g1', teamId: HOME, scorerId: 'p1', assistId: '' }],
        goalieLines: [
          { playerId: 'p2', teamId: HOME, shotsFaced: '5', goalsAgainst: '0' },
          { playerId: 'p4', teamId: AWAY, shotsFaced: '9', goalsAgainst: '1' },
        ],
      }),
    )

    expect(screen.getByText('No falta nada en esta planilla')).toBeVisible()
    expect(screen.getByText('No hay cambios sin guardar.')).toBeVisible()
    // The percentage of a line the database already holds, computed on read.
    expect(
      within(rowIn('Arqueros', 'Barrientos Luz')).getByText('Atajadas 100%'),
    ).toBeVisible()
    expect(
      within(rowIn('Arqueros', 'Duarte Sol')).getByText('Atajadas 89%'),
    ).toBeVisible()
  })

  it('offers only a draw when the goals are level, because a draw is a real result', () => {
    show(sheet())
    enterResult('4', '4')

    expect(screen.getByRole('radio', { name: 'Empate' })).toBeVisible()
    expect(
      screen.queryByRole('radio', { name: 'En tiempo reglamentario' }),
    ).toBeNull()
    expect(
      screen.queryByRole('radio', { name: 'Definido por shootout' }),
    ).toBeNull()
    expect(screen.getByText(/El empate es un resultado real/)).toBeVisible()
  })

  it('offers regulation and shootout when the goals are not level', () => {
    show(sheet())
    enterResult('9', '6')

    expect(
      screen.getByRole('radio', { name: 'En tiempo reglamentario' }),
    ).toBeVisible()
    expect(
      screen.getByRole('radio', { name: 'Definido por shootout' }),
    ).toBeVisible()
    expect(screen.queryByRole('radio', { name: 'Empate' })).toBeNull()
  })

  it('asks for the goals before asking how the match ended', () => {
    show(sheet())

    expect(
      screen.getByText('Cargá los dos goles y el panel ofrece cómo terminó.'),
    ).toBeVisible()
    expect(screen.queryByRole('radio', { name: 'Empate' })).toBeNull()
  })

  it('writes a shootout result as three columns and nothing else', async () => {
    const save = show(sheet())
    enterResult('9', '6', 'Definido por shootout')

    expect(screen.getByText('Falta guardar el resultado.')).toBeVisible()
    fireEvent.click(saveButton())

    expect(await screen.findByText('Guardamos el resultado.')).toBeVisible()
    expect(save.mock.calls[0]?.[0]).toMatchObject({
      matchId: MATCH,
      result: { home_goals: 9, away_goals: 6, resolution: 'shootout' },
      players: { upsert: [], removePlayerIds: [] },
      goals: { upsert: [], removeIds: [] },
      goalieLines: { upsert: [], removePlayerIds: [] },
    })
  })

  it('writes a draw, level goals and all', async () => {
    const save = show(sheet())
    enterResult('4', '4', 'Empate')
    fireEvent.click(saveButton())

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(save.mock.calls[0]?.[0].result).toEqual({
      home_goals: 4,
      away_goals: 4,
      resolution: 'draw',
    })
  })

  it('will not submit half a score, and says why instead', () => {
    show(sheet())
    fireEvent.change(screen.getByLabelText('Goles de Rock Choppers'), {
      target: { value: '9' },
    })

    expect(
      screen.getByText(/Cargá los dos goles o ninguno de los dos/),
    ).toBeVisible()
    expect(saveButton()).toBeDisabled()
  })

  it('will not submit a draw whose goals stopped being level', () => {
    show(sheet())
    enterResult('4', '4', 'Empate')
    fireEvent.change(screen.getByLabelText('Goles de Sucucho'), {
      target: { value: '3' },
    })

    expect(
      screen.getByText(
        'Un empate necesita el mismo gol de los dos lados, y el resultado dice 4 a 3.',
      ),
    ).toBeVisible()
    expect(saveButton()).toBeDisabled()
  })

  it('enters a goal nobody recorded a scorer for, and writes it as such', async () => {
    const save = show(sheet())

    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar gol de Rock Choppers' }),
    )

    expect(screen.getByText('Gol sin goleador')).toBeVisible()
    expect(saveButton()).toBeEnabled()

    fireEvent.click(saveButton())
    await waitFor(() => expect(save).toHaveBeenCalled())

    expect(save.mock.calls[0]?.[0].goals.upsert).toEqual([
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        match_id: MATCH,
        team_id: HOME,
        scorer_id: null,
        assist_id: null,
      },
    ])
  })

  it('records a scorer without an assist, each one independently', async () => {
    const save = show(sheet())

    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar gol de Sucucho' }),
    )
    const goal = rowIn('Goles', 'Sucucho')
    fireEvent.change(within(goal).getByLabelText('Goleador'), {
      target: { value: 'p3' },
    })

    fireEvent.click(saveButton())
    await waitFor(() => expect(save).toHaveBeenCalled())

    expect(save.mock.calls[0]?.[0].goals.upsert[0]).toMatchObject({
      team_id: AWAY,
      scorer_id: 'p3',
      assist_id: null,
    })
    expect(screen.queryByText('Gol sin goleador')).toBeNull()
  })

  it('lets a sheet whose goals disagree with the result be saved anyway', async () => {
    const save = show(sheet())
    enterResult('1', '0', 'En tiempo reglamentario')
    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar gol de Rock Choppers' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar gol de Rock Choppers' }),
    )

    expect(
      screen.getByText('Hay más goles cargados que los del resultado'),
    ).toBeVisible()
    expect(screen.getByText(/Podés guardar igual/)).toBeVisible()
    expect(saveButton()).toBeEnabled()

    fireEvent.click(saveButton())
    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(save.mock.calls[0]?.[0].goals.upsert).toHaveLength(2)
  })

  it('names the goals still missing while they are being entered', () => {
    show(sheet())
    enterResult('2', '0', 'En tiempo reglamentario')
    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar gol de Rock Choppers' }),
    )

    expect(screen.getByText('Faltan 1 de los 2 goles')).toBeVisible()
  })

  it('adds a substitute who is on no roster, and marks the appearance as one', async () => {
    const save = show(sheet())

    addFromPicker(
      'Agregar a Rock Choppers',
      'sub',
      'Agregar jugador de Rock Choppers',
    )

    const listed = rowIn('Quiénes jugaron', 'Zapata Rocío')
    expect(within(listed).getByLabelText('Suplente')).toBeChecked()

    fireEvent.click(saveButton())
    await waitFor(() => expect(save).toHaveBeenCalled())

    expect(save.mock.calls[0]?.[0].players.upsert).toEqual([
      {
        match_id: MATCH,
        player_id: 'sub',
        team_id: HOME,
        is_substitute: true,
        is_franchise: false,
      },
    ])
  })

  it('adds a roster player without calling them a substitute', () => {
    show(sheet())

    addFromPicker(
      'Agregar a Rock Choppers',
      'p1',
      'Agregar jugador de Rock Choppers',
    )

    expect(
      within(rowIn('Quiénes jugaron', 'Aguirre Nahuel')).getByLabelText(
        'Suplente',
      ),
    ).not.toBeChecked()
  })

  it('offers nobody twice, so the same person cannot be listed for both sides', () => {
    show(sheet())

    addFromPicker(
      'Agregar a Rock Choppers',
      'sub',
      'Agregar jugador de Rock Choppers',
    )

    const picker = screen.getByLabelText('Agregar a Sucucho')
    expect(
      within(picker).queryByRole('option', { name: 'Zapata Rocío' }),
    ).toBeNull()
  })

  it('keeps a single franchise player: ticking a second one unticks the first', async () => {
    const save = show(sheet())

    addFromPicker(
      'Agregar a Rock Choppers',
      'sub',
      'Agregar jugador de Rock Choppers',
    )
    addFromPicker('Agregar a Sucucho', 'p3', 'Agregar jugador de Sucucho')

    const franchiseOf = (person: string) =>
      within(rowIn('Quiénes jugaron', person)).getByLabelText('Franquicia')

    fireEvent.click(franchiseOf('Zapata Rocío'))
    expect(franchiseOf('Zapata Rocío')).toBeChecked()

    fireEvent.click(franchiseOf('Cárdenas Ivo'))

    expect(franchiseOf('Zapata Rocío')).not.toBeChecked()
    expect(franchiseOf('Cárdenas Ivo')).toBeChecked()

    fireEvent.click(saveButton())
    await waitFor(() => expect(save).toHaveBeenCalled())

    const written = save.mock.calls[0]?.[0].players.upsert ?? []
    expect(written.filter((entry) => entry.is_franchise)).toHaveLength(1)
  })

  it('takes somebody off the sheet by name, and removes the row', async () => {
    const save = show(
      sheet({
        appearances: [
          {
            playerId: 'p1',
            teamId: HOME,
            isSubstitute: false,
            isFranchise: false,
          },
        ],
      }),
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Quitar a Aguirre Nahuel' }),
    )
    fireEvent.click(saveButton())
    await waitFor(() => expect(save).toHaveBeenCalled())

    expect(save.mock.calls[0]?.[0].players).toEqual({
      upsert: [],
      removePlayerIds: ['p1'],
    })
  })

  it('computes the save percentage while the numbers are typed, and writes only the two counts', async () => {
    const save = show(sheet())

    addFromPicker(
      'Agregar arquero de Rock Choppers',
      'p2',
      'Agregar arquero de Rock Choppers',
    )

    const line = rowIn('Arqueros', 'Barrientos Luz')
    expect(within(line).getByText('Atajadas —')).toBeVisible()

    fireEvent.change(within(line).getByLabelText('Tiros recibidos'), {
      target: { value: '8' },
    })
    fireEvent.change(within(line).getByLabelText('Goles recibidos'), {
      target: { value: '2' },
    })

    expect(within(line).getByText('Atajadas 75%')).toBeVisible()

    fireEvent.click(saveButton())
    await waitFor(() => expect(save).toHaveBeenCalled())

    expect(save.mock.calls[0]?.[0].goalieLines.upsert).toEqual([
      {
        match_id: MATCH,
        player_id: 'p2',
        team_id: HOME,
        shots_faced: 8,
        goals_against: 2,
      },
    ])
  })

  it('will not submit a goalkeeper who conceded more than they faced', () => {
    show(sheet())

    addFromPicker(
      'Agregar arquero de Rock Choppers',
      'p2',
      'Agregar arquero de Rock Choppers',
    )

    const line = rowIn('Arqueros', 'Barrientos Luz')
    fireEvent.change(within(line).getByLabelText('Tiros recibidos'), {
      target: { value: '4' },
    })
    fireEvent.change(within(line).getByLabelText('Goles recibidos'), {
      target: { value: '5' },
    })

    expect(
      screen.getByText(
        'Barrientos Luz no puede recibir 5 goles de 4 tiros: todo gol recibido fue un tiro recibido.',
      ),
    ).toBeVisible()
    expect(saveButton()).toBeDisabled()
  })

  it('will not submit a goalkeeper line with one of its two numbers missing', () => {
    show(sheet())

    addFromPicker(
      'Agregar arquero de Rock Choppers',
      'p2',
      'Agregar arquero de Rock Choppers',
    )

    fireEvent.change(
      within(rowIn('Arqueros', 'Barrientos Luz')).getByLabelText(
        'Tiros recibidos',
      ),
      { target: { value: '8' } },
    )

    expect(screen.getByText(/le falta uno de los dos números/)).toBeVisible()
    expect(saveButton()).toBeDisabled()
  })

  it('shows a refusal by row level security as a permission, and keeps what was typed', async () => {
    const save = show(
      sheet(),
      answering({
        saved: [],
        failed: [
          {
            part: 'result',
            because:
              'La base rechazó el cambio: tu rol no tiene permiso para editar planillas. La gestión deportiva puede cargar resultados; comunicación, no.',
          },
        ],
      }),
    )

    enterResult('9', '6', 'En tiempo reglamentario')
    fireEvent.click(saveButton())

    const refusal = await screen.findByRole('alert')
    expect(refusal).toHaveTextContent('No pudimos guardar el resultado')
    expect(refusal).toHaveTextContent('tu rol no tiene permiso')
    expect(refusal).toHaveTextContent('Lo que cargaste sigue en pantalla')

    // Nothing typed was thrown away, and the same save is still pending.
    expect(screen.getByLabelText('Goles de Rock Choppers')).toHaveValue(9)
    expect(screen.getByText('Falta guardar el resultado.')).toBeVisible()

    fireEvent.click(saveButton())
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
    expect(save.mock.calls[1]?.[0].result).toEqual({
      home_goals: 9,
      away_goals: 6,
      resolution: 'regulation',
    })
  })

  it('reports what saved and what did not, part by part', async () => {
    show(
      sheet(),
      answering({
        saved: ['result'],
        failed: [{ part: 'goals', because: 'La base no aplicó el cambio.' }],
      }),
    )

    enterResult('1', '0', 'En tiempo reglamentario')
    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar gol de Rock Choppers' }),
    )
    fireEvent.click(saveButton())

    expect(await screen.findByText('Guardamos el resultado.')).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No pudimos guardar los goles',
    )
  })

  it('saving twice writes nothing the second time', async () => {
    const save = show(sheet())

    enterResult('9', '6', 'En tiempo reglamentario')
    fireEvent.click(saveButton())
    expect(await screen.findByText('Guardamos el resultado.')).toBeVisible()
    expect(screen.getByText('No hay cambios sin guardar.')).toBeVisible()

    fireEvent.click(saveButton())
    expect(
      await screen.findByText('No había nada nuevo para guardar.'),
    ).toBeVisible()

    expect(save.mock.calls[1]?.[0]).toMatchObject({
      result: null,
      players: { upsert: [], removePlayerIds: [] },
      goals: { upsert: [], removeIds: [] },
      goalieLines: { upsert: [], removePlayerIds: [] },
    })
  })

  it('names the several parts of one save in Spanish', async () => {
    show(sheet())

    enterResult('1', '0', 'En tiempo reglamentario')
    addFromPicker(
      'Agregar a Rock Choppers',
      'p1',
      'Agregar jugador de Rock Choppers',
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar gol de Rock Choppers' }),
    )
    fireEvent.click(saveButton())

    expect(
      await screen.findByText(
        'Guardamos el resultado, quiénes jugaron y los goles.',
      ),
    ).toBeVisible()
  })

  it('has no sheet to offer for a fixture row without teams', () => {
    show(
      sheet({
        home: null,
        away: null,
        row: row({ home_team: null, away_team: null }),
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Partido sin equipos' }),
    ).toBeVisible()
    expect(screen.getByText(/todavía no tiene los dos equipos/)).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Guardar la planilla' }),
    ).toBeNull()
  })

  it('says where the cabecera is assigned rather than offering the field', () => {
    show(sheet({ row: row({ venue: null }) }))

    expect(screen.getByText('Falta la cabecera')).toBeVisible()
    expect(
      screen.getByText(
        'La cabecera de este partido se asigna en el fixture, no acá.',
      ),
    ).toBeVisible()
  })

  it('shows what the sheet said where a fact is missing', () => {
    show(sheet({ row: row({ notes: 'La planilla no dice el ganador.' }) }))

    expect(
      screen.getByText('La planilla dice: La planilla no dice el ganador.'),
    ).toBeVisible()
  })

  it('has no field for a penalty minute or a sanction, because the league has neither', () => {
    const { container } = render(
      <MemoryRouter>
        <MatchSheetScreen save={accepting()} sheet={sheet()} />
      </MemoryRouter>,
    )

    expect(container.textContent).not.toMatch(/penal|sanci|expulsi/i)
    // And no points either: 2 for a win and 1 for a shootout loss belong to the
    // standings, not to a sheet.
    expect(container.textContent).not.toMatch(/puntos/i)
  })
})

describe('loading a sheet the way the rink does', () => {
  it('brings a whole side in with one press, so absences are what gets removed', () => {
    // Picking fifteen people out of a dropdown one at a time is what the
    // operator asked us to stop making him do.
    show(sheet())

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cargar el plantel de Rock Choppers',
      }),
    )

    const listed = within(block('Quiénes jugaron'))
    expect(listed.getByText('Aguirre Nahuel')).toBeVisible()
    expect(listed.getByText('Barrientos Luz')).toBeVisible()
    // The other side stays as it was: one button, one team.
    expect(listed.queryByText('Cárdenas Ivo')).toBeNull()
    // With everybody in, the button has nothing left to add.
    expect(
      screen.queryByRole('button', {
        name: 'Cargar el plantel de Rock Choppers',
      }),
    ).toBeNull()
  })

  it('takes a goalkeeper from another team, and says they played', () => {
    // A team turns up without its keeper and borrows one; the sheet could not
    // say so before, because the picker only offered the team's own roster.
    show(sheet())

    fireEvent.change(
      screen.getByLabelText('Agregar arquero de Rock Choppers'),
      { target: { value: 'sub' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Agregar arquero de Rock Choppers' }),
    )

    expect(within(block('Arqueros')).getByText('Zapata Rocío')).toBeVisible()
    // And they are on the sheet as having played, marked substitute: a
    // goalkeeping line for somebody the same sheet says was not there would
    // be a contradiction.
    const row = rowIn('Quiénes jugaron', 'Zapata Rocío')
    expect(within(row).getByLabelText('Suplente')).toBeChecked()
  })
})

describe('a substitute the league does not have', () => {
  it('creates the person from the sheet and lists them as a substitute', async () => {
    // «El Cuiti» is in the league's own published statistics as `Suplente
    // (Sucucho)` and is on nobody's roster, so no picker could offer him. The
    // only other door, Equipos y planteles, would also put him on a roster.
    const save = show(sheet())

    fireEvent.change(
      screen.getByLabelText('Suplente que no está en la liga', {
        selector: '#sheet-new-sub-team-rock',
      }),
      { target: { value: 'Cuitiño Joaquín' } },
    )
    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'Crear y sumar como suplente',
      })[0]!,
    )

    const row = rowIn('Quiénes jugaron', 'Cuitiño Joaquín')
    expect(within(row).getByLabelText('Suplente')).toBeChecked()

    fireEvent.click(saveButton())
    await screen.findByRole('status')

    const writes = save.mock.calls[0]?.[0]
    expect(writes?.people).toEqual([
      { id: expect.any(String), full_name: 'Cuitiño Joaquín' },
    ])
    // The appearance names the person the same save creates, and nothing puts
    // them on a roster: a substitute is not a roster player.
    expect(writes?.players.upsert[0]?.player_id).toBe(writes?.people[0]?.id)
    expect(writes?.players.upsert[0]?.is_substitute).toBe(true)
  })
})
