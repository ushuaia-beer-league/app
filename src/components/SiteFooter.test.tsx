import { render, screen } from '@testing-library/react'
import { SiteFooter } from './SiteFooter'

describe('SiteFooter', () => {
  it('closes the page with the league name and its one-line description', () => {
    render(<SiteFooter />)

    expect(screen.getByRole('contentinfo')).toBeVisible()
    expect(screen.getByText('BEER LEAGUE')).toBeVisible()
    expect(
      screen.getByText('Hockey sobre Hielo · Fin del Mundo · Desde 2023'),
    ).toBeVisible()
  })

  it('names the season only when one is given', () => {
    render(<SiteFooter season={2026} />)

    expect(
      screen.getByText(
        'Hockey sobre Hielo · Fin del Mundo · Temporada 2026 · Desde 2023',
      ),
    ).toBeVisible()
  })
})
