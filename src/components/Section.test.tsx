import { render, screen } from '@testing-library/react'
import { Section } from './Section'

describe('Section', () => {
  it('names its landmark after the title and shows the eyebrow above it', () => {
    render(
      <Section
        id="historia"
        eyebrow="Sobre nosotros"
        title="Historia de la UBL"
      >
        <p>Contenido de la sección.</p>
      </Section>,
    )

    expect(
      screen.getByRole('region', { name: 'Historia de la UBL' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Historia de la UBL' }),
    ).toBeVisible()
    expect(screen.getByText('Sobre nosotros')).toBeVisible()
    expect(screen.getByText('Contenido de la sección.')).toBeVisible()
  })
})
