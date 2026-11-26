import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '../data/supabase-client'

type SessionState =
  | { state: 'loading' | 'unconfigured' | 'signed-out' | 'failed' }
  | { state: 'signed-in'; session: Session }

export function useLeagueSession(destination: string) {
  const [status, setStatus] = useState<SessionState>({ state: 'loading' })
  const [error, setError] = useState<'sign-in' | 'sign-out' | null>(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    return fragment.has('error_code') || query.has('error_code')
      ? 'sign-in'
      : null
  })
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setStatus({ state: 'loading' })
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    let current = true
    let receivedEvent = false
    let unsubscribe: (() => void) | undefined

    const receive = (session: Session | null) => {
      if (current)
        setStatus(
          session ? { state: 'signed-in', session } : { state: 'signed-out' },
        )
    }

    void (async () => {
      try {
        const client = await getSupabaseClient()
        if (!current) return
        if (!client) {
          setStatus({ state: 'unconfigured' })
          return
        }
        const result = client.auth.onAuthStateChange((_event, session) => {
          receivedEvent = true
          receive(session)
        })
        unsubscribe = () => result.data.subscription.unsubscribe()
        const { data, error } = await client.auth.getSession()
        if (receivedEvent || !current) return
        if (error) setStatus({ state: 'failed' })
        else receive(data.session)
      } catch {
        if (current && !receivedEvent) setStatus({ state: 'failed' })
      }
    })()

    return () => {
      current = false
      unsubscribe?.()
    }
  }, [attempt])

  const signIn = useCallback(async () => {
    setError(null)
    try {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Supabase is not configured')
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}${destination}/`
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) setError('sign-in')
    } catch {
      setError('sign-in')
    }
  }, [destination])

  const signOut = useCallback(async () => {
    setError(null)
    try {
      const client = await getSupabaseClient()
      const result = await client?.auth.signOut()
      if (result?.error) setError('sign-out')
      else setStatus({ state: 'signed-out' })
    } catch {
      setError('sign-out')
    }
  }, [])

  return { status, error, retry, signIn, signOut }
}
