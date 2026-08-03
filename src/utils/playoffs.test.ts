import { SEED_2026 } from '../data/seed-2026'
import type { Match, MatchStage } from '../data/types'
import {
  bracketPlacings,
  bracketShape,
  champion,
  knockoutResult,
  resolveBracket,
  seeding,
  type ResolvedBracketMatch,
  type ResolvedBracketRound,
} from './playoffs'

/** The 2026 regular season, which is what seeds both brackets. */
const BEER_REGULAR = SEED_2026.matches.filter(
  (match) => match.competition === 'beer' && match.stage === 'regular',
)

let sequence = 0

function bracket(stage: MatchStage, overrides: Partial<Match> = {}): Match {
  sequence += 1

  return {
    id: `test-${sequence}`,
    competition: 'beer',
    stage,
    date: '2026-08-08',
    time: '21:30',
    venue: null,
    homeTeamId: null,
    awayTeamId: null,
    score: null,
    notes: null,
    ...overrides,
  }
}

function regular(home: string, goals: [number, number], away: string): Match {
  sequence += 1

  return {
    id: `test-${sequence}`,
    competition: 'beer',
    stage: 'regular',
    date: '2026-05-23',
    time: '21:30',
    venue: 'bahia',
    homeTeamId: home,
    awayTeamId: away,
    score: { home: goals[0], away: goals[1], resolution: 'regulation' },
    notes: null,
  }
}

/**
 * A four-team league whose order is decided on points alone, so a hand-built
 * bracket can be seeded without leaning on a tiebreaker: alfa 6, bravo 4,
 * charlie 2, delta 0.
 */
const FOUR_TEAM_SEASON: readonly Match[] = [
  regular('alfa', [5, 1], 'bravo'),
  regular('alfa', [5, 1], 'charlie'),
  regular('alfa', [5, 1], 'delta'),
  regular('bravo', [4, 1], 'charlie'),
  regular('bravo', [4, 1], 'delta'),
  regular('charlie', [3, 1], 'delta'),
]

function matchAt(
  rounds: readonly ResolvedBracketRound[],
  stage: MatchStage,
  index = 0,
): ResolvedBracketMatch {
  const found = rounds
    .find((round) => round.stage === stage)
    ?.matches.find((candidate) => candidate.index === index)

  if (!found) throw new Error(`No ${stage} at index ${index}`)
  return found
}

function sidesOf(rounds: readonly ResolvedBracketRound[]) {
  return rounds.flatMap((round) =>
    round.matches.flatMap((match) => [match.home, match.away]),
  )
}

describe('seeding', () => {
  it('reproduces the order the league published on 4 July 2026', () => {
    expect(
      seeding(SEED_2026.matches, { competition: 'beer' }).map(
        (row) => [row.position, row.teamId] as const,
      ),
    ).toEqual([
      [1, 'birra-del-fuego'],
      [2, 'short-shift-soft-sticks'],
      [3, 'rock-choppers'],
      [4, 'blanco'],
      [5, 'sucucho'],
      [6, 'tipo-nine'],
      [7, 'zhockey'],
    ])
  })

  it('seeds Rock Choppers third on PGR although Blanco has the better goal difference', () => {
    const rows = seeding(SEED_2026.matches, { competition: 'beer' })
    const choppers = rows[2]
    const blanco = rows[3]

    expect([choppers?.teamId, blanco?.teamId]).toEqual([
      'rock-choppers',
      'blanco',
    ])
    // Both on 6 points; 3 regulation wins against 2 is what separates them, and
    // -4 against +4 is what would have separated them the other way.
    expect(choppers?.standing.points).toBe(blanco?.standing.points)
    expect(choppers?.standing.regulationWins).toBeGreaterThan(
      blanco?.standing.regulationWins ?? 0,
    )
    expect(choppers?.standing.goalDifference).toBeLessThan(
      blanco?.standing.goalDifference ?? 0,
    )
  })

  it('leaves the 4 July play-in out of the seeding', () => {
    const tipoNine = seeding(SEED_2026.matches, { competition: 'beer' }).find(
      (row) => row.teamId === 'tipo-nine',
    )

    // Tipo Nine won the play-in 10-7 and is still the sixth seed on six games:
    // the play-in decides a berth, never a seventh regular-season result.
    expect(tipoNine?.position).toBe(6)
    expect(tipoNine?.standing.played).toBe(6)
  })

  it('seeds the four women’s teams as the standings order them', () => {
    expect(
      seeding(SEED_2026.matches, { competition: 'wubl' }).map(
        (row) => row.teamId,
      ),
    ).toEqual([
      'wubl-sucucho',
      'wubl-birra-del-fuego',
      'wubl-tipo-nine',
      'wubl-zhockey',
    ])
  })

  it('has no seeds at all when nothing has been played', () => {
    expect(seeding([], { competition: 'beer' })).toEqual([])
  })

  it('seeds teams that have not played when they are named', () => {
    expect(
      seeding([], { competition: 'beer', teamIds: ['alfa', 'bravo'] }).map(
        (row) => [row.position, row.teamId, row.standing.played] as const,
      ),
    ).toEqual([
      [1, 'alfa', 0],
      [2, 'bravo', 0],
    ])
  })
})

describe('knockoutResult', () => {
  it('names the winner and the loser of a regulation match', () => {
    expect(
      knockoutResult(
        { home: 4, away: 2, resolution: 'regulation' },
        'alfa',
        'bravo',
      ),
    ).toEqual({ decided: true, winnerTeamId: 'alfa', loserTeamId: 'bravo' })
  })

  it('advances a shootout winner, because a shootout win is a win', () => {
    expect(
      knockoutResult(
        { home: 4, away: 5, resolution: 'shootout' },
        'alfa',
        'bravo',
      ),
    ).toEqual({ decided: true, winnerTeamId: 'bravo', loserTeamId: 'alfa' })
  })

  it('names nobody when a knockout ended level', () => {
    // The women's competition has a 4-4 on record (Mujeres Birra del Fuego v
    // Mujeres Tipo Nine, 28 June 2026), so a level bracket match is possible.
    const result = knockoutResult(
      { home: 4, away: 4, resolution: 'draw' },
      'alfa',
      'bravo',
    )

    expect(result).toEqual({ decided: false, because: 'ended-level' })
    expect(result.decided).toBe(false)
    expect('winnerTeamId' in result).toBe(false)
  })

  it('names nobody while a match has no score', () => {
    expect(knockoutResult(null, 'alfa', 'bravo')).toEqual({
      decided: false,
      because: 'not-played',
    })
  })

  it('names nobody when the sides are not known, even with a score', () => {
    expect(
      knockoutResult(
        { home: 10, away: 7, resolution: 'regulation' },
        null,
        null,
      ),
    ).toEqual({ decided: false, because: 'sides-unknown' })
  })

  it('reports a level match before it reports unknown sides', () => {
    expect(
      knockoutResult({ home: 3, away: 3, resolution: 'draw' }, null, null),
    ).toEqual({ decided: false, because: 'ended-level' })
  })

  it('refuses a contradictory record instead of picking someone', () => {
    expect(() =>
      knockoutResult(
        { home: 3, away: 3, resolution: 'regulation' },
        'alfa',
        'bravo',
      ),
    ).toThrow(/cannot end level/)
  })
})

describe('bracketShape', () => {
  it('recognises the 2026 brackets', () => {
    expect(bracketShape(SEED_2026.matches, { competition: 'beer' })).toBe(
      'six-team-with-playin',
    )
    expect(bracketShape(SEED_2026.matches, { competition: 'wubl' })).toBe(
      'four-team',
    )
  })

  it('recognises nothing it has no plan for', () => {
    expect(bracketShape([bracket('final')], { competition: 'beer' })).toBe(
      'unknown',
    )
    expect(
      bracketShape(
        [bracket('quarterfinal'), bracket('quarterfinal'), bracket('final')],
        { competition: 'beer' },
      ),
    ).toBe('unknown')
  })
})

describe('resolveBracket on the real 2026 season', () => {
  const beer = resolveBracket(SEED_2026.matches, { competition: 'beer' })
  const wubl = resolveBracket(SEED_2026.matches, { competition: 'wubl' })

  it('derives the play-in sides from the seeding and reads its winner', () => {
    const playin = matchAt(beer, 'playin')

    // Row 2026-029: 23:30 on 4 July, 10-7, and no teams on the row. The sides
    // are the sixth and the seventh seed.
    expect(playin.home.teamId).toBe('tipo-nine')
    expect(playin.away.teamId).toBe('zhockey')
    expect(playin.home.origin).toEqual({ kind: 'seed', position: 6 })
    expect(playin.result).toEqual({
      decided: true,
      winnerTeamId: 'tipo-nine',
      loserTeamId: 'zhockey',
    })
  })

  it('passes the sheet’s own words through without reading them', () => {
    const playin = matchAt(beer, 'playin')

    // The sheet's Ganador column on this row names Short Shift Soft Sticks, a
    // team that did not play it. The text is published as it stands and the
    // winner above comes from the goals and the seeding, not from this string.
    expect(playin.printed).toBe(playin.match.notes)
    expect(playin.printed).toContain('Short Shift Soft Sticks')
  })

  it('feeds the play-in winner into the quarterfinal that waits for it', () => {
    const first = matchAt(beer, 'quarterfinal', 0)
    const second = matchAt(beer, 'quarterfinal', 1)

    // Row 2026-030 prints "3er Lugar (hanta)" against "Ganador 6to 7to (t9)",
    // and row 2026-031 prints "4to Lugar (vitox)" against "5to Lugar (suc)".
    // Only the test reads those; the module derived the same four teams from the
    // seeding and the play-in result.
    expect([first.home.teamId, first.away.teamId]).toEqual([
      'rock-choppers',
      'tipo-nine',
    ])
    expect(first.away.origin).toEqual({
      kind: 'winner-of',
      of: { stage: 'playin', index: 0 },
    })
    expect(first.printed).toContain('3er Lugar (hanta)')
    expect(first.printed).toContain('Ganador 6to 7to (t9)')

    expect([second.home.teamId, second.away.teamId]).toEqual([
      'blanco',
      'sucucho',
    ])
    expect(second.printed).toContain('4to Lugar (vitox)')
    expect(second.printed).toContain('5to Lugar (suc)')

    // Neither has been played, so neither names a winner.
    expect(first.result).toEqual({ decided: false, because: 'not-played' })
    expect(second.result).toEqual({ decided: false, because: 'not-played' })
  })

  it('seats the first two seeds in the semifinals and nobody opposite them', () => {
    const first = matchAt(beer, 'semifinal', 0)
    const second = matchAt(beer, 'semifinal', 1)

    // Rows 2026-034 and 2026-035 print "Semifinal 1 (verde)" and "Semifinal 2
    // (azul)" against "Por determinar": verde is Birra del Fuego, azul is Short
    // Shift Soft Sticks, and which quarterfinal winner meets which of them is
    // not published anywhere, so it stays unpublished here.
    expect(first.home.teamId).toBe('birra-del-fuego')
    expect(second.home.teamId).toBe('short-shift-soft-sticks')

    for (const semifinal of [first, second]) {
      expect(semifinal.away.teamId).toBeNull()
      expect(semifinal.away.undecided).toBe('pairing-not-published')
      expect(semifinal.away.origin).toEqual({
        kind: 'unpublished-pairing',
        candidates: [
          { stage: 'quarterfinal', index: 0 },
          { stage: 'quarterfinal', index: 1 },
        ],
      })
      expect(semifinal.printed).toContain('Por determinar')
    }
  })

  it('leaves the finals, third place and fifth place waiting', () => {
    for (const stage of ['third-place', 'fifth-place', 'final'] as const) {
      const match = matchAt(beer, stage)

      expect([match.home.teamId, match.away.teamId]).toEqual([null, null])
      expect([match.home.undecided, match.away.undecided]).toEqual([
        'not-played',
        'not-played',
      ])
    }

    // Third place waits on the semifinals, fifth place on the quarterfinals:
    // the two beaten quarterfinalists are 5th and 6th, and the play-in loser is
    // 7th and plays no more.
    expect(matchAt(beer, 'third-place').home.origin).toEqual({
      kind: 'loser-of',
      of: { stage: 'semifinal', index: 0 },
    })
    expect(matchAt(beer, 'fifth-place').home.origin).toEqual({
      kind: 'loser-of',
      of: { stage: 'quarterfinal', index: 0 },
    })
    expect(matchAt(beer, 'final').home.origin).toEqual({
      kind: 'winner-of',
      of: { stage: 'semifinal', index: 0 },
    })
  })

  it('pairs the women’s semifinals 1 against 4 and 2 against 3', () => {
    const first = matchAt(wubl, 'semifinal', 0)
    const second = matchAt(wubl, 'semifinal', 1)

    // Rows 2026-032 and 2026-033 print "1o Lugar Mujeres (sucucho)" against
    // "4to Lugar Mujeres (z hockey)", and "2o Lugar Mujeres (bdf)" against
    // "3o Lugar Mujeres (t9)".
    expect([first.home.teamId, first.away.teamId]).toEqual([
      'wubl-sucucho',
      'wubl-zhockey',
    ])
    expect([second.home.teamId, second.away.teamId]).toEqual([
      'wubl-birra-del-fuego',
      'wubl-tipo-nine',
    ])
  })

  it('never carries a team without a reason, nor a gap without one', () => {
    for (const side of [...sidesOf(beer), ...sidesOf(wubl)]) {
      expect(side.teamId === null).toBe(side.undecided !== null)
    }
  })

  it('has no champion, no third place and no fifth place yet', () => {
    expect(bracketPlacings(beer)).toEqual({
      champion: null,
      runnerUp: null,
      thirdPlace: null,
      fifthPlace: null,
    })
    expect(champion(wubl)).toBeNull()
  })
})

describe('resolveBracket on a bracket 2026 cannot show yet', () => {
  it('fills a four-team bracket to its champion', () => {
    const rounds = resolveBracket(
      [
        ...FOUR_TEAM_SEASON,
        bracket('semifinal', {
          score: { home: 4, away: 2, resolution: 'regulation' },
        }),
        bracket('semifinal', {
          date: '2026-08-08',
          time: '22:30',
          score: { home: 3, away: 2, resolution: 'regulation' },
        }),
        bracket('third-place', {
          date: '2026-08-15',
          score: { home: 1, away: 3, resolution: 'regulation' },
        }),
        bracket('final', {
          date: '2026-08-15',
          time: '22:30',
          // A shootout final still crowns a champion.
          score: { home: 5, away: 4, resolution: 'shootout' },
        }),
      ],
      { competition: 'beer' },
    )

    // Semifinals: alfa beat delta, bravo beat charlie.
    expect(matchAt(rounds, 'final').home.teamId).toBe('alfa')
    expect(matchAt(rounds, 'final').away.teamId).toBe('bravo')
    expect(matchAt(rounds, 'third-place').home.teamId).toBe('delta')
    expect(matchAt(rounds, 'third-place').away.teamId).toBe('charlie')

    expect(bracketPlacings(rounds)).toEqual({
      champion: 'alfa',
      runnerUp: 'bravo',
      thirdPlace: 'charlie',
      fifthPlace: null,
    })
    expect(champion(rounds)).toBe('alfa')
  })

  it('crowns nobody while the final is unplayed, even with its sides known', () => {
    const rounds = resolveBracket(
      [
        ...FOUR_TEAM_SEASON,
        bracket('semifinal', {
          score: { home: 4, away: 2, resolution: 'regulation' },
        }),
        bracket('semifinal', {
          time: '22:30',
          score: { home: 3, away: 2, resolution: 'regulation' },
        }),
        bracket('final', { date: '2026-08-15' }),
      ],
      { competition: 'beer' },
    )

    expect([
      matchAt(rounds, 'final').home.teamId,
      matchAt(rounds, 'final').away.teamId,
    ]).toEqual(['alfa', 'bravo'])
    expect(champion(rounds)).toBeNull()
    expect(matchAt(rounds, 'final').result).toEqual({
      decided: false,
      because: 'not-played',
    })
  })

  it('advances nobody out of a semifinal that ended level', () => {
    const rounds = resolveBracket(
      [
        ...FOUR_TEAM_SEASON,
        bracket('semifinal', {
          score: { home: 4, away: 2, resolution: 'regulation' },
        }),
        bracket('semifinal', {
          time: '22:30',
          score: { home: 3, away: 3, resolution: 'draw' },
        }),
        bracket('third-place', { date: '2026-08-15' }),
        bracket('final', {
          date: '2026-08-15',
          time: '22:30',
          score: { home: 6, away: 1, resolution: 'regulation' },
        }),
      ],
      { competition: 'beer' },
    )

    expect(matchAt(rounds, 'semifinal', 1).result).toEqual({
      decided: false,
      because: 'ended-level',
    })

    // The final has a score, but only one side of it is known, so it crowns
    // nobody: half a final is not a final.
    const final = matchAt(rounds, 'final')
    expect(final.home.teamId).toBe('alfa')
    expect(final.away.teamId).toBeNull()
    expect(final.away.undecided).toBe('ended-level')
    expect(final.result).toEqual({ decided: false, because: 'sides-unknown' })
    expect(champion(rounds)).toBeNull()

    // Same on the other side of the draw: no loser either.
    expect(matchAt(rounds, 'third-place').away.undecided).toBe('ended-level')
  })

  it('says nothing at all about a bracket where nothing has been played', () => {
    const rounds = resolveBracket(
      [
        bracket('semifinal'),
        bracket('semifinal', { time: '22:30' }),
        bracket('third-place', { date: '2026-08-15' }),
        bracket('final', { date: '2026-08-15', time: '22:30' }),
      ],
      { competition: 'beer' },
    )

    // No results, so no standings, so no seeds; and the rounds that wait on
    // those semifinals wait on a match with no score.
    expect(matchAt(rounds, 'semifinal', 0).home.undecided).toBe(
      'seed-unavailable',
    )
    expect(matchAt(rounds, 'final').home.undecided).toBe('not-played')
    expect(sidesOf(rounds).every((side) => side.teamId === null)).toBe(true)
    expect(bracketPlacings(rounds)).toEqual({
      champion: null,
      runnerUp: null,
      thirdPlace: null,
      fifthPlace: null,
    })
  })

  it('runs a six-team bracket from the play-in to the fifth-place match', () => {
    const rounds = resolveBracket(
      [
        ...BEER_REGULAR,
        bracket('playin', {
          date: '2026-07-04',
          time: '23:30',
          score: { home: 10, away: 7, resolution: 'regulation' },
        }),
        bracket('quarterfinal', {
          score: { home: 2, away: 5, resolution: 'regulation' },
        }),
        bracket('quarterfinal', {
          score: { home: 6, away: 1, resolution: 'regulation' },
        }),
        bracket('semifinal', { time: '23:30' }),
        bracket('semifinal', { time: '23:30' }),
        bracket('fifth-place', { date: '2026-08-15', time: '21:30' }),
      ],
      { competition: 'beer' },
    )

    // Tipo Nine (6th) beat Zhockey (7th), then beat Rock Choppers (3rd); Blanco
    // (4th) beat Sucucho (5th). The two beaten quarterfinalists play for 5th.
    expect(matchAt(rounds, 'quarterfinal', 0).result).toEqual({
      decided: true,
      winnerTeamId: 'tipo-nine',
      loserTeamId: 'rock-choppers',
    })
    const fifth = matchAt(rounds, 'fifth-place')
    expect([fifth.home.teamId, fifth.away.teamId]).toEqual([
      'rock-choppers',
      'sucucho',
    ])

    // Both quarterfinals are decided and the semifinals still name only their
    // seeds: the source never said which winner meets which of them.
    for (const index of [0, 1]) {
      const semifinal = matchAt(rounds, 'semifinal', index)
      expect(semifinal.away.undecided).toBe('pairing-not-published')
    }
  })

  it('prefers a team recorded on the row to anything it could derive', () => {
    const rounds = resolveBracket(
      [
        ...FOUR_TEAM_SEASON,
        bracket('semifinal'),
        bracket('semifinal', { time: '22:30' }),
        bracket('final', {
          date: '2026-08-15',
          time: '22:30',
          // The back office filled the row in; the semifinals it should have
          // been derived from are still empty.
          homeTeamId: 'charlie',
          awayTeamId: 'delta',
          score: { home: 2, away: 3, resolution: 'regulation' },
        }),
      ],
      { competition: 'beer' },
    )

    const final = matchAt(rounds, 'final')
    expect(final.home.origin).toEqual({ kind: 'recorded' })
    expect([final.home.teamId, final.away.teamId]).toEqual(['charlie', 'delta'])
    expect(champion(rounds)).toBe('delta')
  })

  it('says nothing about a bracket shape it does not know', () => {
    const rounds = resolveBracket(
      [...FOUR_TEAM_SEASON, bracket('final', { date: '2026-08-15' })],
      { competition: 'beer' },
    )
    const final = matchAt(rounds, 'final')

    expect(final.home.origin).toEqual({ kind: 'unknown-structure' })
    expect(final.home.undecided).toBe('structure-not-known')
    expect(final.away.undecided).toBe('structure-not-known')
    expect(champion(rounds)).toBeNull()
  })

  it('keeps one competition’s bracket out of the other', () => {
    const rounds = resolveBracket(
      [
        ...FOUR_TEAM_SEASON,
        bracket('semifinal'),
        bracket('semifinal', { time: '22:30' }),
        bracket('final', {
          competition: 'wubl',
          date: '2026-08-15',
          homeTeamId: 'wubl-sucucho',
          awayTeamId: 'wubl-tipo-nine',
          score: { home: 3, away: 1, resolution: 'regulation' },
        }),
      ],
      { competition: 'beer' },
    )

    expect(rounds.map((round) => round.stage)).toEqual(['semifinal'])
    expect(champion(rounds)).toBeNull()
  })
})
