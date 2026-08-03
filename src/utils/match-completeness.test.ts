import { SEED_2026 } from '../data/seed-2026'
import type { Match } from '../data/types'
import {
  goalsExceedScore,
  isMatchComplete,
  matchGaps,
  type MatchRecordCounts,
} from './match-completeness'

const played: Match = {
  id: 'test',
  competition: 'beer',
  stage: 'regular',
  date: '2026-05-23',
  time: '21:30',
  venue: 'bahia',
  homeTeamId: 'rock-choppers',
  awayTeamId: 'sucucho',
  score: { home: 9, away: 6, resolution: 'regulation' },
  notes: null,
}

const nothing: MatchRecordCounts = { players: 0, goals: 0, goalieLines: 0 }
const everything: MatchRecordCounts = { players: 18, goals: 15, goalieLines: 2 }

const kinds = (match: Match, counts: MatchRecordCounts) =>
  matchGaps(match, counts).map((gap) => gap.kind)

describe('matchGaps', () => {
  it('asks for the result before the scorers, because one hangs off the other', () => {
    expect(kinds({ ...played, score: null }, nothing)).toEqual(['score'])
  })

  it('asks for everything a played match with no sheet entered still needs', () => {
    expect(kinds(played, nothing)).toEqual(['players', 'goals', 'goalkeepers'])
  })

  it('counts the goals still missing against the score', () => {
    const gaps = matchGaps(played, { players: 18, goals: 11, goalieLines: 2 })

    expect(gaps).toHaveLength(1)
    expect(gaps[0]?.label).toBe('Faltan 4 de los 15 goles')
  })

  it('says how many goals there are in total when none have been entered', () => {
    const gaps = matchGaps(played, { players: 18, goals: 0, goalieLines: 2 })

    expect(gaps[0]?.label).toBe('Faltan los 15 goles')
  })

  it('spots one goalkeeper where there should be two', () => {
    expect(kinds(played, { players: 18, goals: 15, goalieLines: 1 })).toEqual([
      'goalkeepers',
    ])
  })

  it('finds nothing missing from a match that is fully entered', () => {
    expect(matchGaps(played, everything)).toEqual([])
    expect(isMatchComplete(played, everything)).toBe(true)
  })

  it('says an unassigned cabecera is missing, and that an operator can fix it', () => {
    const gaps = matchGaps({ ...played, venue: null }, everything)

    expect(gaps.map((gap) => [gap.kind, gap.needsTheLeague])).toEqual([
      ['venue', false],
    ])
  })

  it('marks the teams of a slot the sheet never filled as the league’s to answer', () => {
    // The real row: 23 May 2026, 21:30, Bahía, no teams at all.
    const empty = SEED_2026.matches.find(
      (match) =>
        match.stage === 'regular' &&
        match.homeTeamId === null &&
        match.awayTeamId === null,
    )
    if (!empty)
      throw new Error('The 2026 seed no longer holds the empty round-1 slot')

    const gaps = matchGaps(empty, nothing)

    expect(gaps[0]).toMatchObject({ kind: 'teams', needsTheLeague: true })
    // No score either, and nothing beyond it: there is nothing to ask an
    // operator about a match nobody can identify.
    expect(gaps.map((gap) => gap.kind)).toEqual(['teams', 'score'])
  })

  it('asks nothing about the sheet of a bracket match that has no sides yet', () => {
    const semifinal = SEED_2026.matches.find(
      (match) => match.stage === 'semifinal',
    )
    if (!semifinal) throw new Error('The 2026 seed no longer holds a semifinal')

    expect(kinds(semifinal, nothing)).toEqual(['teams', 'venue', 'score'])
  })

  it('counts a 0-0 as a result, so it asks for the sheet and not for a score', () => {
    const draw: Match = {
      ...played,
      competition: 'wubl',
      score: { home: 0, away: 0, resolution: 'draw' },
    }

    expect(kinds(draw, { players: 12, goals: 0, goalieLines: 2 })).toEqual([])
  })
})

describe('goalsExceedScore', () => {
  it('is a contradiction, not a gap', () => {
    const counts = { players: 18, goals: 16, goalieLines: 2 }

    expect(matchGaps(played, counts)).toEqual([])
    expect(goalsExceedScore(played, counts)).toBe(true)
    expect(isMatchComplete(played, counts)).toBe(false)
  })

  it('says nothing about a match with no score to contradict', () => {
    expect(goalsExceedScore({ ...played, score: null }, everything)).toBe(false)
  })
})

describe('the 2026 season as the panel would list it', () => {
  it('has 28 matches with a result and 12 still waiting for one', () => {
    const withResult = SEED_2026.matches.filter(
      (match) => !kinds(match, nothing).includes('score'),
    )

    expect(withResult).toHaveLength(28)
    expect(SEED_2026.matches.length - withResult.length).toBe(12)
  })

  it('needs the league, not an operator, for exactly the rows the sheet left nameless', () => {
    const needingTheLeague = SEED_2026.matches.filter((match) =>
      matchGaps(match, nothing).some((gap) => gap.needsTheLeague),
    )

    // The empty round-1 slot, the play-in printed by position, and the eleven
    // bracket rows whose sides are still positions: two quarterfinals, four
    // semifinals, two third-place matches, one fifth place and two finals.
    expect(needingTheLeague).toHaveLength(13)
  })
})
