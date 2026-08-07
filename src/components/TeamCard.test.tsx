import { fireEvent, render, screen, within } from '@testing-library/react'
import type { TeamSeed } from '../data/teams-2026'
import type { TeamRoster } from './rosters'
import { TeamCard } from './TeamCard'

/** A Beer League team, with the sponsored name the roster sheet uses. */
const ROCK_CHOPPERS: TeamSeed = {
  slug: 'rock-choppers',
  competition: 'beer',
  shortName: 'Rock Choppers',
  fullName: 'Hantachoppers',
  nickname: 'hanta',
  aliases: [],
  mappingInferred: true,
}

/** A women's team, which has no sponsored name in any source. */
const WUBL_SUCUCHO: TeamSeed = {
  slug: 'wubl-sucucho',
  competition: 'wubl',
  shortName: 'Sucucho',
  fullName: null,
  nickname: 'sucucho',
  aliases: ['Frozen Queens'],
  mappingInferred: true,
}

/** The real Hantachoppers gap: 28 twice, in the sheet's order. */
const SHARED_28: TeamRoster = {
  lines: [
    {
      playerSlug: 'rodriguez-puma-luciano',
      name: 'Rodríguez Puma Luciano',
      jerseyNumber: 21,
      numberShared: false,
    },
    {
      playerSlug: 'contignola-flor',
      name: 'Contignola Flor',
      jerseyNumber: 28,
      numberShared: true,
    },
    {
      playerSlug: 'bergeonneau-mauri',
      name: 'Bergeonneau, Mauri',
      jerseyNumber: 28,
      numberShared: true,
    },
  ],
  sharedNumbers: [28],
}

/** The real Blanco gap: a player the sheet gives no number. */
const NO_NUMBER: TeamRoster = {
  lines: [
    {
      playerSlug: 'zayas-marcelo',
      name: 'Zayas Marcelo',
      jerseyNumber: 1,
      numberShared: false,
    },
    {
      playerSlug: 'coria-omar',
      name: 'Coria Omar',
      jerseyNumber: null,
      numberShared: false,
    },
  ],
  sharedNumbers: [],
}

/** One player, no number repeated and none missing: a roster with no notes. */
const ONE_LINE: TeamRoster = {
  lines: [
    {
      playerSlug: 'rodriguez-puma-luciano',
      name: 'Rodríguez Puma Luciano',
      jerseyNumber: 21,
      numberShared: false,
    },
  ],
  sharedNumbers: [],
}

const EMPTY: TeamRoster = { lines: [], sharedNumbers: [] }

/** A card is a list item, so it is rendered inside the list it belongs to. */
function renderCard(team: TeamSeed, roster: TeamRoster) {
  return render(
    <ul>
      <TeamCard team={team} roster={roster} />
    </ul>,
  )
}

describe('TeamCard', () => {
  it('heads the card with the name the fixture uses and the sponsored one under it', () => {
    renderCard(ROCK_CHOPPERS, SHARED_28)

    expect(
      screen.getByRole('heading', { level: 4, name: 'Rock Choppers' }),
    ).toBeVisible()
    expect(screen.getByText('Hantachoppers')).toBeVisible()
  })

  it('says nothing under the name when no source gives the team one', () => {
    renderCard(WUBL_SUCUCHO, EMPTY)

    expect(
      screen.getByRole('heading', { level: 4, name: 'Sucucho' }),
    ).toBeVisible()
    expect(screen.queryByText('Frozen Queens')).not.toBeInTheDocument()
  })

  it('counts the roster', () => {
    renderCard(ROCK_CHOPPERS, SHARED_28)

    expect(screen.getByText('3 jugadores en el plantel')).toBeVisible()
  })

  it('says one jugador in the singular', () => {
    renderCard(ROCK_CHOPPERS, ONE_LINE)

    expect(screen.getByText('1 jugador en el plantel')).toBeVisible()
  })

  it('lists the roster by number, with the name beside it', () => {
    renderCard(ROCK_CHOPPERS, SHARED_28)

    expect(
      within(screen.getByRole('list', { name: 'Plantel' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      '21Rodríguez Puma Luciano',
      '28Contignola Flor',
      '28Bergeonneau, Mauri',
    ])
  })

  it('shows both players who wear number 28 and says the number is repeated', () => {
    renderCard(ROCK_CHOPPERS, SHARED_28)

    // Neither line is dropped and neither number is changed.
    expect(screen.getAllByText('28')).toHaveLength(2)
    expect(screen.getByText('Contignola Flor')).toBeVisible()
    expect(screen.getByText('Bergeonneau, Mauri')).toBeVisible()

    // And the repetition is explained, so it does not read as a fault.
    expect(
      screen.getByText(
        'El número 28 aparece más de una vez en la planilla de la liga. Se publica tal cual está, sin confirmar.',
      ),
    ).toBeVisible()
  })

  it('names every repeated number when there is more than one', () => {
    renderCard(ROCK_CHOPPERS, { ...SHARED_28, sharedNumbers: [21, 28] })

    expect(screen.getByText(/Los números 21 y 28 aparecen/)).toBeVisible()
  })

  it('shows the player the sheet gives no number, and explains the mark', () => {
    renderCard(ROCK_CHOPPERS, NO_NUMBER)

    const roster = screen.getByRole('list', { name: 'Plantel' })
    expect(within(roster).getByText('S/N')).toBeVisible()
    expect(screen.getByText('Coria Omar')).toBeVisible()
    expect(
      screen.getByText(
        'S/N: la planilla de la liga no anota número para ese jugador.',
      ),
    ).toBeVisible()
  })

  it('leaves the notes out when the roster has neither gap', () => {
    renderCard(ROCK_CHOPPERS, ONE_LINE)

    expect(screen.queryByText(/aparece más de una vez/)).not.toBeInTheDocument()
    expect(screen.queryByText(/S\/N/)).not.toBeInTheDocument()
  })

  it('shows a team whose roster nobody published, and says so', () => {
    renderCard(WUBL_SUCUCHO, EMPTY)

    expect(
      screen.getByText(
        'El plantel de este equipo no está publicado en las planillas de la liga.',
      ),
    ).toBeVisible()
    // The team is still on the page: an unpublished roster is a gap in the
    // sources, not a reason to hide the team.
    expect(
      screen.getByRole('heading', { level: 4, name: 'Sucucho' }),
    ).toBeVisible()
    expect(
      screen.queryByText(/jugadores en el plantel/),
    ).not.toBeInTheDocument()
  })
})

describe('the player badges', () => {
  const TIPO_NINE: TeamSeed = {
    slug: 'tipo-nine',
    competition: 'beer',
    shortName: 'Tipo Nine',
    fullName: 'Almirante Beerizar',
    nickname: 't9',
    aliases: [],
    mappingInferred: true,
  }

  const roster = (names: string[]): TeamRoster => ({
    lines: names.map((name, i) => ({
      playerSlug: name.toLowerCase().replace(/ /g, '-'),
      name,
      jerseyNumber: i + 1,
      numberShared: false,
    })),
    sharedNumbers: [],
  })

  it('attaches the badge to the player who owns it, closed until asked', () => {
    render(
      <TeamCard
        team={TIPO_NINE}
        roster={roster(['Alarcon Gonza', 'Apellido Sinescudo'])}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Alarcon Gonza' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    // The player with no badge is plain text, not a control.
    expect(
      screen.queryByRole('button', { name: 'Apellido Sinescudo' }),
    ).not.toBeInTheDocument()

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows one badge at a time per card', () => {
    render(
      <TeamCard
        team={TIPO_NINE}
        roster={roster(['Alarcon Gonza', 'Diaz Ofelia'])}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Alarcon Gonza' }))
    fireEvent.click(screen.getByRole('button', { name: 'Diaz Ofelia' }))
    expect(
      screen.getByRole('button', { name: 'Alarcon Gonza' }),
    ).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Diaz Ofelia' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('shows no strip and no badges on a team that has none', () => {
    render(<TeamCard team={ROCK_CHOPPERS} roster={roster(['Alarcon Gonza'])} />)

    // Same name, other team: the badge belongs to Tipo Nine's Gonza only.
    expect(
      screen.queryByRole('button', { name: 'Alarcon Gonza' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Escudos que la liga hizo/),
    ).not.toBeInTheDocument()
  })
})
