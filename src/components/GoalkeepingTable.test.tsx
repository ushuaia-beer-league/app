import { render, screen, within } from '@testing-library/react'
import type { PublishedGoalkeepingRow } from '../utils/published-statistics'
import { GoalkeepingTable } from './GoalkeepingTable'

/** The season's best percentage among the keepers who played six games. */
const KEEPER: PublishedGoalkeepingRow = {
  name: 'Badaracco Nico',
  nameIsPrinted: false,
  team: 'Frozen Sucucho',
  isSubstitute: false,
  gamesPlayed: 5,
  shotsFaced: 173,
  goalsAgainst: 25,
  savePercentage: (173 - 25) / 173,
}

/** A keeper who faced nothing: no percentage exists, and none is invented. */
const UNTESTED: PublishedGoalkeepingRow = {
  name: 'Jofré Lautaro',
  nameIsPrinted: false,
  team: 'Suplente (Sucucho)',
  isSubstitute: true,
  gamesPlayed: 1,
  shotsFaced: 0,
  goalsAgainst: 0,
  savePercentage: null,
}

describe('GoalkeepingTable', () => {
  it('heads the columns the goalkeeper sheet heads, and calls a keeper a keeper', () => {
    render(
      <GoalkeepingTable
        rows={[KEEPER]}
        provenance="Totales publicados por la liga el 4 de julio de 2026."
      />,
    )

    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual([
      'Arquero',
      'Equipo',
      'PJ',
      'Tiros recibidos',
      'Goles recibidos',
      'PA',
    ])
  })

  it('prints the save percentage the league prints', () => {
    render(
      <GoalkeepingTable
        rows={[KEEPER]}
        provenance="Totales publicados por la liga el 4 de julio de 2026."
      />,
    )

    const row = screen.getByRole('row', { name: /Badaracco Nico/ })

    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['Frozen Sucucho', '5', '173', '25', '86%'])
  })

  it('gives a keeper who faced no shot a dash rather than a zero', () => {
    render(
      <GoalkeepingTable
        rows={[UNTESTED]}
        provenance="Totales publicados por la liga el 4 de julio de 2026."
      />,
    )

    expect(screen.getByText('—')).toBeVisible()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
    expect(screen.queryByText('100%')).not.toBeInTheDocument()
  })

  it('marks the substitute and explains the percentage', () => {
    render(
      <GoalkeepingTable
        rows={[UNTESTED]}
        provenance="Totales publicados por la liga el 4 de julio de 2026."
      />,
    )

    const row = screen.getByRole('row', { name: /Jofré Lautaro.*, suplente/ })

    expect(within(row).getByText('Sup')).toBeVisible()
    expect(
      screen.getByText(/Porcentaje de atajadas sobre los tiros recibidos/),
    ).toBeVisible()
  })

  it('says when the league published these totals', () => {
    render(
      <GoalkeepingTable
        rows={[KEEPER]}
        provenance="Totales publicados por la liga el 4 de julio de 2026."
      />,
    )

    expect(
      screen.getByText(/Totales publicados por la liga el 4 de julio de 2026/),
    ).toBeVisible()
  })

  it('says so when the competition has no published keepers', () => {
    render(
      <GoalkeepingTable
        rows={[]}
        provenance="Totales publicados por la liga el 4 de julio de 2026."
      />,
    )

    expect(
      screen.getByText(
        'Todavía no hay arqueros publicados en esta competencia.',
      ),
    ).toBeVisible()
  })
})
