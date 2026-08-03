import { render, screen } from '@testing-library/react'
import { HistorySection } from './HistorySection'

describe('HistorySection', () => {
  it('tells the league story under its own title', () => {
    render(<HistorySection />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Historia de la UBL' }),
    ).toBeVisible()
    expect(screen.getByText('Sobre nosotros')).toBeVisible()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Cómo nació la UBL' }),
    ).toBeVisible()
  })

  it('quotes the organisation word for word', () => {
    render(<HistorySection />)

    expect(
      screen.getByText(/^Toda gran historia arranca más o menos igual/),
    ).toBeVisible()
    expect(
      screen.getByText(
        '"¿Y si armamos algo para competir... pero pasándola bien?"',
      ),
    ).toBeVisible()
    expect(
      screen.getByText(
        'Es competencia con otra energía: menos presión, más comunidad.',
      ),
    ).toBeVisible()
    expect(screen.getByText('Birra del Fuego')).toBeVisible()
    expect(
      screen.getByText(
        /^Fin del mundo\. Comienzo de todo\.\.\. tercer tiempo\./,
      ),
    ).toBeVisible()
  })

  it('lists the ten commandments in order', () => {
    render(<HistorySection />)

    const commandments = screen.getAllByRole('listitem')

    expect(commandments).toHaveLength(10)
    expect(commandments[0]).toHaveTextContent('Beberé en nombre del hockey.')
    expect(commandments[9]).toHaveTextContent(
      'Abandonaré la Ushuaia Beer League si insisto en romper los mandamientos.',
    )
  })

  it('closes with the league hashtags', () => {
    render(<HistorySection />)

    expect(
      screen.getByText(
        '#UBL #UshuaiaBeerLeague #BeerLeague #HockeyYComunidad #FinDelMundo #ShortShiftsLongStories',
      ),
    ).toBeVisible()
  })
})
