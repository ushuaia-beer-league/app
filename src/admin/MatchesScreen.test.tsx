import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Match } from '../data/types'
import type { AdminMatch } from './adminQueries'
import { MatchesScreen } from './MatchesScreen'

const match = (overrides: Partial<Match> = {}): Match => ({
  id: 'seed-id',
  competition: 'beer',
  stage: 'regular',
  date: '2026-05-23',
  time: '21:30',
  venue: 'bahia',
  homeTeamId: 'rock-choppers',
  awayTeamId: 'sucucho',
  score: { home: 9, away: 6, resolution: 'regulation' },
  notes: null,
  ...overrides,
})

const entry = (
  id: string,
  overrides: Partial<Match> = {},
  counts: AdminMatch['counts'] = { players: 0, goals: 0, goalieLines: 0 },
): AdminMatch => ({ id, match: match(overrides), counts })

const names: Record<string, string> = {
  'rock-choppers': 'Rock Choppers',
  sucucho: 'Sucucho',
}

const show = (matches: AdminMatch[]) =>
  render(
    <MemoryRouter>
      <MatchesScreen matches={matches} teamName={(id) => names[id] ?? id} />
    </MemoryRouter>,
  )

const rowOrder = () =>
  screen.getAllByRole('listitem').map((item) => item.textContent ?? '')

describe('MatchesScreen', () => {
  it('says how many matches need something', () => {
    show([
      entry('a'),
      entry('b', {}, { players: 18, goals: 15, goalieLines: 2 }),
    ])

    expect(screen.getByText('1 de 2 partidos necesitan algo.')).toBeVisible()
  })

  it('says so plainly when nothing is missing', () => {
    show([entry('a', {}, { players: 18, goals: 15, goalieLines: 2 })])

    expect(screen.getByText('1 partidos, todos completos.')).toBeVisible()
    expect(screen.getByText('Completo')).toBeVisible()
  })

  it('names every gap of a played match with no sheet entered', () => {
    show([entry('a')])

    const row = screen.getByRole('listitem')
    expect(within(row).getByText('Falta quiénes jugaron')).toBeVisible()
    expect(within(row).getByText('Faltan los 15 goles')).toBeVisible()
    expect(within(row).getByText('Faltan los arqueros')).toBeVisible()
  })

  it('puts a contradiction first, then work an operator can do, then what the league owes', () => {
    show([
      // Complete.
      entry(
        'done',
        { date: '2026-05-23' },
        { players: 18, goals: 15, goalieLines: 2 },
      ),
      // Nobody can enter the teams of this one.
      entry('league', {
        date: '2026-05-24',
        homeTeamId: null,
        awayTeamId: null,
      }),
      // An operator can enter this sheet.
      entry('work', { date: '2026-05-25' }),
      // More goals than the result allows.
      entry(
        'wrong',
        { date: '2026-05-26' },
        { players: 18, goals: 16, goalieLines: 2 },
      ),
    ])

    const order = rowOrder()
    expect(order[0]).toContain('Hay más goles cargados')
    expect(order[1]).toContain('Falta quiénes jugaron')
    expect(order[2]).toContain('Sin equipos en la planilla')
    expect(order[3]).toContain('Completo')
  })

  it('shows the result when there is one and the time when there is not', () => {
    show([entry('a', { score: null })])

    expect(screen.getByText(/vs/)).toBeVisible()
    expect(screen.queryByText(/9 - 6/)).toBeNull()
  })

  it('links each match to its own sheet', () => {
    show([entry('a-uuid')])

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/admin/partidos/a-uuid',
    )
  })

  it('says the cabecera when there is one and stays quiet when there is not', () => {
    show([entry('a', { venue: null })])

    expect(screen.getByText(/Falta la cabecera/)).toBeVisible()
    expect(screen.queryByText(/Bahía/)).toBeNull()
  })

  it('says so when the season has no matches at all', () => {
    show([])

    expect(
      screen.getByText('Todavía no hay partidos cargados en esta temporada.'),
    ).toBeVisible()
  })
})
