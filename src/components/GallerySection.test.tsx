import { render, screen } from '@testing-library/react'
import { GallerySection } from './GallerySection'

describe('GallerySection', () => {
  it('presents the gallery and says the photographs arrive during the season', () => {
    render(<GallerySection />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Fotos & Momentos' }),
    ).toBeVisible()
    expect(
      screen.getByText(
        '📁 Las fotos se van agregando a lo largo de la temporada',
      ),
    ).toBeVisible()
  })

  it('wires no image, so a screen reader is offered nothing to look at', () => {
    const { container } = render(<GallerySection />)

    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(container.querySelectorAll('.gallery__slot')).toHaveLength(6)
  })
})
