import { describe, expect, it } from 'vitest'
import { findPlayerNames } from './playerNames'

describe('player suggestions', () => {
  const names = [
    { id: 'beer', full_name: 'Pérez, Ana' },
    { id: 'wubl', full_name: 'Ana Pérez' },
    { id: 'nickname', full_name: 'Pérez, Ana (Anita)' },
    { id: 'other', full_name: 'Anabella Pereda' },
  ]

  it('lists every homonym and allows accents, abbreviations and reordered names', () => {
    expect(findPlayerNames(names, '  ana  pereZ ').map(({ id }) => id)).toEqual(
      ['beer', 'wubl', 'nickname'],
    )
  })

  it('allows a partial surname and rejects empty or punctuation-only queries', () => {
    expect(findPlayerNames(names, 'peré')).toHaveLength(4)
    expect(findPlayerNames(names, '  , -')).toEqual([])
  })
})
