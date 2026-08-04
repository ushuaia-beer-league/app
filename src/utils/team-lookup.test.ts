import {
  BEER_TEAMS_2026,
  TEAMS_2026,
  WUBL_TEAMS_2026,
} from '../data/teams-2026'
import { findByTruncatedName, findTeam } from './team-lookup'

describe('findTeam', () => {
  it('finds a team by the name the fixture uses', () => {
    expect(findTeam(TEAMS_2026, 'beer', 'Short Shift Soft Sticks')?.slug).toBe(
      'short-shift-soft-sticks',
    )
  })

  it('finds it by the sponsored name the roster sheet uses', () => {
    expect(findTeam(TEAMS_2026, 'beer', 'Beerros Azulvetrados')?.slug).toBe(
      'short-shift-soft-sticks',
    )
  })

  it('finds it by the nickname the playoff bracket uses', () => {
    expect(findTeam(TEAMS_2026, 'beer', 'azul')?.slug).toBe(
      'short-shift-soft-sticks',
    )
    expect(findTeam(TEAMS_2026, 'beer', 'z hockey')?.slug).toBe('zhockey')
  })

  it('finds it by an alias, and ignores case and spacing', () => {
    expect(findTeam(TEAMS_2026, 'beer', 'SSSS')?.slug).toBe(
      'short-shift-soft-sticks',
    )
    expect(findTeam(TEAMS_2026, 'beer', '  rock   choppers ')?.slug).toBe(
      'rock-choppers',
    )
  })

  it('keeps the two competitions apart when they share a name', () => {
    expect(findTeam(TEAMS_2026, 'beer', 'Sucucho')?.slug).toBe('sucucho')
    expect(findTeam(TEAMS_2026, 'wubl', 'Sucucho')?.slug).toBe('wubl-sucucho')
  })

  it('finds the one women’s statistics name that has evidence behind it', () => {
    expect(findTeam(TEAMS_2026, 'wubl', 'Frozen Queens')?.slug).toBe(
      'wubl-sucucho',
    )
  })

  it('returns nothing for the women’s statistics names that have none', () => {
    for (const name of ['Turbeerras', 'Zambirreras', 'Moby Drink']) {
      expect(findTeam(TEAMS_2026, 'wubl', name)).toBeNull()
    }
  })

  it('returns nothing rather than a near miss', () => {
    expect(findTeam(TEAMS_2026, 'beer', 'Rock')).toBeNull()
    expect(findTeam(TEAMS_2026, 'beer', '')).toBeNull()
  })

  it('covers every team in both competitions', () => {
    for (const team of BEER_TEAMS_2026) {
      expect(findTeam(TEAMS_2026, 'beer', team.shortName)?.slug).toBe(team.slug)
    }
    for (const team of WUBL_TEAMS_2026) {
      expect(findTeam(TEAMS_2026, 'wubl', team.shortName)?.slug).toBe(team.slug)
    }
  })
})

describe('findByTruncatedName', () => {
  const roster = [
    { name: 'Beltrami Ramiro' },
    { name: 'Zayas Marcelo' },
    { name: 'Zayas Matias' },
    { name: 'Amaolo Lanata Eugenia' },
    { name: 'Bernales Joaquin' },
  ]

  it('matches a name the export cut off mid-word', () => {
    expect(findByTruncatedName(roster, 'Beltrami Ramir')?.name).toBe(
      'Beltrami Ramiro',
    )
    expect(findByTruncatedName(roster, 'Amaolo Lanata Euge')?.name).toBe(
      'Amaolo Lanata Eugenia',
    )
  })

  it('matches a full name that only differs in case or accents', () => {
    expect(findByTruncatedName(roster, 'bernales joaquín')?.name).toBe(
      'Bernales Joaquin',
    )
  })

  it('refuses a prefix that fits two people', () => {
    expect(findByTruncatedName(roster, 'Zayas')).toBeNull()
  })

  it('refuses a name nobody carries', () => {
    expect(findByTruncatedName(roster, 'Fermin Lopez Silva')).toBeNull()
    expect(findByTruncatedName(roster, '')).toBeNull()
  })

  it('matches when the roster is the shorter of the two spellings', () => {
    expect(
      findByTruncatedName([{ name: 'Ceravolo Agus' }], 'Ceravolo Agust')?.name,
    ).toBe('Ceravolo Agus')
  })

  it('matches the same words written in the other order', () => {
    expect(
      findByTruncatedName([{ name: 'Avila Ariadna' }], 'Ariadna, Avila')?.name,
    ).toBe('Avila Ariadna')
  })

  it('ignores a nickname the roster keeps in the middle of a name', () => {
    const roster = [
      { name: 'Zahr Turco Leandro' },
      { name: 'Rodriguez Puma Luciano' },
      { name: 'Leuenberger Colo Federico' },
      { name: 'Avila Chori Leandro' },
      { name: 'Avila Ariadna' },
    ]

    expect(findByTruncatedName(roster, 'Zahr Leand')?.name).toBe(
      'Zahr Turco Leandro',
    )
    expect(findByTruncatedName(roster, 'Rodríguez Luciano')?.name).toBe(
      'Rodriguez Puma Luciano',
    )
    expect(findByTruncatedName(roster, 'Leuenberger Feder')?.name).toBe(
      'Leuenberger Colo Federico',
    )
    expect(findByTruncatedName(roster, 'Avila Leand')?.name).toBe(
      'Avila Chori Leandro',
    )
  })

  it('refuses an initial as evidence of a given name', () => {
    // The real pair from the 2026 sheets: "Tibaudin Ana J" is not Tibaudin José,
    // and "jose" starting with "j" must not be enough to put her goals on his
    // line.
    expect(
      findByTruncatedName([{ name: 'Tibaudin Jose' }], 'Tibaudin Ana J'),
    ).toBeNull()

    // Not the same thing: "Molinolo O" is what a truncated "Molinolo Osvaldo"
    // looks like, and the whole string is a prefix of the whole name. The
    // dangerous shape is a complete given name followed by an unrelated initial.
    expect(
      findByTruncatedName([{ name: 'Molinolo Osvaldo' }], 'Molinolo O')?.name,
    ).toBe('Molinolo Osvaldo')
  })

  // These three pairs are resolved, but not here: the league confirmed which
  // spelling is whose, and `confirmed-names.ts` applies that before the matcher
  // ever sees the name. This function stays as conservative as it was, because
  // the next pair nobody has confirmed has to keep failing.
  it('refuses a surname spelled differently, however obvious the person is', () => {
    expect(
      findByTruncatedName([{ name: 'Velazquez Luciano' }], 'Velasquez Lucia'),
    ).toBeNull()
    expect(
      findByTruncatedName([{ name: 'Contignola Flor' }], 'Cotignola Flore'),
    ).toBeNull()
    expect(
      findByTruncatedName([{ name: 'Tabarez Ian' }], 'Tabares Ian'),
    ).toBeNull()
  })

  it('refuses a different given name under the same surname', () => {
    const roster = [
      { name: 'Sueldo Fito' },
      { name: 'Romero Emir' },
      { name: 'Carbone Anita' },
    ]

    expect(findByTruncatedName(roster, 'Sueldo Adolf')).toBeNull()
    expect(findByTruncatedName(roster, 'Sueldo Kevin')).toBeNull()
    expect(findByTruncatedName(roster, 'Romero José')).toBeNull()
    expect(findByTruncatedName(roster, 'Carbone Ana')).toBeNull()
  })

  it('matches the truncation that does fit only one Zayas', () => {
    expect(findByTruncatedName(roster, 'Zayas Marce')?.name).toBe(
      'Zayas Marcelo',
    )
  })
})
