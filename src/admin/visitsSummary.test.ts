import { describe, expect, it } from 'vitest'

import { labelFor, summariseVisits, type ViewCount } from './visitsSummary'

const count = (path: string, day: string, views: number): ViewCount => ({
  path,
  day,
  views,
})

describe('labelFor', () => {
  it('names the screens the panel already has names for', () => {
    expect(labelFor('/')).toBe('Sitio público')
    expect(labelFor('admin/equipos')).toBe('Panel: equipos y planteles')
  })

  it('folds every match sheet into one name, not forty uuids', () => {
    expect(
      labelFor('admin/partidos/27a7aa65-7979-8b47-b70e-95e13d5aa331'),
    ).toBe('Panel: una planilla')
  })

  it('keeps a path nobody named rather than hiding it', () => {
    // Only the site itself can put a path in this table, so an unfamiliar one is
    // worth seeing.
    expect(labelFor('algo-nuevo')).toBe('algo-nuevo')
  })
})

describe('summariseVisits', () => {
  it('answers with nothing at all when nothing has been counted', () => {
    const summary = summariseVisits([])

    expect(summary.rows).toEqual([])
    expect(summary.total).toBe(0)
    expect(summary.latestDay).toBeNull()
    expect(summary.days).toBe(0)
  })

  it('adds a path up across days and orders by the total', () => {
    const summary = summariseVisits([
      count('/', '2026-08-04', 10),
      count('/', '2026-08-05', 5),
      count('admin', '2026-08-05', 7),
    ])

    expect(summary.rows.map((row) => [row.label, row.total])).toEqual([
      ['Sitio público', 15],
      ['Panel: partidos', 7],
    ])
    expect(summary.total).toBe(22)
    expect(summary.days).toBe(2)
  })

  it('counts today against the most recent day in the data, not the clock', () => {
    // The panel is read from a phone whose timezone nobody controls. Saying zero
    // because that phone has passed midnight would be a lie about the site.
    const summary = summariseVisits([
      count('/', '2026-08-04', 10),
      count('/', '2026-08-05', 3),
    ])

    expect(summary.latestDay).toBe('2026-08-05')
    expect(summary.rows[0]?.today).toBe(3)
  })

  it('folds the match sheets together and keeps the latest day among them', () => {
    const summary = summariseVisits([
      count('admin/partidos/aaa', '2026-08-04', 2),
      count('admin/partidos/bbb', '2026-08-05', 3),
    ])

    expect(summary.rows).toHaveLength(1)
    expect(summary.rows[0]).toMatchObject({
      label: 'Panel: una planilla',
      total: 5,
      today: 3,
      lastSeen: '2026-08-05',
    })
  })

  it('leaves a path that was created and never opened without a last day', () => {
    const summary = summariseVisits([count('admin/fotos', '2026-08-05', 0)])

    expect(summary.rows[0]).toMatchObject({ total: 0, lastSeen: null })
  })
})
