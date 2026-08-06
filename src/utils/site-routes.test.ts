import { readdirSync, readFileSync } from 'node:fs'

import {
  anchorFor,
  LEAGUE_TABS,
  pathForTab,
  routeFor,
  sharedRoutes,
  SITE_ROUTES,
} from './site-routes'

describe('routeFor', () => {
  it('finds the home page', () => {
    expect(routeFor('/')?.section).toBe('inicio')
  })

  it('opens each tab on the tab it names', () => {
    expect(routeFor('/ligas/posiciones')?.tab).toBe('standings')
    expect(routeFor('/ligas/goleadores')?.tab).toBe('scoring')
    expect(routeFor('/ligas/arqueros')?.tab).toBe('goalkeeping')
    expect(routeFor('/ligas/playoffs')?.tab).toBe('playoffs')
  })

  it('opens the fixture for the short address and the long one', () => {
    // The nav links to the short one and the tab strip writes the long one. Both
    // have to work, and both have to mean the same thing.
    expect(routeFor('/ligas')?.tab).toBe('fixture')
    expect(routeFor('/ligas/fixture')?.tab).toBe('fixture')
  })

  it('survives a trailing slash and a shouting link', () => {
    // What a link pasted twice through a chat looks like.
    expect(routeFor('/ligas/posiciones/')?.tab).toBe('standings')
    expect(routeFor('/LIGAS/POSICIONES')?.tab).toBe('standings')
    expect(routeFor('//equipos//')?.section).toBe('equipos')
  })

  it('answers nothing for an address that is not ours', () => {
    expect(routeFor('/ligas/penales')).toBeNull()
    expect(routeFor('/admin')).toBeNull()
    expect(routeFor('/equipos/blanco')).toBeNull()
  })
})

describe('pathForTab', () => {
  it('round-trips every tab through its address', () => {
    // The property that matters: a tab writes an address, and that address opens
    // the same tab. If a slug is ever renamed on one side only, this fails.
    for (const tab of LEAGUE_TABS) {
      expect(routeFor(pathForTab(tab))?.tab).toBe(tab)
    }
  })

  it('spells the addresses in Spanish', () => {
    expect(pathForTab('standings')).toBe('/ligas/posiciones')
    expect(pathForTab('goalkeeping')).toBe('/ligas/arqueros')
  })
})

describe('the route table', () => {
  it('has no two routes on the same address', () => {
    const paths = SITE_ROUTES.map((route) => route.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('gives every route a title and a description', () => {
    for (const route of SITE_ROUTES) {
      expect(route.title.length).toBeGreaterThan(8)
      expect(route.description.length).toBeGreaterThan(12)
      // A description this long is cut off in a search result, so it is a bug
      // rather than a preference.
      expect(route.description.length).toBeLessThanOrEqual(160)
    }
  })

  it('names the league in every title', () => {
    for (const route of SITE_ROUTES) {
      expect(route.title).toContain('Ushuaia Beer League')
    }
  })

  it('scrolls each route to an element the page actually has', () => {
    // Reads the components rather than a list kept here, because a list kept here
    // would only ever agree with itself. It caught a real one: `/fotos` pointed at
    // an id of `fotos` and the gallery's element is `galeria`, so the address
    // scrolled nowhere and nothing else would have noticed.
    const sources = [
      ...readdirSync('src/components')
        .filter((name) => name.endsWith('.tsx'))
        .map((name) => `src/components/${name}`),
      'src/App.tsx',
    ]

    const ids = new Set<string>()
    for (const file of sources) {
      for (const match of readFileSync(file, 'utf8').matchAll(
        /id="([^"${]+)"/g,
      )) {
        ids.add(match[1]!)
      }
    }

    // A sanity check on the reading itself: if the regex ever stops matching, the
    // assertions below would pass an empty set and prove nothing.
    expect(ids.size).toBeGreaterThan(4)

    for (const route of SITE_ROUTES) {
      expect([...ids]).toContain(anchorFor(route.section))
    }
  })

  it('covers the four the league asked to be shareable, and only those', () => {
    // The league marked the home page, the fixture, the standings and the playoffs
    // on 6 August 2026. Teams was left unmarked even though its wording was
    // approved, so it is not here and that is a question waiting for an answer, not
    // an oversight.
    expect(sharedRoutes().map((route) => route.path)).toEqual([
      '/',
      '/ligas/fixture',
      '/ligas/posiciones',
      '/ligas/playoffs',
    ])
  })

  it('promises nothing on a card that a result could falsify', () => {
    // The league chose fixed wording over naming who is winning, because a card
    // with names on it is only true until somebody enters a result. Nothing here
    // may look like a standing.
    for (const route of sharedRoutes()) {
      expect(route.description).not.toMatch(/\d/)
      expect(route.title).not.toMatch(/\d/)
    }
  })
})
