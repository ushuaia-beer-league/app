import {
  moveSponsor,
  movePhoto,
  newPhoto,
  newSponsor,
  photoPartsOf,
  photoProblems,
  photoWrites,
  photosDraftFrom,
  pickedKey,
  sponsorProblems,
  sponsorRecordsOf,
  sponsorWrites,
  sponsorsDraftFrom,
  withSavedPhotos,
  withoutPhoto,
  type DraftPhoto,
  type DraftSponsor,
  type PhotoRecord,
  type PhotosPage,
  type SponsorRecord,
  type SponsorsPage,
} from './contentDrafts'

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

const photo = (overrides: Partial<PhotoRecord> = {}): PhotoRecord => ({
  id: 'photo-1',
  storagePath: 'photos/2026/aaa.jpg',
  caption: 'Final en el Poli',
  takenOn: '2026-08-15',
  displayOrder: 0,
  ...overrides,
})

const sponsorsPage = (
  sponsors: readonly SponsorRecord[] = [],
): SponsorsPage => ({ seasonId: SEASON, sponsors })

const photosPage = (photos: readonly PhotoRecord[] = []): PhotosPage => ({
  seasonId: SEASON,
  photos,
})

describe('the sponsors draft', () => {
  it('writes nothing at all for a season with no sponsors', () => {
    const page = sponsorsPage()
    const draft = sponsorsDraftFrom(page)

    expect(draft).toEqual([])
    expect(sponsorWrites(SEASON, page.sponsors, draft).upsert).toEqual([])
  })

  it('writes a sponsor that has only a name, with no logo and no link', () => {
    const draft = [newSponsor('Ferretería del Sur')]
    const writes = sponsorWrites(SEASON, [], draft)

    expect(writes.upsert).toEqual([
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        season_id: SEASON,
        name: 'Ferretería del Sur',
        url: null,
        // The whole point of the nullable column: the name is published while
        // the logo is still on somebody's phone.
        logo_path: null,
        display_order: 0,
        active: true,
      },
    ])
    expect(sponsorProblems(draft)).toEqual([])
  })

  it('refuses a sponsor with no name, because the name is what gets published', () => {
    const problems = sponsorProblems([newSponsor('   ')])

    expect(problems).toHaveLength(1)
    expect(problems[0]?.message).toBe(
      'Falta el nombre de el sponsor 1. El nombre es lo que se publica cuando todavía no hay logo, así que no puede quedar vacío.',
    )
  })

  it('refuses a link that is not one, and accepts an empty one', () => {
    const named: DraftSponsor = { ...newSponsor('Kiosco 9'), url: 'beagle.com' }

    expect(sponsorProblems([named])[0]?.message).toBe(
      'El link de Kiosco 9 tiene que empezar con http:// o https://.',
    )
    expect(sponsorProblems([{ ...named, url: '' }])).toEqual([])
    expect(
      sponsorProblems([{ ...named, url: 'https://beagle.example' }]),
    ).toEqual([])
  })

  it('retires a sponsor by clearing active, and never by deleting it', () => {
    const page = sponsorsPage([sponsor()])
    const draft = sponsorsDraftFrom(page).map((row) => ({
      ...row,
      active: false,
    }))

    const writes = sponsorWrites(SEASON, page.sponsors, draft)

    expect(writes.upsert).toHaveLength(1)
    expect(writes.upsert[0]).toMatchObject({ id: 'sponsor-1', active: false })
    // There is nowhere in this shape to ask for a deletion.
    expect(Object.keys(writes)).toEqual(['seasonId', 'upsert'])
  })

  it('reorders by position, writing the two rows that moved', () => {
    const page = sponsorsPage([
      sponsor({ id: 'a', name: 'Aluar', displayOrder: 0 }),
      sponsor({ id: 'b', name: 'Beagle', displayOrder: 1 }),
      sponsor({ id: 'c', name: 'Cabo', displayOrder: 2 }),
    ])

    const moved = moveSponsor(sponsorsDraftFrom(page), 'c', -1)
    const writes = sponsorWrites(SEASON, page.sponsors, moved)

    expect(moved.map((row) => row.id)).toEqual(['a', 'c', 'b'])
    expect(writes.upsert.map((row) => [row.id, row.display_order])).toEqual([
      ['c', 1],
      ['b', 2],
    ])
  })

  it('does nothing when the first sponsor is moved up', () => {
    const draft = sponsorsDraftFrom(sponsorsPage([sponsor({ id: 'a' })]))

    expect(moveSponsor(draft, 'a', -1).map((row) => row.id)).toEqual(['a'])
    expect(moveSponsor(draft, 'a', 1).map((row) => row.id)).toEqual(['a'])
  })

  it('writes nothing on a second save, because the baseline moved with it', () => {
    const page = sponsorsPage([sponsor()])
    const draft = sponsorsDraftFrom(page).map((row) => ({
      ...row,
      name: 'Cervecería Beagle SRL',
    }))

    const first = sponsorWrites(SEASON, page.sponsors, draft)
    expect(first.upsert).toHaveLength(1)

    const second = sponsorWrites(SEASON, sponsorRecordsOf(draft), draft)
    expect(second.upsert).toEqual([])
  })

  it('trims what was typed, so a stray space is not a change', () => {
    const page = sponsorsPage([sponsor({ url: null, logoPath: null })])
    const draft = sponsorsDraftFrom(page).map((row) => ({
      ...row,
      name: '  Cervecería Beagle  ',
      url: '   ',
    }))

    expect(sponsorWrites(SEASON, page.sponsors, draft).upsert).toEqual([])
  })
})

describe('the photographs draft', () => {
  it('has nothing to write for an empty gallery', () => {
    const page = photosPage()
    const writes = photoWrites(SEASON, page.photos, photosDraftFrom(page))

    expect(photoPartsOf(writes)).toEqual([])
    expect(writes).toMatchObject({ upsert: [], removeIds: [], removePaths: [] })
  })

  it('writes a photograph nobody captioned or dated as the nulls it is', () => {
    const draft = [
      newPhoto('photos/2026/bbb.jpg', pickedKey({ name: 'x.jpg', size: 10 })),
    ]
    const writes = photoWrites(SEASON, [], draft)

    expect(writes.upsert).toEqual([
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        season_id: SEASON,
        storage_path: 'photos/2026/bbb.jpg',
        caption: null,
        taken_on: null,
        display_order: 0,
      },
    ])
    expect(photoProblems(draft)).toEqual([])
    expect(photoPartsOf(writes)).toEqual(['rows'])
  })

  it('keeps the caption and the date it was given', () => {
    const draft: DraftPhoto[] = [
      {
        ...newPhoto('photos/2026/bbb.jpg'),
        caption: 'Rock Choppers campeón',
        takenOn: '2026-08-15',
      },
    ]

    expect(photoWrites(SEASON, [], draft).upsert[0]).toMatchObject({
      caption: 'Rock Choppers campeón',
      taken_on: '2026-08-15',
    })
  })

  it('refuses a date the column would refuse', () => {
    const draft = [
      { ...newPhoto('photos/2026/bbb.jpg'), takenOn: '1999-01-01' },
    ]

    expect(photoProblems(draft)[0]?.message).toBe(
      'La fecha de la foto 1 está fuera de rango: la base acepta desde 2023.',
    )
  })

  it('takes a photograph out by row and by file, in that order', () => {
    const page = photosPage([
      photo(),
      photo({
        id: 'photo-2',
        storagePath: 'photos/2026/ccc.jpg',
        displayOrder: 1,
      }),
    ])
    const draft = withoutPhoto(photosDraftFrom(page), 'photo-1')
    const writes = photoWrites(SEASON, page.photos, draft)

    expect(writes.removeIds).toEqual(['photo-1'])
    expect(writes.removePaths).toEqual(['photos/2026/aaa.jpg'])
    // The one left over moved up a place, so its row is rewritten too.
    expect(photoPartsOf(writes)).toEqual(['rows', 'removed'])
  })

  it('reorders the gallery by position', () => {
    const page = photosPage([
      photo({ id: 'a', storagePath: 'photos/2026/a.jpg', displayOrder: 0 }),
      photo({ id: 'b', storagePath: 'photos/2026/b.jpg', displayOrder: 1 }),
    ])

    const moved = movePhoto(photosDraftFrom(page), 'a', 1)
    const writes = photoWrites(SEASON, page.photos, moved)

    expect(moved.map((row) => row.id)).toEqual(['b', 'a'])
    expect(writes.upsert.map((row) => [row.id, row.display_order])).toEqual([
      ['b', 0],
      ['a', 1],
    ])
  })

  it('writes nothing on a second save', () => {
    const page = photosPage([photo()])
    const draft = photosDraftFrom(page).map((row) => ({
      ...row,
      caption: 'Final en el Poli, tercer tiempo',
    }))

    const first = photoWrites(SEASON, page.photos, draft)
    expect(first.upsert).toHaveLength(1)

    const saved = withSavedPhotos(page.photos, draft, ['rows'])
    expect(photoWrites(SEASON, saved, draft).upsert).toEqual([])
  })

  it('advances the baseline over the parts that landed and leaves the rest pending', () => {
    const page = photosPage([
      photo({ id: 'kept' }),
      photo({ id: 'gone', storagePath: 'photos/2026/gone.jpg' }),
    ])
    const draft = withoutPhoto(photosDraftFrom(page), 'gone').map((row) => ({
      ...row,
      caption: 'Con epígrafe',
    }))

    // The rows saved and the deletion was refused, so the deletion is still
    // pending and the caption is not.
    const baseline = withSavedPhotos(page.photos, draft, ['rows'])
    const again = photoWrites(SEASON, baseline, draft)

    expect(again.upsert).toEqual([])
    expect(again.removeIds).toEqual(['gone'])
    expect(photoPartsOf(again)).toEqual(['removed'])
  })

  it('recognises the same file picked twice', () => {
    const first = pickedKey({ name: 'asado.jpg', size: 2048 })
    const second = pickedKey({ name: 'asado.jpg', size: 2048 })

    expect(first).toBe(second)
    expect(pickedKey({ name: 'asado.jpg', size: 4096 })).not.toBe(first)
  })
})
