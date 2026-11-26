function words(name: string): string[] {
  return (
    name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  )
}

/** Keep homonyms as distinct records. A suggestion can never establish identity. */
export function findPlayerNames<Player extends { full_name: string }>(
  players: readonly Player[],
  query: string,
): Player[] {
  const wanted = words(query)
  if (wanted.join('').length < 2) return []

  return players.filter((player) => {
    const candidate = words(player.full_name)
    return wanted.every((part) =>
      candidate.some((word) => word.startsWith(part)),
    )
  })
}
