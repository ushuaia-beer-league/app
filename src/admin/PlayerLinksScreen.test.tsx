import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as accounts from '../player/playerAccounts'
import { PlayerLinksScreen } from './PlayerLinksScreen'

vi.mock('../player/playerAccounts', async (load) => ({
  ...(await load<typeof accounts>()),
  loadPlayerCatalog: vi.fn(),
  loadPlayerLinksForReview: vi.fn(),
  reviewPlayerLink: vi.fn(),
}))

describe('player linking in the back office', () => {
  const candidate = {
    id: 'player',
    full_name: 'Pérez, Ana',
    active: true,
    team_players: [],
  }
  const account = {
    user_id: 'account',
    username: 'anaperez',
    full_name: 'Ana Pérez',
    player_id: null,
    player: null,
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(accounts.loadPlayerCatalog).mockResolvedValue([candidate])
    vi.mocked(accounts.loadPlayerLinksForReview).mockResolvedValue({
      accounts: [account],
      requests: [],
    })
  })

  it.each([
    ['Aprobar', 'approve'],
    ['Rechazar', 'reject'],
  ] as const)('records %s for the exact request', async (button, action) => {
    vi.mocked(accounts.loadPlayerLinksForReview).mockResolvedValueOnce({
      accounts: [account],
      requests: [
        {
          id: 'request',
          user_id: 'account',
          player_id: 'player',
          status: 'pending',
          player: candidate,
        },
      ],
    })
    render(
      <MemoryRouter>
        <PlayerLinksScreen />
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: button }))
    fireEvent.click(
      within(
        screen.getByRole('region', { name: 'Confirmar decisión' }),
      ).getByRole('button', { name: 'Confirmar' }),
    )

    expect(await screen.findByText('La decisión quedó guardada.')).toBeVisible()
    expect(accounts.reviewPlayerLink).toHaveBeenCalledWith(
      action,
      'account',
      'player',
      'request',
    )
  })

  it('links an account without a request and offers an explicit confirmation', async () => {
    render(
      <MemoryRouter>
        <PlayerLinksScreen />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Elegir ficha' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Pérez, Ana' }))

    expect(accounts.reviewPlayerLink).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('La decisión quedó guardada.')).toBeVisible()
    expect(accounts.reviewPlayerLink).toHaveBeenCalledWith(
      'link',
      'account',
      'player',
      undefined,
    )
  })

  it('reports a conflict if another account was linked first', async () => {
    vi.mocked(accounts.reviewPlayerLink).mockRejectedValue({ code: '23505' })
    render(
      <MemoryRouter>
        <PlayerLinksScreen />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Elegir ficha' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Pérez, Ana' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Otra cuenta ya tiene esta ficha.',
    )
    expect(screen.queryByText('La decisión quedó guardada.')).toBeNull()
  })
})
