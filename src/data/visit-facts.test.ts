import {
  decideVisitor,
  deviceKind,
  leagueDay,
  referrerKind,
  visitFacts,
  type VisitEnvironment,
} from './visit-facts'

describe('decideVisitor', () => {
  it('counts a browser that has never been here', () => {
    expect(decideVisitor(null, '2026-08-06')).toEqual({
      kind: 'new',
      mark: '2026-08-06',
    })
  })

  it('counts a browser that was here on an earlier day', () => {
    expect(decideVisitor('2026-07-30', '2026-08-06')).toEqual({
      kind: 'returning',
      mark: '2026-08-06',
    })
  })

  it('counts nothing the second time somebody opens it the same day', () => {
    // Otherwise "how many came back" would slowly turn into "how many pages they
    // opened", which is the number beside it and already counted.
    expect(decideVisitor('2026-08-06', '2026-08-06')).toEqual({
      kind: null,
      mark: null,
    })
  })

  it('treats a mark that is not a date as no mark at all', () => {
    for (const junk of ['', 'yesterday', '2026-8-6', '{"id":"abc"}']) {
      expect(decideVisitor(junk, '2026-08-06')).toEqual({
        kind: 'new',
        mark: '2026-08-06',
      })
    }
  })

  it('leaves a mark from the future where it is', () => {
    // A wrong clock, or a browser restored from a backup. Overwriting it would
    // count this browser as returning on every load until the date catches up.
    expect(decideVisitor('2027-01-01', '2026-08-06')).toEqual({
      kind: null,
      mark: null,
    })
  })
})

describe('leagueDay', () => {
  it('answers with the league’s own day, not the reader’s', () => {
    // Two in the morning UTC on 7 August is eleven at night on the 6th here, and
    // the counter row it belongs to is dated the 6th. Reading the browser's own
    // date would file that visit under tomorrow.
    expect(leagueDay(new Date('2026-08-07T02:00:00Z'))).toBe('2026-08-06')
  })

  it('gives a padded date the comparisons can order', () => {
    expect(leagueDay(new Date('2026-01-09T15:00:00Z'))).toBe('2026-01-09')
  })
})

describe('deviceKind', () => {
  it('believes the hint over anything else', () => {
    expect(deviceKind(true, 'Mozilla/5.0 (Macintosh)')).toBe('phone')
    expect(deviceKind(false, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)')).toBe(
      'computer',
    )
  })

  it('falls back to matching the user-agent when there is no hint', () => {
    expect(
      deviceKind(
        undefined,
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac)',
      ),
    ).toBe('phone')
    expect(
      deviceKind(undefined, 'Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile'),
    ).toBe('phone')
    expect(
      deviceKind(undefined, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
    ).toBe('computer')
  })

  it('calls a tablet a computer, which is the documented choice', () => {
    expect(
      deviceKind(undefined, 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)'),
    ).toBe('computer')
  })
})

describe('referrerKind', () => {
  const own = 'ushuaia-beer-league.github.io'

  it('calls no referrer direct', () => {
    expect(referrerKind('', own)).toBe('direct')
  })

  it('calls our own host direct', () => {
    // A single page app never reloads on an internal click, so this is a refresh
    // or a bookmark: that person did not arrive from somewhere else.
    expect(referrerKind(`https://${own}/app/equipos`, own)).toBe('direct')
    expect(referrerKind(`https://www.${own}/app/`, own)).toBe('direct')
    expect(referrerKind('https://ushuaia-beer-league.vercel.app/', own)).toBe(
      'other',
    )
  })

  it('recognises the search engines people here use', () => {
    expect(referrerKind('https://www.google.com/search?q=beer', own)).toBe(
      'search',
    )
    expect(referrerKind('https://www.google.com.ar/', own)).toBe('search')
    expect(referrerKind('https://duckduckgo.com/', own)).toBe('search')
  })

  it('recognises the places the league actually shares links', () => {
    expect(referrerKind('https://l.instagram.com/?u=x', own)).toBe('social')
    expect(referrerKind('https://m.facebook.com/', own)).toBe('social')
    expect(referrerKind('https://api.whatsapp.com/', own)).toBe('social')
    expect(referrerKind('https://t.co/abc', own)).toBe('social')
  })

  it('puts anything else in other, including something unparseable', () => {
    expect(referrerKind('https://tierradelfuego.gob.ar/', own)).toBe('other')
    expect(referrerKind('not a url', own)).toBe('other')
  })

  it('never lets the address itself out', () => {
    // The point of this function: what it returns is one of four words, so a URL
    // carrying a search someone typed can never reach the database.
    const kinds = ['direct', 'search', 'social', 'other']
    expect(
      kinds.includes(
        referrerKind('https://www.google.com/search?q=my+name', own),
      ),
    ).toBe(true)
  })
})

describe('visitFacts', () => {
  function browser(over: Partial<VisitEnvironment> = {}): VisitEnvironment {
    return {
      pathname: '/',
      referrer: '',
      host: 'ushuaia-beer-league.github.io',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      mobileHint: undefined,
      now: new Date('2026-08-06T15:00:00Z'),
      readMark: () => null,
      writeMark: () => {},
      ...over,
    }
  }

  it('reports all four things about a first visit', () => {
    expect(
      visitFacts(
        browser({
          pathname: '/equipos',
          referrer: 'https://www.instagram.com/',
          mobileHint: true,
        }),
      ),
    ).toEqual({
      visitor: 'new',
      device: 'phone',
      referrer: 'social',
      entry: 'equipos',
    })
  })

  it('writes the day into the browser so the next visit is a return', () => {
    const written: string[] = []
    visitFacts(browser({ writeMark: (day) => written.push(day) }))
    expect(written).toEqual(['2026-08-06'])
  })

  it('leaves the visitor out when today is already counted', () => {
    const facts = visitFacts(browser({ readMark: () => '2026-08-06' }))
    expect('visitor' in facts).toBe(false)
    // The rest is still reported: these three count entries to the site, and this
    // is one.
    expect(facts).toEqual({
      device: 'computer',
      referrer: 'direct',
      entry: '/',
    })
  })

  it('does not write the mark when there was nothing to change', () => {
    const written: string[] = []
    visitFacts(
      browser({
        readMark: () => '2026-08-06',
        writeMark: (d) => written.push(d),
      }),
    )
    expect(written).toEqual([])
  })

  it('leaves the entry out rather than inventing a name for it', () => {
    const facts = visitFacts(browser({ pathname: '/../%20 nonsense' }))
    expect('entry' in facts).toBe(false)
    expect(facts.visitor).toBe('new')
  })

  it('sends nothing that could point at a person', () => {
    // The guarantee this whole module exists for. Every value is one of a closed
    // set of words, or a path from our own site.
    const facts = visitFacts(
      browser({
        referrer: 'https://www.google.com/search?q=braian+mellor+ushuaia',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605',
        pathname: '/ligas',
      }),
    )

    expect(facts).toEqual({
      visitor: 'new',
      device: 'computer',
      referrer: 'search',
      entry: 'ligas',
    })
  })
})
