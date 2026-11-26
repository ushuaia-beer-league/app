import { playerClient, resultData } from './playerAccounts'

export async function loadMembershipStatements() {
  const client = await playerClient()
  return (
    resultData(
      await client
        .from('membership_statements')
        .select('*')
        .order('season_year', { ascending: false })
        .order('competition_key')
        .order('source_name')
        .order('id'),
    ) ?? []
  )
}

export async function loadOwnMembershipStatements(userId: string) {
  const client = await playerClient()
  return (
    resultData(
      await client
        .from('membership_statements')
        .select('*')
        .eq('visible_to', userId)
        .order('season_year', { ascending: false })
        .order('competition_key'),
    ) ?? []
  )
}

export async function assignMembershipStatement(
  statementId: string,
  playerId: string | null,
  visibleTo: string | null,
) {
  const client = await playerClient()
  resultData(
    await client.rpc('assign_membership_statement', {
      p_statement_id: statementId,
      ...(playerId ? { p_player_id: playerId } : {}),
      ...(visibleTo ? { p_visible_to: visibleTo } : {}),
    }),
  )
}
