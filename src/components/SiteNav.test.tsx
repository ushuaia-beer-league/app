import { fireEvent, render, screen } from '@testing-library/react'
import { SiteNav } from './SiteNav'

describe('SiteNav', () => {
  it('offers the sections that exist as a named navigation landmark', () => {
    render(<SiteNav />)

    const navigation = screen.getByRole('navigation', {
      name: 'Navegación principal',
    })

    expect(navigation).toBeVisible()
    expect(screen.getByRole('link', { name: 'Historia' })).toHaveAttribute(
      'href',
      '#historia',
    )
    expect(screen.getByRole('link', { name: 'Fotos' })).toHaveAttribute(
      'href',
      '#galeria',
    )
    expect(screen.getByRole('link', { name: 'Sponsors' })).toHaveAttribute(
      'href',
      '#sponsors',
    )
    expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute(
      'href',
      '#contacto',
    )
  })

  it('starts with the phone menu collapsed and opens it on demand', () => {
    render(<SiteNav />)

    const toggle = screen.getByRole('button', { name: 'Menú' })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('collapses the phone menu again once a section is chosen', () => {
    render(<SiteNav />)

    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    fireEvent.click(screen.getByRole('link', { name: 'Historia' }))

    expect(screen.getByRole('button', { name: 'Menú' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
