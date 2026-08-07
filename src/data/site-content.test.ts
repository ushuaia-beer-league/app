import {
  builtInBlock,
  CONTENT_KEYS,
  overrideFor,
  paragraphsOf,
  type ContentBlock,
} from './site-content'

describe('overrideFor', () => {
  const block: ContentBlock = {
    key: 'historia-hoy',
    language: 'en',
    title: 'What we are',
    body: 'One paragraph.',
  }
  const overrides = new Map([['historia-hoy#en', block]])

  it('answers the edit for its own language only', () => {
    expect(overrideFor(overrides, 'historia-hoy', 'en')).toBe(block)
    // Spanish was never edited, so Spanish keeps the built-in text. This is the
    // rule that stops an edit in one language from blanking the other two.
    expect(overrideFor(overrides, 'historia-hoy', 'es')).toBeNull()
    expect(overrideFor(overrides, 'historia-hoy', 'pt-BR')).toBeNull()
  })

  it('answers null with no overrides at all', () => {
    expect(overrideFor(undefined, 'historia-hoy', 'es')).toBeNull()
  })

  it('never names the commandments', () => {
    // The rulebook is not editable content. If somebody adds its key here, this
    // fails and they have to argue with CLAUDE.md instead.
    for (const key of CONTENT_KEYS) {
      expect(key).not.toMatch(/mandamiento|commandment/)
    }
  })
})

describe('paragraphsOf', () => {
  it('splits on blank lines and trims', () => {
    expect(paragraphsOf('Uno.\n\nDos.\n \nTres.')).toEqual([
      'Uno.',
      'Dos.',
      'Tres.',
    ])
  })

  it('keeps single newlines inside one paragraph', () => {
    expect(paragraphsOf('línea uno\nlínea dos')).toEqual([
      'línea uno\nlínea dos',
    ])
  })

  it('drops emptiness rather than rendering empty paragraphs', () => {
    expect(paragraphsOf('\n\n  \n\n')).toEqual([])
  })
})

describe('builtInBlock', () => {
  const es = (key: string) => key

  it('rebuilds each block as editable paragraphs', () => {
    const block = builtInBlock('historia-comienzo', es as never)
    expect(block.title).toBe('El comienzo')
    expect(block.body.split('\n\n')).toHaveLength(2)
    expect(block.body).toContain('En 2023')
  })

  it('keeps the sponsor’s name inside its sentence', () => {
    // "Birra del Fuego" is a proper noun the catalogue never carries; losing it
    // would hand the operators a sentence with a hole in the middle.
    const block = builtInBlock('historia-apoyo', es as never)
    expect(block.body).toContain('fue Birra del Fuego,')
  })

  it('ends the story with the third half untranslated here', () => {
    const block = builtInBlock('historia-hoy', es as never)
    expect(
      block.body.endsWith('Fin del mundo. Comienzo de todo... tercer tiempo.'),
    ).toBe(true)
  })
})
