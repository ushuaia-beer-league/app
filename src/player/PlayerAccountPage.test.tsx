import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayerAccountPage } from './PlayerAccountPage'
import * as accounts from './playerAccounts'
import * as history from './playerHistory'
import { useLeagueSession } from '../hooks/useLeagueSession'

vi.mock('../hooks/useLeagueSession')
vi.mock('./playerAccounts', async (load) => ({
  ...(await load<typeof accounts>()),
  loadPlayerAccount: vi.fn(),
  registerPlayer: vi.fn(),
  loadPlayerCatalog: vi.fn(),
  requestPlayerLink: vi.fn(),
}))
vi.mock('./playerHistory')
vi.mock('./membershipQueries', () => ({
  loadOwnMembershipStatements: vi.fn().mockResolvedValue([]),
}))

const candidate = {
  id: 'player',
  full_name: 'Pérez, Ana',
  active: true,
  team_players: [],
}
const account = {
  user_id: 'account',
  player_id: null,
  username: 'anaperez',
  full_name: 'Ana Pérez',
  created_at: '2026-11-26T00:00:00Z',
}

function renderAccount() {
  return render(
    <MemoryRouter initialEntries={['/mi-cuenta']}>
      <PlayerAccountPage />
    </MemoryRouter>,
  )
}

describe('the player account', () => {
  const signIn = vi.fn()
  const signOut = vi.fn()
  const retry = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useLeagueSession).mockReturnValue({
      status: {
        state: 'signed-in',
        session: { user: { id: 'account' } },
      } as ReturnType<typeof useLeagueSession>['status'],
      signIn,
      signOut,
      retry,
      error: null,
    })
    vi.mocked(accounts.loadPlayerAccount).mockResolvedValue({
      account: null,
      request: null,
    })
    vi.mocked(accounts.loadPlayerCatalog).mockResolvedValue([candidate])
  })

  it('opens Google sign-in from the player page', () => {
    vi.mocked(useLeagueSession).mockReturnValue({
      status: { state: 'signed-out' },
      signIn,
      signOut,
      retry,
      error: null,
    })
    renderAccount()

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar con Google' }))

    expect(signIn).toHaveBeenCalledOnce()
    expect(useLeagueSession).toHaveBeenCalledWith('mi-cuenta')
  })

  it('registers, suggests the existing player and waits for approval', async () => {
    vi.mocked(accounts.loadPlayerAccount)
      .mockResolvedValueOnce({ account: null, request: null })
      .mockResolvedValueOnce({ account, request: null })
      .mockResolvedValue({
        account,
        request: {
          id: 'request',
          user_id: 'account',
          player_id: candidate.id,
          status: 'pending',
          player: candidate,
        },
      })
    renderAccount()

    fireEvent.change(await screen.findByLabelText('Nombre completo'), {
      target: { value: 'Ana Pérez' },
    })
    fireEvent.change(screen.getByLabelText('Nombre de usuario'), {
      target: { value: 'AnaPerez' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Pérez, Ana' }))
    fireEvent.click(screen.getByRole('button', { name: 'Esta ficha es mía' }))

    expect(accounts.registerPlayer).toHaveBeenCalledWith(
      'account',
      'anaperez',
      'Ana Pérez',
    )
    expect(accounts.requestPlayerLink).toHaveBeenCalledWith('player')
    expect(
      await screen.findByRole('heading', { name: 'Solicitud pendiente' }),
    ).toBeVisible()
    expect(history.loadPlayerHistory).not.toHaveBeenCalled()
  })

  it('lets an admin link a player who skipped claiming and shows the correct history', async () => {
    vi.mocked(accounts.loadPlayerAccount)
      .mockResolvedValueOnce({ account, request: null })
      .mockResolvedValue({
        account: { ...account, player_id: 'player' },
        request: null,
      })
    vi.mocked(history.loadPlayerSeasons).mockResolvedValue({
      player: { full_name: candidate.full_name, position: null, level: null },
      competitions: [
        { key: 'beer', name: 'Beer League' },
        { key: 'wubl', name: 'WUBL' },
      ],
      seasons: [
        { id: 'old', year: 2025, status: 'closed' },
        { id: 'season', year: 2026, status: 'active' },
      ],
    })
    vi.mocked(history.loadPlayerHistory).mockResolvedValue({
      rosters: [],
      goalEvents: [],
      goalieLines: [],
      games: [],
      upcoming: [],
      statistics: {
        scoring: { goals: 8, assists: 5, points: 13 },
        goalie: null,
      },
    })
    renderAccount()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Seguir sin vincular' }),
    )
    expect(accounts.requestPlayerLink).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar estado' }))

    expect(await screen.findByText('8')).toBeVisible()
    expect(history.loadPlayerHistory).toHaveBeenCalledWith(
      'player',
      'season',
      'beer',
    )
    fireEvent.change(screen.getByLabelText('Competencia'), {
      target: { value: 'wubl' },
    })
    await waitFor(() =>
      expect(history.loadPlayerHistory).toHaveBeenCalledWith(
        'player',
        'season',
        'wubl',
      ),
    )
  })

  it('keeps the registration form up when a username is already taken', async () => {
    vi.mocked(accounts.registerPlayer).mockRejectedValue({ code: '23505' })
    renderAccount()

    fireEvent.change(await screen.findByLabelText('Nombre completo'), {
      target: { value: 'Ana Pérez' },
    })
    fireEvent.change(screen.getByLabelText('Nombre de usuario'), {
      target: { value: 'anaperez' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ese nombre de usuario ya está en uso.',
    )
    expect(screen.getByLabelText('Nombre de usuario')).toHaveValue('anaperez')
  })

  it('can recover from a failed profile read', async () => {
    vi.mocked(accounts.loadPlayerAccount).mockRejectedValueOnce(
      new Error('offline'),
    )
    renderAccount()
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByRole('heading', { name: 'Creá tu cuenta' }),
    ).toBeVisible()
  })
})
