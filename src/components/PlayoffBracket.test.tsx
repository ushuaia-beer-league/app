import { render, screen } from '@testing-library/react'
import { SEED_2026 } from '../data/seed-2026'
import { TEAMS_2026 } from '../data/teams-2026'
import type { Match } from '../data/types'
import { PlayoffBracket } from './PlayoffBracket'

/** The lookup the site passes in: a team id printed as the fixture names it. */
const teamName = (teamId: string) =>
  TEAMS_2026.find((team) => team.slug === teamId)?.shortName ?? teamId

function renderBracket(competition: 'beer' | 'wubl') {
  render(
    <PlayoffBracket
      matches={SEED_2026.matches}
      competition={competition}
      teamName={teamName}
    />,
  )
}

describe('PlayoffBracket', () => {
  it('names every round of the Beer League bracket in playing order', () => {
    renderBracket('beer')

    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual([
      'Repechaje',
      'Cuartos de final',
      'Semifinales',
      'Tercer puesto',
      'Quinto puesto',
      'Final',
    ])
  })

  it('starts the women at the semifinals, with no play-in and no quarterfinal', () => {
    renderBracket('wubl')

    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Semifinales', 'Tercer puesto', 'Final'])
    expect(screen.getByText('1o Lugar Mujeres (sucucho)')).toBeVisible()
    // Both women's semifinals start at 22:30, one per cabecera.
    expect(screen.getAllByText('8 ago · 22:30')).toHaveLength(2)
  })

  it('shows a slot with no team as the sheet printed it', () => {
    renderBracket('beer')

    expect(screen.getByText('3er Lugar (hanta)')).toBeVisible()
    expect(screen.getByText('Ganador 6to 7to (t9)')).toBeVisible()
    expect(screen.getByText('4to Lugar (vitox)')).toBeVisible()
    expect(screen.getByText('Semifinal 1 (verde)')).toBeVisible()
    expect(screen.getByText('Semifinal 2 (azul)')).toBeVisible()
    // The two semifinals and the third-place match all wait on "Por determinar".
    expect(screen.getAllByText('Por determinar')).toHaveLength(3)
  })

  it('says "Por definir" only where the sheet says nothing at all', () => {
    renderBracket('beer')

    const final = screen.getByText('Final — 1er Lugar').closest('li')
    expect(final).toHaveTextContent('Por definir')

    const fifthPlace = screen.getByText('Partido 5to Lugar').closest('li')
    expect(fifthPlace).toHaveTextContent('Por definir')

    // Nowhere else: every other open slot has wording of its own.
    expect(screen.getAllByText('Por definir')).toHaveLength(2)
  })

  it('dates and times each match, two at once where two rinks run at once', () => {
    renderBracket('beer')

    const playIn = screen.getByText('6to Lugar').closest('li')
    expect(playIn).toHaveTextContent('4 jul · 23:30')

    // The two quarterfinals start together, one per cabecera.
    expect(screen.getAllByText('8 ago · 21:30')).toHaveLength(2)
  })

  it('shows the play-in score and leaves its winner unnamed', () => {
    renderBracket('beer')

    const playIn = screen.getByText('6to Lugar').closest('li')
    expect(playIn).toHaveTextContent('10')
    expect(playIn).toHaveTextContent('7')

    // The sheet's Ganador column names Short Shift Soft Sticks on a row whose
    // sides are printed as positions, and the winner of the play-in is not
    // written into the quarterfinal it feeds. Neither guess reaches the screen.
    expect(screen.queryByText('Short Shift Soft Sticks')).toBeNull()
    expect(screen.queryByText('Tipo Nine')).toBeNull()
  })

  it('names both teams and marks a shootout once a match is recorded', () => {
    const played: Match = {
      id: 'test-final',
      competition: 'beer',
      stage: 'final',
      date: '2026-08-15',
      time: '22:30',
      venue: 'bahia',
      homeTeamId: 'birra-del-fuego',
      awayTeamId: 'short-shift-soft-sticks',
      score: { home: 5, away: 4, resolution: 'shootout' },
      notes: null,
    }

    render(
      <PlayoffBracket
        matches={[played]}
        competition="beer"
        teamName={teamName}
      />,
    )

    expect(screen.getByText('Birra del Fuego')).toBeVisible()
    expect(screen.getByText('Short Shift Soft Sticks')).toBeVisible()
    expect(screen.getByText('5')).toBeVisible()
    expect(screen.getByText('4')).toBeVisible()
    expect(screen.getByText('15 ago · 22:30')).toBeVisible()
    expect(screen.getByText('Penales')).toBeVisible()
  })

  it('calls a draw a draw', () => {
    const drawn: Match = {
      id: 'test-third-place',
      competition: 'wubl',
      stage: 'third-place',
      date: '2026-08-15',
      time: '20:30',
      venue: null,
      homeTeamId: 'wubl-tipo-nine',
      awayTeamId: 'wubl-zhockey',
      score: { home: 4, away: 4, resolution: 'draw' },
      notes: null,
    }

    render(
      <PlayoffBracket
        matches={[drawn]}
        competition="wubl"
        teamName={teamName}
      />,
    )

    expect(screen.getByText('Empate')).toBeVisible()
    expect(screen.getAllByText('4')).toHaveLength(2)
  })

  it('says so when a competition has no bracket yet', () => {
    render(
      <PlayoffBracket matches={[]} competition="beer" teamName={teamName} />,
    )

    expect(
      screen.getByText(
        'Todavía no hay llaves publicadas para esta competencia.',
      ),
    ).toBeVisible()
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
  })
})
