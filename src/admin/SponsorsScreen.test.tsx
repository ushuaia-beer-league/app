import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Result } from './adminQueries'
import type {
  SponsorRecord,
  SponsorWrites,
  SponsorsPage,
} from './contentDrafts'
import { SponsorsScreen } from './SponsorsScreen'

const SEASON = 'season-2026'

const sponsor = (overrides: Partial<SponsorRecord> = {}): SponsorRecord => ({
  id: 'sponsor-1',
  name: 'Cervecería Beagle',
  url: 'https://beagle.example',
  logoPath: 'sponsors/2026/aaa.png',
  displayOrder: 0,
  active: true,
  ...overrides,
})

type Loader = () => Promise<Result<SponsorsPage>>
type Saver = (writes: SponsorWrites) => Promise<Result<null>>
type Uploader = (file: File) => Promise<Result<string>>

const page = (sponsors: readonly SponsorRecord[] = []): SponsorsPage => ({
  seasonId: SEASON,
  sponsors,
})

/** A database that accepts everything, which is what it does for communications. */
const accepting = () =>
  vi.fn<Saver>().mockResolvedValue({ ok: true, data: null })

/** A bucket that accepts everything and answers with the path it stored. */
const storing = (path = 'sponsors/2026/new.png') =>
  vi.fn<Uploader>().mockResolvedValue({ ok: true, data: path })

const image = (name = 'logo.png', type = 'image/png', size = 4_000) => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const show = ({
  sponsors = [],
  load,
  save = accepting(),
  upload = storing(),
}: {
  sponsors?: readonly SponsorRecord[]
  load?: Loader
  save?: ReturnType<typeof accepting>
  upload?: ReturnType<typeof storing>
} = {}) => {
  render(
    <SponsorsScreen
      imageUrl={(path) => `https://media.example/${path}`}
      load={load ?? (() => Promise.resolve({ ok: true, data: page(sponsors) }))}
      save={save}
      upload={upload}
    />,
  )
  return { save, upload }
}

const saveButton = () =>
  screen.getByRole('button', { name: /Guardar los sponsors|Guardando/ })

/** One sponsor's row, found by the name shown on it. */
const rowOf = async (name: string) =>
  (await screen.findByRole('heading', { name })).closest('li') as HTMLElement

const addSponsor = (name: string) => {
  fireEvent.change(screen.getByLabelText('Nombre del nuevo sponsor'), {
    target: { value: name },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Agregar sponsor' }))
}

describe('SponsorsScreen', () => {
  it('waits out loud, and then says a season with no sponsors has none', async () => {
    show()

    expect(screen.getByText('Cargando los sponsors…')).toBeVisible()
    expect(
      await screen.findByText(
        'Todavía no hay sponsors cargados en esta temporada.',
      ),
    ).toBeVisible()
    expect(screen.getByText('No hay cambios sin guardar.')).toBeVisible()
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
      'No pudimos leer los sponsors: Esta versión del sitio se publicó sin la conexión a la base.',
    )
  })

  it('saves a sponsor that is only a name, and says its logo is missing', async () => {
    const { save } = show()
    await screen.findByText(
      'Todavía no hay sponsors cargados en esta temporada.',
    )

    addSponsor('Ferretería del Sur')

    const row = await rowOf('Ferretería del Sur')
    expect(
      within(row).getByText('Sin logo todavía: se publica el nombre.'),
    ).toBeVisible()
    expect(screen.getByText('Falta guardar un sponsor.')).toBeVisible()

    fireEvent.click(saveButton())

    expect(await screen.findByText('Guardamos un sponsor.')).toBeVisible()
    expect(save.mock.calls[0]?.[0].upsert).toEqual([
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        season_id: SEASON,
        name: 'Ferretería del Sur',
        url: null,
        logo_path: null,
        display_order: 0,
        active: true,
      },
    ])
  })

  it('shows the logo a sponsor already has, and writes the path and never a URL', async () => {
    const { save } = show({ sponsors: [sponsor()] })

    const row = await rowOf('Cervecería Beagle')
    expect(
      await within(row).findByRole('img', {
        name: 'Logo de Cervecería Beagle',
      }),
    ).toHaveAttribute('src', 'https://media.example/sponsors/2026/aaa.png')

    fireEvent.change(within(row).getByLabelText('Nombre'), {
      target: { value: 'Cervecería Beagle SRL' },
    })
    fireEvent.click(saveButton())

    await screen.findByText('Guardamos un sponsor.')
    expect(save.mock.calls[0]?.[0].upsert[0]).toMatchObject({
      name: 'Cervecería Beagle SRL',
      logo_path: 'sponsors/2026/aaa.png',
    })
  })

  it('uploads a logo and keeps the path the bucket answered with', async () => {
    const { save, upload } = show({ sponsors: [sponsor({ logoPath: null })] })
    const row = await rowOf('Cervecería Beagle')

    expect(
      within(row).getByText('Sin logo todavía: se publica el nombre.'),
    ).toBeVisible()

    fireEvent.change(within(row).getByLabelText('Logo'), {
      target: { files: [image()] },
    })

    expect(
      await within(await rowOf('Cervecería Beagle')).findByRole('img', {
        name: 'Logo de Cervecería Beagle',
      }),
    ).toBeVisible()
    expect(upload).toHaveBeenCalledTimes(1)

    fireEvent.click(saveButton())
    await screen.findByText('Guardamos un sponsor.')

    expect(save.mock.calls[0]?.[0].upsert[0]).toMatchObject({
      logo_path: 'sponsors/2026/new.png',
    })
  })

  it('refuses a file the bucket would not take, before spending the upload', async () => {
    const { upload } = show({ sponsors: [sponsor()] })
    const row = await rowOf('Cervecería Beagle')

    fireEvent.change(within(row).getByLabelText('Logo'), {
      target: { files: [image('contrato.pdf', 'application/pdf')] },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '«contrato.pdf» no es una imagen de las que el depósito acepta. Tienen que ser JPG, PNG, WEBP o AVIF.',
    )
    expect(upload).not.toHaveBeenCalled()
  })

  it('refuses a file too big to be worth uploading, before spending the upload', async () => {
    const { upload } = show({ sponsors: [sponsor()] })
    const row = await rowOf('Cervecería Beagle')

    fireEvent.change(within(row).getByLabelText('Logo'), {
      target: { files: [image('gigante.jpg', 'image/jpeg', 31_457_280)] },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '«gigante.jpg» pesa 30,0 MB y el panel acepta hasta 25,0 MB.',
    )
    expect(upload).not.toHaveBeenCalled()
  })

  it('reads a refused upload as a permission, and loses nothing that was typed', async () => {
    const upload = vi.fn<Uploader>().mockResolvedValue({
      ok: false,
      because:
        'La base rechazó el cambio: tu rol no tiene permiso para editar sponsors ni fotos. Comunicación y la administración general pueden; la gestión deportiva, no.',
    })
    show({ sponsors: [sponsor({ logoPath: null })], upload })

    const row = await rowOf('Cervecería Beagle')
    fireEvent.change(within(row).getByLabelText('Nombre'), {
      target: { value: 'Cervecería Beagle SRL' },
    })
    fireEvent.change(within(row).getByLabelText('Logo'), {
      target: { files: [image()] },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos subir el logo de Cervecería Beagle SRL: La base rechazó el cambio: tu rol no tiene permiso para editar sponsors ni fotos.',
    )
    expect(
      within(await rowOf('Cervecería Beagle SRL')).getByLabelText('Nombre'),
    ).toHaveValue('Cervecería Beagle SRL')
  })

  it('reads a refused save as a permission, and keeps the draft to retry', async () => {
    const save = vi.fn<Saver>().mockResolvedValue({
      ok: false,
      because:
        'La base rechazó el cambio: tu rol no tiene permiso para editar sponsors ni fotos. Comunicación y la administración general pueden; la gestión deportiva, no.',
    })
    show({ sponsors: [sponsor()], save })

    fireEvent.change(
      within(await rowOf('Cervecería Beagle')).getByLabelText('Link'),
      {
        target: { value: 'https://beagle.example/ubl' },
      },
    )
    fireEvent.click(saveButton())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'No pudimos guardar los sponsors: La base rechazó el cambio: tu rol no tiene permiso para editar sponsors ni fotos.',
    )
    expect(alert).toHaveTextContent('Lo que cargaste sigue en pantalla.')

    // Still pending, still on screen, and one more press retries the same write.
    expect(screen.getByText('Falta guardar un sponsor.')).toBeVisible()
    expect(
      within(await rowOf('Cervecería Beagle')).getByLabelText('Link'),
    ).toHaveValue('https://beagle.example/ubl')

    fireEvent.click(saveButton())
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('will not save a sponsor whose name was emptied, and says why', async () => {
    show({ sponsors: [sponsor()] })

    fireEvent.change(
      within(await rowOf('Cervecería Beagle')).getByLabelText('Nombre'),
      { target: { value: '' } },
    )

    expect(
      await screen.findByText(
        'Falta el nombre de el sponsor 1. El nombre es lo que se publica cuando todavía no hay logo, así que no puede quedar vacío.',
      ),
    ).toBeVisible()
    expect(saveButton()).toBeDisabled()
  })

  it('will not save a link that is not a link', async () => {
    show({ sponsors: [sponsor()] })

    fireEvent.change(
      within(await rowOf('Cervecería Beagle')).getByLabelText('Link'),
      {
        target: { value: 'beagle.example' },
      },
    )

    expect(
      await screen.findByText(
        'El link de Cervecería Beagle tiene que empezar con http:// o https://.',
      ),
    ).toBeVisible()
    expect(saveButton()).toBeDisabled()
  })

  it('retires a sponsor without deleting it, and can put it back', async () => {
    const { save } = show({ sponsors: [sponsor()] })
    const row = await rowOf('Cervecería Beagle')

    fireEvent.click(within(row).getByRole('button', { name: 'Retirar' }))
    expect(
      within(await rowOf('Cervecería Beagle')).getByText('Retirado'),
    ).toBeVisible()

    fireEvent.click(saveButton())
    await screen.findByText('Guardamos un sponsor.')

    expect(save.mock.calls[0]?.[0].upsert[0]).toMatchObject({
      id: 'sponsor-1',
      active: false,
    })

    fireEvent.click(
      within(await rowOf('Cervecería Beagle')).getByRole('button', {
        name: 'Reactivar',
      }),
    )
    expect(screen.queryByText('Retirado')).toBeNull()
  })

  it('reorders the wall and writes the new places', async () => {
    const { save } = show({
      sponsors: [
        sponsor({ id: 'a', name: 'Aluar', displayOrder: 0 }),
        sponsor({ id: 'b', name: 'Beagle', displayOrder: 1 }),
      ],
    })

    fireEvent.click(
      within(await rowOf('Beagle')).getByRole('button', {
        name: 'Subir Beagle en el orden',
      }),
    )
    fireEvent.click(saveButton())
    await screen.findByText('Guardamos 2 sponsors.')

    expect(
      save.mock.calls[0]?.[0].upsert.map((row) => [row.id, row.display_order]),
    ).toEqual([
      ['b', 0],
      ['a', 1],
    ])
  })

  it('writes nothing the second time the same draft is saved', async () => {
    const { save } = show({ sponsors: [sponsor()] })

    fireEvent.change(
      within(await rowOf('Cervecería Beagle')).getByLabelText('Nombre'),
      { target: { value: 'Cervecería Beagle SRL' } },
    )
    fireEvent.click(saveButton())
    await screen.findByText('Guardamos un sponsor.')

    fireEvent.click(saveButton())
    expect(
      await screen.findByText('No había nada nuevo para guardar.'),
    ).toBeVisible()
    expect(save.mock.calls[1]?.[0].upsert).toEqual([])
  })
})
