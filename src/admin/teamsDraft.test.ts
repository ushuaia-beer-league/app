import {
  draftFromTeam,
  emptyRosterAddDraft,
  emptyTeamDraft,
  JERSEY_MAX,
  JERSEY_MIN,
  personName,
  personPicks,
  rosterAddProblems,
  rosterAddWarnings,
  rosterDraftFor,
  rosterPartsOf,
  rosterProblems,
  rosterWarnings,
  rosterWrites,
  sameTeam,
  slugFor,
  sortedRoster,
  sortedTeams,
  teamEdit,
  teamProblems,
  teamRow,
  teamSavePlan,
  withAddedPerson,
  withSavedRosterParts,
  type RosterDraft,
  type RosterRecord,
  type TeamDraft,
  type TeamRecord,
  type TeamsPage,
} from './teamsDraft'

const team = (overrides: Partial<TeamRecord> = {}): TeamRecord => ({
  id: 'team-verde',
  competition: 'beer',
  slug: 'birra-del-fuego',
  shortName: 'Birra del Fuego',
  fullName: 'Green Seven Birra del fuego',
  nickname: 'verde',
  colour: 'verde',
  logoUrl: null,
  active: true,
  ...overrides,
})

const entry = (overrides: Partial<RosterRecord> = {}): RosterRecord => ({
  id: 'roster-1',
  competition: 'beer',
  teamId: 'team-verde',
  playerId: 'player-joaquin',
  jerseyNumber: 30,
  active: true,
  ...overrides,
})

const page = (overrides: Partial<TeamsPage> = {}): TeamsPage => ({
  seasonId: 'season-2026',
  year: 2026,
  teams: [team()],
  people: [
    { id: 'player-joaquin', fullName: 'Bernales Joaquín', active: true },
    { id: 'player-omar', fullName: 'Coria Omar', active: true },
    { id: 'player-flor', fullName: 'Cotignola Flor', active: true },
    { id: 'player-mauri', fullName: 'Bergeonneau Mauri', active: true },
  ],
  roster: [entry()],
  ...overrides,
})

const draft = (overrides: Partial<TeamDraft> = {}): TeamDraft => ({
  ...emptyTeamDraft('beer'),
  shortName: 'Rock Choppers',
  slug: 'rock-choppers',
  ...overrides,
})

const roster = (
  entries: RosterDraft['entries'],
  newPeople: RosterDraft['newPeople'] = [],
): RosterDraft => ({ entries, newPeople })

describe('the team vocabulary', () => {
  it('opens a new team with nothing filled in, in the competition asked for', () => {
    expect(emptyTeamDraft('wubl')).toEqual({
      competition: 'wubl',
      slug: '',
      shortName: '',
      fullName: '',
      nickname: '',
      colour: '',
      logoUrl: '',
      active: true,
    })
  })

  it('reads an existing team into the form, absent columns as empty fields', () => {
    expect(draftFromTeam(team({ fullName: null, nickname: null }))).toEqual({
      competition: 'beer',
      slug: 'birra-del-fuego',
      shortName: 'Birra del Fuego',
      fullName: '',
      nickname: '',
      colour: 'verde',
      logoUrl: '',
      active: true,
    })
  })

  it('proposes a slug out of a name, without accents and without spaces', () => {
    expect(slugFor('Birra del Fuego')).toBe('birra-del-fuego')
    expect(slugFor('Tipo Nine (T9)')).toBe('tipo-nine-t9')
    expect(slugFor('  Mujeres Birra del Fuego  ')).toBe(
      'mujeres-birra-del-fuego',
    )
    expect(slugFor('Zhockey')).toBe('zhockey')
  })

  it('allows the jersey range the database allows', () => {
    expect(JERSEY_MIN).toBe(0)
    expect(JERSEY_MAX).toBe(99)
  })

  it('turns empty optional fields into absent columns rather than empty strings', () => {
    expect(teamEdit(draft())).toEqual({
      slug: 'rock-choppers',
      short_name: 'Rock Choppers',
      full_name: null,
      nickname: null,
      colour: null,
      logo_url: null,
      active: true,
    })
  })

  it('gives a new team its competition and an edit no way to change one', () => {
    expect(teamRow(draft({ competition: 'wubl' }))).toEqual(
      expect.objectContaining({ competition_key: 'wubl' }),
    )
    expect(teamEdit(draft({ competition: 'wubl' }))).not.toHaveProperty(
      'competition_key',
    )
  })

  it('shows retired teams last, and the rest by name', () => {
    const rows = sortedTeams([
      team({ id: 'z', shortName: 'Zhockey' }),
      team({ id: 'r', shortName: 'Rock Choppers', active: false }),
      team({ id: 'b', shortName: 'Blanco' }),
    ])

    expect(rows.map((each) => each.shortName)).toEqual([
      'Blanco',
      'Zhockey',
      'Rock Choppers',
    ])
  })
})

describe('teamProblems', () => {
  it('accepts a team with only a name and a slug', () => {
    expect(teamProblems(draft(), [], null)).toEqual([])
  })

  it('wants a short name, which is the one the fixture uses', () => {
    expect(
      teamProblems(draft({ shortName: '  ' }), [], null).map(
        (problem) => problem.kind,
      ),
    ).toContain('short-name-missing')
  })

  it('refuses an empty slug and a slug the database would not accept', () => {
    expect(
      teamProblems(draft({ slug: '' }), [], null).map((each) => each.kind),
    ).toContain('slug-missing')

    for (const bad of [
      'Rock Choppers',
      'rock choppers',
      'rock_choppers',
      '-rock',
      'rock-',
    ]) {
      expect(
        teamProblems(draft({ slug: bad }), [], null).map((each) => each.kind),
      ).toContain('slug-shape')
    }
  })

  it('reads a duplicate slug as a duplicate, and says which team holds it', () => {
    const problems = teamProblems(
      draft({ slug: 'birra-del-fuego' }),
      [team()],
      null,
    )

    expect(problems.map((each) => each.kind)).toContain('slug-taken')
    expect(problems[0]?.message).toContain('Birra del Fuego')
    expect(problems[0]?.message).toContain('Beer League')
  })

  it('refuses a slug held by a team of the other competition too', () => {
    // teams_slug_unique is global, not per competition.
    const problems = teamProblems(
      draft({ competition: 'wubl', slug: 'birra-del-fuego' }),
      [team()],
      null,
    )

    expect(problems.map((each) => each.kind)).toContain('slug-taken')
  })

  it('refuses a short name another team of the same competition already has', () => {
    const problems = teamProblems(
      draft({ shortName: 'Birra del Fuego', slug: 'bdf' }),
      [team()],
      null,
    )

    expect(problems.map((each) => each.kind)).toEqual(['short-name-taken'])
    expect(problems[0]?.message).toContain('Beer League')
  })

  it('allows the same short name in the other competition', () => {
    expect(
      teamProblems(
        draft({
          competition: 'wubl',
          shortName: 'Birra del Fuego',
          slug: 'mujeres-birra-del-fuego',
        }),
        [team()],
        null,
      ),
    ).toEqual([])
  })

  it('does not count a team against itself while it is being edited', () => {
    expect(teamProblems(draftFromTeam(team()), [team()], 'team-verde')).toEqual(
      [],
    )
  })
})

describe('teamSavePlan', () => {
  it('inserts a new team with its competition', () => {
    expect(teamSavePlan(draft({ competition: 'wubl' }), [], null)).toEqual({
      teamId: null,
      row: expect.objectContaining({ competition_key: 'wubl' }),
    })
  })

  it('updates an existing team, and never its competition', () => {
    const plan = teamSavePlan(
      draftFromTeam(team({ shortName: 'Birra' })),
      [team()],
      'team-verde',
    )

    expect(plan).toEqual({
      teamId: 'team-verde',
      row: expect.objectContaining({ short_name: 'Birra' }),
    })
    expect(plan?.row).not.toHaveProperty('competition_key')
  })

  it('writes nothing when a second save changed nothing', () => {
    expect(
      teamSavePlan(draftFromTeam(team()), [team()], 'team-verde'),
    ).toBeNull()
  })

  it('knows a draft that still says what the row says', () => {
    expect(sameTeam(team(), draftFromTeam(team()))).toBe(true)
    expect(sameTeam(team(), draftFromTeam(team({ active: false })))).toBe(false)
  })

  it('retires a team by clearing active rather than by deleting it', () => {
    const plan = teamSavePlan(
      draftFromTeam(team({ active: false })),
      [team()],
      'team-verde',
    )

    expect(plan?.row.active).toBe(false)
  })
})

describe('the roster it loaded', () => {
  it('is empty for a team nobody has a row for', () => {
    expect(rosterDraftFor(page({ roster: [] }), 'team-verde')).toEqual({
      entries: [],
      newPeople: [],
    })
  })

  it('holds a missing number as an empty field rather than as a zero', () => {
    const loaded = rosterDraftFor(
      page({ roster: [entry({ jerseyNumber: null })] }),
      'team-verde',
    )

    expect(loaded.entries[0]?.jerseyNumber).toBe('')
  })

  it('leaves out the rosters of other teams', () => {
    const loaded = rosterDraftFor(
      page({
        roster: [entry(), entry({ id: 'other', teamId: 'team-azul' })],
      }),
      'team-verde',
    )

    expect(loaded.entries).toHaveLength(1)
  })

  it('names a person the draft invented, before their row exists', () => {
    const draftRoster = roster(
      [{ id: 'r', playerId: 'new-1', jerseyNumber: '', active: true }],
      [{ id: 'new-1', fullName: 'Zayas Maitena' }],
    )

    expect(personName(page(), draftRoster, 'new-1')).toBe('Zayas Maitena')
  })

  it('says so rather than showing a blank for somebody it cannot name', () => {
    expect(personName(page(), roster([]), 'nobody')).toBe(
      'Persona que no está en la base',
    )
  })
})

describe('rosterAddProblems', () => {
  it('wants somebody chosen or a name typed', () => {
    expect(
      rosterAddProblems(emptyRosterAddDraft(), page(), team()).map(
        (each) => each.kind,
      ),
    ).toEqual(['nobody-chosen'])
  })

  it('accepts a person the league already knows, with no number', () => {
    expect(
      rosterAddProblems(
        { playerId: 'player-omar', name: '', jerseyNumber: '' },
        page(),
        team(),
      ),
    ).toEqual([])
  })

  it('accepts a person the league does not know yet, by name', () => {
    expect(
      rosterAddProblems(
        { playerId: '', name: 'Zayas Maitena', jerseyNumber: '36' },
        page(),
        team(),
      ),
    ).toEqual([])
  })

  it('refuses the same person twice in this team', () => {
    const problems = rosterAddProblems(
      { playerId: 'player-joaquin', name: '', jerseyNumber: '' },
      page(),
      team(),
    )

    expect(problems.map((each) => each.kind)).toEqual(['already-in-this-team'])
  })

  it('points at the row rather than at the form when the row is only deactivated', () => {
    const problems = rosterAddProblems(
      { playerId: 'player-joaquin', name: '', jerseyNumber: '' },
      page({ roster: [entry({ active: false })] }),
      team(),
    )

    expect(problems[0]?.message).toContain('Devolvela al plantel')
  })

  it('refuses the same person twice in one competition, and names the other team', () => {
    const problems = rosterAddProblems(
      { playerId: 'player-flor', name: '', jerseyNumber: '' },
      page({
        teams: [
          team(),
          team({
            id: 'team-hanta',
            shortName: 'Rock Choppers',
            slug: 'rock-choppers',
          }),
        ],
        roster: [
          entry({ id: 'r2', teamId: 'team-hanta', playerId: 'player-flor' }),
        ],
      }),
      team(),
    )

    expect(problems.map((each) => each.kind)).toEqual([
      'already-in-competition',
    ])
    expect(problems[0]?.message).toContain('Rock Choppers')
    expect(problems[0]?.message).toContain('Beer League')
  })

  it('allows the same person in the other competition, which is two legal rows', () => {
    const wubl = team({
      id: 'team-queens',
      competition: 'wubl',
      slug: 'frozen-queens',
      shortName: 'Frozen Queens',
    })

    expect(
      rosterAddProblems(
        { playerId: 'player-flor', name: '', jerseyNumber: '9' },
        page({
          teams: [team(), wubl],
          roster: [
            entry({ id: 'r2', playerId: 'player-flor', jerseyNumber: 28 }),
          ],
        }),
        wubl,
      ),
    ).toEqual([])
  })

  it('refuses a number that is not a number, and one outside the range', () => {
    expect(
      rosterAddProblems(
        { playerId: 'player-omar', name: '', jerseyNumber: '-3' },
        page(),
        team(),
      ).map((each) => each.kind),
    ).toEqual(['jersey-not-a-count'])

    expect(
      rosterAddProblems(
        { playerId: 'player-omar', name: '', jerseyNumber: '100' },
        page(),
        team(),
      ).map((each) => each.kind),
    ).toEqual(['jersey-out-of-range'])
  })

  it('warns about a typed name the league already knows, and does not refuse it', () => {
    const add = { playerId: '', name: 'coria omar', jerseyNumber: '' }

    expect(rosterAddProblems(add, page(), team())).toEqual([])
    expect(rosterAddWarnings(add, page()).map((each) => each.kind)).toEqual([
      'name-already-known',
    ])
  })
})

describe('withAddedPerson', () => {
  it('adds a person the league already knows without inventing a player row', () => {
    const next = withAddedPerson(roster([]), {
      playerId: 'player-omar',
      name: '',
      jerseyNumber: '',
    })

    expect(next.entries).toEqual([
      expect.objectContaining({
        playerId: 'player-omar',
        jerseyNumber: '',
        active: true,
      }),
    ])
    expect(next.newPeople).toEqual([])
  })

  it('invents an id for a person the league does not know, so a second save is idempotent', () => {
    const next = withAddedPerson(roster([]), {
      playerId: '',
      name: '  Zayas Maitena  ',
      jerseyNumber: '36',
    })

    expect(next.newPeople).toEqual([
      { id: next.entries[0]?.playerId, fullName: 'Zayas Maitena' },
    ])
    expect(next.entries[0]?.jerseyNumber).toBe('36')
  })
})

describe('rosterProblems and rosterWarnings', () => {
  const twentyEight = roster([
    { id: 'a', playerId: 'player-flor', jerseyNumber: '28', active: true },
    { id: 'b', playerId: 'player-mauri', jerseyNumber: '28', active: true },
  ])

  it('never refuses a number that repeats inside a team', () => {
    expect(rosterProblems(page(), twentyEight)).toEqual([])
  })

  it('says out loud that a number repeats, naming both people', () => {
    const warnings = rosterWarnings(page(), twentyEight)

    expect(warnings.map((each) => each.kind)).toEqual(['jersey-repeated'])
    expect(warnings[0]?.message).toContain('28')
    expect(warnings[0]?.message).toContain('Cotignola Flor')
    expect(warnings[0]?.message).toContain('Bergeonneau Mauri')
  })

  it('never refuses a person with no number, and says so out loud', () => {
    const nobodys = roster([
      { id: 'a', playerId: 'player-omar', jerseyNumber: '', active: true },
    ])

    expect(rosterProblems(page(), nobodys)).toEqual([])
    expect(rosterWarnings(page(), nobodys).map((each) => each.kind)).toEqual([
      'jersey-missing',
    ])
  })

  it('says nothing about the number of somebody who is off the roster', () => {
    expect(
      rosterWarnings(
        page(),
        roster([
          { id: 'a', playerId: 'player-omar', jerseyNumber: '', active: false },
        ]),
      ),
    ).toEqual([])
  })

  it('refuses a number that is not a number, naming the person', () => {
    const problems = rosterProblems(
      page(),
      roster([
        {
          id: 'a',
          playerId: 'player-omar',
          jerseyNumber: 'ocho',
          active: true,
        },
      ]),
    )

    expect(problems.map((each) => each.kind)).toEqual(['jersey-not-a-count'])
    expect(problems[0]?.message).toContain('Coria Omar')
  })

  it('refuses a number outside what the database allows', () => {
    expect(
      rosterProblems(
        page(),
        roster([
          {
            id: 'a',
            playerId: 'player-omar',
            jerseyNumber: '128',
            active: true,
          },
        ]),
      ).map((each) => each.kind),
    ).toEqual(['jersey-out-of-range'])
  })

  it('refuses the same person twice in one team', () => {
    expect(
      rosterProblems(
        page(),
        roster([
          { id: 'a', playerId: 'player-omar', jerseyNumber: '1', active: true },
          { id: 'b', playerId: 'player-omar', jerseyNumber: '2', active: true },
        ]),
      ).map((each) => each.kind),
    ).toEqual(['person-twice'])
  })
})

describe('sortedRoster', () => {
  it('puts numbers first in order, then the people without one, then the retired', () => {
    const rows = sortedRoster(
      page(),
      roster([
        { id: 'a', playerId: 'player-omar', jerseyNumber: '', active: true },
        { id: 'b', playerId: 'player-flor', jerseyNumber: '28', active: true },
        {
          id: 'c',
          playerId: 'player-joaquin',
          jerseyNumber: '3',
          active: true,
        },
        { id: 'd', playerId: 'player-mauri', jerseyNumber: '1', active: false },
      ]),
    )

    expect(rows.map((row) => row.id)).toEqual(['c', 'b', 'a', 'd'])
  })
})

describe('personPicks', () => {
  it('leaves out anybody already on a roster of this competition this season', () => {
    const picks = personPicks(page(), team(), roster([]))

    expect(picks.map((person) => person.id)).not.toContain('player-joaquin')
    expect(picks.map((person) => person.id)).toContain('player-omar')
  })

  it('still offers somebody who is only on a roster of the other competition', () => {
    const wubl = team({
      id: 'team-queens',
      competition: 'wubl',
      slug: 'frozen-queens',
      shortName: 'Frozen Queens',
    })

    expect(
      personPicks(page({ teams: [team(), wubl] }), wubl, roster([])).map(
        (person) => person.id,
      ),
    ).toContain('player-joaquin')
  })

  it('leaves out somebody the draft has already added but not saved', () => {
    const picks = personPicks(
      page(),
      team(),
      roster([
        { id: 'a', playerId: 'player-omar', jerseyNumber: '', active: true },
      ]),
    )

    expect(picks.map((person) => person.id)).not.toContain('player-omar')
  })

  it('does not offer a deactivated person', () => {
    expect(
      personPicks(
        page({
          people: [{ id: 'gone', fullName: 'Quien Fuera', active: false }],
        }),
        team(),
        roster([]),
      ),
    ).toEqual([])
  })
})

describe('rosterWrites', () => {
  const loaded = () => rosterDraftFor(page(), 'team-verde')

  it('writes nothing when nothing changed', () => {
    const writes = rosterWrites(page(), team(), loaded(), loaded())

    expect(writes.people).toEqual([])
    expect(writes.roster).toEqual([])
    expect(rosterPartsOf(writes)).toEqual([])
  })

  it('writes only the row whose number moved', () => {
    const before = loaded()
    const after = roster(
      before.entries.map((each) => ({ ...each, jerseyNumber: '31' })),
    )
    const writes = rosterWrites(page(), team(), before, after)

    expect(writes.roster).toEqual([
      {
        id: 'roster-1',
        season_id: 'season-2026',
        competition_key: 'beer',
        team_id: 'team-verde',
        player_id: 'player-joaquin',
        jersey_number: 31,
        active: true,
      },
    ])
    expect(rosterPartsOf(writes)).toEqual(['roster'])
  })

  it('writes an absent number as null rather than as a zero', () => {
    const before = loaded()
    const after = roster(
      before.entries.map((each) => ({ ...each, jerseyNumber: '' })),
    )

    expect(
      rosterWrites(page(), team(), before, after).roster[0]?.jersey_number,
    ).toBeNull()
  })

  it('takes somebody off the roster by clearing active, never by deleting', () => {
    const before = loaded()
    const after = roster(
      before.entries.map((each) => ({ ...each, active: false })),
    )
    const writes = rosterWrites(page(), team(), before, after)

    expect(writes.roster[0]?.active).toBe(false)
    expect(writes).not.toHaveProperty('removeIds')
  })

  it('writes the person and the roster row when somebody new was added', () => {
    const before = loaded()
    const after = withAddedPerson(before, {
      playerId: '',
      name: 'Zayas Maitena',
      jerseyNumber: '36',
    })
    const writes = rosterWrites(page(), team(), before, after)

    expect(writes.people).toEqual([
      { id: after.entries[1]?.playerId, full_name: 'Zayas Maitena' },
    ])
    expect(writes.roster).toHaveLength(1)
    expect(rosterPartsOf(writes)).toEqual(['people', 'roster'])
  })

  it('stores nothing about a person but their name', () => {
    const after = withAddedPerson(roster([]), {
      playerId: '',
      name: 'Zayas Maitena',
      jerseyNumber: '',
    })

    expect(
      Object.keys(
        rosterWrites(page(), team(), roster([]), after).people[0] ?? {},
      ),
    ).toEqual(['id', 'full_name'])
  })

  it('sends a row whose number is not a number nowhere', () => {
    const after = roster([
      { id: 'a', playerId: 'player-omar', jerseyNumber: 'ocho', active: true },
    ])

    expect(rosterWrites(page(), team(), roster([]), after).roster).toEqual([])
  })

  it('carries the team competition into every row, so a roster cannot cross one', () => {
    const wubl = team({
      id: 'team-queens',
      competition: 'wubl',
      slug: 'frozen-queens',
      shortName: 'Frozen Queens',
    })
    const after = withAddedPerson(roster([]), {
      playerId: 'player-flor',
      name: '',
      jerseyNumber: '9',
    })

    expect(
      rosterWrites(page(), wubl, roster([]), after).roster[0]?.competition_key,
    ).toBe('wubl')
  })
})

describe('withSavedRosterParts', () => {
  it('moves the baseline forward only over the parts the database accepted', () => {
    const before = roster([])
    const after = withAddedPerson(before, {
      playerId: '',
      name: 'Zayas Maitena',
      jerseyNumber: '36',
    })

    const peopleOnly = withSavedRosterParts(before, after, ['people'])
    expect(peopleOnly.newPeople).toEqual(after.newPeople)
    expect(peopleOnly.entries).toEqual(before.entries)

    const both = withSavedRosterParts(before, after, ['people', 'roster'])
    expect(both).toEqual(after)
  })
})
