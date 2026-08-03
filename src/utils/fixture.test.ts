import { SEED_2026 } from '../data/seed-2026'
import { bracketRounds, fixtureRounds } from './fixture'

describe('fixtureRounds', () => {
  it('keeps both cabeceras inside one time slot', () => {
    const rounds = fixtureRounds(SEED_2026.matches, { competition: 'beer' })
    const roundOne = rounds.find((round) => round.date === '2026-05-23')

    expect(
      roundOne?.slots.map((slot) => [slot.time, slot.matches.length]),
    ).toEqual([
      ['21:30', 2],
      ['22:30', 2],
      ['23:30', 2],
    ])
  })

  it('puts Bahía before Poli, and an unassigned cabecera last', () => {
    const rounds = fixtureRounds(SEED_2026.matches, { competition: 'beer' })
    const slot = rounds
      .find((round) => round.date === '2026-05-23')
      ?.slots.find((candidate) => candidate.time === '21:30')

    expect(slot?.matches.map((match) => match.venue)).toEqual(['bahia', 'poli'])

    const playoffs = rounds.find((round) => round.date === '2026-08-08')
    expect(
      playoffs?.slots.every((candidate) => candidate.matches.length > 0),
    ).toBe(true)
  })

  it('orders the rounds by date', () => {
    const dates = fixtureRounds(SEED_2026.matches, { competition: 'beer' }).map(
      (round) => round.date,
    )

    expect(dates).toEqual([...dates].sort())
    expect(dates[0]).toBe('2026-05-23')
  })

  it('carries the playoff rounds, not only the regular season', () => {
    const dates = fixtureRounds(SEED_2026.matches, { competition: 'beer' }).map(
      (round) => round.date,
    )

    expect(dates).toContain('2026-08-08')
    expect(dates).toContain('2026-08-15')
  })

  it('never lets one competition reach the other fixture', () => {
    const beer = fixtureRounds(SEED_2026.matches, { competition: 'beer' })
    const wubl = fixtureRounds(SEED_2026.matches, { competition: 'wubl' })

    for (const round of beer) {
      for (const slot of round.slots) {
        for (const match of slot.matches) expect(match.competition).toBe('beer')
      }
    }
    // The women started in round 3, so their fixture is shorter and starts later.
    expect(wubl[0]?.date).toBe('2026-06-06')
  })
})

describe('bracketRounds', () => {
  it('lists the rounds in playing order and skips what a competition has not got', () => {
    expect(
      bracketRounds(SEED_2026.matches, { competition: 'beer' }).map(
        (round) => round.stage,
      ),
    ).toEqual([
      'playin',
      'quarterfinal',
      'semifinal',
      'third-place',
      'fifth-place',
      'final',
    ])

    // The women's four teams go straight to semifinals: no play-in, no
    // quarterfinal, no fifth-place match.
    expect(
      bracketRounds(SEED_2026.matches, { competition: 'wubl' }).map(
        (round) => round.stage,
      ),
    ).toEqual(['semifinal', 'third-place', 'final'])
  })

  it('keeps a bracket row that names no teams, with what the sheet printed', () => {
    const semifinals = bracketRounds(SEED_2026.matches, {
      competition: 'beer',
    }).find((round) => round.stage === 'semifinal')

    expect(semifinals?.matches).toHaveLength(2)
    for (const match of semifinals?.matches ?? []) {
      expect(match.homeTeamId).toBeNull()
      expect(match.notes).toContain('Semifinal')
    }
  })
})
