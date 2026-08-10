import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Result } from './adminQueries'
import { FixtureScreen } from './FixtureScreen'
import type {
  FixtureMatch,
  FixturePage,
  FixtureTeam,
  MatchSavePlan,
} from './fixtureDraft'
import type { AdminRole } from './useAdminSession'

/**
 * No database, and no attempt to reach one. The matches and the teams come from a
 * fake and so does the write, which is the only way the refusals that matter here
 * can be exercised: row level security, the composite foreign key that ties a
 * match's teams to its competition, and `matches_slot_unique`, which is the one
 * this league gets wrong most easily.
 */
type Loader = (year: number) => Promise<Result<FixturePage>>
type Saver = (plan: MatchSavePlan) => Promise<Result<null>>

const HANTA: FixtureTeam = {
  id: 'team-hanta',
  competition: 'beer',
  shortName: 'Rock Choppers',
  active: true,
}

const SUCUCHO: FixtureTeam = {
  id: 'team-suc',
  competition: 'beer',
  shortName: 'Sucucho',
  active: true,
}

const QUEENS: FixtureTeam = {
  id: 'team-queens',
  competition: 'wubl',
  shortName: 'Frozen Queens',
  active: true,
}

const match = (overrides: Partial<FixtureMatch> = {}): FixtureMatch => ({
  id: 'match-1',
  competition: 'beer',
  stage: 'regular',
  date: '2026-05-23',
  time: '21:30',
  venue: 'poli',
  homeTeamId: 'team-hanta',
  awayTeamId: 'team-suc',
  homeGoals: 9,
  awayGoals: 6,
  resolution: 'regulation',
  notes: null,
  ...overrides,
})

const accepted: Result<null> = { ok: true, data: null }

interface Options {
  teams?: FixtureTeam[]
  matches?: FixtureMatch[]
  load?: Loader
  save?: Saver
  role?: AdminRole
}

const show = ({
  teams = [HANTA, SUCUCHO, QUEENS],
  matches = [],
  load = () =>
    Promise.resolve({
      ok: true,
      data: { seasonId: 'season-2026', year: 2026, teams, matches },
    }),
  save = vi.fn<Saver>().mockResolvedValue(accepted),
  role = 'sporting_management',
}: Options = {}) => {
  render(
    <MemoryRouter>
      <FixtureScreen load={load} role={role} save={save} year={2026} />
    </MemoryRouter>,
  )
  return save
}

const pick = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

const saveButton = () =>
  screen.getByRole('button', {
    name: /Crear el partido|Guardar el partido|Guardando/,
  })

const fillSlot = async (date: string, time: string, venue = '') => {
  await screen.findByLabelText('Fecha')
  pick('Fecha', date)
  pick('Hora', time)
  if (venue !== '') pick('Cabecera', venue)
}

describe('FixtureScreen', () => {
  it('waits out loud while it reads the fixture', () => {
    show({ load: () => new Promise(() => undefined) })

    expect(screen.getByText('Cargando el fixture…')).toBeVisible()
  })

  it('says why it could not read it', async () => {
    show({
      load: () =>
        Promise.resolve({
          ok: false,
          because: 'La temporada 2026 no está cargada en la base.',
        }),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos leer el fixture: La temporada 2026 no está cargada en la base.',
    )
  })

  it('says so when the season holds no match yet', async () => {
    show()

    expect(
      await screen.findByText('Todavía no hay partidos cargados en 2026.'),
    ).toBeVisible()
  })

  it('groups the matches by day, with the two cabeceras of an hour together', async () => {
    show({
      matches: [
        match({ id: 'b', venue: 'bahia' }),
        match({ id: 'p', venue: 'poli' }),
        match({ id: 'later', date: '2026-05-30' }),
      ],
    })

    await screen.findByText('Sábado, 23 de mayo de 2026')
    const rows = screen.getAllByRole('listitem')

    expect(rows[0]).toHaveTextContent('Bahía')
    expect(rows[1]).toHaveTextContent('Poli')
    expect(screen.getByText('Sábado, 30 de mayo de 2026')).toBeVisible()
  })

  it('shows a slot with no teams as the reserved hour it is', async () => {
    show({
      matches: [
        match({
          homeTeamId: null,
          awayTeamId: null,
          homeGoals: null,
          awayGoals: null,
          resolution: null,
        }),
      ],
    })

    expect(
      await screen.findByText('Horario reservado, sin equipos'),
    ).toBeVisible()
  })

  it('shows a match with no cabecera rather than hiding it', async () => {
    show({ matches: [match({ venue: null })] })

    expect(await screen.findByText('Sin cabecera')).toBeVisible()
  })

  it('shows the score and links to the sheet instead of offering to edit it', async () => {
    show({ matches: [match()] })

    const sheet = await screen.findByRole('link', { name: 'Planilla' })
    const row = sheet.closest('li') as HTMLElement

    expect(within(row).getByText('9 - 6')).toBeVisible()
    expect(sheet).toHaveAttribute('href', '/admin/partidos/match-1')
    expect(screen.queryByLabelText(/goles/i)).toBeNull()
  })

  it('shows what the original sheet said about a gap', async () => {
    show({
      matches: [
        match({ notes: 'winner column names a team that did not play' }),
      ],
    })

    expect(await screen.findByText(/La planilla original dice:/)).toBeVisible()
  })

  it('creates a match with its date, hour, cabecera, instance and two teams', async () => {
    const save = show()
    await fillSlot('2026-05-23', '22:30', 'bahia')

    pick('Local', 'team-hanta')
    pick('Visitante', 'team-suc')
    fireEvent.click(saveButton())

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Guardamos el partido nuevo.',
    )
    expect(save).toHaveBeenCalledWith({
      matchId: null,
      row: {
        season_id: 'season-2026',
        competition_key: 'beer',
        stage: 'regular',
        match_date: '2026-05-23',
        start_time: '22:30',
        venue: 'bahia',
        home_team_id: 'team-hanta',
        away_team_id: 'team-suc',
      },
    })
  })

  it('saves a second match at the same hour in the other cabecera', async () => {
    // Two matches run at once, one in each cabecera. This is the case a form
    // that assumed one match per hour would refuse.
    const save = show({ matches: [match({ venue: 'poli' })] })
    await fillSlot('2026-05-23', '21:30', 'bahia')

    expect(
      screen.getByText(/Es lo normal: se juegan dos partidos a la vez/),
    ).toBeVisible()
    expect(saveButton()).toBeEnabled()

    fireEvent.click(saveButton())
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        row: expect.objectContaining({ start_time: '21:30', venue: 'bahia' }),
      }),
    )
  })

  it('reads a second match in the same hour and cabecera as exactly that', async () => {
    const save = show({ matches: [match({ venue: 'poli' })] })
    await fillSlot('2026-05-23', '21:30', 'poli')

    expect(
      screen.getByText(/Ya hay un partido a esa hora en esa cabecera/),
    ).toBeVisible()
    expect(saveButton()).toBeDisabled()

    fireEvent.click(saveButton())
    expect(save).not.toHaveBeenCalled()
  })

  it('saves two matches at the same hour with no cabecera at all', async () => {
    // The two 21:30 semifinals of 8 August 2026: nulls are distinct in a unique
    // constraint, so these do not collide and the panel must not pretend they do.
    const save = show({
      matches: [match({ id: 'semi-1', date: '2026-08-08', venue: null })],
    })
    await fillSlot('2026-08-08', '21:30')

    expect(screen.getByText(/Sin cabecera: se guarda igual/)).toBeVisible()
    expect(saveButton()).toBeEnabled()

    fireEvent.click(saveButton())
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        row: expect.objectContaining({ venue: null }),
      }),
    )
  })

  it('saves a slot with a time and a cabecera and no teams', async () => {
    const save = show()
    await fillSlot('2026-05-23', '21:30', 'bahia')

    expect(screen.getByText(/Sin equipos: se guarda igual/)).toBeVisible()

    fireEvent.click(saveButton())
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        row: expect.objectContaining({
          home_team_id: null,
          away_team_id: null,
        }),
      }),
    )
  })

  it('offers only the teams of the chosen competition, and clears them when it changes', async () => {
    show()
    await screen.findByLabelText('Local')

    const home = screen.getByLabelText('Local')
    expect(within(home).getByText('Rock Choppers')).toBeVisible()
    expect(within(home).queryByText('Frozen Queens')).toBeNull()

    pick('Local', 'team-hanta')
    fireEvent.click(screen.getByRole('radio', { name: "Women's Beer League" }))

    expect(screen.getByLabelText('Local')).toHaveValue('')
    expect(
      within(screen.getByLabelText('Local')).getByText('Frozen Queens'),
    ).toBeVisible()
  })

  it('refuses a team playing itself', async () => {
    show()
    await fillSlot('2026-05-23', '22:30', 'bahia')

    pick('Local', 'team-hanta')
    pick('Visitante', 'team-hanta')

    expect(
      screen.getByText('Un equipo no puede jugar contra sí mismo.'),
    ).toBeVisible()
    expect(saveButton()).toBeDisabled()
  })

  it('names the eight instances and says which one feeds the standings', async () => {
    show()

    const stage = await screen.findByLabelText('Instancia')
    expect(within(stage).getAllByRole('option')).toHaveLength(8)
    expect(within(stage).getByText('Fase regular (suma puntos)')).toBeVisible()
    expect(within(stage).getByText('Repechaje')).toBeVisible()
    expect(within(stage).getByText('Cuartos')).toBeVisible()
    expect(within(stage).getByText('Juego de estrellas')).toBeVisible()
  })

  it('says out loud when the chosen instance does not feed the standings', async () => {
    const save = show()
    await fillSlot('2026-07-04', '23:30', 'bahia')

    pick('Instancia', 'playin')

    expect(
      screen.getByText(/Repechaje no cuenta para la tabla de posiciones/),
    ).toBeVisible()

    fireEvent.click(saveButton())
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        row: expect.objectContaining({ stage: 'playin' }),
      }),
    )
  })

  it('edits a match, reading its values into the form', async () => {
    const save = show({ matches: [match()] })

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Editar el partido de Sábado, 23 de mayo de 2026 a las 21:30',
      }),
    )

    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-05-23')
    expect(screen.getByLabelText('Hora')).toHaveValue('21:30')
    expect(screen.getByLabelText('Cabecera')).toHaveValue('poli')
    expect(screen.getByLabelText('Local')).toHaveValue('team-hanta')

    pick('Cabecera', 'bahia')
    fireEvent.click(saveButton())

    expect(save).toHaveBeenCalledWith({
      matchId: 'match-1',
      row: expect.objectContaining({ venue: 'bahia' }),
    })
  })

  it('links an edit to the sheet instead of showing the score', async () => {
    show({ matches: [match()] })

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Editar el partido de Sábado, 23 de mayo de 2026 a las 21:30',
      }),
    )

    expect(
      screen.getByRole('link', { name: 'Abrir la planilla' }),
    ).toHaveAttribute('href', '/admin/partidos/match-1')
    expect(screen.queryByLabelText('Goles del local')).toBeNull()
  })

  it('never sends a score, a resolution or a note', async () => {
    const save = show({ matches: [match()] })

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Editar el partido de Sábado, 23 de mayo de 2026 a las 21:30',
      }),
    )
    pick('Cabecera', 'bahia')
    fireEvent.click(saveButton())

    const written = (save as ReturnType<typeof vi.fn>).mock.calls[0]?.[0].row
    for (const column of [
      'home_goals',
      'away_goals',
      'resolution',
      'status',
      'notes',
    ]) {
      expect(written).not.toHaveProperty(column)
    }
  })

  it('writes nothing on a second save that changed nothing', async () => {
    const save = show({ matches: [match()] })

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Editar el partido de Sábado, 23 de mayo de 2026 a las 21:30',
      }),
    )
    fireEvent.click(saveButton())

    expect(await screen.findByRole('status')).toHaveTextContent(
      'No cambiaste nada, así que no escribimos nada.',
    )
    expect(save).not.toHaveBeenCalled()
  })

  it('lets an edit be abandoned', async () => {
    show({ matches: [match()] })

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Editar el partido de Sábado, 23 de mayo de 2026 a las 21:30',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByLabelText('Fecha')).toHaveValue('')
    expect(screen.getByRole('heading', { name: 'Nuevo partido' })).toBeVisible()
  })

  it('reports the unique on the slot as a permission-shaped refusal, not a crash', async () => {
    const save = show({
      save: vi.fn<Saver>().mockResolvedValue({
        ok: false,
        because:
          'Ya hay un partido a esa hora en esa cabecera. Cambiá la hora, o poné este partido en la otra cabecera.',
      }),
    })
    await fillSlot('2026-05-23', '22:30', 'bahia')

    fireEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya hay un partido a esa hora en esa cabecera.',
    )
    expect(save).toHaveBeenCalled()
    // What was typed stays: the refusal is something to fix, not to start over.
    expect(screen.getByLabelText('Hora')).toHaveValue('22:30')
  })

  it('reports a refusal by row level security as a permission', async () => {
    show({
      save: vi.fn<Saver>().mockResolvedValue({
        ok: false,
        because:
          'La base rechazó el cambio: tu rol no tiene permiso para editar equipos, planteles ni fixture.',
      }),
    })
    await fillSlot('2026-05-23', '22:30', 'bahia')

    fireEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'tu rol no tiene permiso para editar equipos, planteles ni fixture',
    )
  })

  it('shows a role that cannot write these tables why, and no form', async () => {
    show({ role: 'communications', matches: [match()] })

    expect(await screen.findByText(/Tu rol es Comunicación/)).toBeVisible()
    expect(screen.queryByLabelText('Fecha')).toBeNull()
    expect(
      screen.queryByRole('button', { name: /Editar el partido/ }),
    ).toBeNull()
    // The fixture itself is public, so the list stays.
    expect(screen.getByText('21:30')).toBeVisible()
  })
})

describe('the row the match sheet sends people to', () => {
  it('carries the address the sheet links to', async () => {
    // The sheet's link is `/admin/fixture#partido-<id>`; without this id the
    // fragment lands nowhere and the operator is back to hunting the list.
    show({ matches: [match({ homeTeamId: null, awayTeamId: null })] })
    // The row of a bracket match with no teams: exactly the one the sheet
    // cannot load and links here for.
    const row = (
      await screen.findByText('Horario reservado, sin equipos')
    ).closest('li')

    expect(row?.id).toBe('partido-match-1')
  })
})
