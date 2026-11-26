import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient, type LeagueClient } from '../data/supabase-client'
import { useLeagueSession } from './useLeagueSession'

vi.mock('../data/supabase-client')

describe('the shared Google session', () => {
  const unsubscribe = vi.fn()
  const getSession = vi.fn()
  const signInWithOAuth = vi.fn()
  const signOut = vi.fn()
  const onAuthStateChange =
    vi.fn<
      (
        callback: (event: AuthChangeEvent, session: Session | null) => void,
      ) => unknown
    >()

  beforeEach(() => {
    vi.resetAllMocks()
    window.history.replaceState(null, '', '/')
    vi.mocked(getSupabaseClient).mockResolvedValue({
      auth: { getSession, signInWithOAuth, signOut, onAuthStateChange },
    } as unknown as LeagueClient)
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    })
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    signInWithOAuth.mockResolvedValue({ error: null })
  })

  it('returns Google to the player route and unsubscribes on unmount', async () => {
    const { result, unmount } = renderHook(() => useLeagueSession('mi-cuenta'))
    await waitFor(() => expect(result.current.status.state).toBe('signed-out'))
    await act(() => result.current.signIn())

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}mi-cuenta/`,
      },
    })
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('retains a sign-out event even if an earlier session read resolves later', async () => {
    let finish: ((result: unknown) => void) | undefined
    getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { result } = renderHook(() => useLeagueSession('mi-cuenta'))
    await waitFor(() => expect(onAuthStateChange).toHaveBeenCalled())
    await act(async () => {
      onAuthStateChange.mock.calls[0]?.[0]('SIGNED_OUT', null)
      finish?.({
        data: { session: { user: { id: 'prior-user' } } },
        error: null,
      })
    })

    expect(result.current.status.state).toBe('signed-out')
  })

  it('keeps the authenticated session visible when sign-out fails', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'player' } } },
      error: null,
    })
    signOut.mockResolvedValue({ error: new Error('network failed') })
    const { result } = renderHook(() => useLeagueSession('mi-cuenta'))
    await waitFor(() => expect(result.current.status.state).toBe('signed-in'))
    await act(() => result.current.signOut())

    expect(result.current.status.state).toBe('signed-in')
    expect(result.current.error).toBe('sign-out')
  })
})
