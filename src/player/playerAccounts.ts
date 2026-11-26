import type { Tables } from '../data/database.types'
import {
  PLAYER_ACCOUNT_LINK_SELECT,
  PLAYER_CATALOG_SELECT,
  PLAYER_REQUEST_SELECT,
} from '../data/queries'
import { getSupabaseClient } from '../data/supabase-client'

export function resultData<Data>(result: {
  data: Data
  error: { code: string } | null
}): Data {
  if (result.error) throw result.error
  return result.data
}

export async function playerClient() {
  const client = await getSupabaseClient()
  if (!client) throw new Error('Database connection is unavailable')
  return client
}

type Account = Tables<'player_accounts'>
type LinkRequest = Tables<'player_link_requests'>

export async function loadPlayerAccount(userId: string) {
  const client = await playerClient()
  const [account, request] = await Promise.all([
    client
      .from('player_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('player_link_requests')
      .select(PLAYER_REQUEST_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id')
      .limit(1)
      .maybeSingle(),
  ])
  return { account: resultData(account), request: resultData(request) }
}

export async function registerPlayer(
  userId: string,
  username: string,
  fullName: string,
) {
  const client = await playerClient()
  const account = resultData(
    await client
      .from('player_accounts')
      .insert({
        user_id: userId,
        username: username.trim().toLowerCase(),
        full_name: fullName.trim(),
      })
      .select('*')
      .single(),
  )
  if (account?.user_id !== userId) throw new Error('The session changed')
}

export async function requestPlayerLink(playerId: string) {
  const client = await playerClient()
  resultData(await client.rpc('request_player_link', { p_player_id: playerId }))
}

export async function loadPlayerCatalog() {
  const client = await playerClient()
  const pageSize = 500
  const page = (offset: number) =>
    client
      .from('players')
      .select(PLAYER_CATALOG_SELECT)
      .order('full_name')
      .order('id')
      .range(offset, offset + pageSize - 1)
  const catalog = []
  for (let offset = 0; ; offset += pageSize) {
    const rows = resultData(await page(offset)) ?? []
    catalog.push(...rows)
    if (rows.length < pageSize) return catalog
  }
}

export type PlayerCandidate = Awaited<
  ReturnType<typeof loadPlayerCatalog>
>[number]

export function playerContext(
  player: Pick<PlayerCandidate, 'team_players'>,
): string[] {
  return [
    ...new Set(
      player.team_players
        .map((row) =>
          [row.team?.short_name, row.competitions?.name, row.seasons?.year]
            .filter(Boolean)
            .join(' · '),
        )
        .filter(Boolean),
    ),
  ]
}

export async function loadPlayerLinksForReview() {
  const client = await playerClient()
  const [accounts, requests] = await Promise.all([
    client
      .from('player_accounts')
      .select(PLAYER_ACCOUNT_LINK_SELECT)
      .order('full_name')
      .order('user_id'),
    client
      .from('player_link_requests')
      .select(PLAYER_REQUEST_SELECT)
      .eq('status', 'pending')
      .order('created_at')
      .order('id'),
  ])
  return {
    accounts: resultData(accounts) ?? [],
    requests: resultData(requests) ?? [],
  }
}

export async function reviewPlayerLink(
  action: 'approve' | 'reject' | 'link' | 'unlink',
  userId: Account['user_id'],
  playerId: LinkRequest['player_id'],
  requestId?: LinkRequest['id'],
) {
  const client = await playerClient()
  resultData(
    await client.rpc('review_player_link', {
      p_action: action,
      p_user_id: userId,
      p_player_id: playerId,
      ...(requestId ? { p_request_id: requestId } : {}),
    }),
  )
}

export function playerErrorCode(error: unknown): string | null {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : null
}
