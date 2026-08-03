import { render, screen } from '@testing-library/react'
import { HeroSection } from './HeroSection'

describe('HeroSection', () => {
  it('carries the league name as the page heading', () => {
    render(<HeroSection />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Ushuaia Beer League' }),
    ).toBeVisible()
    expect(screen.getByText('🏒 Hockey sobre Hielo')).toBeVisible()

    // The tagline is the reference's own wording, including the spaces before
    // its commas, and "Birra" is a separate node because it is painted gold.
    const tagline = screen.getByText(/Fin del Mundo · Desde 2023/)

    expect(tagline).toBeVisible()
    expect(tagline).toHaveTextContent(
      'Hockey , Birra , Fin del Mundo · Desde 2023',
    )
  })

  it('links to the history section', () => {
    render(<HeroSection />)

    expect(screen.getByRole('link', { name: 'Historia UBL' })).toHaveAttribute(
      'href',
      '#historia',
    )
  })

  it('names the season in the eyebrow only when one is given', () => {
    render(<HeroSection season={2026} />)

    expect(
      screen.getByText('🏒 Temporada 2026 · Hockey sobre Hielo'),
    ).toBeVisible()
  })

  it('shows no figures and no competitions until they are passed in', () => {
    render(<HeroSection />)

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('definition')).not.toBeInTheDocument()
  })

  it('prints the figures and the competitions it is given', () => {
    render(
      <HeroSection
        stats={[
          { value: '10', label: 'Equipos' },
          { value: '2023', label: 'Desde' },
        ]}
        competitions={[{ name: '🏒 Beer League', tone: 'beer' }]}
      />,
    )

    expect(screen.getByText('Equipos')).toBeVisible()
    expect(screen.getByText('10')).toBeVisible()
    expect(screen.getByText('Desde')).toBeVisible()
    expect(screen.getByText('🏒 Beer League')).toBeVisible()
  })
})
