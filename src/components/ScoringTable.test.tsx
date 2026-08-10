import { render, screen, within } from '@testing-library/react'
import type { PublishedScoringRow } from '../utils/published-statistics'
import { ScoringTable } from './ScoringTable'

/** The season's leading scorer, whose printed name the sheet truncated. */
const LEADER: PublishedScoringRow = {
  playerId: null,
  name: 'Beltrami Ramiro',
  nameIsPrinted: false,
  team: 'Beerizar Rompehielos T9',
  isSubstitute: false,
  assists: 6,
  goals: 23,
  points: 29,
}

/** A substitute: on the sheet, not on the roster. */
const SUBSTITUTE: PublishedScoringRow = {
  playerId: null,
  name: 'Fermín López Silva',
  nameIsPrinted: true,
  team: 'Blancaspuma y las 7 pintas (sup)',
  isSubstitute: true,
  assists: 2,
  goals: 4,
  points: 6,
}

/** A line the sheets never tied to a team. */
const WITHOUT_TEAM: PublishedScoringRow = {
  playerId: null,
  name: 'Dana Gonzales',
  nameIsPrinted: true,
  team: null,
  isSubstitute: false,
  assists: 0,
  goals: 1,
  points: 1,
}

describe('ScoringTable', () => {
  it('heads the five columns the league publishes', () => {
    render(
      <ScoringTable
        rows={[LEADER]}
        provenance="Totales publicados por la liga el 4 de julio de 2026."
      />,
    )

    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual(['Jugador', 'Equipo', 'A', 'G', 'PTS'])
  })

  it('puts assists, goals and points where the sheet puts them', () => {
    render(
      <ScoringTable
        rows={[LEADER]}
        provenance="Totales publicados por la liga el 4 de julio de 2026."
      />,
    )

    const row = screen.getByRole('row', { name: /Beltrami Ramiro/ })

    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['Beerizar Rompehielos T9', '6', '23', '29'])
  })

  it('says where its numbers came from, whatever the caller says that is', () => {
    // The same table renders the league's published totals and what the panel's
    // own sheets add up to, so the sentence is the caller's: saying "publicados
    // el 4 de julio" over last night's playoff goals would be false.
    render(
      <ScoringTable
        rows={[LEADER]}
        provenance="Calculado a partir de 3 planillas cargadas en el sitio."
      />,
    )

    expect(
      screen.getByText(
        'Calculado a partir de 3 planillas cargadas en el sitio.',
      ),
    ).toBeVisible()
    expect(
      screen.queryByText(/No se calculan a partir de los partidos cargados/),
    ).toBeNull()
  })

  it('marks a name nobody has confirmed, and explains the mark', () => {
    render(
      <ScoringTable
        rows={[SUBSTITUTE]}
        provenance="Totales publicados por la liga el 4 de julio de 2026."
      />,
    )

    expect(
      screen.getByRole('rowheader', {
        name: 'Fermín López Silva, nombre sin confirmar',
      }),
    ).toBeVisible()
    expect(screen.getByText('*', { selector: 'span' })).toBeVisible()
    expect(
      screen.getByText(/El nombre es el que imprime la planilla/),
    ).toBeVisible()
  })

  it('marks a substitute as one, and explains the mark', () => {
    render(
      <ScoringTable
        rows={[SUBSTITUTE]}
        provenance="Totales publicados por la liga el 4 de julio de 2026."
      />,
    )

    const row = screen.getByRole('row', { name: /suplente/ })

    expect(within(row).getByText('Sup')).toBeVisible()
    expect(screen.getByText(/sin integrar el plantel del equipo/)).toBeVisible()
  })

  it('leaves the team gap showing when the sheets never named one', () => {
    render(
      <ScoringTable
        rows={[WITHOUT_TEAM]}
        provenance="Totales publicados por la liga el 4 de julio de 2026."
      />,
    )

    expect(screen.getByText('Sin equipo')).toBeVisible()
  })

  it('says so when the competition has no published totals', () => {
    render(
      <ScoringTable
        rows={[]}
        provenance="Totales publicados por la liga el 4 de julio de 2026."
      />,
    )

    expect(
      screen.getByText(
        'Todavía no hay goleadores publicados en esta competencia.',
      ),
    ).toBeVisible()
  })
})
