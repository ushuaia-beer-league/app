/**
 * The public site's addresses, and what each one is called.
 *
 * **These are real pages, not anchors.** An earlier version of this file said the
 * site was one scrolling page and that nobody had asked for that to change. That was
 * wrong, and it was worse than wrong: the league had asked for the opposite, in those
 * words, so as not to have to scroll, and the assumption got written down here as if
 * it were their decision. Left alone it would have been quoted back as a requirement
 * by whoever read it next.
 *
 * So each address renders its own screen: the fixture and the tables at `/ligas`, the
 * teams at `/equipos`, and a short home page that no longer carries all of it at
 * once. Sharing a link then genuinely lands somebody on a table rather than at the
 * top of a page they have to scroll.
 *
 * Pure, and apart from the components, for two reasons. The obvious one is that a
 * wrong mapping here sends a shared link to the wrong table. The other is that this
 * has to be read by something that is not React at all: the build writes one HTML
 * file per address, with that address's title and card in it, because WhatsApp and
 * Facebook do not run JavaScript and would otherwise show the same card for every
 * link in the league.
 *
 * The addresses are Spanish and the tab keys are English, which looks like an
 * inconsistency and is the repository's rule: user-facing strings are Spanish
 * because the league is Argentine, and code is English. So `posiciones` in the URL
 * is `standings` in the code, and this file is the one place that knows both.
 *
 * The words come from the league. They picked them on 6 August 2026, and they also
 * picked what these cards must never do: no card names the team that is winning.
 * That was offered and refused, because a card with names on it is only true until
 * somebody enters a result, and the site would then have to be republished on every
 * result to keep it from lying. A phrase that is always true costs nothing and
 * never goes stale.
 */

/** The tab keys `LeaguesSection` uses internally. */
export const LEAGUE_TABS = [
  'fixture',
  'standings',
  'scoring',
  'goalkeeping',
  'playoffs',
] as const

export type TabKey = (typeof LEAGUE_TABS)[number]

/** How each tab is spelled in an address. */
const TAB_SLUGS: Readonly<Record<TabKey, string>> = {
  fixture: 'fixture',
  standings: 'posiciones',
  scoring: 'goleadores',
  goalkeeping: 'arqueros',
  playoffs: 'playoffs',
}

/** Which part of the page an address opens on. */
export type SectionKey =
  'inicio' | 'ligas' | 'equipos' | 'fotos' | 'sponsors' | 'contacto'

/**
 * The element to scroll to, which is the id the section already carries.
 *
 * The address and the id are not always the same word, and `fotos` is why this is a
 * table rather than an assumption: the gallery's element has been `galeria` since it
 * was written, and an address of `/galeria` reads worse than `/fotos`. The first
 * version of this file assumed they matched, so `/fotos` scrolled nowhere at all.
 * `site-routes.test.ts` now reads the components and refuses an id they do not have.
 */
const SECTION_ANCHORS: Readonly<Record<SectionKey, string>> = {
  inicio: 'hero',
  ligas: 'ligas',
  equipos: 'equipos',
  fotos: 'galeria',
  sponsors: 'sponsors',
  contacto: 'contacto',
}

export interface SiteRoute {
  /** The address, relative to wherever the site is mounted. */
  path: string
  section: SectionKey
  /** The tab to open, for the addresses under `ligas`. */
  tab?: TabKey
  /** What a browser tab and a search result say. */
  title: string
  /** What a search result and a shared card say underneath. */
  description: string
  /**
   * Whether the build writes a file for this address so a scraper that runs no
   * JavaScript still gets the right card. The league chose four of them, and every
   * extra file is another copy of the page for a search engine to consider, so this
   * is deliberately not "all of them".
   */
  shared: boolean
}

const LEAGUE_NAME = 'Ushuaia Beer League'

/**
 * Every address, in the order the page shows them.
 *
 * `/ligas` and `/ligas/fixture` are both here and both open the fixture: the short
 * one is what somebody types or what the nav links to, the long one is what the
 * tab writes into the address bar. Two addresses for one view is why `canonical`
 * matters, and each file the build writes points at itself.
 */
export const SITE_ROUTES: readonly SiteRoute[] = [
  {
    path: '/',
    section: 'inicio',
    title: `${LEAGUE_NAME}: hockey sobre hielo en el fin del mundo`,
    description:
      'La beer league de hockey sobre hielo más austral del mundo. Fixture, posiciones, goleadores y playoffs.',
    shared: true,
  },
  {
    path: '/ligas',
    section: 'ligas',
    tab: 'fixture',
    title: `Próximos partidos · ${LEAGUE_NAME}`,
    description: 'Fecha, hora y cabecera de todo lo que se viene.',
    shared: false,
  },
  {
    path: '/ligas/fixture',
    section: 'ligas',
    tab: 'fixture',
    title: `Próximos partidos · ${LEAGUE_NAME}`,
    description: 'Fecha, hora y cabecera de todo lo que se viene.',
    shared: true,
  },
  {
    path: '/ligas/posiciones',
    section: 'ligas',
    tab: 'standings',
    title: `Tabla de posiciones · ${LEAGUE_NAME}`,
    description: 'Cómo van las dos ligas fecha por fecha.',
    shared: true,
  },
  {
    path: '/ligas/goleadores',
    section: 'ligas',
    tab: 'scoring',
    title: `Goleadores · ${LEAGUE_NAME}`,
    description: 'Goles, asistencias y puntos de las dos ligas.',
    shared: false,
  },
  {
    path: '/ligas/arqueros',
    section: 'ligas',
    tab: 'goalkeeping',
    title: `Arqueros · ${LEAGUE_NAME}`,
    description:
      'Tiros recibidos, goles recibidos y porcentaje de atajadas de las dos ligas.',
    shared: false,
  },
  {
    path: '/ligas/playoffs',
    section: 'ligas',
    tab: 'playoffs',
    // Not the league's words: they marked playoffs as worth a card and the wording
    // was never sent. This is a stand-in and it is the safe kind, describing the
    // bracket rather than claiming anything about who is in it.
    title: `Playoffs · ${LEAGUE_NAME}`,
    description: 'El cuadro, cruce por cruce, a medida que se define.',
    shared: true,
  },
  {
    path: '/equipos',
    section: 'equipos',
    title: `Los equipos · ${LEAGUE_NAME}`,
    description: 'Planteles, escudos y números de las dos ligas.',
    shared: false,
  },
  {
    path: '/fotos',
    section: 'fotos',
    title: `Fotos · ${LEAGUE_NAME}`,
    description: 'La temporada, como la vieron los que estuvieron.',
    shared: false,
  },
  {
    path: '/contacto',
    section: 'contacto',
    title: `Contacto · ${LEAGUE_NAME}`,
    description: 'Cómo sumarse a la liga y cómo encontrarnos.',
    shared: false,
  },
]

/** The address for a tab, which is what the tab strip writes when it is clicked. */
export function pathForTab(tab: TabKey): string {
  return `/ligas/${TAB_SLUGS[tab]}`
}

/**
 * The route an address is, or null when it is none of them.
 *
 * A trailing slash and a different case both resolve, because a link typed by hand
 * or pasted twice through a chat should not land on nothing. Anything else answers
 * null and the caller decides, which for the site means showing the page from the
 * top rather than an error: a wrong address on a one-page site is not worth a 404
 * that the visitor cannot act on.
 */
export function routeFor(pathname: string): SiteRoute | null {
  const cleaned = `/${pathname.toLowerCase().replace(/^\/+|\/+$/g, '')}`

  return SITE_ROUTES.find((route) => route.path === cleaned) ?? null
}

/** The element a route scrolls to. */
export function anchorFor(section: SectionKey): string {
  return SECTION_ANCHORS[section]
}

/** The addresses the build writes a file for, so a scraper gets the right card. */
export function sharedRoutes(): readonly SiteRoute[] {
  return SITE_ROUTES.filter((route) => route.shared)
}

/**
 * The competition, when the address names one: `/ligas/goleadores/women` or
 * `/ligas/posiciones/todas`. No segment means the Beer League, which is what the
 * page already showed by default, so every existing link keeps its meaning.
 *
 * `women` and not `wubl` in the address, because an address is read by people and
 * the league's own English name for the competition is the Women's Beer League.
 */
const CHOICE_BY_SEGMENT: Readonly<Record<string, 'beer' | 'wubl' | 'all'>> = {
  beer: 'beer',
  women: 'wubl',
  // Legacy: the base address used to mean the Beer League and /todas meant both.
  // Both leagues at once became the default on 2026-08-07, so the bare address
  // now means todas and this segment survives only so old links keep working.
  todas: 'all',
}

const SEGMENT_BY_CHOICE: Readonly<Partial<Record<string, string>>> = {
  beer: 'beer',
  wubl: 'women',
}

/** The competition an address asks for. Both at once unless it names one. */
export function competitionFor(pathname: string): 'beer' | 'wubl' | 'all' {
  const last = pathname.toLowerCase().replace(/\/+$/, '').split('/').pop() ?? ''
  return CHOICE_BY_SEGMENT[last] ?? 'all'
}

/** Strips a competition segment so `routeFor` sees the page it belongs to. */
export function withoutCompetition(pathname: string): string {
  const cleaned = pathname.toLowerCase().replace(/\/+$/, '')
  const last = cleaned.split('/').pop() ?? ''
  return last in CHOICE_BY_SEGMENT
    ? cleaned.slice(0, cleaned.length - last.length - 1)
    : pathname
}

/** The address for a tab in a competition, which the two selectors write. */
export function pathForLeagues(
  tab: TabKey,
  choice: 'beer' | 'wubl' | 'all',
): string {
  const segment = SEGMENT_BY_CHOICE[choice]
  return segment === undefined
    ? pathForTab(tab)
    : `${pathForTab(tab)}/${segment}`
}

/**
 * The per-competition pages, each with its own words.
 *
 * Not a generic suffix, at the league's request: the women's scoring page says
 * **Goleadoras** and talks about the women's league, because a shared card that
 * says "Goleadores · Beer League" over a women's table is a card that lied.
 * Spanish is gendered and these pages are about people, so each variant carries
 * its own title and description instead of a template.
 */
export interface VariantPage {
  path: string
  title: string
  description: string
}

const WOMEN = "Women's Beer League"

const VARIANT_WORDING: Readonly<
  Record<TabKey, { beer: [string, string]; women: [string, string] }>
> = {
  fixture: {
    beer: [
      'Próximos partidos · Beer League',
      'Fecha, hora y cabecera de los partidos de la Beer League.',
    ],
    women: [
      `Próximos partidos · ${WOMEN}`,
      'Fecha, hora y cabecera de los partidos del femenino.',
    ],
  },
  standings: {
    beer: [
      'Tabla de posiciones · Beer League',
      'Cómo va la Beer League fecha por fecha.',
    ],
    women: [
      `Tabla de posiciones · ${WOMEN}`,
      'Cómo va la liga femenina fecha por fecha.',
    ],
  },
  scoring: {
    beer: [
      'Goleadores · Beer League',
      'Goles, asistencias y puntos de la Beer League.',
    ],
    women: [
      `Goleadoras · ${WOMEN}`,
      'Goles, asistencias y puntos de las jugadoras del femenino.',
    ],
  },
  goalkeeping: {
    beer: [
      'Arqueros · Beer League',
      'Tiros recibidos, goles recibidos y porcentaje de atajadas de la Beer League.',
    ],
    women: [
      `Arqueras · ${WOMEN}`,
      'Tiros recibidos, goles recibidos y porcentaje de atajadas del femenino.',
    ],
  },
  playoffs: {
    beer: [
      'Playoffs · Beer League',
      'El cuadro de la Beer League, cruce por cruce, a medida que se define.',
    ],
    women: [
      `Playoffs · ${WOMEN}`,
      'El cuadro del femenino, cruce por cruce, a medida que se define.',
    ],
  },
}

/** Every per-competition page the build writes, with its own words. */
export function variantPages(): VariantPage[] {
  const pages: VariantPage[] = []
  for (const tab of LEAGUE_TABS) {
    for (const segment of ['beer', 'women'] as const) {
      const [title, description] = VARIANT_WORDING[tab][segment]
      pages.push({
        path: `${pathForTab(tab)}/${segment}`,
        title: `${title} · Ushuaia Beer League`,
        description,
      })
    }
  }
  return pages
}

/**
 * The pages that get their own drawn `og:image`, and the file each one wears.
 *
 * WhatsApp and Facebook show the image beside a shared link, and they read it
 * from the static head — so the art is drawn at build time by
 * `scripts/build-share-cards.py`, committed under `public/share/`, and wired
 * per page by `vite.config.ts`. All three speak through this function: the
 * script draws one card per entry, the config points each page at its slug,
 * and `share-pages.test.ts` refuses a page whose art has not been drawn.
 *
 * The heading is the title's first segment and the rest becomes the small
 * line, so "Goleadoras · Women's Beer League · Ushuaia Beer League" draws as
 * a big GOLEADORAS over the competition — the words the league chose, split
 * where the league's own separator splits them.
 */
export interface SharePage {
  /** `ligas-goleadores-women`: the address with its slashes flattened. */
  slug: string
  heading: string
  subheading: string
}

export function shareCardPages(): SharePage[] {
  const paths = [
    ...SITE_ROUTES.filter((route) => route.path !== '/').map((route) => ({
      path: route.path,
      title: route.title,
    })),
    ...variantPages().map((page) => ({ path: page.path, title: page.title })),
  ]
  return paths.map(({ path, title }) => {
    const [heading, ...rest] = title.split(' · ')
    return {
      slug: path.slice(1).replaceAll('/', '-'),
      heading: heading ?? title,
      subheading: rest.join(' · '),
    }
  })
}
