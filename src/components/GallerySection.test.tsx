import { fireEvent, render, screen } from '@testing-library/react'
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

describe('GallerySection, with photographs', () => {
  const PHOTOS = [
    { url: 'https://example.com/a.jpg', caption: 'Fecha 1' },
    { url: 'https://example.com/b.jpg', caption: null },
    { url: 'https://example.com/c.jpg', caption: 'Playoffs' },
  ]

  it('packs the photos as a masonry wall', () => {
    const { container } = render(<GallerySection photos={PHOTOS} />)

    // The class is the contract with the stylesheet: columns, not grid rows,
    // so a portrait photo cannot leave a photo-sized hole beside itself.
    expect(container.querySelector('.gallery--masonry')).not.toBeNull()
    expect(container.querySelectorAll('.gallery__photo')).toHaveLength(3)
  })

  it('enlarges a photo, and the arrows walk the wall around its ends', () => {
    const { container } = render(<GallerySection photos={PHOTOS} />)

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Ampliar la foto' })[0]!,
    )
    expect(container.querySelector('.gallery__stage img')).toHaveAttribute(
      'src',
      'https://example.com/a.jpg',
    )

    // Backwards from the first photo wraps to the last: a wall has no edge
    // worth stopping at.
    fireEvent.click(screen.getByRole('button', { name: 'Foto anterior' }))
    expect(container.querySelector('.gallery__stage img')).toHaveAttribute(
      'src',
      'https://example.com/c.jpg',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    expect(container.querySelector('.gallery__stage img')).toHaveAttribute(
      'src',
      'https://example.com/a.jpg',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(container.querySelector('.gallery__stage')).toBeNull()
  })
})
