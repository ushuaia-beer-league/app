import { SEED_2026 } from '../data/seed-2026'
import {
  bracketRounds,
  fixtureRounds,
  splitFixtureByDate,
  type FixtureRound,
} from './fixture'

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

describe('splitFixtureByDate', () => {
  const round = (date: string): FixtureRound => ({ date, slots: [] })

  it('puts what is still to come first, soonest first', () => {
    const { upcoming } = splitFixtureByDate(
      [round('2026-08-15'), round('2026-08-08'), round('2026-05-23')],
      '2026-08-05',
    )

    expect(upcoming.map((r) => r.date)).toEqual(['2026-08-08', '2026-08-15'])
  })

  it('puts what has been played the other way round, most recent first', () => {
    const { past } = splitFixtureByDate(
      [round('2026-05-23'), round('2026-07-04'), round('2026-06-28')],
      '2026-08-05',
    )

    expect(past.map((r) => r.date)).toEqual([
      '2026-07-04',
      '2026-06-28',
      '2026-05-23',
    ])
  })

  it('keeps today among what is to come, all day', () => {
    // On a match day the question is what is on tonight. A round that moved into
    // the collapsed past at some hour of its own day would hide it.
    const { upcoming, past } = splitFixtureByDate(
      [round('2026-08-08')],
      '2026-08-08',
    )

    expect(upcoming.map((r) => r.date)).toEqual(['2026-08-08'])
    expect(past).toEqual([])
  })

  it('leaves a round nobody reported in the past rather than promoting it', () => {
    // The league's own sheet has a May row with no result. A fixture that offered
    // it as a coming attraction would be lying about the season.
    const { upcoming, past } = splitFixtureByDate(
      [round('2026-05-23')],
      '2026-08-05',
    )

    expect(upcoming).toEqual([])
    expect(past.map((r) => r.date)).toEqual(['2026-05-23'])
  })

  it('answers with two empty halves for an empty fixture', () => {
    expect(splitFixtureByDate([], '2026-08-05')).toEqual({
      upcoming: [],
      past: [],
    })
  })

  it('splits the real season the way the calendar does', () => {
    const rounds = fixtureRounds(SEED_2026.matches, { competition: 'beer' })
    const { upcoming, past } = splitFixtureByDate(rounds, '2026-08-05')

    // The regular season is over and the playoffs are not: both halves have
    // something in them, which is what makes this a useful check rather than a
    // restatement of the function.
    expect(upcoming.length).toBeGreaterThan(0)
    expect(past.length).toBeGreaterThan(0)
    expect(upcoming.length + past.length).toBe(rounds.length)

    // Every upcoming date is a playoff date, and every past one is not.
    expect(upcoming.map((r) => r.date)).toEqual(['2026-08-08', '2026-08-15'])
    expect(past[0]?.date).toBe('2026-07-04')
  })
})

describe('fixtureRounds for all competitions at once', () => {
  it('merges both into the calendar the league actually plays', () => {
    // 6 June 2026 is a shared night: two women's matches and two Beer League ones,
    // in the two cabeceras. Asking for one competition hides half of it.
    const beer = fixtureRounds(SEED_2026.matches, { competition: 'beer' })
    const wubl = fixtureRounds(SEED_2026.matches, { competition: 'wubl' })
    const all = fixtureRounds(SEED_2026.matches, { competition: 'all' })

    const shared = '2026-06-06'
    const matchesOn = (rounds: ReturnType<typeof fixtureRounds>) =>
      rounds
        .filter((round) => round.date === shared)
        .flatMap((round) => round.slots.flatMap((slot) => slot.matches)).length

    expect(matchesOn(beer)).toBe(2)
    expect(matchesOn(wubl)).toBe(4)
    expect(matchesOn(all)).toBe(6)
  })

  it('loses no match and invents none', () => {
    const beer = fixtureRounds(SEED_2026.matches, { competition: 'beer' })
    const wubl = fixtureRounds(SEED_2026.matches, { competition: 'wubl' })
    const all = fixtureRounds(SEED_2026.matches, { competition: 'all' })

    const count = (rounds: ReturnType<typeof fixtureRounds>) =>
      rounds.flatMap((round) => round.slots.flatMap((slot) => slot.matches))
        .length

    expect(count(all)).toBe(count(beer) + count(wubl))
    expect(count(all)).toBe(SEED_2026.matches.length)
  })

  it('keeps the dates in calendar order and the slots in time order', () => {
    const all = fixtureRounds(SEED_2026.matches, { competition: 'all' })

    expect(all.map((round) => round.date)).toEqual(
      [...all.map((round) => round.date)].sort(),
    )
    for (const round of all) {
      expect(round.slots.map((slot) => slot.time)).toEqual(
        [...round.slots.map((slot) => slot.time)].sort(),
      )
    }
  })

  it('orders a merged slot by cabecera, and by competition when that ties', () => {
    const all = fixtureRounds(SEED_2026.matches, { competition: 'all' })

    for (const round of all) {
      for (const slot of round.slots) {
        const keys = slot.matches.map(
          (match) => `${match.venue ?? 'zzz'}|${match.competition}`,
        )
        expect(keys).toEqual([...keys].sort())
      }
    }
  })
})
