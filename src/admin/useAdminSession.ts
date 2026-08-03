/**
 * Who is signed in, and what the league lets them do.
 *
 * Two separate questions, and the second one is not answered by this file. The
 * role here decides what the panel *shows*; row level security decides what may
 * be *written*. A bug in this hook can hide a button from somebody entitled to
 * press it, which is a nuisance. It cannot let anybody write a row they are not
 * entitled to, which is the point.
 */

import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient, supabaseConfig } from '../data/supabase-client'

/** The three roles of the functional document, plus "signed in and none of them". */
export type AdminRole =
  'general_administrator' | 'sporting_management' | 'communications'

export type AdminStatus =
  /** Still asking Supabase. */
  | { state: 'loading' }
  /** No key in this build, so there is nothing to sign in to. */
  | { state: 'unconfigured' }
  | { state: 'signed-out' }
  /** Signed in with a Google account the league does not know. */
  | { state: 'not-an-admin'; email: string }
  | { state: 'ready'; email: string; role: AdminRole }

export interface AdminSession {
  status: AdminStatus
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  /** What went wrong on the last attempt, in the panel's own language. */
  error: string | null
}

function isRole(value: unknown): value is AdminRole {
  return (
    value === 'general_administrator' ||
    value === 'sporting_management' ||
    value === 'communications'
  )
}

/** Where Google sends the administrator back to. */
function redirectTo(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}admin/`
}

export function useAdminSession(): AdminSession {
  const [status, setStatus] = useState<AdminStatus>({ state: 'loading' })
  const [error, setError] = useState<string | null>(null)

  const readRole = useCallback(async (session: Session | null) => {
    const client = await getSupabaseClient()
    if (!client) {
      setStatus({ state: 'unconfigured' })
      return
    }
    if (!session) {
      setStatus({ state: 'signed-out' })
      return
    }

    const email = session.user.email ?? ''

    // The founding owner has no row in `admins` on purpose, so the role comes
    // from the database's own answer rather than from a table read.
    const { data, error: failed } = await client.rpc('my_admin_role')

    if (failed) {
      setError('No pudimos verificar tus permisos. Probá de nuevo.')
      setStatus({ state: 'not-an-admin', email })
      return
    }

    setStatus(
      isRole(data)
        ? { state: 'ready', email, role: data }
        : { state: 'not-an-admin', email },
    )
  }, [])

  useEffect(() => {
    let current = true

    void (async () => {
      if (!supabaseConfig()) {
        if (current) setStatus({ state: 'unconfigured' })
        return
      }

      const client = await getSupabaseClient()
      if (!client || !current) return

      const { data } = await client.auth.getSession()
      if (current) await readRole(data.session)

      const { data: subscription } = client.auth.onAuthStateChange(
        (_event, session) => {
          if (current) void readRole(session)
        },
      )

      return () => subscription.subscription.unsubscribe()
    })()

    return () => {
      current = false
    }
  }, [readRole])

  const signIn = useCallback(async () => {
    setError(null)
    const client = await getSupabaseClient()
    if (!client) {
      setError('Este build no tiene la conexión a Supabase configurada.')
      return
    }

    const { error: failed } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo() },
    })

    if (failed) {
      setError(
        'No pudimos abrir el ingreso con Google. Puede que todavía no esté configurado.',
      )
    }
  }, [])

  const signOut = useCallback(async () => {
    const client = await getSupabaseClient()
    await client?.auth.signOut()
    setStatus({ state: 'signed-out' })
  }, [])

  return { status, signIn, signOut, error }
}

/** What each role may write, mirroring the policies in the database. */
export const PERMISSIONS = {
  /** Teams, fixture, results and statistics. */
  sport: ['general_administrator', 'sporting_management'] as AdminRole[],
  /** Seasons, competitions and the administrator list. */
  league: ['general_administrator'] as AdminRole[],
  /** Sponsors and photographs. */
  content: ['general_administrator', 'communications'] as AdminRole[],
} as const

export function can(role: AdminRole, area: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[area].includes(role)
}
