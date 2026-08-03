import { render, screen } from '@testing-library/react'
import { SponsorsSection } from './SponsorsSection'

describe('SponsorsSection', () => {
  it('says the wall is empty instead of hiding the section', () => {
    render(<SponsorsSection />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Sponsors' }),
    ).toBeVisible()
    expect(screen.getByText('Gracias a ellos es posible')).toBeVisible()
    expect(
      screen.getByText('Todavía no hay sponsors publicados.'),
    ).toBeVisible()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('shows the name and the category of every sponsor it is given', () => {
    render(
      <SponsorsSection
        sponsors={[
          { name: 'Sponsor de ejemplo', category: 'Sponsor principal' },
          {
            name: 'Otro sponsor',
            category: 'Equipamiento',
            href: 'https://example.com',
          },
        ]}
      />,
    )

    expect(screen.getByText('Sponsor de ejemplo')).toBeVisible()
    expect(screen.getByText('Sponsor principal')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Otro sponsor' })).toHaveAttribute(
      'href',
      'https://example.com',
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
