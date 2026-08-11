import { render, screen } from '@testing-library/react'
import { SEED_2026 } from '../data/seed-2026'
import { TEAMS_2026 } from '../data/teams-2026'
import type { Match } from '../data/types'
import { PlayoffBracket } from './PlayoffBracket'

/**
 * The marks on the slots, and not the same words inside the legend that explains
 * them: the legend quotes the mark, so a plain text query finds both.
 */
const derivedMarks = () =>
  screen.getAllByText('por posición', {
    selector: 'span.playoff-bracket__derived',
  })

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
  it('names every round of the Beer League bracket, climbing to the final', () => {
    renderBracket('beer')

    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual([
      'Repechaje',
      'Cuartos de final',
      'Semifinales',
      // The three matches of 15 August are played at once, so the columns are
      // ordered towards the trophy rather than by kickoff: the league asked for
      // fifth, then third, then the final.
      'Quinto puesto',
      'Tercer puesto',
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

    // The sheet prints these sides as "1o Lugar Mujeres (sucucho)" and friends.
    // The site works out who that is from the women's own table and says it did.
    expect(screen.getByText(/Sucucho/)).toBeVisible()
    expect(screen.getByText(/Zhockey/)).toBeVisible()
    expect(derivedMarks()).toHaveLength(4)

    // Both women's semifinals start at 22:30, one per cabecera.
    expect(screen.getAllByText('8 ago · 22:30')).toHaveLength(2)
  })

  it('works out the sides the sheet prints as positions, and marks them as worked out', () => {
    renderBracket('beer')

    // "3er Lugar (hanta)" against "Ganador 6to 7to (t9)": the third seed against
    // the play-in winner, both derived from the table and from a played match.
    const quarterfinals = screen.getAllByText(/Rock Choppers|Tipo Nine/)
    expect(quarterfinals.length).toBeGreaterThan(0)

    // Six slots can be worked out: the two play-in sides, the four quarterfinal
    // sides minus none, and the two semifinal seeds. Each says so.
    expect(derivedMarks().length).toBeGreaterThanOrEqual(6)
    expect(screen.getByText(/lo deduce el sitio/)).toBeVisible()
  })

  it('shows a slot nothing can decide yet as the sheet printed it', () => {
    renderBracket('beer')

    // Everything on 15 August waits on a match nobody has played, so nothing
    // about it can be worked out and the sheet's own wording stands.
    expect(screen.getByText('Partido 3er Lugar')).toBeVisible()
    expect(screen.getByText('Partido 5to Lugar')).toBeVisible()
    expect(screen.getByText('Final — 1er Lugar')).toBeVisible()

    // The two semifinals wait on a pairing the sheet never published, and the
    // third-place match on a semifinal nobody has played.
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

    expect(screen.getByText('4 jul · 23:30')).toBeVisible()

    // The two quarterfinals start together, one per cabecera.
    expect(screen.getAllByText('8 ago · 21:30')).toHaveLength(2)
  })

  it('shows the play-in score, and never the winner the sheet gets wrong', () => {
    renderBracket('beer')

    const playIn = screen.getByText('4 jul · 23:30').closest('li')
    expect(playIn).toHaveTextContent('10')
    expect(playIn).toHaveTextContent('7')

    // Sixth against seventh, worked out from the table: Tipo Nine and Zhockey.
    expect(playIn).toHaveTextContent('Tipo Nine')
    expect(playIn).toHaveTextContent('Zhockey')

    // The sheet's own Ganador column names Short Shift Soft Sticks on this row,
    // a team that did not play it. That is a known error in the source and it
    // never reaches this row. The same team does appear elsewhere in the
    // bracket, legitimately, as the second seed waiting in a semifinal.
    expect(playIn).not.toHaveTextContent('Short Shift Soft Sticks')
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
