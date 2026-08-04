import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Result } from './adminQueries'
import type {
  PhotoRecord,
  PhotoWrites,
  PhotosPage,
  PhotosSaveReport,
} from './contentDrafts'
import { PhotosScreen } from './PhotosScreen'

const SEASON = 'season-2026'

const photo = (overrides: Partial<PhotoRecord> = {}): PhotoRecord => ({
  id: 'photo-1',
  storagePath: 'photos/2026/aaa.jpg',
  caption: 'Final en el Poli',
  takenOn: '2026-08-15',
  displayOrder: 0,
  ...overrides,
})

type Loader = () => Promise<Result<PhotosPage>>
type Saver = (writes: PhotoWrites) => Promise<PhotosSaveReport>
type Uploader = (file: File) => Promise<Result<string>>

const page = (photos: readonly PhotoRecord[] = []): PhotosPage => ({
  seasonId: SEASON,
  photos,
})

/** A database that accepts every part of the save. */
const accepting = () =>
  vi.fn<Saver>(async (writes) => ({
    saved: [
      ...(writes.upsert.length > 0 ? (['rows'] as const) : []),
      ...(writes.removeIds.length > 0 ? (['removed', 'files'] as const) : []),
    ],
    failed: [],
  }))

const storing = () => {
  let count = 0
  return vi.fn<Uploader>(() => {
    count += 1
    return Promise.resolve({ ok: true, data: `photos/2026/file-${count}.jpg` })
  })
}

const image = (name = 'asado.jpg', type = 'image/jpeg', size = 400_000) => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const show = ({
  photos = [],
  load,
  save = accepting(),
  upload = storing(),
}: {
  photos?: readonly PhotoRecord[]
  load?: Loader
  save?: ReturnType<typeof accepting>
  upload?: ReturnType<typeof storing>
} = {}) => {
  render(
    <PhotosScreen
      imageUrl={(path) => `https://media.example/${path}`}
      load={load ?? (() => Promise.resolve({ ok: true, data: page(photos) }))}
      save={save}
      upload={upload}
    />,
  )
  return { save, upload }
}

const saveButton = () =>
  screen.getByRole('button', { name: /Guardar la galería|Guardando/ })

/** The gallery's rows, in the order they are shown. */
const rows = async () =>
  (await screen.findAllByLabelText('Epígrafe')).map(
    (field) => field.closest('li') as HTMLElement,
  )

const pick = async (files: readonly File[]) =>
  fireEvent.change(await screen.findByLabelText('Elegí una o varias fotos'), {
    target: { files },
  })

describe('PhotosScreen', () => {
  it('says an empty gallery is empty instead of showing placeholders', async () => {
    show()

    expect(screen.getByText('Cargando las fotos…')).toBeVisible()
    expect(
      await screen.findByText(
        'Todavía no hay fotos en la galería de esta temporada.',
      ),
    ).toBeVisible()
    expect(screen.getByText('No hay cambios sin guardar.')).toBeVisible()
    expect(screen.queryAllByRole('img')).toEqual([])
  })

  it('says why it could not read the gallery', async () => {
    show({
      load: () =>
        Promise.resolve({
          ok: false,
          because: 'La temporada 2026 no está cargada en la base.',
        }),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos leer las fotos: La temporada 2026 no está cargada en la base.',
    )
  })

  it('uploads several at once and writes one row for each', async () => {
    const { save, upload } = show()
    await screen.findByText(
      'Todavía no hay fotos en la galería de esta temporada.',
    )

    await pick([image('uno.jpg'), image('dos.jpg', 'image/jpeg', 500_000)])

    expect(await screen.findByText('2 fotos en la galería.')).toBeVisible()
    expect(upload).toHaveBeenCalledTimes(2)

    fireEvent.click(saveButton())
    await screen.findByText('Guardamos las fotos.')

    expect(save.mock.calls[0]?.[0].upsert).toEqual([
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        season_id: SEASON,
        storage_path: 'photos/2026/file-1.jpg',
        caption: null,
        taken_on: null,
        display_order: 0,
      },
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        season_id: SEASON,
        storage_path: 'photos/2026/file-2.jpg',
        caption: null,
        taken_on: null,
        display_order: 1,
      },
    ])
  })

  it('keeps the ones that landed when an upload fails halfway', async () => {
    const upload = vi
      .fn<Uploader>()
      .mockResolvedValueOnce({ ok: true, data: 'photos/2026/uno.jpg' })
      .mockResolvedValueOnce({
        ok: false,
        because:
          'El depósito rechazó el archivo por tamaño: el máximo es 5 MB por imagen.',
      })
    show({ upload })

    await pick([image('uno.jpg'), image('dos.jpg')])

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '«dos.jpg»: El depósito rechazó el archivo por tamaño: el máximo es 5 MB por imagen.',
    )
    expect(
      screen.getByText('Las demás sí subieron y están en la lista.'),
    ).toBeVisible()
    expect(await rows()).toHaveLength(1)
    expect(screen.getByText('1 fotos en la galería.')).toBeVisible()
  })

  it('refuses a file the bucket would not take, before spending the upload', async () => {
    const { upload } = show()
    await screen.findByText(
      'Todavía no hay fotos en la galería de esta temporada.',
    )

    await pick([image('planilla.pdf', 'application/pdf'), image('buena.jpg')])

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '«planilla.pdf» no es una imagen de las que el depósito acepta.',
    )
    // The good one still went up: one refusal does not cancel the pick.
    expect(upload).toHaveBeenCalledTimes(1)
    expect(await rows()).toHaveLength(1)
  })

  it('does not claim the others went up when none of them did', async () => {
    const { upload } = show()
    await screen.findByText(
      'Todavía no hay fotos en la galería de esta temporada.',
    )

    await pick([image('planilla.pdf', 'application/pdf')])

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '«planilla.pdf» no es una imagen de las que el depósito acepta.',
    )
    expect(
      screen.queryByText('Las demás sí subieron y están en la lista.'),
    ).toBeNull()
    expect(upload).not.toHaveBeenCalled()
    expect(
      screen.getByText('Todavía no hay fotos en la galería de esta temporada.'),
    ).toBeVisible()
  })

  it('refuses the same file picked twice, so one image is one row', async () => {
    const { upload } = show()
    await screen.findByText(
      'Todavía no hay fotos en la galería de esta temporada.',
    )

    await pick([image('asado.jpg')])
    expect(await screen.findByText('1 fotos en la galería.')).toBeVisible()

    await pick([image('asado.jpg')])

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '«asado.jpg» ya está en esta lista. Una foto entra una sola vez.',
    )
    expect(upload).toHaveBeenCalledTimes(1)
    expect(await rows()).toHaveLength(1)
  })

  it('captions and dates a photograph, and leaves both empty if nobody said', async () => {
    const { save } = show()
    await screen.findByText(
      'Todavía no hay fotos en la galería de esta temporada.',
    )

    await pick([image('uno.jpg'), image('dos.jpg', 'image/jpeg', 500_000)])
    await screen.findByText('2 fotos en la galería.')

    const [first] = await rows()
    fireEvent.change(within(first as HTMLElement).getByLabelText('Epígrafe'), {
      target: { value: 'Rock Choppers campeón' },
    })
    fireEvent.change(within(first as HTMLElement).getByLabelText('Fecha'), {
      target: { value: '2026-08-15' },
    })

    fireEvent.click(saveButton())
    await screen.findByText('Guardamos las fotos.')

    const written = save.mock.calls[0]?.[0].upsert
    expect(written?.[0]).toMatchObject({
      caption: 'Rock Choppers campeón',
      taken_on: '2026-08-15',
    })
    // A photograph with no caption is still a photograph.
    expect(written?.[1]).toMatchObject({ caption: null, taken_on: null })
  })

  it('shows a photograph that is already in the gallery, named by its caption', async () => {
    show({ photos: [photo()] })

    expect(
      await screen.findByRole('img', { name: 'Final en el Poli' }),
    ).toHaveAttribute('src', 'https://media.example/photos/2026/aaa.jpg')
  })

  it('takes a photograph out of the gallery and out of the bucket', async () => {
    const { save } = show({
      photos: [
        photo(),
        photo({
          id: 'photo-2',
          storagePath: 'photos/2026/bbb.jpg',
          caption: null,
          displayOrder: 1,
        }),
      ],
    })

    const [first] = await rows()
    fireEvent.click(
      within(first as HTMLElement).getByRole('button', {
        name: 'Quitar la foto 1 de la galería',
      }),
    )

    expect(
      screen.getByText(
        'Una foto sale de la galería cuando guardes, y su archivo se borra del depósito.',
      ),
    ).toBeVisible()

    fireEvent.click(saveButton())
    await screen.findByText(
      'Guardamos las fotos, las que sacaste y los archivos del depósito.',
    )

    expect(save.mock.calls[0]?.[0]).toMatchObject({
      removeIds: ['photo-1'],
      removePaths: ['photos/2026/aaa.jpg'],
    })
  })

  it('says the rows came off even when the bucket kept the files', async () => {
    const save = vi.fn<Saver>().mockResolvedValue({
      saved: ['rows', 'removed'],
      failed: [{ part: 'files', because: 'El depósito no respondió.' }],
    })
    show({
      photos: [
        photo(),
        photo({
          id: 'photo-2',
          storagePath: 'photos/2026/bbb.jpg',
          caption: 'Tercer tiempo',
          displayOrder: 1,
        }),
      ],
      save,
    })

    const [first] = await rows()
    fireEvent.click(
      within(first as HTMLElement).getByRole('button', {
        name: 'Quitar la foto 1 de la galería',
      }),
    )
    fireEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sacamos las fotos de la galería, pero los archivos quedaron en el depósito: El depósito no respondió.',
    )
    expect(
      screen.getByText('Guardamos las fotos y las que sacaste.'),
    ).toBeVisible()
  })

  it('reads a refused save as a permission, and keeps every caption typed', async () => {
    const save = vi.fn<Saver>().mockResolvedValue({
      saved: [],
      failed: [
        {
          part: 'rows',
          because:
            'La base rechazó el cambio: tu rol no tiene permiso para editar sponsors ni fotos. Comunicación y la administración general pueden; la gestión deportiva, no.',
        },
      ],
    })
    show({ photos: [photo({ caption: null })], save })

    const [first] = await rows()
    fireEvent.change(within(first as HTMLElement).getByLabelText('Epígrafe'), {
      target: { value: 'Tercer tiempo en Bahía' },
    })
    fireEvent.click(saveButton())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'No pudimos guardar las fotos: La base rechazó el cambio: tu rol no tiene permiso para editar sponsors ni fotos.',
    )
    expect(alert).toHaveTextContent('Lo que cargaste sigue en pantalla.')

    expect(screen.getByText('Falta guardar las fotos.')).toBeVisible()
    const [again] = await rows()
    expect(within(again as HTMLElement).getByLabelText('Epígrafe')).toHaveValue(
      'Tercer tiempo en Bahía',
    )
  })

  it('reorders the gallery and writes the new places', async () => {
    const { save } = show({
      photos: [
        photo({ id: 'a', caption: 'Primera', displayOrder: 0 }),
        photo({
          id: 'b',
          caption: 'Segunda',
          storagePath: 'photos/2026/bbb.jpg',
          displayOrder: 1,
        }),
      ],
    })

    const [, second] = await rows()
    fireEvent.click(
      within(second as HTMLElement).getByRole('button', {
        name: 'Subir la foto 2 en el orden',
      }),
    )
    fireEvent.click(saveButton())
    await screen.findByText('Guardamos las fotos.')

    expect(
      save.mock.calls[0]?.[0].upsert.map((row) => [row.id, row.display_order]),
    ).toEqual([
      ['b', 0],
      ['a', 1],
    ])
  })

  it('writes nothing the second time the same gallery is saved', async () => {
    const { save } = show({ photos: [photo()] })

    const [first] = await rows()
    fireEvent.change(within(first as HTMLElement).getByLabelText('Epígrafe'), {
      target: { value: 'Final en el Poli, 2026' },
    })
    fireEvent.click(saveButton())
    await screen.findByText('Guardamos las fotos.')

    fireEvent.click(saveButton())
    expect(
      await screen.findByText('No había nada nuevo para guardar.'),
    ).toBeVisible()
    expect(save.mock.calls[1]?.[0]).toMatchObject({
      upsert: [],
      removeIds: [],
      removePaths: [],
    })
  })
})
