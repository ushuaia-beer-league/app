import {
  isHexColour,
  NAMED_COLOURS,
  pickerValue,
  swatchFor,
} from './teamColours'

describe('swatchFor', () => {
  it('paints the words the league already saved', () => {
    // These are the real values in the database on 2026-08-07: operators typed
    // the sheet's own words, and the panel has to keep showing them.
    expect(swatchFor('Amarillo')).toBe('#f2c31a')
    expect(swatchFor('Negro')).toBe('#101418')
    expect(swatchFor('Turquesa')).toBe('#24b0a5')
  })

  it('reads a word however it was typed, accents included', () => {
    expect(swatchFor('  amarillo ')).toBe('#f2c31a')
    expect(swatchFor('MARRON')).toBe(swatchFor('Marrón'))
  })

  it('passes a hex through, so a custom shade paints itself', () => {
    expect(swatchFor('#A1B2C3')).toBe('#a1b2c3')
    expect(swatchFor('#fff')).toBe('#fff')
  })

  it('paints nothing where there is no colour', () => {
    expect(swatchFor(null)).toBeNull()
    expect(swatchFor('   ')).toBeNull()
  })

  it('keeps quiet about a word nobody named, instead of guessing one', () => {
    // The text is still stored and shown; what is refused is inventing a
    // shade for it.
    expect(swatchFor('Verde agua del club')).toBeNull()
    expect(swatchFor('#nothex')).toBeNull()
  })
})

describe('isHexColour', () => {
  it('tells a hex from a word', () => {
    expect(isHexColour('#0a0a0a')).toBe(true)
    expect(isHexColour('#ABC')).toBe(true)
    expect(isHexColour('Amarillo')).toBe(false)
    expect(isHexColour('#12345')).toBe(false)
  })
})

describe('pickerValue', () => {
  it('opens the picker on the colour that is stored', () => {
    expect(pickerValue('Amarillo')).toBe('#f2c31a')
    expect(pickerValue('#a1b2c3')).toBe('#a1b2c3')
  })

  it('opens on the night black when nothing is stored', () => {
    // A native colour input has no empty state, so it needs somewhere to open
    // that does not read as a decision. Saving is what stores a colour.
    expect(pickerValue(null)).toBe('#101418')
    expect(pickerValue('')).toBe('#101418')
  })
})

describe('the palette', () => {
  it('names every colour once and gives each a real hex', () => {
    const names = NAMED_COLOURS.map((colour) => colour.name)
    expect(new Set(names).size).toBe(names.length)
    for (const colour of NAMED_COLOURS) {
      expect(isHexColour(colour.hex)).toBe(true)
    }
  })
})
