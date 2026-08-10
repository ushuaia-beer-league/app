import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MANUAL } from './manual'
import { ManualScreen } from './ManualScreen'

const show = () =>
  render(
    <MemoryRouter>
      <ManualScreen />
    </MemoryRouter>,
  )

describe('ManualScreen', () => {
  it('shows every section, each one addressable', () => {
    // The screens link to `#<id>`, so a section that renders without its id is
    // a help link that lands nowhere.
    const { container } = show()

    for (const section of MANUAL) {
      expect(
        screen.getByRole('heading', { level: 2, name: section.title }),
      ).toBeVisible()
      expect(container.querySelector(`#${section.id}`)).not.toBeNull()
    }
  })

  it('lists the sections at the top, so nobody scrolls to find one', () => {
    show()
    const toc = within(
      screen.getByRole('navigation', { name: 'Secciones del manual' }),
    )

    expect(toc.getAllByRole('link')).toHaveLength(MANUAL.length)
    expect(
      toc.getByRole('link', { name: 'Cargar una planilla de partido' }),
    ).toHaveAttribute('href', '/admin/manual#planilla')
  })

  it('renders the emphasis the manual marks, as emphasis', () => {
    show()

    // The one inline mark, and the reason it exists: the sentence a reader has
    // to leave with reads as one.
    expect(
      screen.getByText('no guarda tablas: guarda partidos', {
        selector: 'b',
      }),
    ).toBeVisible()
  })

  it('draws a table as a table', () => {
    const { container } = show()
    const tables = container.querySelectorAll('.manual__table')

    expect(tables.length).toBeGreaterThan(1)
    expect(
      within(tables[0] as HTMLElement).getByText('Ganó por penales'),
    ).toBeVisible()
  })
})
