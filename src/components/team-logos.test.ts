import { crestFor, teamLogo } from './team-logos'

describe('crestFor', () => {
  it('prefers the crest uploaded from the panel', () => {
    expect(
      crestFor({
        slug: 'birra-del-fuego',
        logoUrl: 'https://cdn.example.com/nuevo.webp',
      }),
    ).toBe('https://cdn.example.com/nuevo.webp')
  })

  it('falls back to the bundled artwork when nothing was uploaded', () => {
    // An empty string is what a cleared panel field saves; both mean "none".
    expect(crestFor({ slug: 'birra-del-fuego' })).toBe(
      teamLogo('birra-del-fuego'),
    )
    expect(crestFor({ slug: 'birra-del-fuego', logoUrl: '' })).toBe(
      teamLogo('birra-del-fuego'),
    )
    expect(crestFor({ slug: 'birra-del-fuego', logoUrl: null })).toBe(
      teamLogo('birra-del-fuego'),
    )
  })

  it('still falls back when the storage path cannot become a URL', () => {
    // Without a database configuration a storage path resolves to nothing,
    // which is exactly the paused-free-tier case: the bundled badge shows
    // rather than a broken image.
    expect(crestFor({ slug: 'birra-del-fuego', logoUrl: 'teams/x.webp' })).toBe(
      teamLogo('birra-del-fuego'),
    )
  })

  it('answers nothing for a team with neither upload nor artwork', () => {
    expect(crestFor({ slug: 'equipo-sin-escudo' })).toBeNull()
  })
})
