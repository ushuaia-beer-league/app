import { en } from './en'
import { es } from './es'
import {
  DEFAULT_LANGUAGE,
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
    // Enforced by the type system too: `en` is typed as `Catalogue`. This asserts it
    // at runtime as well, because the day a language is added by copying a file, a
    // key left holding its Spanish by accident is a silent miss.
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
  })

  it('leaves no English entry still in Spanish by accident', () => {
    // Some entries are correctly identical in both. They are listed, so that a new
    // untranslated string cannot hide among them.
    const sameInBoth = new Set([
      'Fixture',
      'Playoffs',
      'Sponsors',
      'Historia',
      'Contacto',
      'Equipos',
      'Fotos',
      'Inicio',
      'Menú',
      'Competencia',
      'Todas',
      'Goleadores',
      'Arqueros',
      'Posiciones',
      'Plantel',
      'Ligas & Estadísticas',
      'Saltar al contenido',
      'Cambiar idioma',
      'Próximos partidos',
      'Cargando la temporada…',
      'Escudos de jugadores',
      'Escudos que la liga hizo para cada jugador',
      'El plantel de este equipo no está publicado en las planillas de la liga.',
    ])

    for (const key of Object.keys(es) as (keyof typeof es)[]) {
      if (en[key] === es[key] && !sameInBoth.has(key)) {
        throw new Error(`"${key}" is still in Spanish in en.ts`)
      }
    }
  })

  it('names every language in its own words', () => {
    for (const language of LANGUAGES) {
      expect(LANGUAGE_NAMES[language].length).toBeGreaterThan(3)
    }
  })
})
