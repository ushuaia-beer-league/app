import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Result } from './adminQueries'
import { TeamsAdminScreen } from './TeamsAdminScreen'
import type {
  RosterRecord,
  RosterSaveReport,
  RosterWrites,
  TeamRecord,
  TeamSavePlan,
  TeamsPage,
} from './teamsDraft'
import type { AdminRole } from './useAdminSession'

/**
 * No database, and no attempt to reach one. The teams, the people and the rosters
 * come from fakes, and so do the two writes: everything interesting here is a
 * refusal, and a refusal cannot be exercised against a database a test cannot
 * reach. Row level security, the global slug unique, the per-competition short-name
 * unique and the one-team-per-person-per-competition unique are all below.
 */
type Loader = (year: number) => Promise<Result<TeamsPage>>
type TeamSaver = (plan: TeamSavePlan) => Promise<Result<null>>
type RosterSaver = (writes: RosterWrites) => Promise<RosterSaveReport>

const VERDE: TeamRecord = {
  id: 'team-verde',
  competition: 'beer',
  slug: 'birra-del-fuego',
  shortName: 'Birra del Fuego',
  fullName: 'Green Seven Birra del fuego',
  nickname: 'verde',
  colour: 'verde',
  logoUrl: null,
  active: true,
}

const HANTA: TeamRecord = {
  id: 'team-hanta',
  competition: 'beer',
  slug: 'rock-choppers',
  shortName: 'Rock Choppers',
  fullName: 'Hantachoppers',
  nickname: 'hanta',
  colour: null,
  logoUrl: null,
  active: true,
}

const QUEENS: TeamRecord = {
  id: 'team-queens',
  competition: 'wubl',
  slug: 'frozen-queens',
  shortName: 'Frozen Queens',
  fullName: null,
  nickname: null,
  colour: null,
  logoUrl: null,
  active: true,
}

const PEOPLE = [
  { id: 'player-flor', fullName: 'Cotignola Flor', active: true },
  { id: 'player-mauri', fullName: 'Bergeonneau Mauri', active: true },
  { id: 'player-omar', fullName: 'Coria Omar', active: true },
  { id: 'player-joaquin', fullName: 'Bernales Joaquín', active: true },
]

const rosterRow = (overrides: Partial<RosterRecord> = {}): RosterRecord => ({
  id: 'roster-1',
  competition: 'beer',
  teamId: 'team-hanta',
  playerId: 'player-flor',
  jerseyNumber: 28,
  active: true,
  ...overrides,
})

const accepted: Result<null> = { ok: true, data: null }

const refused = (because: string): Result<null> => ({ ok: false, because })

interface Options {
  teams?: TeamRecord[]
  people?: TeamsPage['people']
  roster?: RosterRecord[]
  load?: Loader
  saveOne?: TeamSaver
  saveRosterRows?: RosterSaver
  role?: AdminRole
}

const show = ({
  teams = [VERDE, HANTA, QUEENS],
  people = PEOPLE,
  roster = [],
  load = () =>
    Promise.resolve({
      ok: true,
      data: { seasonId: 'season-2026', year: 2026, teams, people, roster },
    }),
  saveOne = vi.fn<TeamSaver>().mockResolvedValue(accepted),
  saveRosterRows = vi
    .fn<RosterSaver>()
    .mockResolvedValue({ saved: ['roster'], failed: [] }),
  role = 'sporting_management',
}: Options = {}) => {
  render(
    <TeamsAdminScreen
      load={load}
      role={role}
      saveOne={saveOne}
      saveRosterRows={saveRosterRows}
      year={2026}
    />,
  )
  return { saveOne, saveRosterRows }
}

const typeIn = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

const teamSaveButton = () =>
  screen.getByRole('button', {
    name: /Crear el equipo|Guardar el equipo|Guardando/,
  })

const openRoster = async (shortName: string) =>
  fireEvent.click(
    await screen.findByRole('button', {
      name: `Ver el plantel de ${shortName}`,
    }),
  )

describe('TeamsAdminScreen', () => {
  it('waits out loud while it reads the teams', () => {
    show({ load: () => new Promise(() => undefined) })

    expect(screen.getByText('Cargando los equipos…')).toBeVisible()
  })

  it('says why it could not read them', async () => {
    show({
      load: () =>
        Promise.resolve({
          ok: false,
          because:
            'Esta versión del sitio se publicó sin la conexión a la base.',
        }),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos leer los equipos: Esta versión del sitio se publicó sin la conexión a la base.',
    )
  })

  it('lists one competition at a time, and switches to the other', async () => {
    show()

    expect(await screen.findByText('Rock Choppers')).toBeVisible()
    expect(screen.queryByText('Frozen Queens')).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: "Women's Beer League" }))

    expect(screen.getByText('Frozen Queens')).toBeVisible()
    expect(screen.queryByText('Rock Choppers')).toBeNull()
  })

  it('says so when a competition holds no team at all', async () => {
    show({ teams: [] })

    expect(
      await screen.findByText(/Todavía no hay ningún equipo en Beer League/),
    ).toBeVisible()
  })

  it('creates a team with every column the table carries', async () => {
    const { saveOne } = show({ teams: [] })
    await screen.findByLabelText('Nombre corto')

    typeIn('Nombre corto', 'Rock Choppers')
    typeIn('Nombre con sponsor (opcional)', 'Hantachoppers')
    typeIn('Apodo del cuadro (opcional)', 'hanta')
    typeIn('Color (opcional)', 'verde')
    fireEvent.click(teamSaveButton())

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Guardamos el equipo nuevo.',
    )
    expect(saveOne).toHaveBeenCalledWith({
      teamId: null,
      row: {
        competition_key: 'beer',
        slug: 'rock-choppers',
        short_name: 'Rock Choppers',
        full_name: 'Hantachoppers',
        nickname: 'hanta',
        colour: 'verde',
        // The crest arrives by upload now, not by typing an address;
        // untouched, it saves as the null it is.
        logo_url: null,
        active: true,
      },
    })
  })

  it('offers a slug out of the name and lets it be corrected', async () => {
    const { saveOne } = show({ teams: [] })
    await screen.findByLabelText('Nombre corto')

    typeIn('Nombre corto', 'Mujeres Birra del Fuego')
    expect(screen.getByLabelText('Identificador')).toHaveValue(
      'mujeres-birra-del-fuego',
    )

    typeIn('Identificador', 'mujeres-bdf')
    typeIn('Nombre corto', 'Mujeres Birra del Fuego!')

    // Once corrected the slug stops following the name.
    expect(screen.getByLabelText('Identificador')).toHaveValue('mujeres-bdf')

    fireEvent.click(teamSaveButton())
    expect(saveOne).toHaveBeenCalledWith(
      expect.objectContaining({
        row: expect.objectContaining({ slug: 'mujeres-bdf' }),
      }),
    )
  })

  it('reads a duplicate slug as a duplicate rather than crashing on save', async () => {
    const { saveOne } = show()
    await screen.findByLabelText('Identificador')

    typeIn('Nombre corto', 'Otro nombre')
    typeIn('Identificador', 'birra-del-fuego')

    expect(
      screen.getByText(/El identificador «birra-del-fuego» ya es el de/),
    ).toBeVisible()
    expect(teamSaveButton()).toBeDisabled()

    fireEvent.click(teamSaveButton())
    expect(saveOne).not.toHaveBeenCalled()
  })

  it('reads a duplicate short name in one competition as a duplicate', async () => {
    show()
    await screen.findByLabelText('Nombre corto')

    typeIn('Nombre corto', 'Rock Choppers')
    typeIn('Identificador', 'otro-identificador')

    expect(
      screen.getByText(
        /ya es el nombre corto de un equipo de Beer League. Dentro de una competencia no puede repetirse/,
      ),
    ).toBeVisible()
    expect(teamSaveButton()).toBeDisabled()
  })

  it('lets the same short name through in the other competition', async () => {
    show()
    fireEvent.click(
      await screen.findByRole('radio', { name: "Women's Beer League" }),
    )

    typeIn('Nombre corto', 'Rock Choppers')
    typeIn('Identificador', 'mujeres-rock-choppers')

    expect(screen.queryByText(/nombre corto de un equipo/)).toBeNull()
    expect(teamSaveButton()).toBeEnabled()
  })

  it('does not open complaining about an empty form', async () => {
    show({ teams: [] })

    await screen.findByLabelText('Nombre corto')
    expect(screen.queryByText(/Escribí el nombre corto/)).toBeNull()
    expect(teamSaveButton()).toBeDisabled()
  })

  it('refuses to offer a competition change on an existing team, and says why', async () => {
    show()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar Rock Choppers' }),
    )

    expect(screen.getByText(/No se puede cambiar/)).toBeVisible()
    expect(
      screen.getByText(/dejaría huérfana cada fila que lo nombra/),
    ).toBeVisible()
    // The only competition control on the screen is the selector above the
    // list, which chooses what is being looked at rather than moving a team.
    expect(screen.getAllByRole('radio', { name: 'Beer League' })).toHaveLength(
      1,
    )
  })

  it('edits a team, reading its values into the form, and never sends a competition', async () => {
    const { saveOne } = show()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar Rock Choppers' }),
    )

    expect(screen.getByLabelText('Nombre corto')).toHaveValue('Rock Choppers')
    expect(screen.getByLabelText('Nombre con sponsor (opcional)')).toHaveValue(
      'Hantachoppers',
    )

    typeIn('Color (opcional)', 'negro')
    fireEvent.click(teamSaveButton())

    expect(saveOne).toHaveBeenCalledWith({
      teamId: 'team-hanta',
      row: expect.objectContaining({ colour: 'negro' }),
    })
    expect(
      (saveOne as ReturnType<typeof vi.fn>).mock.calls[0]?.[0].row,
    ).not.toHaveProperty('competition_key')
  })

  it('retires a team by clearing the flag, and offers no way to delete one', async () => {
    const { saveOne } = show()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar Rock Choppers' }),
    )
    fireEvent.click(screen.getByLabelText('El equipo juega esta temporada'))
    fireEvent.click(teamSaveButton())

    expect(saveOne).toHaveBeenCalledWith(
      expect.objectContaining({
        row: expect.objectContaining({ active: false }),
      }),
    )
    expect(screen.queryByRole('button', { name: /Borrar|Eliminar/ })).toBeNull()
  })

  it('writes nothing on a second save that changed nothing', async () => {
    const { saveOne } = show()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar Rock Choppers' }),
    )
    fireEvent.click(teamSaveButton())

    expect(await screen.findByRole('status')).toHaveTextContent(
      'No cambiaste nada, así que no escribimos nada.',
    )
    expect(saveOne).not.toHaveBeenCalled()
  })

  it('reports a refusal by row level security as a permission', async () => {
    show({
      teams: [],
      saveOne: vi
        .fn<TeamSaver>()
        .mockResolvedValue(
          refused(
            'La base rechazó el cambio: tu rol no tiene permiso para editar equipos, planteles ni fixture.',
          ),
        ),
    })
    await screen.findByLabelText('Nombre corto')

    typeIn('Nombre corto', 'Rock Choppers')
    fireEvent.click(teamSaveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'tu rol no tiene permiso para editar equipos, planteles ni fixture',
    )
  })

  it('shows a role that cannot write these tables why, and no form', async () => {
    show({ role: 'communications', roster: [rosterRow()] })

    expect(await screen.findByText(/Tu rol es Comunicación/)).toBeVisible()
    expect(screen.queryByLabelText('Nombre corto')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Editar Rock Choppers' }),
    ).toBeNull()
    // The teams themselves are public, so the list stays, and so does the roster.
    expect(screen.getByText('Rock Choppers')).toBeVisible()

    await openRoster('Rock Choppers')
    expect(screen.getByText('Cotignola Flor')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Guardar el plantel' }),
    ).toBeNull()
  })
})

describe('the roster', () => {
  it('says so when a team has nobody this season', async () => {
    show()

    await openRoster('Rock Choppers')
    expect(screen.getByText('Este plantel está vacío para 2026.')).toBeVisible()
  })

  it('lists the people in it with their numbers', async () => {
    show({
      roster: [
        rosterRow(),
        rosterRow({ id: 'r2', playerId: 'player-mauri', jerseyNumber: 23 }),
      ],
    })

    await openRoster('Rock Choppers')

    expect(screen.getByLabelText('Número de Cotignola Flor')).toHaveValue(28)
    expect(screen.getByLabelText('Número de Bergeonneau Mauri')).toHaveValue(23)
  })

  it('warns about a repeated number and saves it anyway', async () => {
    const { saveRosterRows } = show({
      roster: [
        rosterRow(),
        rosterRow({ id: 'r2', playerId: 'player-mauri', jerseyNumber: 23 }),
      ],
    })

    await openRoster('Rock Choppers')
    fireEvent.change(screen.getByLabelText('Número de Bergeonneau Mauri'), {
      target: { value: '28' },
    })

    expect(screen.getByText(/El número 28 lo llevan/)).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Guardar el plantel' }),
    ).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Guardar el plantel' }))

    expect(saveRosterRows).toHaveBeenCalledWith(
      expect.objectContaining({
        roster: [expect.objectContaining({ jersey_number: 28 })],
      }),
    )
  })

  it('warns about somebody with no number and saves them anyway', async () => {
    const { saveRosterRows } = show({ roster: [rosterRow()] })

    await openRoster('Rock Choppers')
    fireEvent.change(screen.getByLabelText('Número de Cotignola Flor'), {
      target: { value: '' },
    })

    expect(screen.getByText(/queda sin número/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar el plantel' }))

    expect(saveRosterRows).toHaveBeenCalledWith(
      expect.objectContaining({
        roster: [expect.objectContaining({ jersey_number: null })],
      }),
    )
  })

  it('refuses a number the database would refuse', async () => {
    show({ roster: [rosterRow()] })

    await openRoster('Rock Choppers')
    fireEvent.change(screen.getByLabelText('Número de Cotignola Flor'), {
      target: { value: '128' },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El número de Cotignola Flor va entre 0 y 99',
    )
    expect(
      screen.getByRole('button', { name: 'Guardar el plantel' }),
    ).toBeDisabled()
  })

  it('adds somebody the league already knows', async () => {
    const { saveRosterRows } = show()

    await openRoster('Rock Choppers')
    fireEvent.change(screen.getByLabelText('Persona de la liga'), {
      target: { value: 'player-omar' },
    })
    fireEvent.change(screen.getByLabelText('Número (opcional)'), {
      target: { value: '21' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sumar al plantel' }))

    expect(screen.getByLabelText('Número de Coria Omar')).toHaveValue(21)

    fireEvent.click(screen.getByRole('button', { name: 'Guardar el plantel' }))

    expect(saveRosterRows).toHaveBeenCalledWith(
      expect.objectContaining({
        people: [],
        roster: [
          expect.objectContaining({
            player_id: 'player-omar',
            team_id: 'team-hanta',
            competition_key: 'beer',
            season_id: 'season-2026',
            jersey_number: 21,
            active: true,
          }),
        ],
      }),
    )
  })

  it('creates a person the league does not know, with a name and nothing else', async () => {
    const { saveRosterRows } = show({
      saveRosterRows: vi
        .fn<RosterSaver>()
        .mockResolvedValue({ saved: ['people', 'roster'], failed: [] }),
    })

    await openRoster('Rock Choppers')
    fireEvent.change(
      screen.getByLabelText('O una persona nueva: nombre y apellido'),
      { target: { value: 'Zayas Maitena' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sumar al plantel' }))

    expect(screen.getByLabelText('Número de Zayas Maitena')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Guardar el plantel' }))

    const writes = (saveRosterRows as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as RosterWrites
    expect(Object.keys(writes.people[0] ?? {})).toEqual(['id', 'full_name'])
    expect(writes.people[0]?.full_name).toBe('Zayas Maitena')

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Las personas nuevas quedaron creadas.',
    )
  })

  it('asks for nothing personal beyond a name', async () => {
    show()

    await openRoster('Rock Choppers')

    for (const asked of [
      /DNI/i,
      /documento/i,
      /nacimiento/i,
      /teléfono/i,
      /domicilio/i,
      /pago/i,
    ]) {
      expect(screen.queryByLabelText(asked)).toBeNull()
    }
    expect(
      screen.getByText(/No hay DNI, ni fecha de nacimiento, ni teléfono/),
    ).toBeVisible()
  })

  it('says which team already holds somebody, instead of letting the key say it', async () => {
    show({
      roster: [
        rosterRow({
          id: 'r-verde',
          teamId: 'team-verde',
          playerId: 'player-omar',
        }),
      ],
    })

    await openRoster('Rock Choppers')

    // Somebody already on another Beer League roster is not even offered.
    expect(
      within(screen.getByLabelText('Persona de la liga')).queryByText(
        'Coria Omar',
      ),
    ).toBeNull()
  })

  it('offers a woman on a Beer League roster for a WUBL team', async () => {
    show({
      roster: [
        rosterRow({
          id: 'r-hanta',
          teamId: 'team-hanta',
          playerId: 'player-flor',
        }),
      ],
    })

    fireEvent.click(
      await screen.findByRole('radio', { name: "Women's Beer League" }),
    )
    await openRoster('Frozen Queens')

    expect(
      within(screen.getByLabelText('Persona de la liga')).getByText(
        'Cotignola Flor',
      ),
    ).toBeVisible()
  })

  it('takes somebody off the roster without deleting their row', async () => {
    const { saveRosterRows } = show({ roster: [rosterRow()] })

    await openRoster('Rock Choppers')
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Quitar a Cotignola Flor del plantel',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar el plantel' }))

    const writes = (saveRosterRows as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as RosterWrites
    expect(writes.roster[0]?.active).toBe(false)
    expect(writes).not.toHaveProperty('removeIds')
  })

  it('writes nothing on a second save that changed nothing', async () => {
    const { saveRosterRows } = show({ roster: [rosterRow()] })

    await openRoster('Rock Choppers')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar el plantel' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'No cambiaste nada, así que no escribimos nada.',
    )
    expect(saveRosterRows).not.toHaveBeenCalled()
  })

  it('reports a refusal on the people as a refusal that left the roster alone', async () => {
    show({
      saveRosterRows: vi.fn<RosterSaver>().mockResolvedValue({
        saved: [],
        failed: [
          {
            part: 'people',
            because:
              'La base rechazó el cambio: tu rol no tiene permiso para editar equipos, planteles ni fixture.',
          },
        ],
      }),
    })

    await openRoster('Rock Choppers')
    fireEvent.change(
      screen.getByLabelText('O una persona nueva: nombre y apellido'),
      { target: { value: 'Zayas Maitena' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sumar al plantel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar el plantel' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'No pudimos crear a las personas nuevas, así que no tocamos el plantel',
    )
    expect(alert).toHaveTextContent('Lo que cargaste sigue en pantalla.')
    expect(screen.getByLabelText('Número de Zayas Maitena')).toBeVisible()
  })

  it('reports a refusal on the roster rows, and keeps what was typed', async () => {
    show({
      roster: [rosterRow()],
      saveRosterRows: vi.fn<RosterSaver>().mockResolvedValue({
        saved: [],
        failed: [
          {
            part: 'roster',
            because:
              'Esa persona ya está en el plantel de otro equipo de esta competencia en esta temporada.',
          },
        ],
      }),
    })

    await openRoster('Rock Choppers')
    fireEvent.change(screen.getByLabelText('Número de Cotignola Flor'), {
      target: { value: '29' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar el plantel' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos guardar el plantel: Esa persona ya está en el plantel de otro equipo',
    )
    expect(screen.getByLabelText('Número de Cotignola Flor')).toHaveValue(29)
  })
})

describe('the editor opens inside the row it belongs to', () => {
  /** The list item a team's name sits in. */
  const rowOf = async (name: string) => {
    const heading = await screen.findByText(name)
    const row = heading.closest('li')
    if (row === null) throw new Error(`${name} is not inside a row`)

    return row
  }

  const editButton = (row: HTMLElement, name: string) =>
    within(row).getByRole('button', { name: `Editar ${name}` })

  it('puts the form in the row, not at the bottom of the page', async () => {
    show()

    const row = await rowOf('Birra del Fuego')
    expect(within(row).queryByLabelText('Nombre corto')).toBeNull()

    fireEvent.click(editButton(row, 'Birra del Fuego'))

    // The very field somebody is about to type in is inside the row they tapped:
    // editing three teams in a row used to mean scrolling to the bottom, saving,
    // and scrolling back up to find your place.
    const field = within(row).getByLabelText('Nombre corto')
    expect(field).toHaveValue('Birra del Fuego')
  })

  it('marks which row is open, and opens only one', async () => {
    show()

    const verde = await rowOf('Birra del Fuego')
    const hanta = await rowOf('Rock Choppers')

    fireEvent.click(editButton(verde, 'Birra del Fuego'))
    expect(verde.className).toContain('teams__row--editing')
    expect(hanta.className).not.toContain('teams__row--editing')

    fireEvent.click(editButton(hanta, 'Rock Choppers'))
    expect(hanta.className).toContain('teams__row--editing')
    expect(verde.className).not.toContain('teams__row--editing')
    expect(within(verde).queryByLabelText('Nombre corto')).toBeNull()
  })

  it('closes with the same button, so a row opened by mistake costs nothing', async () => {
    show()

    const row = await rowOf('Birra del Fuego')
    const button = editButton(row, 'Birra del Fuego')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveTextContent('Cerrar')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveTextContent('Editar')
    expect(within(row).queryByLabelText('Nombre corto')).toBeNull()
  })

  it('still offers the form below the list for a team that does not exist yet', async () => {
    show()

    // Nothing is being edited, so the form below is the new-team one: there is no
    // row to open for a team that has no row.
    expect(await screen.findByLabelText('Nombre corto')).toBeVisible()
    expect(
      screen.getByRole('button', { name: /Crear el equipo/ }),
    ).toBeVisible()

    const row = await rowOf('Birra del Fuego')
    fireEvent.click(editButton(row, 'Birra del Fuego'))

    // With a row open there is exactly one form on screen, and it is that row's.
    expect(screen.getAllByLabelText('Nombre corto')).toHaveLength(1)
    expect(within(row).getByLabelText('Nombre corto')).toBeVisible()
  })
})
