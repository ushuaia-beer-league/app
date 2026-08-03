import { fireEvent, render, screen } from '@testing-library/react'
import { CompetitionTabs } from './CompetitionTabs'

describe('CompetitionTabs', () => {
  it('offers the two competitions the league names', () => {
    render(<CompetitionTabs value="beer" onChange={() => {}} />)

    expect(screen.getByRole('group', { name: 'Competencia' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Beer League' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: "Women's Beer League" }),
    ).toBeVisible()
  })

  it('says which competition is on screen', () => {
    render(<CompetitionTabs value="wubl" onChange={() => {}} />)

    expect(screen.getByRole('button', { name: 'Beer League' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(
      screen.getByRole('button', { name: "Women's Beer League" }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('asks for the other competition when it is chosen', () => {
    const onChange = vi.fn()
    render(<CompetitionTabs value="beer" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: "Women's Beer League" }))

    expect(onChange).toHaveBeenCalledWith('wubl')
  })
})
