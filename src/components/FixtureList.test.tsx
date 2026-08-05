import { render, screen } from '@testing-library/react'
import type { Match } from '../data/types'
import type { FixtureRound } from '../utils/fixture'
import { FixtureList } from './FixtureList'

function match(fields: Partial<Match> & Pick<Match, 'id'>): Match {
  return {
    competition: 'beer',
    stage: 'regular',
    date: '2026-05-23',
    time: '21:30',
    venue: 'bahia',
    homeTeamId: null,
    awayTeamId: null,
    score: null,
    notes: null,
    ...fields,
  }
}

/**
 * Round 1 of the 2026 season, which is the awkward one: at 21:30 the sheet has a
 * match in the Poli and, in the Bahía, a slot with a time, a cabecera and no
 * teams at all.
 */
const ROUND_ONE: FixtureRound = {
  date: '2026-05-23',
  slots: [
    {
      time: '21:30',
      matches: [
        match({
          id: '2026-001',
          venue: 'bahia',
          notes:
            'The sheet gives this slot a time and a cabecera and names no teams at all. Published as the gap it is.',
        }),
        match({
          id: '2026-002',
          venue: 'poli',
          homeTeamId: 'rock-choppers',
          awayTeamId: 'sucucho',
          score: { home: 9, away: 6, resolution: 'regulation' },
        }),
      ],
    },
    {
      time: '22:30',
      matches: [
        match({
          id: '2026-003',
          time: '22:30',
          venue: 'bahia',
          homeTeamId: 'short-shift-soft-sticks',
          awayTeamId: 'blanco',
          score: { home: 5, away: 4, resolution: 'shootout' },
        }),
      ],
    },
  ],
}

/** A bracket round: a date, no cabecera, and sides printed as positions. */
const BRACKET: FixtureRound = {
  date: '2026-08-08',
  slots: [
    {
      time: '21:30',
      matches: [
        match({
          id: '2026-030',
          stage: 'quarterfinal',
          date: '2026-08-08',
          venue: null,
          notes:
            'Home side printed as "3er Lugar (hanta)". Away side printed as "Ganador 6to 7to (t9)".',
        }),
      ],
    },
  ],
}

const NAMES: Record<string, string> = {
  'rock-choppers': 'Rock Choppers',
  sucucho: 'Sucucho',
  'short-shift-soft-sticks': 'Short Shift Soft Sticks',
  blanco: 'Blanco',
}

const teamName = (teamId: string) => NAMES[teamId] ?? teamId

describe('FixtureList', () => {
  it('heads each date the way somebody would say it', () => {
    render(
      <FixtureList
        rounds={[ROUND_ONE]}
        teamName={teamName}
        today="2026-05-01"
      />,
    )

    expect(
      screen.getByRole('heading', {
        level: 4,
        name: 'Sábado, 23 de mayo de 2026',
      }),
    ).toBeVisible()
  })

  it('shows both cabeceras of the same time slot', () => {
    render(
      <FixtureList
        rounds={[ROUND_ONE]}
        teamName={teamName}
        today="2026-05-01"
      />,
    )

    expect(screen.getByText('Poli')).toBeVisible()
    expect(screen.getAllByText('Bahía')).toHaveLength(2)
    expect(screen.getByText('9 - 6')).toBeVisible()
  })

  it('names the way a match was decided when it was not decided in time', () => {
    render(
      <FixtureList
        rounds={[ROUND_ONE]}
        teamName={teamName}
        today="2026-05-01"
      />,
    )

    expect(screen.getByText('5 - 4')).toBeVisible()
    expect(screen.getByText('Penales')).toBeVisible()
  })

  it('shows the time of a match with no score, never a nil-nil', () => {
    render(
      <FixtureList
        rounds={[
          {
            date: '2026-08-15',
            slots: [
              {
                time: '22:30',
                matches: [
                  match({
                    id: '2026-040',
                    date: '2026-08-15',
                    time: '22:30',
                    venue: null,
                    homeTeamId: 'blanco',
                    awayTeamId: 'sucucho',
                  }),
                ],
              },
            ],
          },
        ]}
        teamName={teamName}
        today="2026-05-01"
      />,
    )

    expect(screen.getByText('Sin resultado')).toBeVisible()
    expect(screen.getAllByText('22:30')).toHaveLength(2)
    expect(screen.queryByText('0 - 0')).not.toBeInTheDocument()
  })

  it('prints what the sheet printed where a side is a position', () => {
    render(
      <FixtureList rounds={[BRACKET]} teamName={teamName} today="2026-05-01" />,
    )

    expect(screen.getByText('3er Lugar (hanta)')).toBeVisible()
    expect(screen.getByText('Ganador 6to 7to (t9)')).toBeVisible()
    expect(screen.getByText('Cabecera a definir')).toBeVisible()
  })

  it('leaves no side blank when the sheet named nobody', () => {
    render(
      <FixtureList
        rounds={[ROUND_ONE]}
        teamName={teamName}
        today="2026-05-01"
      />,
    )

    // Both sides of the 21:30 slot in the Bahía, which the sheet left empty.
    expect(screen.getAllByText('Sin registrar')).toHaveLength(2)
  })

  it('shows the gap in Spanish and keeps the importer’s English out of the page', () => {
    render(
      <FixtureList
        rounds={[ROUND_ONE]}
        teamName={teamName}
        today="2026-05-01"
      />,
    )

    // The slot the sheet left blank says so, twice, one side each.
    expect(screen.getAllByText('Sin registrar')).toHaveLength(2)

    // `Match.notes` explains that gap in English, for the panel and for an
    // audit. It never reaches a visitor of a Spanish page.
    expect(screen.queryByText(/names no teams at all/)).toBeNull()
    expect(screen.queryByText('Nota sobre este partido:')).toBeNull()
  })

  it('says so when the competition has no dates', () => {
    render(<FixtureList rounds={[]} teamName={teamName} today="2026-05-01" />)

    expect(
      screen.getByText('Todavía no hay fechas cargadas para esta competencia.'),
    ).toBeVisible()
  })
})

describe('FixtureList, split in two', () => {
  const roundOn = (date: string, time: string) => ({
    date,
    slots: [
      {
        time,
        matches: [
          match({
            id: `m-${date}`,
            date,
            time,
            venue: 'bahia' as const,
            homeTeamId: 'blanco',
            awayTeamId: 'sucucho',
          }),
        ],
      },
    ],
  })

  const SEASON = [
    roundOn('2026-05-23', '21:30'),
    roundOn('2026-07-04', '21:30'),
    roundOn('2026-08-08', '21:30'),
    roundOn('2026-08-15', '20:30'),
  ]

  const dateHeadings = () =>
    screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)

  it('leads with what is still to come, soonest first', () => {
    render(
      <FixtureList rounds={SEASON} teamName={teamName} today="2026-08-05" />,
    )

    expect(
      screen.getByRole('heading', { level: 3, name: 'Próximos partidos' }),
    ).toBeVisible()

    const headings = dateHeadings()

    // The two playoff dates come first and in calendar order; the played rounds
    // follow, and in the opposite order.
    expect(headings.slice(0, 2)).toEqual([
      'Sábado, 8 de agosto de 2026',
      'Sábado, 15 de agosto de 2026',
    ])
    expect(headings.slice(2)).toEqual([
      'Sábado, 4 de julio de 2026',
      'Sábado, 23 de mayo de 2026',
    ])
  })

  it('keeps what was played behind a disclosure that says how much there is', () => {
    render(
      <FixtureList rounds={SEASON} teamName={teamName} today="2026-08-05" />,
    )

    const summary = screen.getByText('Ver las 2 fechas ya jugadas')

    expect(summary).toBeVisible()
    // Closed, so somebody looking for the next match does not scroll a season.
    expect(summary.closest('details')).not.toHaveAttribute('open')
  })

  it('says it in the singular when one date was played', () => {
    render(
      <FixtureList
        rounds={[
          roundOn('2026-05-23', '21:30'),
          roundOn('2026-08-08', '21:30'),
        ]}
        teamName={teamName}
        today="2026-08-05"
      />,
    )

    expect(screen.getByText('Ver la fecha ya jugada')).toBeVisible()
  })

  it('says the season is over rather than showing an empty heading', () => {
    render(
      <FixtureList
        rounds={[roundOn('2026-05-23', '21:30')]}
        teamName={teamName}
        today="2026-08-20"
      />,
    )

    expect(screen.getByText(/No quedan partidos por jugar/)).toBeVisible()
    expect(screen.getByText('Ver la fecha ya jugada')).toBeVisible()
  })

  it('offers no disclosure at all when nothing has been played yet', () => {
    render(
      <FixtureList
        rounds={[roundOn('2026-08-08', '21:30')]}
        teamName={teamName}
        today="2026-08-05"
      />,
    )

    expect(screen.queryByText(/fechas? ya jugada/)).not.toBeInTheDocument()
  })
})
