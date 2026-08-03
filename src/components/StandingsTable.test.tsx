import { render, screen, within } from '@testing-library/react'
import type { StandingsRow } from '../data/types'
import { StandingsTable } from './StandingsTable'

/**
 * The 4 July 2026 table, as the league published it. Real rows on purpose: a
 * column swapped by accident is visible against the sheet and invisible against
 * numbers invented for a test.
 */
const LEADER: StandingsRow = {
  teamId: 'birra-del-fuego',
  played: 6,
  points: 12,
  wins: 6,
  regulationWins: 5,
  shootoutLosses: 0,
  draws: 0,
  losses: 0,
  goalsFor: 49,
  goalsAgainst: 32,
  goalDifference: 17,
}

const LAST: StandingsRow = {
  teamId: 'zhockey',
  played: 6,
  points: 2,
  wins: 1,
  regulationWins: 1,
  shootoutLosses: 0,
  draws: 0,
  losses: 5,
  goalsFor: 31,
  goalsAgainst: 51,
  goalDifference: -20,
}

/** The women's row that carries the season's only draw. */
const DREW: StandingsRow = {
  teamId: 'wubl-birra-del-fuego',
  played: 3,
  points: 3,
  wins: 1,
  regulationWins: 1,
  shootoutLosses: 0,
  draws: 1,
  losses: 1,
  goalsFor: 13,
  goalsAgainst: 13,
  goalDifference: 0,
}

const NAMES: Record<string, string> = {
  'birra-del-fuego': 'Birra del Fuego',
  zhockey: 'Zhockey',
  'wubl-birra-del-fuego': 'Birra del Fuego',
}

const teamName = (teamId: string) => NAMES[teamId] ?? teamId

describe('StandingsTable', () => {
  it('heads its columns the way the league heads them', () => {
    render(<StandingsTable rows={[LEADER]} teamName={teamName} />)

    const headers = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent)

    expect(headers).toEqual([
      'Equipo',
      'PJ',
      'PUNTOS',
      'PG',
      'PP',
      'PPSO',
      'PGR',
      'GA',
      'GE',
      'DIF',
    ])
  })

  it('puts every number the league published in its own column', () => {
    render(<StandingsTable rows={[LEADER]} teamName={teamName} />)

    const row = screen.getByRole('row', { name: /Birra del Fuego/ })

    expect(
      within(row).getByRole('rowheader', { name: 'Birra del Fuego' }),
    ).toBeVisible()
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['6', '12', '6', '0', '0', '5', '49', '32', '+17'])
  })

  it('signs a negative goal difference', () => {
    render(<StandingsTable rows={[LAST]} teamName={teamName} />)

    expect(screen.getByText('-20')).toBeVisible()
  })

  it('counts draws instead of shootout losses in the women competition', () => {
    render(
      <StandingsTable
        rows={[DREW]}
        teamName={teamName}
        onePointColumn="empate"
      />,
    )

    const headers = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent)

    expect(headers).toContain('empate')
    expect(headers).not.toContain('PPSO')
    expect(
      within(screen.getByRole('row', { name: /Birra del Fuego/ }))
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['3', '3', '1', '1', '1', '1', '13', '13', '0'])
  })

  it('explains the two columns nobody outside the league knows', () => {
    render(<StandingsTable rows={[LEADER]} teamName={teamName} />)

    expect(
      screen.getByText(/Partidos ganados fuera del shootout/),
    ).toBeVisible()
    expect(screen.getByText(/Partidos perdidos en el shootout/)).toBeVisible()
    expect(
      screen.getByText(/puntos, después PGR y después diferencia de gol/),
    ).toBeVisible()
  })

  it('says that the empate column belongs to the women sheet', () => {
    render(
      <StandingsTable
        rows={[DREW]}
        teamName={teamName}
        onePointColumn="empate"
      />,
    )

    expect(screen.getByText(/Partidos empatados/)).toBeVisible()
  })

  it('keeps the ten columns reachable on a phone', () => {
    render(<StandingsTable rows={[LEADER]} teamName={teamName} />)

    const scroller = screen.getByRole('region', {
      name: 'Tabla de posiciones',
    })

    expect(scroller).toContainElement(screen.getByRole('table'))
    expect(scroller).toHaveAttribute('tabindex', '0')
    expect(
      screen.getByText('Deslizá la tabla para ver todas las columnas.'),
    ).toBeVisible()
  })

  it('says so when nothing has been played yet', () => {
    render(<StandingsTable rows={[]} teamName={teamName} />)

    expect(
      screen.getByText('Todavía no hay partidos jugados en esta competencia.'),
    ).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
