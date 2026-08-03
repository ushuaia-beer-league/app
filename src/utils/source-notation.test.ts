import {
  classifyFixtureRow,
  displayName,
  isSubstituteLine,
  matchKey,
  parseDate,
  parseGoalCell,
  parseTeamCell,
  parseTime,
  parseVenue,
  resolutionFor,
} from './source-notation'

describe('parseGoalCell', () => {
  it('reads a plain number', () => {
    expect(parseGoalCell('9')).toEqual({ goals: 9, wonShootout: false })
  })

  it('reads zero as a score, not as nothing', () => {
    expect(parseGoalCell('0')).toEqual({ goals: 0, wonShootout: false })
  })

  it('reads the shootout marker, spaced or not', () => {
    expect(parseGoalCell('5 p')).toEqual({ goals: 5, wonShootout: true })
    expect(parseGoalCell('8p')).toEqual({ goals: 8, wonShootout: true })
  })

  it('reads an empty cell as no score', () => {
    expect(parseGoalCell('')).toBeNull()
    expect(parseGoalCell('   ')).toBeNull()
  })

  it('refuses anything it does not understand', () => {
    expect(parseGoalCell('9-6')).toBeNull()
    expect(parseGoalCell('libre')).toBeNull()
  })
})

describe('resolutionFor', () => {
  const plain = (goals: number) => ({ goals, wonShootout: false })

  it('calls it a shootout when either side carries the marker', () => {
    expect(resolutionFor({ goals: 5, wonShootout: true }, plain(4))).toBe(
      'shootout',
    )
    expect(resolutionFor(plain(7), { goals: 8, wonShootout: true })).toBe(
      'shootout',
    )
  })

  it('calls level goals a draw', () => {
    expect(resolutionFor(plain(4), plain(4))).toBe('draw')
    expect(resolutionFor(plain(0), plain(0))).toBe('draw')
  })

  it('calls an unmarked decided match a regulation result', () => {
    expect(resolutionFor(plain(9), plain(6))).toBe('regulation')
  })
})

describe('parseTime', () => {
  it('accepts both notations the sheet uses', () => {
    expect(parseTime('21:30')).toBe('21:30')
    expect(parseTime('2130')).toBe('21:30')
  })

  it('pads a single-digit hour', () => {
    expect(parseTime('930')).toBe('09:30')
    expect(parseTime('9:30')).toBe('09:30')
  })

  it('refuses an impossible clock and an empty cell', () => {
    expect(parseTime('2560')).toBeNull()
    expect(parseTime('')).toBeNull()
  })
})

describe('parseDate', () => {
  it('reads the sheet’s day-first dates', () => {
    expect(parseDate('23/05/2026')).toBe('2026-05-23')
    expect(parseDate('4/7/2026')).toBe('2026-07-04')
  })

  it('refuses a date that does not exist', () => {
    expect(parseDate('31/02/2026')).toBeNull()
  })

  it('refuses free text, such as the emergency-date row', () => {
    expect(parseDate('22/08/2026 — FECHA DE EMERGENCIA')).toBeNull()
    expect(parseDate('')).toBeNull()
  })
})

describe('parseVenue', () => {
  it('reads both cabeceras, accent or no accent', () => {
    expect(parseVenue('Bahia')).toBe('bahia')
    expect(parseVenue('Bahía')).toBe('bahia')
    expect(parseVenue('Poli')).toBe('poli')
  })

  it('reads an unassigned cabecera as unknown, never as a default', () => {
    expect(parseVenue('')).toBeNull()
    expect(parseVenue('Cabecera libre')).toBeNull()
  })
})

describe('parseTeamCell', () => {
  it('trims the trailing spaces the sheet leaves', () => {
    expect(parseTeamCell('  Rock Choppers  ')).toEqual({
      kind: 'team',
      name: 'Rock Choppers',
      women: false,
    })
  })

  it('reads a Mujeres row as the women’s competition', () => {
    expect(parseTeamCell('Mujeres Tipo Nine ')).toEqual({
      kind: 'team',
      name: 'Tipo Nine',
      women: true,
    })
  })

  it('reads Libre as a bye, which is not a match', () => {
    expect(parseTeamCell('Libre')).toEqual({ kind: 'bye' })
  })

  it('keeps a positional placeholder as printed instead of guessing a team', () => {
    expect(parseTeamCell('6to Lugar')).toEqual({
      kind: 'placeholder',
      printed: '6to Lugar',
    })
    expect(parseTeamCell('Ganador 6to 7to (t9)')).toEqual({
      kind: 'placeholder',
      printed: 'Ganador 6to 7to (t9)',
    })
    expect(parseTeamCell('Por determinar')).toEqual({
      kind: 'placeholder',
      printed: 'Por determinar',
    })
    expect(parseTeamCell('juego de estrellas')).toEqual({
      kind: 'placeholder',
      printed: 'juego de estrellas',
    })
    expect(parseTeamCell('Semifinal 1 (verde)')).toEqual({
      kind: 'placeholder',
      printed: 'Semifinal 1 (verde)',
    })
  })

  it('reads the row with no teams at all as empty', () => {
    expect(parseTeamCell('')).toEqual({ kind: 'empty' })
  })
})

describe('matchKey', () => {
  it('ignores case, accents and punctuation', () => {
    expect(matchKey('Ávila Ariadna')).toBe(matchKey('avila ariadna'))
    expect(matchKey('Bergeonneau, Mauri')).toBe('bergeonneau mauri')
    expect(matchKey('Muñoz Lauti')).toBe('munoz lauti')
  })

  it('collapses the spacing the sheet leaves behind', () => {
    expect(matchKey('  Rock   Choppers  ')).toBe('rock choppers')
  })

  it('does not pretend a truncated name is the same string', () => {
    expect(matchKey('Beltrami Ramir')).not.toBe(matchKey('Beltrami Ramiro'))
  })
})

describe('displayName', () => {
  it('fixes the sheet’s casing without touching the spelling', () => {
    expect(displayName('guete nadin')).toBe('Guete Nadin')
    expect(displayName('Bernales joaquin')).toBe('Bernales Joaquin')
    expect(displayName('  encimas   camacho valen ')).toBe(
      'Encimas Camacho Valen',
    )
  })

  it('capitalises both halves of a name joined by a slash or a hyphen', () => {
    expect(displayName('Baeza Pedro/Tincho')).toBe('Baeza Pedro/Tincho')
    expect(displayName('lopez-mieres martin')).toBe('Lopez-Mieres Martin')
  })

  it('leaves a missing accent missing', () => {
    expect(displayName('aguado barbara')).toBe('Aguado Barbara')
  })
})

describe('classifyFixtureRow', () => {
  const cell = (printed: string) => parseTeamCell(printed)
  const classify = (home: string, away: string) =>
    classifyFixtureRow(cell(home), cell(away))

  it('reads two named teams as a regular match', () => {
    expect(classify('Rock Choppers', 'Sucucho')).toEqual({
      stage: 'regular',
      competition: 'beer',
      competitionAssumed: false,
      isMatch: true,
    })
  })

  it('reads a Mujeres row as the women’s competition', () => {
    expect(classify('Mujeres Sucucho', 'Mujeres Zhockey')).toMatchObject({
      stage: 'regular',
      competition: 'wubl',
      competitionAssumed: false,
    })
  })

  it('keeps the round-1 row with no teams as a match, and says the competition was assumed', () => {
    expect(classify('', '')).toEqual({
      stage: 'regular',
      competition: 'beer',
      competitionAssumed: true,
      isMatch: true,
    })
  })

  it('reads the sixth-against-seventh row as the play-in', () => {
    expect(classify('6to Lugar', '7to Lugar')).toMatchObject({
      stage: 'playin',
      isMatch: true,
    })
  })

  it('reads the seeded pairs of 8 August as quarterfinals, and the women’s as semifinals', () => {
    expect(classify('3er Lugar (hanta)', 'Ganador 6to 7to (t9)')).toMatchObject(
      {
        stage: 'quarterfinal',
        competition: 'beer',
        isMatch: true,
      },
    )
    expect(classify('4to Lugar (vitox)', '5to Lugar (suc)')).toMatchObject({
      stage: 'quarterfinal',
    })
    expect(
      classify('1o Lugar Mujeres (sucucho)', '4to Lugar Mujeres (z hockey)'),
    ).toMatchObject({ stage: 'semifinal', competition: 'wubl' })
  })

  it('reads the rows the sheet itself calls semifinals as semifinals', () => {
    expect(classify('Semifinal 1 (verde)', 'Por determinar')).toMatchObject({
      stage: 'semifinal',
      isMatch: true,
    })
  })

  it('tells a third-place match from a third seed', () => {
    expect(classify('Partido 3er Lugar', 'Por determinar')).toMatchObject({
      stage: 'third-place',
    })
    expect(
      classify('Partido 3er Lugar Mujeres', 'Por determinar'),
    ).toMatchObject({
      stage: 'third-place',
      competition: 'wubl',
    })
    expect(classify('3er Lugar (hanta)', 'Ganador 6to 7to (t9)')).toMatchObject(
      {
        stage: 'quarterfinal',
      },
    )
  })

  it('reads the finals and the fifth-place match', () => {
    expect(classify('Final — 1er Lugar', '')).toMatchObject({ stage: 'final' })
    expect(classify('Final — 1er Lugar Mujeres', '')).toMatchObject({
      stage: 'final',
      competition: 'wubl',
    })
    expect(classify('Partido 5to Lugar', '')).toMatchObject({
      stage: 'fifth-place',
    })
  })

  it('refuses to call a bye, an all-star slot or a free rink a match', () => {
    expect(classify('Libre', 'Libre').isMatch).toBe(false)
    expect(classify('juego de estrellas', 'juego de estrellas')).toMatchObject({
      stage: 'all-star',
      isMatch: false,
    })
    expect(classify('Cabecera libre', '').isMatch).toBe(false)
  })
})

describe('isSubstituteLine', () => {
  it('spots every way the sheets mark a substitute', () => {
    expect(isSubstituteLine('Sup (Zambirreras)')).toBe(true)
    expect(isSubstituteLine('Suplente (Sucucho)')).toBe(true)
    expect(isSubstituteLine('Beerizar Rompehielos T9 (sub)')).toBe(true)
    expect(isSubstituteLine('Substitute (Beerizar)')).toBe(true)
  })

  it('leaves a roster team alone', () => {
    expect(isSubstituteLine('Hantachoppers')).toBe(false)
    expect(isSubstituteLine('Green Seven Birra del fuego')).toBe(false)
  })
})
