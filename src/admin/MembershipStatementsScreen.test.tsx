import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MembershipStatementsScreen } from './MembershipStatementsScreen'
import * as accounts from '../player/playerAccounts'
import * as statements from '../player/membershipQueries'

vi.mock('../player/playerAccounts', async (load) => ({
  ...(await load<typeof accounts>()),
  loadPlayerCatalog: vi.fn(),
  loadPlayerLinksForReview: vi.fn(),
}))
vi.mock('../player/membershipQueries')

describe('membership statement assignment', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(statements.loadMembershipStatements).mockResolvedValue([
      {
        id: 'statement',
        season_year: 2026,
        competition_key: 'beer',
        source_row: 2,
        source_name: 'Ana Pérez',
        payments_cents: [6_000_000],
        balance_cents: null,
        player_id: null,
        visible_to: null,
      },
    ])
    vi.mocked(accounts.loadPlayerCatalog).mockResolvedValue([
      {
        id: 'player',
        full_name: 'Pérez Ana',
        active: true,
        team_players: [],
      },
    ])
    vi.mocked(accounts.loadPlayerLinksForReview).mockResolvedValue({
      accounts: [
        {
          user_id: 'user',
          username: 'ana',
          full_name: 'Ana Pérez',
          player_id: 'player',
          player: null,
        },
      ],
      requests: [],
    })
  })

  it('keeps an unknown balance visible and requires explicit player access', async () => {
    render(
      <MemoryRouter>
        <MembershipStatementsScreen />
      </MemoryRouter>,
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Asignar ficha' }),
    )
    expect(screen.getByText(/Saldo pendiente · Sin confirmar/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Pérez Ana' }))

    const enable = screen.getByRole('checkbox', {
      name: 'Habilitar la consulta privada para @ana',
    })
    expect(enable).not.toBeChecked()
    fireEvent.click(enable)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar asignación' }))

    expect(statements.assignMembershipStatement).toHaveBeenCalledWith(
      'statement',
      'player',
      'user',
    )
    expect(
      await screen.findByText('La asignación quedó guardada.'),
    ).toBeVisible()
  })
})
