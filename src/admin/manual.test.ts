import { inlineParts, MANUAL, manualLink } from './manual'
import { manualMarkdown } from './manualMarkdown'

// The committed file, read by Vite at transform time so the test needs no
// filesystem. `?raw` hands over the bytes exactly as they are on disk.
import committed from '../../docs/COMO-FUNCIONA.md?raw'

describe('the manual', () => {
  it('is the same document in the panel and in the file people share', () => {
    // The whole reason the manual is data: the panel renders it and this file
    // is generated from it, so they cannot say different things. If this fails,
    // somebody edited docs/COMO-FUNCIONA.md by hand or changed manual.ts
    // without running `npm run build:manual`.
    expect(committed).toBe(manualMarkdown())
  })

  it('gives every section an address, and no two the same', () => {
    const ids = MANUAL.map((section) => section.id)
    expect(ids.length).toBeGreaterThan(8)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z-]{3,}$/)
  })

  it('points a help link at a section that exists', () => {
    // The four screens link to these. A renamed id is a broken link, and the
    // reader lands at the top of a long document instead of the answer.
    for (const id of ['planilla', 'equipos', 'fixture', 'compartir']) {
      expect(MANUAL.some((section) => section.id === id)).toBe(true)
      expect(manualLink(id)).toBe(`/admin/manual#${id}`)
    }
  })

  it('says nothing the site contradicts about points', () => {
    // The one place the manual could quietly go stale and be believed: the
    // scoring table. A shootout loss is 1 and a draw is 1, per the league.
    const points = MANUAL.find((section) => section.id === 'puntos')
    const table = points?.blocks.find((block) => block.kind === 'table')
    expect(table).toMatchObject({
      rows: [
        ['Ganó en tiempo', '2'],
        ['Ganó por penales', '2'],
        ['Perdió por penales', '1'],
        ['Empató', '1'],
        ['Perdió en tiempo', '0'],
      ],
    })
  })
})

describe('inlineParts', () => {
  it('marks what is between a pair of asterisks', () => {
    expect(inlineParts('el sistema **no guarda tablas** y ya')).toEqual([
      { text: 'el sistema ', strong: false },
      { text: 'no guarda tablas', strong: true },
      { text: ' y ya', strong: false },
    ])
  })

  it('leaves an unpaired mark alone rather than eating the rest', () => {
    // A typo in the manual must not swallow half a paragraph on screen.
    expect(inlineParts('esto quedó a **medias')).toEqual([
      { text: 'esto quedó a **medias', strong: false },
    ])
  })

  it('has nothing to say about plain text', () => {
    expect(inlineParts('sin marcas')).toEqual([
      { text: 'sin marcas', strong: false },
    ])
  })
})
