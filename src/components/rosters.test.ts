import { SEED_2026 } from '../data/seed-2026'
import type { SeedPlayer, SeedRosterEntry } from '../data/seed'
import { teamRoster } from './rosters'
import { teamLogo } from './team-logos'

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

  it('answers with the women’s roster derived from the statistics', () => {
    const roster = teamRoster(SEED_2026, {
      slug: 'wubl-sucucho',
      competition: 'wubl',
    })

    // No sheet publishes this roster. It exists because every one of these women
    // has a published statistics line naming this team, which is thinner evidence
    // than a roster sheet and is still evidence.
    expect(roster.lines.length).toBeGreaterThan(0)
    expect(roster.lines.every((line) => line.jerseyNumber === null)).toBe(true)

    // No numbers means no number can be shared, however the count is written.
    expect(roster.sharedNumbers).toEqual([])
  })
})

describe('teamRoster across the 2026 slug rename', () => {
  it('finds the roster whichever spelling of the team arrives', () => {
    // On 2026-08-07 an operator renamed the four women's slugs in the database
    // to sponsor-based ones (wubl-brolas, wubl-drake, wubl-taun, wubl-vertice)
    // while the seed's rosters kept the original identity. The join broke and
    // all four rosters silently vanished from their cards. Both spellings must
    // resolve, in either position, forever.
    const source = {
      players: PLAYERS,
      rosters: [
        entry('zayas-marcelo', null, {
          teamSlug: 'wubl-birra-del-fuego',
          competition: 'wubl' as const,
        }),
      ],
    }

    const renamed = teamRoster(source, {
      slug: 'wubl-brolas',
      competition: 'wubl',
    })
    expect(renamed.lines).toHaveLength(1)

    const original = teamRoster(source, {
      slug: 'wubl-birra-del-fuego',
      competition: 'wubl',
    })
    expect(original.lines).toHaveLength(1)
  })

  it('keeps the crest reachable under both spellings too', () => {
    // The same rename also blanked the crests in the fixture until the logo map
    // learned the new keys. If somebody prunes the "duplicate" entries, this is
    // what fails instead of the women's fixture.
    for (const pair of [
      ['wubl-brolas', 'wubl-birra-del-fuego'],
      ['wubl-drake', 'wubl-sucucho'],
      ['wubl-taun', 'wubl-zhockey'],
      ['wubl-vertice', 'wubl-tipo-nine'],
    ]) {
      expect(teamLogo(pair[0])).not.toBeNull()
      expect(teamLogo(pair[0])).toBe(teamLogo(pair[1]))
    }
  })
})
