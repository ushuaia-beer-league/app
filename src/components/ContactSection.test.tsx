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

  it('draws the destination icon and ignores the stored emoji', () => {
    // The first Instagram row shipped wearing two beer mugs, because the
    // glyph field renders whatever an operator types. A recognised
    // destination shows its own mark; the emoji survives only for channels
    // the site does not recognise.
    const { container } = render(
      <ContactSection
        channels={[
          {
            label: 'Instagram',
            href: 'https://www.instagram.com/ubl/',
            glyph: '🍻🍻',
            kind: 'instagram',
            detail: '@ubl',
          },
          {
            label: 'La radio',
            href: 'https://example.com/radio',
            glyph: '📻',
            kind: null,
            detail: 'example.com',
          },
        ]}
      />,
    )

    expect(container.querySelector('[data-icon="instagram"]')).not.toBeNull()
    expect(screen.queryByText('🍻🍻')).not.toBeInTheDocument()
    expect(screen.getByText('📻')).toBeInTheDocument()
  })

  it('prints the address so the name says where it goes', () => {
    render(
      <ContactSection
        channels={[
          {
            label: 'Correo',
            href: 'mailto:ejemplo@example.com',
            kind: 'mail',
            detail: 'ejemplo@example.com',
          },
          {
            label: 'Instagram',
            href: 'https://www.instagram.com/ubl/',
            kind: 'instagram',
            detail: '@ubl',
          },
        ]}
      />,
    )

    expect(screen.getByText('ejemplo@example.com')).toBeVisible()
    expect(screen.getByText('@ubl')).toBeVisible()
  })
})
