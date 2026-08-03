import { render, screen } from '@testing-library/react'
import { ContactSection } from './ContactSection'

describe('ContactSection', () => {
  it('admits it has no channels rather than inventing an address', () => {
    render(<ContactSection />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Contacto' }),
    ).toBeVisible()
    expect(
      screen.getByText('Todavía no hay canales de contacto publicados.'),
    ).toBeVisible()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('links every channel it is given', () => {
    render(
      <ContactSection
        channels={[
          { label: 'Correo', href: 'mailto:ejemplo@example.com', glyph: '✉' },
          { label: 'Instagram', href: 'https://example.com/ubl', glyph: '📸' },
        ]}
      />,
    )

    expect(screen.getByRole('link', { name: 'Correo' })).toHaveAttribute(
      'href',
      'mailto:ejemplo@example.com',
    )
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://example.com/ubl',
    )
  })
})
