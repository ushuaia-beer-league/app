import { STAGE_NAMES } from './adminLabels'
import {
  draftFromMatch,
  emptyFixtureDraft,
  fixtureDays,
  fixtureNotes,
  fixtureProblems,
  hasScore,
  MATCH_STAGES,
  matchEdit,
  matchSavePlan,
  sameMatch,
  slotHolder,
  slotNeighbours,
  STANDINGS_STAGE,
  teamPicks,
  VENUES,
  withCompetition,
  type FixtureDraft,
  type FixtureMatch,
  type FixturePage,
  type FixtureTeam,
} from './fixtureDraft'

const HANTA: FixtureTeam = {
  id: 'team-hanta',
  competition: 'beer',
  shortName: 'Rock Choppers',
  active: true,
}

const SUCUCHO: FixtureTeam = {
  id: 'team-suc',
  competition: 'beer',
  shortName: 'Sucucho',
  active: true,
}

const QUEENS: FixtureTeam = {
  id: 'team-queens',
  competition: 'wubl',
  shortName: 'Frozen Queens',
  active: true,
}

const match = (overrides: Partial<FixtureMatch> = {}): FixtureMatch => ({
  id: 'match-1',
  competition: 'beer',
  stage: 'regular',
  date: '2026-05-23',
  time: '21:30',
  venue: 'poli',
  homeTeamId: 'team-hanta',
  awayTeamId: 'team-suc',
  homeGoals: 9,
  awayGoals: 6,
  resolution: 'regulation',
  notes: null,
  ...overrides,
})

const page = (overrides: Partial<FixturePage> = {}): FixturePage => ({
  seasonId: 'season-2026',
  year: 2026,
  teams: [HANTA, SUCUCHO, QUEENS],
  matches: [match()],
  ...overrides,
})

const draft = (overrides: Partial<FixtureDraft> = {}): FixtureDraft => ({
  ...emptyFixtureDraft('beer'),
  date: '2026-05-23',
  time: '22:30',
  ...overrides,
})

const teamName = (teamId: string) =>
  page().teams.find((team) => team.id === teamId)?.shortName ?? teamId

const problems = (
  current: FixtureDraft,
  where: FixturePage = page(),
  editingId: string | null = null,
) =>
  fixtureProblems(current, where, editingId, teamName).map((each) => each.kind)

const notes = (
  current: FixtureDraft,
  where: FixturePage = page(),
  editingId: string | null = null,
) => fixtureNotes(current, where, editingId).map((each) => each.kind)

describe('the fixture vocabulary', () => {
  it('names the eight stages the database allows, in bracket order', () => {
    expect([...MATCH_STAGES]).toEqual([
      'regular',
      'playin',
      'quarterfinal',
      'semifinal',
      'final',
      'third-place',
      'fifth-place',
      'all-star',
    ])
    expect(MATCH_STAGES.every((stage) => stage in STAGE_NAMES)).toBe(true)
  })

  it('knows the one stage that feeds the standings', () => {
    expect(STANDINGS_STAGE).toBe('regular')
  })

  it('names the two cabeceras and no third', () => {
    expect([...VENUES]).toEqual(['bahia', 'poli'])
  })

  it('opens a new match in the regular phase, with nothing else filled in', () => {
    expect(emptyFixtureDraft('wubl')).toEqual({
      competition: 'wubl',
      stage: 'regular',
      date: '',
      time: '',
      venue: '',
      homeTeamId: '',
      awayTeamId: '',
    })
  })

  it('reads an existing match into the form, absent columns as empty fields', () => {
    expect(
      draftFromMatch(
        match({ venue: null, homeTeamId: null, awayTeamId: null }),
      ),
    ).toEqual({
      competition: 'beer',
      stage: 'regular',
      date: '2026-05-23',
      time: '21:30',
      venue: '',
      homeTeamId: '',
      awayTeamId: '',
    })
  })

  it('clears both teams when the competition moves, and leaves them when it does not', () => {
    const picked = draft({ homeTeamId: 'team-hanta', awayTeamId: 'team-suc' })

    expect(withCompetition(picked, 'wubl')).toEqual(
      expect.objectContaining({
        competition: 'wubl',
        homeTeamId: '',
        awayTeamId: '',
      }),
    )
    expect(withCompetition(picked, 'beer')).toBe(picked)
  })

  it('knows which match already carries a score', () => {
    expect(hasScore(match())).toBe(true)
    expect(hasScore(match({ homeGoals: null, awayGoals: null }))).toBe(false)
  })
})

describe('fixtureProblems', () => {
  it('accepts a match with a date, a time and nothing else', () => {
    expect(problems(draft())).toEqual([])
  })

  it('wants a date and a time, which the database requires', () => {
    expect(problems(draft({ date: '', time: '' }))).toEqual([
      'date-missing',
      'time-missing',
    ])
  })

  it('refuses a time that is not a time', () => {
    expect(problems(draft({ time: '25:00' }))).toEqual(['time-shape'])
  })

  it('refuses a team playing itself', () => {
    expect(
      problems(draft({ homeTeamId: 'team-hanta', awayTeamId: 'team-hanta' })),
    ).toEqual(['same-team'])
  })

  it('refuses a team from another competition', () => {
    expect(problems(draft({ homeTeamId: 'team-queens' }))).toEqual([
      'team-outside-competition',
    ])
  })
})

describe('the slot', () => {
  it('accepts a second match at the same hour in the other cabecera', () => {
    // Two matches run at once, one in Bahia and one in Poli. A unique on
    // (date, time) alone would refuse half of every round.
    expect(problems(draft({ time: '21:30', venue: 'bahia' }))).toEqual([])
  })

  it('says so when the same hour and cabecera is already taken', () => {
    const said = fixtureProblems(
      draft({ time: '21:30', venue: 'poli' }),
      page(),
      null,
      teamName,
    )

    expect(said.map((each) => each.kind)).toEqual(['slot-taken'])
    expect(said[0]?.message).toContain(
      'Ya hay un partido a esa hora en esa cabecera',
    )
    expect(said[0]?.message).toContain('Rock Choppers vs Sucucho')
  })

  it('names the slot holder as a row without teams when that is what it is', () => {
    const said = fixtureProblems(
      draft({ time: '21:30', venue: 'bahia' }),
      page({
        matches: [
          match({
            id: 'empty',
            venue: 'bahia',
            homeTeamId: null,
            awayTeamId: null,
            homeGoals: null,
            awayGoals: null,
            resolution: null,
          }),
        ],
      }),
      null,
      teamName,
    )

    expect(said[0]?.message).toContain('una fila sin equipos')
  })

  it('does not count the match being edited as being in its own way', () => {
    expect(
      problems(draft({ time: '21:30', venue: 'poli' }), page(), 'match-1'),
    ).toEqual([])
  })

  it('never collides two matches with no cabecera at the same time', () => {
    // Postgres treats nulls as distinct in a unique constraint, and the two
    // 21:30 semifinals of 2026 are genuinely two matches with no rink assigned.
    const semis = page({
      matches: [
        match({ id: 'semi-1', date: '2026-08-08', time: '21:30', venue: null }),
      ],
    })

    expect(
      problems(draft({ date: '2026-08-08', time: '21:30', venue: '' }), semis),
    ).toEqual([])
    expect(
      slotHolder(
        draft({ date: '2026-08-08', time: '21:30', venue: '' }),
        semis.matches,
        null,
      ),
    ).toBeNull()
  })

  it('finds the match sharing the hour in the other cabecera', () => {
    expect(
      slotNeighbours(
        draft({ time: '21:30', venue: 'bahia' }),
        page().matches,
        null,
      ).map((each) => each.id),
    ).toEqual(['match-1'])
  })
})

describe('fixtureNotes', () => {
  it('says a match with no cabecera saves anyway', () => {
    expect(notes(draft({ venue: '' }))).toContain('venue-unassigned')
  })

  it('says a match with no teams saves anyway', () => {
    expect(notes(draft({ venue: 'bahia' }))).toContain('no-teams')
  })

  it('says which single team is missing rather than calling it empty', () => {
    const said = notes(
      draft({ venue: 'bahia', homeTeamId: 'team-hanta' }),
      page(),
    )

    expect(said).toContain('one-team')
    expect(said).not.toContain('no-teams')
  })

  it('says which stages do not feed the standings', () => {
    expect(notes(draft({ stage: 'regular', venue: 'bahia' }))).not.toContain(
      'stage-not-regular',
    )

    const said = fixtureNotes(
      draft({ stage: 'playin', venue: 'bahia' }),
      page(),
      null,
    )
    const about = said.find((each) => each.kind === 'stage-not-regular')

    expect(about?.message).toContain('Repechaje')
    expect(about?.message).toContain('no cuenta para la tabla')
  })

  it('says a second match at the same hour in the other cabecera is normal', () => {
    const said = fixtureNotes(
      draft({ time: '21:30', venue: 'bahia' }),
      page(),
      null,
    )
    const about = said.find((each) => each.kind === 'slot-shared')

    expect(about?.message).toContain('dos partidos a la vez')
    expect(about?.message).toContain('Bahía')
  })
})

describe('matchSavePlan', () => {
  it('inserts a new match with its season', () => {
    expect(matchSavePlan(draft({ venue: 'bahia' }), page(), null)).toEqual({
      matchId: null,
      row: {
        season_id: 'season-2026',
        competition_key: 'beer',
        stage: 'regular',
        match_date: '2026-05-23',
        start_time: '22:30',
        venue: 'bahia',
        home_team_id: null,
        away_team_id: null,
      },
    })
  })

  it('stores a match with no teams rather than refusing to write the gap', () => {
    const plan = matchSavePlan(
      draft({ time: '21:30', venue: 'bahia' }),
      page({ matches: [] }),
      null,
    )

    expect(plan?.row).toEqual(
      expect.objectContaining({ home_team_id: null, away_team_id: null }),
    )
  })

  it('stores an unassigned cabecera as null rather than as an empty string', () => {
    expect(
      matchSavePlan(draft({ venue: '' }), page(), null)?.row.venue,
    ).toBeNull()
  })

  it('never writes a score, a resolution, a status or a note', () => {
    const plan = matchSavePlan(draft({ venue: 'bahia' }), page(), null)

    for (const column of [
      'home_goals',
      'away_goals',
      'resolution',
      'status',
      'notes',
    ]) {
      expect(plan?.row).not.toHaveProperty(column)
    }
  })

  it('updates an existing match without naming its season', () => {
    const plan = matchSavePlan(
      draftFromMatch(match({ venue: 'bahia' })),
      page(),
      'match-1',
    )

    expect(plan?.matchId).toBe('match-1')
    expect(plan?.row).not.toHaveProperty('season_id')
    expect(plan?.row.venue).toBe('bahia')
  })

  it('writes nothing when a second save changed nothing', () => {
    expect(matchSavePlan(draftFromMatch(match()), page(), 'match-1')).toBeNull()
    expect(sameMatch(match(), draftFromMatch(match()))).toBe(true)
  })

  it('writes nothing while the date or the time is missing', () => {
    expect(matchSavePlan(draft({ date: '' }), page(), null)).toBeNull()
    expect(matchSavePlan(draft({ time: '' }), page(), null)).toBeNull()
  })

  it('keeps the row snake case, as the table holds it', () => {
    expect(Object.keys(matchEdit(draft())).sort()).toEqual([
      'away_team_id',
      'competition_key',
      'home_team_id',
      'match_date',
      'stage',
      'start_time',
      'venue',
    ])
  })
})

describe('fixtureDays', () => {
  it('groups by day and orders by hour, with the two cabeceras of an hour together', () => {
    const days = fixtureDays([
      match({ id: 'c', date: '2026-05-30', time: '21:30', venue: 'bahia' }),
      match({ id: 'b', date: '2026-05-23', time: '22:30', venue: 'bahia' }),
      match({ id: 'a', date: '2026-05-23', time: '21:30', venue: 'poli' }),
      match({ id: 'a2', date: '2026-05-23', time: '21:30', venue: 'bahia' }),
    ])

    expect(days.map((day) => day.date)).toEqual(['2026-05-23', '2026-05-30'])
    expect(days[0]?.matches.map((each) => each.id)).toEqual(['a2', 'a', 'b'])
  })

  it('puts a match with no cabecera after the ones that have theirs', () => {
    const days = fixtureDays([
      match({ id: 'none', venue: null }),
      match({ id: 'poli', venue: 'poli' }),
    ])

    expect(days[0]?.matches.map((each) => each.id)).toEqual(['poli', 'none'])
  })
})

describe('teamPicks', () => {
  it('offers only the teams of the draft competition', () => {
    expect(teamPicks(page(), draft()).map((team) => team.id)).toEqual([
      'team-hanta',
      'team-suc',
    ])
    expect(
      teamPicks(page(), draft({ competition: 'wubl' })).map((team) => team.id),
    ).toEqual(['team-queens'])
  })

  it('leaves out a retired team, unless this match already names it', () => {
    const retired = page({ teams: [{ ...HANTA, active: false }, SUCUCHO] })

    expect(teamPicks(retired, draft()).map((team) => team.id)).toEqual([
      'team-suc',
    ])
    expect(
      teamPicks(retired, draft({ homeTeamId: 'team-hanta' })).map(
        (team) => team.id,
      ),
    ).toContain('team-hanta')
  })
})
