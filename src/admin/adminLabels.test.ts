import { SEED_2026 } from '../data/seed-2026'
import { RESOLUTION_NAMES, STAGE_NAMES, VENUE_NAMES } from './adminLabels'

describe('the panel’s vocabulary', () => {
  it('names every stage the 2026 fixture actually uses', () => {
    const stages = new Set(SEED_2026.matches.map((match) => match.stage))

    for (const stage of stages) {
      expect(STAGE_NAMES[stage]).toBeTruthy()
    }
    expect(stages.size).toBeGreaterThan(1)
  })

  it('names every cabecera the fixture assigns', () => {
    const venues = new Set(
      SEED_2026.matches
        .map((match) => match.venue)
        .filter((venue) => venue !== null),
    )

    expect([...venues].map((venue) => VENUE_NAMES[venue]).sort()).toEqual([
      'Bahía',
      'Poli',
    ])
  })

  it('names the three ways a match ends, the draw included', () => {
    expect(RESOLUTION_NAMES).toEqual({
      regulation: 'En tiempo reglamentario',
      shootout: 'Definido por shootout',
      draw: 'Empate',
    })
  })

  it('says nothing about points, which only the standings decide', () => {
    const spelling = JSON.stringify(RESOLUTION_NAMES)

    expect(spelling).not.toContain('punto')
    expect(spelling).not.toMatch(/\d/)
  })
})
