import { render, screen, within } from '@testing-library/react'
import { SEED_2026 } from '../data/seed-2026'
import type { SeasonData } from '../data/season-source'
import { TeamsSection } from './TeamsSection'

/**
 * The 2026 season as the versioned snapshot holds it. The real rosters on
 * purpose: the two number 28 of Hantachoppers, the Blanco player with no number
 * and the four unpublished women's rosters are facts about this season, and a
 * component that tidied any of them away would still pass against invented data.
 *
 * The names below are unaccented because the roster sheet types them that way
 * and the seed keeps the sheet's spelling.
 */
const SEASON: SeasonData = {
  ...SEED_2026,
  source: 'seed',
  fellBackBecause: null,
}

const beerBlock = () =>
  within(screen.getByRole('region', { name: 'Beer League' }))

const wublBlock = () =>
  within(screen.getByRole('region', { name: "Women's Beer League" }))

/** The card a team heading belongs to. */
function cardOf(heading: HTMLElement): HTMLElement {
  const card = heading.closest('li')
  if (card === null) throw new Error('the heading is outside a team card')

  return card
}

const beerCard = (name: string) =>
  cardOf(beerBlock().getByRole('heading', { level: 4, name }))

const wublCard = (name: string) =>
  cardOf(wublBlock().getByRole('heading', { level: 4, name }))

describe('TeamsSection', () => {
  it('titles the section and dates it by the season', () => {
    render(<TeamsSection season={SEASON} />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Equipos' }),
    ).toBeVisible()
    expect(screen.getByText('Temporada 2026')).toBeVisible()
  })

  it('groups the teams by competition, seven and four', () => {
    render(<TeamsSection season={SEASON} />)

    expect(
      beerBlock()
        .getAllByRole('heading', { level: 4 })
        .map((heading) => heading.textContent),
    ).toEqual([
      'Birra del Fuego',
      'Short Shift Soft Sticks',
      'Rock Choppers',
      'Blanco',
      'Sucucho',
      'Tipo Nine',
      'Zhockey',
    ])

    expect(
      wublBlock()
        .getAllByRole('heading', { level: 4 })
        .map((heading) => heading.textContent),
    ).toEqual(['Sucucho', 'Birra del Fuego', 'Tipo Nine', 'Zhockey'])
  })

  it('puts the sponsored name under the name the fixture uses', () => {
    render(<TeamsSection season={SEASON} />)

    expect(
      within(beerCard('Rock Choppers')).getByText('Hantachoppers'),
    ).toBeVisible()
  })

  it('says once that the sponsored names are still unconfirmed', () => {
    render(<TeamsSection season={SEASON} />)

    // Once for the whole section rather than once per card: eleven copies of the
    // same caveat read as noise, and the doubt is about the mapping between two
    // sheets, not about any one team.
    expect(
      screen.getAllByText(/La liga todavía no confirmó ninguno/),
    ).toHaveLength(1)
  })

  it('drops the caveat when the league has confirmed the names', () => {
    render(
      <TeamsSection
        season={{
          ...SEASON,
          teams: SEASON.teams.map((team) => ({
            ...team,
            mappingInferred: false,
          })),
        }}
      />,
    )

    expect(
      screen.queryByText(/La liga todavía no confirmó ninguno/),
    ).not.toBeInTheDocument()
  })

  it('says there is no colour and no crest, and draws neither', () => {
    render(<TeamsSection season={SEASON} />)

    expect(
      screen.getByText(
        /Ninguna planilla registra el color ni el escudo de los equipos/,
      ),
    ).toBeVisible()
    // The crest frame is decorative while no asset exists, so there is no image
    // on the page and nothing for a screen reader to announce.
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('counts a roster and orders it by jersey number', () => {
    render(<TeamsSection season={SEASON} />)

    const card = beerCard('Birra del Fuego')

    expect(within(card).getByText('10 jugadores en el plantel')).toBeVisible()
    expect(
      within(within(card).getByRole('list', { name: 'Plantel' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      '20Guete Nadin',
      '21Gowland Guillermina',
      '23Molinolo Osvaldo',
      '24Avila Chori Leandro',
      '25Molinolo Santi',
      '26Aguado Barbara',
      '27Leuenberger Colo Federico',
      '28Baeza Pedro/Tincho',
      '29Quiroga Agustin',
      '30Bernales Joaquin',
    ])
  })

  it('shows both Hantachoppers players who wear number 28', () => {
    render(<TeamsSection season={SEASON} />)

    const card = beerCard('Rock Choppers')

    expect(within(card).getByText('11 jugadores en el plantel')).toBeVisible()
    expect(within(card).getAllByText('28')).toHaveLength(2)
    expect(within(card).getByText('Cotignola Flor')).toBeVisible()
    expect(within(card).getByText('Bergeonneau, Mauri')).toBeVisible()
    expect(
      within(card).getByText(/El número 28 aparece más de una vez/),
    ).toBeVisible()
  })

  it('shows the Blanco player the sheet gives no number, last', () => {
    render(<TeamsSection season={SEASON} />)

    const card = beerCard('Blanco')
    const lines = within(within(card).getByRole('list', { name: 'Plantel' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent)

    expect(lines[lines.length - 1]).toBe('S/NCoria Omar')
    expect(
      within(card).getByText(
        'S/N: la planilla de la liga no anota número para ese jugador.',
      ),
    ).toBeVisible()
  })

  it('shows the four women teams and says their rosters are unpublished', () => {
    render(<TeamsSection season={SEASON} />)

    const block = wublBlock()

    expect(
      block.getByText(
        /Ninguna planilla de la liga publica los planteles de la Women's Beer League/,
      ),
    ).toBeVisible()
    expect(
      block.getByText(/Cada equipo toma jugadoras de varios equipos/),
    ).toBeVisible()
    expect(
      block.getAllByText(
        'El plantel de este equipo no está publicado en las planillas de la liga.',
      ),
    ).toHaveLength(4)
    expect(block.queryAllByRole('list', { name: 'Plantel' })).toHaveLength(0)
  })

  it('says nothing of the kind about the Beer League, whose rosters exist', () => {
    render(<TeamsSection season={SEASON} />)

    expect(
      beerBlock().queryByText(/Ninguna planilla de la liga publica/),
    ).not.toBeInTheDocument()
  })

  it('reads the roster of the competition each team plays in', () => {
    render(<TeamsSection season={SEASON} />)

    // "Birra del Fuego" is a team in both competitions and only the Beer League
    // one has a published roster. Selecting by team alone would hand the Beer
    // League players to the women's team that shares its name.
    const women = wublCard('Birra del Fuego')

    expect(
      within(women).getByText(
        'El plantel de este equipo no está publicado en las planillas de la liga.',
      ),
    ).toBeVisible()
    expect(
      within(women).queryByText('Bernales Joaquin'),
    ).not.toBeInTheDocument()

    expect(
      within(beerCard('Birra del Fuego')).getByText('Bernales Joaquin'),
    ).toBeVisible()
  })

  it('says a competition has no teams rather than showing an empty grid', () => {
    render(<TeamsSection season={{ ...SEASON, teams: [] }} />)

    expect(
      screen.getAllByText(
        'Todavía no hay equipos cargados en esta competencia.',
      ),
    ).toHaveLength(2)
    // And no notice about unpublished rosters, because there is no team to have
    // one.
    expect(
      screen.queryByText(/Ninguna planilla de la liga publica/),
    ).not.toBeInTheDocument()
  })
})
