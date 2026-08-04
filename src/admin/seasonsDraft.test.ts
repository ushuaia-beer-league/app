import {
  draftFromSeason,
  emptySeasonDraft,
  FIRST_SEASON_YEAR,
  LAST_SEASON_YEAR,
  SEASON_STATUS_NAMES,
  SEASON_STATUSES,
  seasonProblems,
  seasonRow,
  seasonSavePlan,
  seasonStandingDown,
  sortedSeasons,
  STOOD_DOWN_STATUS,
  type SeasonDraft,
  type SeasonRecord,
} from './seasonsDraft'

const season = (overrides: Partial<SeasonRecord> = {}): SeasonRecord => ({
  id: 'season-2026',
  year: 2026,
  startsOn: '2026-05-16',
  endsOn: '2026-08-15',
  status: 'active',
  ...overrides,
})

const draft = (overrides: Partial<SeasonDraft> = {}): SeasonDraft => ({
  ...emptySeasonDraft(),
  year: '2027',
  ...overrides,
})

describe('the vocabulary', () => {
  it('names the three states the database allows, and no fourth', () => {
    expect([...SEASON_STATUSES]).toEqual(['upcoming', 'active', 'finished'])
    expect(SEASON_STATUS_NAMES).toEqual({
      upcoming: 'Por comenzar',
      active: 'En curso',
      finished: 'Finalizada',
    })
  })

  it('starts counting at the year the league was founded', () => {
    expect(FIRST_SEASON_YEAR).toBe(2023)
    expect(LAST_SEASON_YEAR).toBe(2100)
  })

  it('finishes a season it stands down rather than sending it back to upcoming', () => {
    expect(STOOD_DOWN_STATUS).toBe('finished')
  })

  it('opens a new season with nothing filled in, and guesses no year', () => {
    expect(emptySeasonDraft()).toEqual({
      year: '',
      startsOn: '',
      endsOn: '',
      status: 'upcoming',
    })
  })

  it('reads an existing season into the form, empty dates included', () => {
    expect(draftFromSeason(season({ startsOn: null, endsOn: null }))).toEqual({
      year: '2026',
      startsOn: '',
      endsOn: '',
      status: 'active',
    })
  })
})

describe('the year', () => {
  it('asks for one', () => {
    expect(
      seasonProblems(draft({ year: '' }), [], null).map((p) => p.kind),
    ).toEqual(['year-missing'])
  })

  it('refuses anything that is not a whole number', () => {
    for (const text of ['2026a', '2.026', '-2026', '2026.5']) {
      expect(
        seasonProblems(draft({ year: text }), [], null).map((p) => p.kind),
      ).toEqual(['year-not-a-number'])
    }
  })

  it('refuses a year before the league existed', () => {
    const problems = seasonProblems(draft({ year: '2022' }), [], null)

    expect(problems.map((problem) => problem.kind)).toEqual([
      'year-out-of-range',
    ])
    expect(problems.map((problem) => problem.message).join('')).toContain(
      '2023',
    )
  })

  it('refuses a year past the range check', () => {
    expect(
      seasonProblems(draft({ year: '2101' }), [], null).map((p) => p.kind),
    ).toEqual(['year-out-of-range'])
  })

  it('accepts both ends of the range', () => {
    expect(seasonProblems(draft({ year: '2023' }), [], null)).toEqual([])
    expect(seasonProblems(draft({ year: '2100' }), [], null)).toEqual([])
  })

  it('refuses a year another season already holds', () => {
    const problems = seasonProblems(draft({ year: '2026' }), [season()], null)

    expect(problems.map((problem) => problem.kind)).toEqual(['year-taken'])
    expect(problems.map((problem) => problem.message).join('')).toContain(
      '2026',
    )
  })

  it('does not call a season its own duplicate while it is being edited', () => {
    expect(
      seasonProblems(draft({ year: '2026' }), [season()], 'season-2026'),
    ).toEqual([])
  })
})

describe('the dates', () => {
  it('accepts a season with no dates at all, because that is a real row', () => {
    expect(
      seasonProblems(draft({ startsOn: '', endsOn: '' }), [], null),
    ).toEqual([])
  })

  it('accepts a season with only one of the two', () => {
    expect(seasonProblems(draft({ startsOn: '2027-05-01' }), [], null)).toEqual(
      [],
    )
    expect(seasonProblems(draft({ endsOn: '2027-08-30' }), [], null)).toEqual(
      [],
    )
  })

  it('refuses an end before the start', () => {
    const problems = seasonProblems(
      draft({ startsOn: '2027-08-30', endsOn: '2027-05-01' }),
      [],
      null,
    )

    expect(problems.map((problem) => problem.kind)).toEqual(['dates-inverted'])
  })

  it('accepts a season that opens and closes on the same day', () => {
    expect(
      seasonProblems(
        draft({ startsOn: '2027-05-01', endsOn: '2027-05-01' }),
        [],
        null,
      ),
    ).toEqual([])
  })

  it('reports the year and the dates together, because both are wrong at once', () => {
    expect(
      seasonProblems(
        draft({ year: '1999', startsOn: '2027-08-30', endsOn: '2027-05-01' }),
        [],
        null,
      ).map((problem) => problem.kind),
    ).toEqual(['year-out-of-range', 'dates-inverted'])
  })
})

describe('at most one season in curso', () => {
  it('names the season in the way when this one is being made active', () => {
    expect(
      seasonStandingDown(draft({ status: 'active' }), [season()], null)?.year,
    ).toBe(2026)
  })

  it('names nobody when this season is not being made active', () => {
    expect(
      seasonStandingDown(draft({ status: 'upcoming' }), [season()], null),
    ).toBeNull()
    expect(
      seasonStandingDown(draft({ status: 'finished' }), [season()], null),
    ).toBeNull()
  })

  it('names nobody when no season is active yet', () => {
    expect(
      seasonStandingDown(
        draft({ status: 'active' }),
        [season({ status: 'finished' })],
        null,
      ),
    ).toBeNull()
  })

  it('does not ask the active season to stand itself down while it is being edited', () => {
    expect(
      seasonStandingDown(
        draft({ year: '2026', status: 'active' }),
        [season()],
        'season-2026',
      ),
    ).toBeNull()
  })

  it('is not a reason to refuse the save, only a step of it', () => {
    expect(
      seasonProblems(draft({ status: 'active' }), [season()], null),
    ).toEqual([])
  })
})

describe('the row', () => {
  it('writes the four columns, with an unfixed date as null', () => {
    expect(seasonRow(draft({ year: '2027', status: 'upcoming' }))).toEqual({
      year: 2027,
      starts_on: null,
      ends_on: null,
      status: 'upcoming',
    })
  })

  it('writes the dates it was given', () => {
    expect(
      seasonRow(draft({ startsOn: '2027-05-01', endsOn: '2027-08-30' })),
    ).toMatchObject({ starts_on: '2027-05-01', ends_on: '2027-08-30' })
  })

  it('refuses to invent a year rather than writing a placeholder', () => {
    expect(seasonRow(draft({ year: '' }))).toBeNull()
    expect(seasonRow(draft({ year: 'dos mil' }))).toBeNull()
  })
})

describe('the plan a save carries out', () => {
  it('creates a season with no id and nothing to stand down', () => {
    expect(seasonSavePlan(draft(), [], null)).toEqual({
      seasonId: null,
      row: { year: 2027, starts_on: null, ends_on: null, status: 'upcoming' },
      standDown: null,
    })
  })

  it('carries the season it will finish first, so the unique index is not hit', () => {
    const plan = seasonSavePlan(draft({ status: 'active' }), [season()], null)

    expect(plan?.standDown).toEqual({ id: 'season-2026', year: 2026 })
  })

  it('names the season being edited', () => {
    expect(
      seasonSavePlan(draft({ year: '2026' }), [season()], 'season-2026')
        ?.seasonId,
    ).toBe('season-2026')
  })

  it('has no plan when the draft has no row', () => {
    expect(seasonSavePlan(draft({ year: '' }), [], null)).toBeNull()
  })
})

describe('the list', () => {
  it('puts the most recent season first', () => {
    const sorted = sortedSeasons([
      season({ id: 'a', year: 2024 }),
      season({ id: 'b', year: 2026 }),
      season({ id: 'c', year: 2025 }),
    ])

    expect(sorted.map((each) => each.year)).toEqual([2026, 2025, 2024])
  })

  it('leaves the list it was handed alone', () => {
    const list = [season({ id: 'a', year: 2024 }), season({ id: 'b' })]
    sortedSeasons(list)

    expect(list.map((each) => each.year)).toEqual([2024, 2026])
  })
})
