import { render, screen } from '@testing-library/react'
import { Wordmark } from './Wordmark'

describe('Wordmark', () => {
  it('reads as the league name even though it is painted in two colours', () => {
    const { container } = render(<Wordmark />)

    expect(container.textContent).toBe('USHUAIA BEER LEAGUE')
    expect(screen.getByText('BEER LEAGUE')).toBeVisible()
  })
})
