import { render, screen } from '@testing-library/react'
import { Crest } from './Crest'

describe('Crest', () => {
  it('exposes the Spanish label when the crest stands on its own', () => {
    render(<Crest label="Escudo de la Ushuaia Beer League" />)

    expect(
      screen.getByRole('img', { name: 'Escudo de la Ushuaia Beer League' }),
    ).toBeVisible()
  })

  it('stays out of the accessibility tree when it sits beside the wordmark', () => {
    render(<Crest />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
