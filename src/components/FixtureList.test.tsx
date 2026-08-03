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
    render(<FixtureList rounds={[ROUND_ONE]} teamName={teamName} />)

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Sábado, 23 de mayo de 2026',
      }),
    ).toBeVisible()
  })

  it('shows both cabeceras of the same time slot', () => {
    render(<FixtureList rounds={[ROUND_ONE]} teamName={teamName} />)

    expect(screen.getByText('Poli')).toBeVisible()
    expect(screen.getAllByText('Bahía')).toHaveLength(2)
    expect(screen.getByText('9 - 6')).toBeVisible()
  })

  it('names the way a match was decided when it was not decided in time', () => {
    render(<FixtureList rounds={[ROUND_ONE]} teamName={teamName} />)

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
      />,
    )

    expect(screen.getByText('Sin resultado')).toBeVisible()
    expect(screen.getAllByText('22:30')).toHaveLength(2)
    expect(screen.queryByText('0 - 0')).not.toBeInTheDocument()
  })

  it('prints what the sheet printed where a side is a position', () => {
    render(<FixtureList rounds={[BRACKET]} teamName={teamName} />)

    expect(screen.getByText('3er Lugar (hanta)')).toBeVisible()
    expect(screen.getByText('Ganador 6to 7to (t9)')).toBeVisible()
    expect(screen.getByText('Cabecera a definir')).toBeVisible()
  })

  it('leaves no side blank when the sheet named nobody', () => {
    render(<FixtureList rounds={[ROUND_ONE]} teamName={teamName} />)

    // Both sides of the 21:30 slot in the Bahía, which the sheet left empty.
    expect(screen.getAllByText('Sin registrar')).toHaveLength(2)
  })

  it('carries the record of what the sheet left out', () => {
    render(<FixtureList rounds={[ROUND_ONE]} teamName={teamName} />)

    expect(
      screen.getByText(/names no teams at all/, { exact: false }),
    ).toBeVisible()
    expect(screen.getByText('Nota sobre este partido:')).toBeVisible()
  })

  it('says so when the competition has no dates', () => {
    render(<FixtureList rounds={[]} teamName={teamName} />)

    expect(
      screen.getByText('Todavía no hay fechas cargadas para esta competencia.'),
    ).toBeVisible()
  })
})
