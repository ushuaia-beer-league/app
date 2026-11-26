/**
 * Who is signed in, and what the league lets them do.
 *
 * Two separate questions, and the second one is not answered by this file. The
 * role here decides what the panel *shows*; row level security decides what may
 * be *written*. A bug in this hook can hide a button from somebody entitled to
 * press it, which is a nuisance. It cannot let anybody write a row they are not
 * entitled to, which is the point.
 */

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../data/supabase-client'
import { useLeagueSession } from '../hooks/useLeagueSession'

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

export function useAdminSession(): AdminSession {
  const auth = useLeagueSession('admin')
  const session = auth.status.state === 'signed-in' ? auth.status.session : null
  const userId = session?.user.id
  const email = session?.user.email ?? ''
  const [checked, setChecked] = useState<{
    userId: string
    email: string
    role: AdminRole | null
    failed: boolean
  } | null>(null)

  useEffect(() => {
    if (!userId) return
    let current = true

    // Role checks run after the auth event. A response for an earlier session
    // cannot restore that session's permissions after sign-out.
    void (async () => {
      try {
        const client = await getSupabaseClient()
        if (!client) throw new Error('Supabase is not configured')
        const { data, error } = await client.rpc('my_admin_role')
        if (current)
          setChecked({
            userId,
            email,
            role: isRole(data) ? data : null,
            failed: error !== null,
          })
      } catch {
        if (current) setChecked({ userId, email, role: null, failed: true })
      }
    })()
    return () => {
      current = false
    }
  }, [userId, email, session?.access_token])

  let status: AdminStatus
  let error: string | null = null
  if (auth.error === 'sign-in')
    error = 'No pudimos abrir el ingreso con Google. Probá de nuevo.'
  if (auth.error === 'sign-out')
    error = 'No pudimos cerrar la sesión. Probá de nuevo.'

  if (auth.status.state === 'failed') {
    status = { state: 'signed-out' }
    error = 'No pudimos verificar tu sesión. Probá de nuevo.'
  } else if (auth.status.state !== 'signed-in') {
    status = { state: auth.status.state }
  } else if (checked?.userId !== userId || checked?.email !== email) {
    status = { state: 'loading' }
  } else {
    status =
      checked?.role && !checked.failed
        ? { state: 'ready', email, role: checked.role }
        : { state: 'not-an-admin', email }
    if (checked?.failed)
      error = 'No pudimos verificar tus permisos. Probá de nuevo.'
  }

  return { status, error, signIn: auth.signIn, signOut: auth.signOut }
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
