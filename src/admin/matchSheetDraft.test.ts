import type { MatchRow } from '../data/season-source'
import { goalsExceedScore, matchGaps } from '../utils/match-completeness'
import {
  draftCounts,
  draftFromSheet,
  draftMatch,
  draftProblems,
  draftResult,
  goaliePicks,
  leaguePicks,
  legalResolutions,
  linePercentage,
  matchSheetWrites,
  newGoal,
  partsOf,
  readCount,
  rosterPicks,
  scorerPicks,
  withFranchise,
  withSavedParts,
  type MatchSheetData,
  type MatchSheetDraft,
} from './matchSheetDraft'

const HOME = 'team-rock'
const AWAY = 'team-sucucho'

const row = (overrides: Partial<MatchRow> = {}): MatchRow => ({
  id: 'match-1',
  competition_key: 'beer',
  stage: 'regular',
  match_date: '2026-05-23',
  start_time: '21:30:00',
  venue: 'bahia',
  home_goals: null,
  away_goals: null,
  resolution: null,
  notes: null,
  home_team: { slug: 'rock-choppers' },
  away_team: { slug: 'sucucho' },
  ...overrides,
})

const sheet = (overrides: Partial<MatchSheetData> = {}): MatchSheetData => ({
  matchId: 'match-1',
  row: row(),
  home: { id: HOME, slug: 'rock-choppers', shortName: 'Rock Choppers' },
  away: { id: AWAY, slug: 'sucucho', shortName: 'Sucucho' },
  players: [
    { id: 'p1', name: 'Aguirre Nahuel', active: true },
    { id: 'p2', name: 'Barrientos Luz', active: true },
    { id: 'p3', name: 'Cárdenas Ivo', active: true },
    { id: 'p4', name: 'Duarte Sol', active: true },
    { id: 'sub', name: 'Zapata Rocío', active: true },
    { id: 'gone', name: 'Ex Jugador', active: false },
  ],
  roster: [
    { playerId: 'p1', teamId: HOME, jerseyNumber: 9 },
    { playerId: 'p2', teamId: HOME, jerseyNumber: null },
    { playerId: 'p3', teamId: AWAY, jerseyNumber: 28 },
    { playerId: 'p4', teamId: AWAY, jerseyNumber: 1 },
  ],
  appearances: [],
  goals: [],
  goalieLines: [],
  ...overrides,
})

const draft = (overrides: Partial<MatchSheetDraft> = {}): MatchSheetDraft => ({
  homeGoals: '',
  awayGoals: '',
  resolution: '',
  appearances: [],
  goals: [],
  goalieLines: [],
  ...overrides,
})

const kinds = (data: MatchSheetData, current: MatchSheetDraft) =>
  draftProblems(data, current).map((problem) => problem.kind)

describe('draftFromSheet', () => {
  it('starts from what the database holds, empty fields and all', () => {
    expect(draftFromSheet(sheet())).toEqual({
      homeGoals: '',
      awayGoals: '',
      resolution: '',
      appearances: [],
      goals: [],
      goalieLines: [],
    })
  })

  it('carries a recorded result, including a draw', () => {
    const data = sheet({
      row: row({ home_goals: 4, away_goals: 4, resolution: 'draw' }),
    })

    expect(draftFromSheet(data)).toMatchObject({
      homeGoals: '4',
      awayGoals: '4',
      resolution: 'draw',
    })
  })

  it('keeps a nil-nil apart from an unreported match', () => {
    const nilNil = draftFromSheet(
      sheet({ row: row({ home_goals: 0, away_goals: 0 }) }),
    )

    expect(nilNil.homeGoals).toBe('0')
    expect(draftFromSheet(sheet()).homeGoals).toBe('')
  })
})

describe('readCount', () => {
  it('reads a count, an empty field and anything else', () => {
    expect(readCount('7')).toBe(7)
    expect(readCount('0')).toBe(0)
    expect(readCount('  ')).toBeNull()
    // A count column is non-negative in every one of these tables.
    expect(readCount('-1')).toBe('invalid')
    expect(readCount('2.5')).toBe('invalid')
    expect(readCount('nueve')).toBe('invalid')
  })
})

describe('legalResolutions', () => {
  it('offers only a draw when the goals are level, nil-nil included', () => {
    expect(legalResolutions(draft({ homeGoals: '4', awayGoals: '4' }))).toEqual(
      ['draw'],
    )
    expect(legalResolutions(draft({ homeGoals: '0', awayGoals: '0' }))).toEqual(
      ['draw'],
    )
  })

  it('offers regulation and shootout when they are not', () => {
    expect(legalResolutions(draft({ homeGoals: '9', awayGoals: '6' }))).toEqual(
      ['regulation', 'shootout'],
    )
  })

  it('offers nothing while the score is half entered', () => {
    expect(legalResolutions(draft({ homeGoals: '9' }))).toEqual([])
    expect(legalResolutions(draft())).toEqual([])
  })
})

describe('draftProblems', () => {
  it('finds nothing wrong with an empty sheet', () => {
    expect(draftProblems(sheet(), draft())).toEqual([])
  })

  it('refuses half a score, which is what the database refuses', () => {
    const problems = draftProblems(sheet(), draft({ homeGoals: '9' }))

    expect(problems.map((problem) => problem.kind)).toEqual(['half-score'])
    expect(problems[0]?.message).toContain('los dos goles o ninguno')
  })

  it('refuses a goal count that is not a count', () => {
    expect(kinds(sheet(), draft({ homeGoals: '-2', awayGoals: '1' }))).toEqual([
      'score-not-a-count',
    ])
  })

  it('accepts a draw when the goals are level', () => {
    expect(
      draftProblems(
        sheet(),
        draft({ homeGoals: '4', awayGoals: '4', resolution: 'draw' }),
      ),
    ).toEqual([])
  })

  it('refuses a draw whose goals are not level, and says the score out loud', () => {
    const problems = draftProblems(
      sheet(),
      draft({ homeGoals: '4', awayGoals: '3', resolution: 'draw' }),
    )

    expect(problems[0]?.kind).toBe('draw-not-level')
    expect(problems[0]?.message).toContain('4 a 3')
  })

  it('refuses a decided result whose goals are level', () => {
    expect(
      kinds(
        sheet(),
        draft({ homeGoals: '4', awayGoals: '4', resolution: 'shootout' }),
      ),
    ).toEqual(['decided-is-level'])
  })

  it('refuses a resolution with no score to resolve', () => {
    expect(kinds(sheet(), draft({ resolution: 'regulation' }))).toEqual([
      'resolution-without-score',
    ])
  })

  it('refuses two franchise players in one match, and counts them', () => {
    const problems = draftProblems(
      sheet(),
      draft({
        appearances: [
          {
            playerId: 'p1',
            teamId: HOME,
            isSubstitute: true,
            isFranchise: true,
          },
          {
            playerId: 'p3',
            teamId: AWAY,
            isSubstitute: true,
            isFranchise: true,
          },
        ],
      }),
    )

    expect(problems[0]?.kind).toBe('two-franchise')
    expect(problems[0]?.message).toContain('2 marcados')
  })

  it('accepts one franchise player', () => {
    expect(
      draftProblems(
        sheet(),
        draft({
          appearances: [
            {
              playerId: 'p1',
              teamId: HOME,
              isSubstitute: true,
              isFranchise: true,
            },
          ],
        }),
      ),
    ).toEqual([])
  })

  it('refuses the same person twice, whichever side', () => {
    const problems = draftProblems(
      sheet(),
      draft({
        appearances: [
          {
            playerId: 'p1',
            teamId: HOME,
            isSubstitute: false,
            isFranchise: false,
          },
          {
            playerId: 'p1',
            teamId: AWAY,
            isSubstitute: false,
            isFranchise: false,
          },
        ],
      }),
    )

    expect(problems[0]?.kind).toBe('player-listed-twice')
    expect(problems[0]?.message).toContain('Aguirre Nahuel')
  })

  it('refuses a goal whose scorer is also its assist', () => {
    expect(
      kinds(
        sheet(),
        draft({
          goals: [{ id: 'g1', teamId: HOME, scorerId: 'p1', assistId: 'p1' }],
        }),
      ),
    ).toEqual(['scorer-is-assist'])
  })

  it('says nothing about a goal with no scorer and no assist', () => {
    expect(
      draftProblems(
        sheet(),
        draft({
          goals: [{ id: 'g1', teamId: HOME, scorerId: '', assistId: '' }],
        }),
      ),
    ).toEqual([])
  })

  it('refuses a goalkeeper who conceded more than they faced', () => {
    const problems = draftProblems(
      sheet(),
      draft({
        goalieLines: [
          {
            playerId: 'p2',
            teamId: HOME,
            shotsFaced: '10',
            goalsAgainst: '11',
          },
        ],
      }),
    )

    expect(problems[0]?.kind).toBe('goalie-goals-exceed-shots')
    expect(problems[0]?.message).toContain('Barrientos Luz')
  })

  it('refuses a goalkeeper line with one number missing, and one with both', () => {
    expect(
      kinds(
        sheet(),
        draft({
          goalieLines: [
            {
              playerId: 'p2',
              teamId: HOME,
              shotsFaced: '10',
              goalsAgainst: '',
            },
          ],
        }),
      ),
    ).toEqual(['goalie-line-incomplete'])

    expect(
      kinds(
        sheet(),
        draft({
          goalieLines: [
            { playerId: 'p2', teamId: HOME, shotsFaced: '', goalsAgainst: '' },
          ],
        }),
      ),
    ).toEqual(['goalie-line-incomplete'])
  })

  it('accepts a goalkeeper who faced nothing', () => {
    expect(
      draftProblems(
        sheet(),
        draft({
          goalieLines: [
            {
              playerId: 'p2',
              teamId: HOME,
              shotsFaced: '0',
              goalsAgainst: '0',
            },
          ],
        }),
      ),
    ).toEqual([])
  })

  it('refuses the same goalkeeper twice', () => {
    expect(
      kinds(
        sheet(),
        draft({
          goalieLines: [
            {
              playerId: 'p2',
              teamId: HOME,
              shotsFaced: '4',
              goalsAgainst: '1',
            },
            {
              playerId: 'p2',
              teamId: HOME,
              shotsFaced: '5',
              goalsAgainst: '2',
            },
          ],
        }),
      ),
    ).toEqual(['goalie-listed-twice'])
  })

  it('lets a goal count that disagrees with the score be saved anyway', () => {
    const data = sheet()
    const current = draft({
      homeGoals: '1',
      awayGoals: '0',
      resolution: 'regulation',
      goals: [
        { id: 'g1', teamId: HOME, scorerId: '', assistId: '' },
        { id: 'g2', teamId: HOME, scorerId: '', assistId: '' },
      ],
    })

    // The contradiction is real, and it is not a reason to refuse the save.
    expect(
      goalsExceedScore(draftMatch(data, current), draftCounts(current)),
    ).toBe(true)
    expect(draftProblems(data, current)).toEqual([])
  })
})

describe('draftMatch and draftCounts', () => {
  it('reads a score only once both goals and a resolution are there', () => {
    const data = sheet()

    expect(
      draftMatch(data, draft({ homeGoals: '9', awayGoals: '6' })).score,
    ).toBeNull()
    expect(
      draftMatch(
        data,
        draft({ homeGoals: '9', awayGoals: '6', resolution: 'regulation' }),
      ).score,
    ).toEqual({ home: 9, away: 6, resolution: 'regulation' })
  })

  it('gives matchGaps the vocabulary of what is still missing', () => {
    const data = sheet()
    const current = draft({
      homeGoals: '2',
      awayGoals: '1',
      resolution: 'regulation',
    })

    expect(
      matchGaps(draftMatch(data, current), draftCounts(current)).map(
        (gap) => gap.kind,
      ),
    ).toEqual(['players', 'goals', 'goalkeepers'])
  })
})

describe('linePercentage', () => {
  it('computes what the league prints and stores nowhere', () => {
    expect(
      linePercentage({
        playerId: 'p2',
        teamId: HOME,
        shotsFaced: '8',
        goalsAgainst: '2',
      }),
    ).toBe(0.75)
  })

  it('has no answer for a keeper who faced nothing, or a half-typed line', () => {
    const line = { playerId: 'p2', teamId: HOME }

    expect(
      linePercentage({ ...line, shotsFaced: '0', goalsAgainst: '0' }),
    ).toBe(null)
    expect(
      linePercentage({ ...line, shotsFaced: '', goalsAgainst: '2' }),
    ).toBeNull()
    // The util throws on this pair; a field being typed must not.
    expect(
      linePercentage({ ...line, shotsFaced: '1', goalsAgainst: '4' }),
    ).toBeNull()
  })
})

describe('withFranchise', () => {
  it('moves the single franchise flag rather than adding a second', () => {
    const current = draft({
      appearances: [
        { playerId: 'p1', teamId: HOME, isSubstitute: true, isFranchise: true },
        {
          playerId: 'p3',
          teamId: AWAY,
          isSubstitute: true,
          isFranchise: false,
        },
      ],
    })

    const moved = withFranchise(current, 'p3', true)

    expect(moved.appearances.map((row) => row.isFranchise)).toEqual([
      false,
      true,
    ])
    expect(
      withFranchise(moved, 'p3', false).appearances.map(
        (row) => row.isFranchise,
      ),
    ).toEqual([false, false])
  })
})

describe('the pickers', () => {
  it('offers a side its roster, and drops whoever is already listed', () => {
    const data = sheet()

    expect(rosterPicks(data, draft(), HOME).map((pick) => pick.name)).toEqual([
      'Aguirre Nahuel',
      'Barrientos Luz',
    ])

    const listed = draft({
      appearances: [
        {
          playerId: 'p1',
          teamId: HOME,
          isSubstitute: false,
          isFranchise: false,
        },
      ],
    })

    expect(rosterPicks(data, listed, HOME).map((pick) => pick.name)).toEqual([
      'Barrientos Luz',
    ])
  })

  it('offers the rest of the league for a substitute, who has no roster row', () => {
    const data = sheet()

    expect(leaguePicks(data, draft()).map((pick) => pick.name)).toEqual([
      // Neither of the two rosters, and not the retired player.
      'Zapata Rocío',
    ])
  })

  it('offers a goal the people who played for that side and its roster', () => {
    const data = sheet()
    const current = draft({
      appearances: [
        {
          playerId: 'sub',
          teamId: HOME,
          isSubstitute: true,
          isFranchise: false,
        },
      ],
    })

    expect(scorerPicks(data, current, HOME).map((pick) => pick.name)).toEqual([
      'Aguirre Nahuel',
      'Barrientos Luz',
      'Zapata Rocío',
    ])
    expect(scorerPicks(data, current, AWAY).map((pick) => pick.name)).toEqual([
      'Cárdenas Ivo',
      'Duarte Sol',
    ])
  })

  it('drops a goalkeeper already on the sheet from the goalkeeper picker', () => {
    const data = sheet()
    const current = draft({
      goalieLines: [
        { playerId: 'p1', teamId: HOME, shotsFaced: '4', goalsAgainst: '1' },
      ],
    })

    expect(goaliePicks(data, current, HOME).map((pick) => pick.name)).toEqual([
      'Barrientos Luz',
    ])
  })
})

describe('newGoal', () => {
  it('is a goal of a side with nobody named, and its own identity', () => {
    const first = newGoal(HOME)
    const second = newGoal(HOME)

    expect(first).toMatchObject({ teamId: HOME, scorerId: '', assistId: '' })
    expect(first.id).not.toBe(second.id)
  })
})

describe('matchSheetWrites', () => {
  const baseline = draft()

  it('writes nothing when nothing changed', () => {
    const writes = matchSheetWrites('match-1', baseline, draft())

    expect(partsOf(writes)).toEqual([])
    expect(writes.result).toBeNull()
  })

  it('writes the three result columns and nothing else', () => {
    const writes = matchSheetWrites(
      'match-1',
      baseline,
      draft({ homeGoals: '9', awayGoals: '6', resolution: 'shootout' }),
    )

    expect(writes.result).toEqual({
      home_goals: 9,
      away_goals: 6,
      resolution: 'shootout',
    })
    expect(partsOf(writes)).toEqual(['result'])
  })

  it('clears a result back to nulls when the operator empties it', () => {
    const was = draft({
      homeGoals: '9',
      awayGoals: '6',
      resolution: 'regulation',
    })

    expect(matchSheetWrites('match-1', was, draft()).result).toEqual({
      home_goals: null,
      away_goals: null,
      resolution: null,
    })
  })

  it('writes an appearance with its side, its substitute flag and its franchise flag', () => {
    const writes = matchSheetWrites(
      'match-1',
      baseline,
      draft({
        appearances: [
          {
            playerId: 'sub',
            teamId: HOME,
            isSubstitute: true,
            isFranchise: true,
          },
        ],
      }),
    )

    expect(writes.players.upsert).toEqual([
      {
        match_id: 'match-1',
        player_id: 'sub',
        team_id: HOME,
        is_substitute: true,
        is_franchise: true,
      },
    ])
    expect(writes.players.removePlayerIds).toEqual([])
  })

  it('writes a goal with no scorer as two nulls, independently', () => {
    const writes = matchSheetWrites(
      'match-1',
      baseline,
      draft({
        goals: [
          { id: 'g1', teamId: HOME, scorerId: '', assistId: '' },
          { id: 'g2', teamId: AWAY, scorerId: 'p3', assistId: '' },
        ],
      }),
    )

    expect(writes.goals.upsert).toEqual([
      {
        id: 'g1',
        match_id: 'match-1',
        team_id: HOME,
        scorer_id: null,
        assist_id: null,
      },
      {
        id: 'g2',
        match_id: 'match-1',
        team_id: AWAY,
        scorer_id: 'p3',
        assist_id: null,
      },
    ])
  })

  it('writes a goalkeeper line as two counts and never a percentage', () => {
    const writes = matchSheetWrites(
      'match-1',
      baseline,
      draft({
        goalieLines: [
          { playerId: 'p2', teamId: HOME, shotsFaced: '8', goalsAgainst: '2' },
        ],
      }),
    )

    expect(writes.goalieLines.upsert).toEqual([
      {
        match_id: 'match-1',
        player_id: 'p2',
        team_id: HOME,
        shots_faced: 8,
        goals_against: 2,
      },
    ])
    expect(JSON.stringify(writes)).not.toContain('percentage')
  })

  it('sends no row for a goalkeeper line that is not yet two numbers', () => {
    const writes = matchSheetWrites(
      'match-1',
      baseline,
      draft({
        goalieLines: [
          { playerId: 'p2', teamId: HOME, shotsFaced: '8', goalsAgainst: '' },
        ],
      }),
    )

    expect(partsOf(writes)).toEqual([])
  })

  it('removes what the operator took off the sheet, by key', () => {
    const was = draft({
      appearances: [
        {
          playerId: 'p1',
          teamId: HOME,
          isSubstitute: false,
          isFranchise: false,
        },
      ],
      goals: [{ id: 'g1', teamId: HOME, scorerId: 'p1', assistId: '' }],
      goalieLines: [
        { playerId: 'p2', teamId: HOME, shotsFaced: '8', goalsAgainst: '2' },
      ],
    })

    const writes = matchSheetWrites('match-1', was, draft())

    expect(writes.players.removePlayerIds).toEqual(['p1'])
    expect(writes.goals.removeIds).toEqual(['g1'])
    expect(writes.goalieLines.removePlayerIds).toEqual(['p2'])
    expect(partsOf(writes)).toEqual(['players', 'goals', 'goalkeepers'])
  })

  it('leaves an untouched row alone and only writes the one that changed', () => {
    const was = draft({
      appearances: [
        {
          playerId: 'p1',
          teamId: HOME,
          isSubstitute: false,
          isFranchise: false,
        },
        {
          playerId: 'p2',
          teamId: HOME,
          isSubstitute: false,
          isFranchise: false,
        },
      ],
    })
    const now = draft({
      appearances: [
        {
          playerId: 'p1',
          teamId: HOME,
          isSubstitute: false,
          isFranchise: false,
        },
        {
          playerId: 'p2',
          teamId: HOME,
          isSubstitute: true,
          isFranchise: false,
        },
      ],
    })

    const writes = matchSheetWrites('match-1', was, now)

    expect(writes.players.upsert.map((row) => row.player_id)).toEqual(['p2'])
    expect(writes.players.removePlayerIds).toEqual([])
  })

  it('has nothing left to write once the baseline caught up, so a second save doubles nothing', () => {
    const saved = draft({
      homeGoals: '9',
      awayGoals: '6',
      resolution: 'regulation',
      goals: [{ id: 'g1', teamId: HOME, scorerId: 'p1', assistId: '' }],
    })

    const first = matchSheetWrites('match-1', baseline, saved)
    const moved = withSavedParts(baseline, saved, partsOf(first))
    const second = matchSheetWrites('match-1', moved, saved)

    expect(partsOf(first)).toEqual(['result', 'goals'])
    expect(partsOf(second)).toEqual([])
  })
})

describe('withSavedParts', () => {
  it('keeps a refused part pending and lets the next save retry exactly it', () => {
    const current = draft({
      homeGoals: '4',
      awayGoals: '4',
      resolution: 'draw',
      goals: [{ id: 'g1', teamId: HOME, scorerId: '', assistId: '' }],
    })

    // The result saved, the goals were refused.
    const moved = withSavedParts(draft(), current, ['result'])

    expect(moved.resolution).toBe('draw')
    expect(moved.goals).toEqual([])
    expect(partsOf(matchSheetWrites('match-1', moved, current))).toEqual([
      'goals',
    ])
  })
})

describe('draftResult', () => {
  it('reads an empty field as no goals rather than as zero', () => {
    expect(draftResult(draft())).toEqual({
      home_goals: null,
      away_goals: null,
      resolution: null,
    })
    expect(
      draftResult(draft({ homeGoals: '0', awayGoals: '0' })),
    ).toMatchObject({ home_goals: 0, away_goals: 0 })
  })
})
