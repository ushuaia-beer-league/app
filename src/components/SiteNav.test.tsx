import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { SiteNav } from './SiteNav'

describe('SiteNav', () => {
  it('offers the sections that exist as a named navigation landmark', () => {
    render(
      <MemoryRouter>
        <SiteNav />
      </MemoryRouter>,
    )

    const navigation = screen.getByRole('navigation', {
      name: 'Navegación principal',
    })

    expect(navigation).toBeVisible()

    // Addresses, not anchors. The sections became pages when the league asked not to
    // have to scroll past the whole season to reach the teams, so each of these has
    // to be somewhere a link can land and a browser can bookmark.
    const links: [string, string][] = [
      ['Historia', '/'],
      ['Ligas & Estadísticas', '/ligas'],
      ['Equipos', '/equipos'],
      ['Fotos', '/fotos'],
      ['Contacto', '/contacto'],
    ]

    for (const [name, href] of links) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
    }
  })

  it('starts with the phone menu collapsed and opens it on demand', () => {
    render(
      <MemoryRouter>
        <SiteNav />
      </MemoryRouter>,
    )

    const toggle = screen.getByRole('button', { name: 'Menú' })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('collapses the phone menu again once a section is chosen', () => {
    render(
      <MemoryRouter>
        <SiteNav />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    fireEvent.click(screen.getByRole('link', { name: 'Historia' }))

    expect(screen.getByRole('button', { name: 'Menú' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
