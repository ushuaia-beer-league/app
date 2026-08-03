import { fireEvent, render, screen, within } from '@testing-library/react'
import type { SeasonData } from '../data/season-source'
import { SEED_2026 } from '../data/seed-2026'
import { LeaguesSection } from './LeaguesSection'

/**
 * A season small enough to read: two Beer League teams with one result between
 * them, two women's teams with a draw, and one published line in each table.
 */
const SEASON: SeasonData = {
  source: 'supabase',
  fellBackBecause: null,
  season: 2026,
  publishedOn: '2026-07-04',
  sources: [],
  teams: [
    {
      slug: 'birra-del-fuego',
      competition: 'beer',
      shortName: 'Birra del Fuego',
      fullName: 'Green Seven Birra del fuego',
      nickname: 'verde',
      aliases: [],
      mappingInferred: true,
    },
    {
      slug: 'zhockey',
      competition: 'beer',
      shortName: 'Zhockey',
      fullName: 'Castores Zhockey',
      nickname: 'z hockey',
      aliases: [],
      mappingInferred: true,
    },
    {
      slug: 'wubl-birra-del-fuego',
      competition: 'wubl',
      shortName: 'Birra del Fuego',
      fullName: null,
      nickname: 'bdf',
      aliases: [],
      mappingInferred: true,
    },
    {
      slug: 'wubl-tipo-nine',
      competition: 'wubl',
      shortName: 'Tipo Nine',
      fullName: null,
      nickname: 't9',
      aliases: [],
      mappingInferred: true,
    },
  ],
  players: [],
  rosters: [],
  matches: [
    {
      id: 'beer-1',
      competition: 'beer',
      stage: 'regular',
      date: '2026-05-23',
      time: '22:30',
      venue: 'poli',
      homeTeamId: 'zhockey',
      awayTeamId: 'birra-del-fuego',
      score: { home: 6, away: 14, resolution: 'regulation' },
      notes: null,
    },
    {
      id: 'wubl-1',
      competition: 'wubl',
      stage: 'regular',
      date: '2026-06-28',
      time: '22:30',
      venue: 'bahia',
      homeTeamId: 'wubl-birra-del-fuego',
      awayTeamId: 'wubl-tipo-nine',
      score: { home: 4, away: 4, resolution: 'draw' },
      notes: null,
    },
  ],
  publishedPlayerStats: [
    {
      competition: 'beer',
      sourceFile: 'player-stats.html',
      printedPlayerName: 'Baeza Pedro',
      printedTeam: 'Green Seven Birra del fuego',
      playerSlug: 'baeza-pedro',
      teamSlug: 'birra-del-fuego',
      resolvedName: 'Baeza Pedro',
      assists: 6,
      goals: 17,
      points: 23,
    },
    {
      competition: 'wubl',
      sourceFile: 'wubl-player-stats.html',
      printedPlayerName: 'Seru Campos Victoria',
      printedTeam: 'Turbeerras',
      playerSlug: 'seru-campos-victoria',
      teamSlug: null,
      resolvedName: 'Seru Campos Victoria',
      assists: 3,
      goals: 5,
      points: 8,
    },
  ],
  publishedGoalieStats: [
    {
      competition: 'beer',
      sourceFile: 'goalie-stats.html',
      printedPlayerName: 'Bernales joaqu',
      printedTeam: 'Green Seven Birra del fuego',
      playerSlug: 'bernales-joaquin',
      teamSlug: 'birra-del-fuego',
      resolvedName: 'Bernales Joaquín',
      gamesPlayed: 6,
      shotsFaced: 151,
      goalsAgainst: 32,
    },
  ],
  calendarNotes: [],
  findings: [],
}

describe('LeaguesSection', () => {
  it('opens on the fixture of the Beer League', () => {
    render(<LeaguesSection season={SEASON} />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ligas & Estadísticas' }),
    ).toBeVisible()
    expect(screen.getByText('Temporada 2026')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Beer League' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Fixture' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('6 - 14')).toBeVisible()
  })

  it('names its five tables as tabs of one panel', () => {
    render(<LeaguesSection season={SEASON} />)

    const tabs = screen.getByRole('tablist', {
      name: 'Tablas de la competencia',
    })

    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Fixture', 'Posiciones', 'Goleadores', 'Arqueros', 'Playoffs'])

    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveAttribute(
      'aria-labelledby',
      screen.getByRole('tab', { name: 'Fixture' }).id,
    )
  })

  it('shows the standings the utilities computed, not any of its own', () => {
    render(<LeaguesSection season={SEASON} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Posiciones' }))

    const winner = screen.getByRole('row', { name: /Birra del Fuego/ })

    // Two points for the win, five more goals than it conceded: the league's own
    // scale, applied by `standings()`.
    expect(
      within(winner)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['1', '2', '1', '0', '0', '1', '14', '6', '+8'])
  })

  it('moves between tabs with the arrow keys', () => {
    render(<LeaguesSection season={SEASON} />)

    const fixture = screen.getByRole('tab', { name: 'Fixture' })
    fixture.focus()
    fireEvent.keyDown(fixture, { key: 'ArrowRight' })

    const standings = screen.getByRole('tab', { name: 'Posiciones' })
    expect(standings).toHaveAttribute('aria-selected', 'true')
    expect(standings).toHaveFocus()
    expect(fixture).toHaveAttribute('tabindex', '-1')

    fireEvent.keyDown(standings, { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Playoffs' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Playoffs' }), {
      key: 'ArrowRight',
    })
    expect(screen.getByRole('tab', { name: 'Fixture' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('shows the bracket under the same competition selector as the tables', () => {
    render(<LeaguesSection season={SEASON} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Playoffs' }))

    // One selector governs both, so a bracket can never show one competition
    // while the standings above it show the other.
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      screen.getByRole('tab', { name: 'Playoffs' }).id,
    )
  })

  it('switches every table when the competition changes', () => {
    render(<LeaguesSection season={SEASON} />)

    fireEvent.click(screen.getByRole('button', { name: "Women's Beer League" }))
    fireEvent.click(screen.getByRole('tab', { name: 'Posiciones' }))

    // The women's sheet counts draws where the Beer League sheet counts
    // shootout losses.
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toContain('empate')

    fireEvent.click(screen.getByRole('tab', { name: 'Goleadores' }))
    expect(screen.getByText('Seru Campos Victoria')).toBeVisible()
    expect(screen.queryByText('Baeza Pedro')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Arqueros' }))
    expect(
      screen.getByText(
        'Todavía no hay arqueros publicados en esta competencia.',
      ),
    ).toBeVisible()
  })

  it('says the published tables are the league own totals, with their date', () => {
    render(<LeaguesSection season={SEASON} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Goleadores' }))
    expect(
      screen.getByText(/Totales publicados por la liga el 4 de julio de 2026/),
    ).toBeVisible()

    fireEvent.click(screen.getByRole('tab', { name: 'Arqueros' }))
    expect(
      screen.getByText(/Totales publicados por la liga el 4 de julio de 2026/),
    ).toBeVisible()
    expect(screen.getByText('79%')).toBeVisible()
  })

  it('says when what it shows is the last saved copy of the season', () => {
    render(
      <LeaguesSection
        season={{
          ...SEASON,
          source: 'seed',
          fellBackBecause: 'the database holds no matches for this season',
        }}
      />,
    )

    expect(
      screen.getByText(
        'Estás viendo la última copia guardada de la temporada.',
      ),
    ).toBeVisible()
  })

  it('does not announce a snapshot when the database answered', () => {
    render(<LeaguesSection season={SEASON} />)

    expect(
      screen.queryByText(
        'Estás viendo la última copia guardada de la temporada.',
      ),
    ).not.toBeInTheDocument()
  })

  it('renders the versioned season the site falls back on', () => {
    render(
      <LeaguesSection
        season={{ ...SEED_2026, source: 'seed', fellBackBecause: null }}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Posiciones' }))

    // The published table of 4 July 2026: twelve points, six games, five of the
    // six wins outside a shootout.
    expect(
      within(screen.getByRole('row', { name: /Birra del Fuego/ }))
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['6', '12', '6', '0', '0', '5', '49', '32', '+17'])
  })
})
