import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Result, SeasonsAndCompetitions } from './adminQueries'
import { SeasonsScreen } from './SeasonsScreen'
import type {
  CompetitionRecord,
  SeasonRecord,
  SeasonSavePlan,
  SeasonSaveReport,
} from './seasonsDraft'
import type { AdminRole } from './useAdminSession'

/**
 * No database, and no attempt to reach one. The seasons come from a fake, and so
 * does the write, which is the only way the two refusals that matter here can be
 * exercised: row level security, and the unique index that allows one season in
 * curso.
 */
type Loader = () => Promise<Result<SeasonsAndCompetitions>>
type Saver = (plan: SeasonSavePlan) => Promise<SeasonSaveReport>

const season = (overrides: Partial<SeasonRecord> = {}): SeasonRecord => ({
  id: 'season-2026',
  year: 2026,
  startsOn: '2026-05-16',
  endsOn: '2026-08-15',
  status: 'active',
  ...overrides,
})

/** The two rows the migration itself inserts, which is where they come from. */
const BEER: CompetitionRecord = {
  key: 'beer',
  name: 'Beer League',
  description: 'Competencia principal, planteles mixtos.',
  active: true,
}

const WUBL: CompetitionRecord = {
  key: 'wubl',
  name: "Women's Beer League",
  description: 'Competencia femenina, cuatro equipos.',
  active: true,
}

const COMPETITIONS: CompetitionRecord[] = [BEER, WUBL]

const accepted = (stoodDown: number | null = null): SeasonSaveReport => ({
  stoodDown,
  saved: true,
  failed: [],
})

const accepting = () =>
  vi.fn<Saver>(async (plan) =>
    accepted(plan.standDown === null ? null : plan.standDown.year),
  )

const answering = (report: SeasonSaveReport) =>
  vi.fn<Saver>().mockResolvedValue(report)

interface Options {
  seasons?: SeasonRecord[]
  competitions?: CompetitionRecord[]
  load?: Loader
  save?: ReturnType<typeof accepting>
  role?: AdminRole
}

const show = ({
  seasons = [],
  competitions = COMPETITIONS,
  load = () => Promise.resolve({ ok: true, data: { seasons, competitions } }),
  save = accepting(),
  role = 'general_administrator',
}: Options = {}) => {
  render(<SeasonsScreen load={load} role={role} save={save} />)
  return save
}

const typeYear = (text: string) =>
  fireEvent.change(screen.getByLabelText('Año'), { target: { value: text } })

const saveButton = () =>
  screen.getByRole('button', {
    name: /Crear la temporada|Guardar la temporada|Guardando/,
  })

describe('SeasonsScreen', () => {
  it('waits out loud while it reads the seasons', () => {
    show({ load: () => new Promise(() => undefined) })

    expect(screen.getByText('Cargando las temporadas…')).toBeVisible()
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
      'No pudimos leer las temporadas: Esta versión del sitio se publicó sin la conexión a la base.',
    )
  })

  it('lists every season with its dates and its state, most recent first', async () => {
    show({
      seasons: [
        season({ id: 'a', year: 2025, status: 'finished' }),
        season(),
        season({
          id: 'c',
          year: 2027,
          startsOn: null,
          endsOn: null,
          status: 'upcoming',
        }),
      ],
    })

    const rows = await screen.findAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('2027')
    expect(rows[0]).toHaveTextContent('Sin fechas definidas')
    expect(rows[0]).toHaveTextContent('Por comenzar')
    expect(rows[1]).toHaveTextContent('2026')
    expect(rows[1]).toHaveTextContent(
      'Del 16 de mayo de 2026 al 15 de agosto de 2026',
    )
    expect(rows[1]).toHaveTextContent('En curso')
    expect(rows[2]).toHaveTextContent('Finalizada')
  })

  it('says so when no season is loaded at all', async () => {
    show({ seasons: [] })

    expect(
      await screen.findByText(/Todavía no hay ninguna temporada cargada/),
    ).toBeVisible()
  })

  it('creates a season with a year, its dates and its state', async () => {
    const save = show()
    await screen.findByLabelText('Año')

    typeYear('2027')
    fireEvent.change(screen.getByLabelText('Empieza (opcional)'), {
      target: { value: '2027-05-15' },
    })
    fireEvent.change(screen.getByLabelText('Termina (opcional)'), {
      target: { value: '2027-08-20' },
    })
    fireEvent.click(saveButton())

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Guardamos la temporada.',
    )
    expect(save).toHaveBeenCalledWith({
      seasonId: null,
      row: {
        year: 2027,
        starts_on: '2027-05-15',
        ends_on: '2027-08-20',
        status: 'upcoming',
      },
      standDown: null,
    })
  })

  it('creates a season whose calendar is not fixed yet', async () => {
    const save = show()
    await screen.findByLabelText('Año')

    typeYear('2027')
    fireEvent.click(saveButton())

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        row: expect.objectContaining({ starts_on: null, ends_on: null }),
      }),
    )
  })

  it('says which season will be stood down before the button is pressed', async () => {
    show({ seasons: [season()] })
    await screen.findByLabelText('Año')

    typeYear('2027')
    fireEvent.click(screen.getByRole('radio', { name: 'En curso' }))

    expect(
      screen.getByText(
        /la temporada 2026 deja de estar en curso y queda finalizada/,
      ),
    ).toBeVisible()
  })

  it('stands the current season down as part of the write, and says it did', async () => {
    const save = show({ seasons: [season()] })
    await screen.findByLabelText('Año')

    typeYear('2027')
    fireEvent.click(screen.getByRole('radio', { name: 'En curso' }))
    fireEvent.click(saveButton())

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        row: expect.objectContaining({ year: 2027, status: 'active' }),
        standDown: { id: 'season-2026', year: 2026 },
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'La temporada 2026 quedó finalizada, porque solo puede haber una en curso.',
    )
  })

  it('does not ask the season being edited to stand itself down', async () => {
    const save = show({ seasons: [season()] })

    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar la temporada 2026' }),
    )
    fireEvent.click(saveButton())

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ seasonId: 'season-2026', standDown: null }),
    )
  })

  it('edits an existing season, reading its values into the form', async () => {
    const save = show({ seasons: [season()] })

    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar la temporada 2026' }),
    )

    expect(screen.getByLabelText('Año')).toHaveValue(2026)
    expect(screen.getByLabelText('Empieza (opcional)')).toHaveValue(
      '2026-05-16',
    )
    expect(screen.getByRole('radio', { name: 'En curso' })).toBeChecked()
    expect(
      screen.getByRole('heading', { name: 'Editar la temporada 2026' }),
    ).toBeVisible()

    fireEvent.change(screen.getByLabelText('Termina (opcional)'), {
      target: { value: '2026-08-22' },
    })
    fireEvent.click(saveButton())

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonId: 'season-2026',
        row: expect.objectContaining({ ends_on: '2026-08-22' }),
      }),
    )
  })

  it('lets an edit be abandoned', async () => {
    show({ seasons: [season()] })

    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar la temporada 2026' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByLabelText('Año')).toHaveValue(null)
    expect(
      screen.getByRole('heading', { name: 'Nueva temporada' }),
    ).toBeVisible()
  })

  it('refuses an end date before the start', async () => {
    const save = show()
    await screen.findByLabelText('Año')

    typeYear('2027')
    fireEvent.change(screen.getByLabelText('Empieza (opcional)'), {
      target: { value: '2027-08-20' },
    })
    fireEvent.change(screen.getByLabelText('Termina (opcional)'), {
      target: { value: '2027-05-15' },
    })

    expect(
      screen.getByText(/La temporada no puede cerrar antes de empezar/),
    ).toBeVisible()
    expect(saveButton()).toBeDisabled()

    fireEvent.click(saveButton())
    expect(save).not.toHaveBeenCalled()
  })

  it('refuses a year outside the range the database checks', async () => {
    const save = show()
    await screen.findByLabelText('Año')

    typeYear('2022')
    expect(screen.getByText(/La liga se fundó en 2023/)).toBeVisible()
    expect(saveButton()).toBeDisabled()

    typeYear('2101')
    expect(screen.getByText(/el año va entre 2023 y 2100/)).toBeVisible()
    expect(saveButton()).toBeDisabled()
    expect(save).not.toHaveBeenCalled()
  })

  it('refuses a year another season already holds', async () => {
    show({ seasons: [season()] })
    await screen.findByLabelText('Año')

    typeYear('2026')

    expect(screen.getByText(/Ya hay una temporada 2026 cargada/)).toBeVisible()
    expect(saveButton()).toBeDisabled()
  })

  it('does not open complaining about an empty year', async () => {
    show()

    await screen.findByLabelText('Año')
    expect(screen.queryByText(/Escribí el año/)).toBeNull()
    expect(saveButton()).toBeDisabled()
  })

  it('reports a refusal by row level security as a permission', async () => {
    show({
      save: answering({
        stoodDown: null,
        saved: false,
        failed: [
          {
            step: 'season',
            because:
              'La base rechazó el cambio: solo la administración general puede crear o editar temporadas.',
          },
        ],
      }),
    })
    await screen.findByLabelText('Año')

    typeYear('2027')
    fireEvent.click(saveButton())

    const refused = await screen.findByRole('alert')
    expect(refused).toHaveTextContent(
      'No pudimos guardar la temporada: La base rechazó el cambio: solo la administración general puede crear o editar temporadas.',
    )
    expect(refused).toHaveTextContent('Lo que cargaste sigue en pantalla.')
  })

  it('says the current season was already finished when the second step failed', async () => {
    show({
      seasons: [season()],
      save: answering({
        stoodDown: 2026,
        saved: false,
        failed: [
          { step: 'season', because: 'Ya hay una temporada con ese año.' },
        ],
      }),
    })
    await screen.findByLabelText('Año')

    typeYear('2027')
    fireEvent.click(screen.getByRole('radio', { name: 'En curso' }))
    fireEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ojo: la temporada 2026 ya quedó finalizada.',
    )
  })

  it('says it left the season alone when it could not stand the current one down', async () => {
    show({
      seasons: [season()],
      save: answering({
        stoodDown: null,
        saved: false,
        failed: [
          {
            step: 'stand-down',
            because:
              'La base rechazó el cambio: solo la administración general puede crear o editar temporadas.',
          },
        ],
      }),
    })
    await screen.findByLabelText('Año')

    typeYear('2027')
    fireEvent.click(screen.getByRole('radio', { name: 'En curso' }))
    fireEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos finalizar la temporada que estaba en curso, así que no tocamos la que estabas guardando',
    )
  })

  it('shows a role that cannot write these tables why, and no form', async () => {
    show({ seasons: [season()], role: 'sporting_management' })

    expect(await screen.findByText(/Tu rol es Gestión deportiva/)).toBeVisible()
    expect(screen.queryByLabelText('Año')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Editar la temporada 2026' }),
    ).toBeNull()
    // The seasons themselves are public, so the list stays.
    expect(screen.getByText('2026')).toBeVisible()
  })

  it('shows the two competitions and offers no way to create one', async () => {
    show()

    expect(await screen.findByText('Beer League')).toBeVisible()
    expect(screen.getByText("Women's Beer League")).toBeVisible()
    expect(
      screen.getByText(/Las competencias son un vocabulario fijo/),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: /competencia/i })).toBeNull()
  })

  it('says which competition is retired rather than hiding it', async () => {
    show({ competitions: [{ ...BEER, active: false }] })

    const row = (await screen.findByText('Beer League')).closest(
      'li',
    ) as HTMLElement
    expect(within(row).getByText('Inactiva')).toBeVisible()
  })

  it('says so when the database gave back no competition at all', async () => {
    show({ competitions: [] })

    expect(
      await screen.findByText(/La base no devolvió ninguna competencia/),
    ).toBeVisible()
  })
})
