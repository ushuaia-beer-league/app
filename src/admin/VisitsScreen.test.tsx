import { render, screen } from '@testing-library/react'

import type { Result } from './adminQueries'
import { VisitsScreen } from './VisitsScreen'
import type { ViewCount, VisitFactCount } from './visitsSummary'

/**
 * The counters cannot be read from a test and must not be. Both loaders are fakes,
 * which is also the only way to exercise the half of this screen that matters:
 * what it says the numbers mean.
 */
const views = (rows: ViewCount[]) => (): Promise<Result<ViewCount[]>> =>
  Promise.resolve({ ok: true, data: rows })

const facts =
  (rows: VisitFactCount[]) => (): Promise<Result<VisitFactCount[]>> =>
    Promise.resolve({ ok: true, data: rows })

const fact = (
  factName: string,
  value: string,
  visits: number,
): VisitFactCount => ({ day: '2026-08-06', fact: factName, value, visits })

describe('VisitsScreen', () => {
  it('shows the three numbers and keeps them apart', async () => {
    render(
      <VisitsScreen
        load={views([{ path: '/', day: '2026-08-06', views: 40 }])}
        loadFacts={facts([
          fact('visitor', 'new', 12),
          fact('visitor', 'returning', 7),
          fact('device', 'phone', 30),
          fact('device', 'computer', 10),
        ])}
      />,
    )

    // Each number is checked inside its own card, because the three of them mean
    // different things and a loose search for a digit would not notice if two
    // cards swapped.
    const card = (label: string) => screen.getByText(label).closest('p')

    expect(
      await screen.findByText('navegadores entraron por primera vez'),
    ).toBeInTheDocument()
    expect(card('navegadores entraron por primera vez')).toHaveTextContent('12')
    expect(card('veces que alguien volvió otro día')).toHaveTextContent('7')
    expect(card('entradas al sitio')).toHaveTextContent('40')
  })

  it('warns against reading the returns as people', async () => {
    // The number invites the wrong reading, so the warning is part of the screen
    // rather than of the documentation nobody opens.
    render(
      <VisitsScreen
        load={views([])}
        loadFacts={facts([
          fact('device', 'phone', 5),
          fact('visitor', 'returning', 5),
        ])}
      />,
    )

    expect(
      await screen.findByText(/alguien que entra cinco días distintos suma/),
    ).toBeInTheDocument()
  })

  it('says where the returning visitor is recognised, because it is not here', async () => {
    // The privacy claim in one sentence: the date lives in the visitor's browser
    // and does not travel. If this ever stops being true, this test has to fail.
    render(<VisitsScreen load={views([])} loadFacts={facts([])} />)

    expect(
      await screen.findByText(/no viaja a ninguna parte/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/nada que se pueda atribuir a una persona/),
    ).toBeInTheDocument()
  })

  it('names the three breakdowns in Spanish', async () => {
    render(
      <VisitsScreen
        load={views([])}
        loadFacts={facts([
          fact('device', 'phone', 8),
          fact('referrer', 'direct', 6),
          fact('referrer', 'social', 2),
          fact('entry', '/', 8),
        ])}
      />,
    )

    expect(await screen.findByText('Desde qué aparato')).toBeInTheDocument()
    expect(screen.getByText('Por dónde llegaron')).toBeInTheDocument()
    expect(screen.getByText('En qué página entraron')).toBeInTheDocument()
    expect(screen.getByText('Directo o por WhatsApp')).toBeInTheDocument()
    expect(screen.getByText('Teléfono')).toBeInTheDocument()
  })

  it('says nothing about who instead of showing zeroes', async () => {
    // A site that nobody has opened yet, or the day this is deployed. Three cards
    // reading zero would look like a failure rather than like a beginning.
    render(<VisitsScreen load={views([])} loadFacts={facts([])} />)

    expect(
      await screen.findByText(/Todavía no hay ninguna visita/),
    ).toBeInTheDocument()
    expect(screen.queryByText('entradas al sitio')).not.toBeInTheDocument()
  })

  it('still shows the screens table when the visit counters cannot be read', async () => {
    // Two requests, and either half is worth showing on its own.
    render(
      <VisitsScreen
        load={views([{ path: 'admin/equipos', day: '2026-08-06', views: 3 }])}
        loadFacts={() =>
          Promise.resolve({ ok: false, because: 'permission denied' })
        }
      />,
    )

    expect(
      await screen.findByText('Panel: equipos y planteles'),
    ).toBeInTheDocument()
    expect(screen.queryByText('entradas al sitio')).not.toBeInTheDocument()
  })

  it('reports a failure to read the screens table as a failure', async () => {
    render(
      <VisitsScreen
        load={() => Promise.resolve({ ok: false, because: 'la base duerme' })}
        loadFacts={facts([])}
      />,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('la base duerme')
  })

  it('uses the singular when there is one of something', async () => {
    render(
      <VisitsScreen
        load={views([])}
        loadFacts={facts([
          fact('device', 'phone', 1),
          fact('visitor', 'new', 1),
          fact('visitor', 'returning', 1),
        ])}
      />,
    )

    expect(
      await screen.findByText('navegador entró por primera vez'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('vez que alguien volvió otro día'),
    ).toBeInTheDocument()
    expect(screen.getByText('entrada al sitio')).toBeInTheDocument()
  })
})
