import { describe, expect, it } from 'vitest'

import {
  CONFIRMED_SPELLINGS,
  confirmedName,
  confirmedSpelling,
} from './confirmed-names'
import { matchKey } from './source-notation'

describe('confirmedSpelling', () => {
  it('answers null for a name the league never spoke about', () => {
    expect(confirmedSpelling('Beltrami Ramiro')).toBeNull()
  })

  it('ignores case, accents and punctuation on the way in', () => {
    expect(confirmedSpelling('CARBONE ANITA')).toBe('Carbone Ana')
    expect(confirmedSpelling('Muñoz Lauti')).toBe('Muñoz Lauta')
    expect(confirmedSpelling('muniz lauti')).toBeNull()
  })

  it('keeps the accent in the answer, because it is the person’s name', () => {
    expect(confirmedSpelling('munoz lauti')).toBe('Muñoz Lauta')
  })
})

describe('confirmedName', () => {
  it('returns the name unchanged when there is nothing to confirm', () => {
    expect(confirmedName('Beltrami Ramir')).toBe('Beltrami Ramir')
  })

  it('resolves each pair the league answered on 4 August 2026', () => {
    expect(confirmedName('velasquez lucia')).toBe('Velazquez Luciano')
    expect(confirmedName('Contignola Flor')).toBe('Cotignola Flor')
    expect(confirmedName('Tabarez Ian')).toBe('Tabares Ian')
    expect(confirmedName('Badaraco Nico')).toBe('Badaracco Nico')
    expect(confirmedName('Cavaliere Milag')).toBe('Cavalleri Milag')
    expect(confirmedName('Nardi Christina')).toBe('Nardi Cristina')
    expect(confirmedName('Muñoz Lauti')).toBe('Muñoz Lauta')
    expect(confirmedName('Carbone Anita')).toBe('Carbone Ana')
    expect(confirmedName('Sueldo Adolf')).toBe('Sueldo Fito')
  })

  it('leaves the confirmed spelling alone when it arrives already right', () => {
    for (const canonical of Object.values(CONFIRMED_SPELLINGS)) {
      expect(confirmedName(canonical)).toBe(canonical)
    }
  })
})

describe('the list itself', () => {
  it('is keyed the way it is looked up, or an entry would never be found', () => {
    for (const key of Object.keys(CONFIRMED_SPELLINGS)) {
      expect(matchKey(key)).toBe(key)
    }
  })

  it('never maps a name onto another name it also rewrites', () => {
    // A canonical spelling that is itself a key would make the answer depend on
    // how many times the function ran.
    for (const canonical of Object.values(CONFIRMED_SPELLINGS)) {
      expect(CONFIRMED_SPELLINGS[matchKey(canonical)]).toBeUndefined()
    }
  })

  it('holds one entry per person, so no two variants claim one name', () => {
    const keys = Object.keys(CONFIRMED_SPELLINGS)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
