import { shareCardPages } from './site-routes'

// What is actually on disk under public/share/, listed by Vite at transform
// time — the test needs no node:fs and runs in the same environment as the
// rest of the suite.
const DRAWN = Object.keys(
  import.meta.glob('../../public/share/*.jpg', { query: '?url' }),
).map((path) => path.split('/').pop() ?? path)

describe('shareCardPages', () => {
  it('gives every page one slug, and no two pages the same one', () => {
    const slugs = shareCardPages().map((page) => page.slug)
    expect(slugs.length).toBeGreaterThan(0)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('splits the title into a heading and the line under it', () => {
    const women = shareCardPages().find(
      (page) => page.slug === 'ligas-goleadores-women',
    )
    // The gendered word leads, exactly as the league asked for the women's
    // pages: the card must say Goleadoras, never a generic suffix.
    expect(women?.heading).toBe('Goleadoras')
    expect(women?.subheading).toContain("Women's Beer League")
  })

  it('has the drawn card for every page the build writes', () => {
    // The build points each page's og:image at /share/<slug>.jpg, and on this
    // host an absent file falls into the SPA rewrite and answers HTML with a
    // 200 — WhatsApp would render nothing and cache the nothing. A new route
    // must come with its art: npm run build:share-cards draws it.
    for (const page of shareCardPages()) {
      expect(DRAWN, `missing public/share/${page.slug}.jpg`).toContain(
        `${page.slug}.jpg`,
      )
    }
  })
})
