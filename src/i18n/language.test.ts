import { en } from './en'
import { STRINGS } from './es'
import {
  DEFAULT_LANGUAGE,
  fill,
  isLanguage,
  LANGUAGES,
  LANGUAGE_NAMES,
  resolveLanguage,
  translator,
} from './language'

describe('resolveLanguage', () => {
  it('is Spanish when nobody has chosen', () => {
    expect(resolveLanguage(null)).toBe('es')
    expect(resolveLanguage(undefined)).toBe('es')
  })

  it('honours a choice that was made', () => {
    expect(resolveLanguage('en')).toBe('en')
    expect(resolveLanguage('es')).toBe('es')
  })

  it('is Spanish for anything it does not recognise', () => {
    // A value from an older version of the site, or from somebody editing their own
    // storage. Neither is worth breaking a page over.
    for (const junk of ['fr', '', 'EN', 42, {}, ['en']]) {
      expect(resolveLanguage(junk)).toBe('es')
    }
  })

  it('never reads the browser’s own language', () => {
    // Deliberate, and the league asked for it: this is an Argentine league, and a
    // phone bought abroad does not mean the person holding it wants an English page.
    // The test exists so that "improving" this later has to be a decision.
    expect(DEFAULT_LANGUAGE).toBe('es')
    expect(resolveLanguage(null)).toBe('es')
  })
})

describe('isLanguage', () => {
  it('accepts exactly the languages the site speaks', () => {
    expect(LANGUAGES.every(isLanguage)).toBe(true)
    expect(isLanguage('it')).toBe(false)
    expect(isLanguage(null)).toBe(false)
  })
})

describe('translator', () => {
  it('answers in Spanish with the Spanish catalogue', () => {
    expect(translator('es')('Próximos partidos')).toBe('Próximos partidos')
  })

  it('answers in English with the English one', () => {
    expect(translator('en')('Próximos partidos')).toBe('Upcoming games')
    expect(translator('en')('Posiciones')).toBe('Standings')
  })

  it('keeps the words that are the same in both', () => {
    // "Fixture" is what the league says in Spanish and what hockey says in English.
    expect(translator('en')('Fixture')).toBe('Fixture')
    expect(translator('en')('Sponsors')).toBe('Sponsors')
  })
})

describe('the catalogues', () => {
  it('translates every string the site can say', () => {
    // Enforced by the type system too: `en` is typed as `Catalogue`, which is built
    // from this list. Asserted at runtime as well, because the day a language is
    // added by copying a file, an entry left holding its Spanish is a silent miss.
    expect(Object.keys(en).sort()).toEqual([...STRINGS].sort())
  })

  it('leaves no English entry still in Spanish by accident', () => {
    // Some entries are correctly identical in both, and they are listed, so a new
    // untranslated string cannot hide among them.
    const sameInBoth = new Set<string>(['Fixture', 'Playoffs', 'Sponsors'])

    const untranslated = STRINGS.filter(
      (key) => en[key] === key && !sameInBoth.has(key),
    )

    expect(untranslated).toEqual([])
  })

  it('names every language in its own words', () => {
    for (const language of LANGUAGES) {
      expect(LANGUAGE_NAMES[language].length).toBeGreaterThan(3)
    }
  })
})

describe('fill', () => {
  it('puts the number where the string says', () => {
    expect(fill('{n} jugadores en el plantel', { n: 10 })).toBe(
      '10 jugadores en el plantel',
    )
  })

  it('fills every hole, including the same one twice', () => {
    expect(fill('{a} vs {b}, y gana {a}', { a: 'Blanco', b: 'Verde' })).toBe(
      'Blanco vs Verde, y gana Blanco',
    )
  })

  it('leaves a hole nobody filled visible instead of writing undefined', () => {
    // A visible {n} is a bug somebody fixes. The word "undefined" inside a sentence
    // is a bug somebody screenshots.
    expect(fill('{n} partidos', {})).toBe('{n} partidos')
  })

  it('leaves a string with no holes alone', () => {
    expect(fill('Próximos partidos', { n: 3 })).toBe('Próximos partidos')
  })
})
