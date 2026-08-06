import { describe, expect, it } from 'vitest'

import {
  labelFor,
  summariseVisitFacts,
  summariseVisits,
  type ViewCount,
  type VisitFactCount,
} from './visitsSummary'

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

describe('summariseVisitFacts', () => {
  const fact = (
    fact: string,
    value: string,
    visits: number,
    day = '2026-08-06',
  ): VisitFactCount => ({ day, fact, value, visits })

  it('keeps first-time browsers and returns as two different numbers', () => {
    // They cannot be added. One counts browsers once each, the other counts
    // occasions, and a single "visitors" number would be neither.
    const summary = summariseVisitFacts([
      fact('visitor', 'new', 12),
      fact('visitor', 'returning', 4, '2026-08-05'),
      fact('visitor', 'returning', 7),
    ])

    expect(summary.firstTime).toBe(12)
    expect(summary.returns).toBe(11)
  })

  it('counts entries from the device split, because every entry answers that', () => {
    const summary = summariseVisitFacts([
      fact('device', 'phone', 30),
      fact('device', 'computer', 10),
      fact('referrer', 'direct', 40),
    ])

    expect(summary.entries).toBe(40)
    expect(summary.devices).toEqual([
      { value: 'phone', label: 'Teléfono', visits: 30, share: 75 },
      { value: 'computer', label: 'Computadora', visits: 10, share: 25 },
    ])
  })

  it('names the referrers in the words the league would use', () => {
    const summary = summariseVisitFacts([
      fact('device', 'phone', 10),
      fact('referrer', 'direct', 6),
      fact('referrer', 'social', 3),
      fact('referrer', 'search', 1),
    ])

    expect(summary.referrers.map((row) => row.label)).toEqual([
      'Directo o por WhatsApp',
      'Redes sociales',
      'Buscadores',
    ])
  })

  it('names the landing pages the way the rest of the panel does', () => {
    const summary = summariseVisitFacts([
      fact('device', 'phone', 5),
      fact('entry', '/', 4),
      fact('entry', 'admin/equipos', 1),
    ])

    expect(summary.landings).toEqual([
      { value: '/', label: 'Sitio público', visits: 4, share: 80 },
      {
        value: 'admin/equipos',
        label: 'Panel: equipos y planteles',
        visits: 1,
        share: 20,
      },
    ])
  })

  it('lets the landings add up to less than the entries', () => {
    // A path nobody can name is left uncounted rather than stored as junk, so this
    // is the expected shape and not a lost row.
    const summary = summariseVisitFacts([
      fact('device', 'phone', 10),
      fact('entry', '/', 8),
    ])

    expect(summary.entries).toBe(10)
    expect(summary.landings[0]?.visits).toBe(8)
  })

  it('answers zeroes rather than dividing by nothing', () => {
    expect(summariseVisitFacts([])).toEqual({
      firstTime: 0,
      returns: 0,
      entries: 0,
      devices: [],
      referrers: [],
      landings: [],
    })
  })

  it('shows a value nobody named instead of hiding it', () => {
    // Only the site writes here, so an unfamiliar value means the site changed and
    // this file did not.
    const summary = summariseVisitFacts([
      fact('device', 'phone', 1),
      fact('referrer', 'carrier-pigeon', 1),
    ])

    expect(summary.referrers[0]?.label).toBe('carrier-pigeon')
  })
})
