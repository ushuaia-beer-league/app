import { SEED_2026 } from '../data/seed-2026'
import type { SeedPlayer, SeedRosterEntry } from '../data/seed'
import { teamRoster } from './rosters'

/**
 * Small lists for the ordering rules, and the 2026 seed for the two gaps that
 * matter. The gaps are checked against the real snapshot on purpose: a filter
 * that quietly dropped the second number 28 would still pass against invented
 * data.
 */
const PLAYERS: readonly SeedPlayer[] = [
  {
    slug: 'zayas-marcelo',
    name: 'Zayas Marcelo',
    printedName: 'zayas marcelo',
  },
  { slug: 'coria-omar', name: 'Coria Omar', printedName: 'coria omar' },
  { slug: 'veron-nico', name: 'Verón Nico', printedName: 'verón nico' },
]

const entry = (
  playerSlug: string,
  jerseyNumber: number | null,
  overrides: Partial<SeedRosterEntry> = {},
): SeedRosterEntry => ({
  playerSlug,
  teamSlug: 'blanco',
  competition: 'beer',
  jerseyNumber,
  ...overrides,
})

describe('teamRoster', () => {
  it('orders by jersey number and leaves the numberless last', () => {
    const roster = teamRoster(
      {
        players: PLAYERS,
        rosters: [
          entry('veron-nico', 9),
          entry('coria-omar', null),
          entry('zayas-marcelo', 1),
        ],
      },
      { slug: 'blanco', competition: 'beer' },
    )

    expect(roster.lines.map((line) => line.jerseyNumber)).toEqual([1, 9, null])
    expect(roster.lines.map((line) => line.name)).toEqual([
      'Zayas Marcelo',
      'Verón Nico',
      'Coria Omar',
    ])
  })

  it('never fills in a missing number', () => {
    const roster = teamRoster(
      { players: PLAYERS, rosters: [entry('coria-omar', null)] },
      { slug: 'blanco', competition: 'beer' },
    )

    expect(roster.lines).toEqual([
      {
        playerSlug: 'coria-omar',
        name: 'Coria Omar',
        jerseyNumber: null,
        numberShared: false,
      },
    ])
    expect(roster.sharedNumbers).toEqual([])
  })

  it('flags both players when a number is worn twice, and lists it once', () => {
    const roster = teamRoster(
      {
        players: PLAYERS,
        rosters: [
          entry('zayas-marcelo', 28),
          entry('veron-nico', 9),
          entry('coria-omar', 28),
        ],
      },
      { slug: 'blanco', competition: 'beer' },
    )

    expect(roster.lines.map((line) => [line.name, line.numberShared])).toEqual([
      // The sheet's order survives between the two 28s.
      ['Verón Nico', false],
      ['Zayas Marcelo', true],
      ['Coria Omar', true],
    ])
    expect(roster.sharedNumbers).toEqual([28])
  })

  it('takes only the rows of that team in that competition', () => {
    const roster = teamRoster(
      {
        players: PLAYERS,
        rosters: [
          entry('zayas-marcelo', 1),
          // The same person, the same team name, the other competition.
          entry('veron-nico', 9, { competition: 'wubl' }),
          entry('coria-omar', 7, { teamSlug: 'sucucho' }),
        ],
      },
      { slug: 'blanco', competition: 'beer' },
    )

    expect(roster.lines.map((line) => line.playerSlug)).toEqual([
      'zayas-marcelo',
    ])
  })

  it('shows the slug when no player answers for a roster row', () => {
    const roster = teamRoster(
      { players: [], rosters: [entry('zayas-marcelo', 1)] },
      { slug: 'blanco', competition: 'beer' },
    )

    expect(roster.lines.map((line) => line.name)).toEqual(['zayas-marcelo'])
  })

  it('keeps the two number 28 of Hantachoppers that the season really has', () => {
    const roster = teamRoster(SEED_2026, {
      slug: 'rock-choppers',
      competition: 'beer',
    })

    expect(roster.lines).toHaveLength(11)
    expect(roster.sharedNumbers).toEqual([28])
    // The first is the spelling the league confirmed, over the roster sheet's own
    // "Contignola"; the second is the sheet's, comma and all.
    expect(
      roster.lines
        .filter((line) => line.jerseyNumber === 28)
        .map((line) => line.name),
    ).toEqual(['Cotignola Flor', 'Bergeonneau, Mauri'])
  })

  it('keeps the Blanco player the sheet gives no number to', () => {
    const roster = teamRoster(SEED_2026, {
      slug: 'blanco',
      competition: 'beer',
    })

    // Last, because a player the sheet gives no number is still on the roster.
    expect(roster.lines.at(-1)).toEqual({
      playerSlug: 'coria-omar',
      name: 'Coria Omar',
      jerseyNumber: null,
      numberShared: false,
    })
  })

  it('answers with nothing for a women team, because nothing is published', () => {
    const roster = teamRoster(SEED_2026, {
      slug: 'wubl-sucucho',
      competition: 'wubl',
    })

    expect(roster.lines).toEqual([])
    expect(roster.sharedNumbers).toEqual([])
  })
})
