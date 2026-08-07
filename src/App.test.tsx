import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'

describe('App', () => {
  it('renders the league name', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Ushuaia Beer League' }),
    ).toBeVisible()
  })

  it('lays the page out with real landmarks and a single level-one heading', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('banner')).toBeVisible()
    expect(screen.getByRole('navigation')).toBeVisible()
    expect(screen.getByRole('main')).toBeVisible()
    expect(screen.getByRole('contentinfo')).toBeVisible()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('offers a way past the fixed navigation before anything else', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'Saltar al contenido' }),
    ).toHaveAttribute('href', '#contenido')
  })

  it('renders one screen per address, and only that screen', () => {
    // The whole point of the split: the home page no longer carries the season, the
    // photographs and the sponsors underneath it. Somebody who wants the teams gets
    // the teams, not a scroll past everything else.
    const titlesAt = (path: string) => {
      const view = render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>,
      )
      const titles = screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent)
      view.unmount()
      return titles
    }

    expect(titlesAt('/')).toEqual(['Historia de la UBL', 'Sponsors'])
    expect(titlesAt('/fotos')).toEqual(['Fotos & Momentos'])
    expect(titlesAt('/sponsors')).toEqual(['Sponsors'])
    expect(titlesAt('/contacto')).toEqual(['Contacto'])
  })

  it('shows the home page for an address nobody recognises', () => {
    // A "not found" on a site this size is a dead end a visitor cannot act on, and a
    // mistyped link is likelier than a page that existed and went away.
    render(
      <MemoryRouter initialEntries={['/no-existe']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Historia de la UBL')).toBeVisible()
  })
})
