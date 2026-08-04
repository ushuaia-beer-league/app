import {
  ACCEPTED_MEDIA_TYPES,
  MEDIA_MAX_BYTES,
  acceptedMedia,
  mediaExtension,
  mediaObjectPath,
  mediaRejection,
  scaledTo,
  tooHeavy,
  type PickedFile,
} from './mediaFiles'

const file = (overrides: Partial<PickedFile> = {}): PickedFile => ({
  name: 'logo.png',
  type: 'image/png',
  size: 120_000,
  ...overrides,
})

describe('mediaFiles', () => {
  it('accepts exactly the four types the bucket allows', () => {
    expect(ACCEPTED_MEDIA_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ])

    for (const type of ACCEPTED_MEDIA_TYPES) {
      expect(acceptedMedia(file({ type }))).toBe(true)
    }
  })

  it('refuses anything that is not one of them, naming the file', () => {
    const because = mediaRejection(
      file({ name: 'contrato.pdf', type: 'application/pdf' }),
    )

    expect(because).toBe(
      '«contrato.pdf» no es una imagen de las que el depósito acepta. Tienen que ser JPG, PNG, WEBP o AVIF.',
    )
  })

  it('refuses a file too big to be worth resizing, in megabytes and in Spanish', () => {
    const because = mediaRejection(
      file({ name: 'tercer tiempo.jpg', type: 'image/jpeg', size: 31_457_280 }),
    )

    expect(because).toBe(
      '«tercer tiempo.jpg» pesa 30,0 MB y el panel acepta hasta 25,0 MB. Exportala más chica y volvé a intentar.',
    )
  })

  it('lets a phone photograph through, because reducing it before uploading is what this panel does', () => {
    // Eight megabytes out of a phone is the ordinary case, not the exception.
    expect(mediaRejection(file({ type: 'image/jpeg', size: 8_388_608 }))).toBe(
      null,
    )
  })

  it('says so when the reduced image is still over the limit the bucket enforces', () => {
    expect(tooHeavy(file({ name: 'equipo.png' }), 6_291_456)).toBe(
      '«equipo.png» todavía pesa 6,0 MB después de reducirla, y el depósito acepta hasta 5,0 MB. Guardala en JPG y volvé a intentar.',
    )
    expect(MEDIA_MAX_BYTES).toBe(5 * 1024 * 1024)
  })

  it('keeps the extension the file arrived with', () => {
    expect(
      mediaExtension(file({ name: 'Escudo.JPEG', type: 'image/jpeg' })),
    ).toBe('jpeg')
    expect(
      mediaExtension(file({ name: 'escudo.jpg', type: 'image/jpeg' })),
    ).toBe('jpg')
    expect(
      mediaExtension(file({ name: 'foto.webp', type: 'image/webp' })),
    ).toBe('webp')
  })

  it('falls back to the type when the name has no usable extension', () => {
    expect(mediaExtension(file({ name: 'imagen', type: 'image/avif' }))).toBe(
      'avif',
    )
    expect(
      mediaExtension(file({ name: 'captura.heic', type: 'image/jpeg' })),
    ).toBe('jpg')
  })

  it('puts the season and a random id in the path, and never a URL', () => {
    const path = mediaObjectPath(
      'sponsors',
      2026,
      file({ name: 'cerveceria.png' }),
      'b9f1c2d4',
    )

    expect(path).toBe('sponsors/2026/b9f1c2d4.png')
    expect(path).not.toContain('http')
  })

  it('keeps the two folders apart, so a year can be listed and budgeted', () => {
    expect(
      mediaObjectPath('photos', 2027, file({ name: 'final.jpg' }), 'abc'),
    ).toBe('photos/2027/abc.jpg')
  })

  it('caps the longest side and keeps the proportions', () => {
    expect(scaledTo(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(scaledTo(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('leaves an image that already fits exactly as it is', () => {
    expect(scaledTo(800, 600, 1600)).toEqual({ width: 800, height: 600 })
    expect(scaledTo(1600, 900, 1600)).toEqual({ width: 1600, height: 900 })
  })

  it('never scales a very thin image down to nothing', () => {
    expect(scaledTo(6000, 2, 1600)).toEqual({ width: 1600, height: 1 })
    expect(scaledTo(0, 0, 1600)).toEqual({ width: 0, height: 0 })
  })
})
