import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('renders the league name', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Ushuaia Beer League' }),
    ).toBeVisible()
  })

  it('lays the page out with real landmarks and a single level-one heading', () => {
    render(<App />)

    expect(screen.getByRole('banner')).toBeVisible()
    expect(screen.getByRole('navigation')).toBeVisible()
    expect(screen.getByRole('main')).toBeVisible()
    expect(screen.getByRole('contentinfo')).toBeVisible()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('offers a way past the fixed navigation before anything else', () => {
    render(<App />)

    expect(
      screen.getByRole('link', { name: 'Saltar al contenido' }),
    ).toHaveAttribute('href', '#contenido')
  })

  it('renders every section this slice owns and none that needs tournament data', () => {
    render(<App />)

    const titles = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)

    expect(titles).toEqual([
      'Historia de la UBL',
      'Fotos & Momentos',
      'Sponsors',
      'Contacto',
    ])
  })
})
