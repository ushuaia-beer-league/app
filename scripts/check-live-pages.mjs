/**
 * Asks the live site, page by page, whether the assets its HTML names actually
 * answer as what they claim to be.
 *
 * The failure this exists for: every deploy renames the hashed bundles, and an
 * HTML page cached anywhere (CDN or browser) can name a bundle the origin no
 * longer has. The SPA rewrite then answers that request with index.html, the
 * browser refuses text/html where a module was promised, and the page renders
 * blank. It happened on /equipos the day the per-route pages shipped; the
 * Cache-Control headers are the fix, and this is the alarm if they ever stop
 * being enough.
 *
 * Runs after each deploy in the workflow. A 5xx from the host is reported but
 * not a failure (the deploy already succeeded; a wobble is not a regression);
 * an asset answering with the wrong type is exactly the bug and fails loudly.
 */

const HOST = process.env.PAGES_HOST ?? 'https://ubl.com.ar'

const ROUTES = [
  '/',
  '/ligas',
  '/ligas/fixture',
  '/ligas/posiciones',
  '/ligas/goleadores',
  '/ligas/arqueros',
  '/ligas/playoffs',
  '/equipos',
  '/fotos',
  '/contacto',
  '/ligas/goleadores/women',
  '/ligas/posiciones/todas',
]

const fresh = { headers: { 'cache-control': 'no-cache' } }
let failures = 0

for (const route of ROUTES) {
  const page = await fetch(`${HOST}${route}`, fresh)
  if (!page.ok) {
    console.log(`  ${route}: HTML answered ${page.status}`)
    if (page.status < 500) failures += 1
    continue
  }

  const html = await page.text()
  const assets = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]),
    ),
  ]

  if (assets.length === 0) {
    console.log(`  ${route}: names no assets at all, which cannot be right`)
    failures += 1
    continue
  }

  for (const asset of assets) {
    const response = await fetch(`${HOST}${asset}`, fresh)
    const type = response.headers.get('content-type') ?? ''
    const wantsScript = asset.endsWith('.js')
    const wantsStyle = asset.endsWith('.css')
    const sane =
      response.ok &&
      (!wantsScript || type.includes('javascript')) &&
      (!wantsStyle || type.includes('css'))

    if (!sane) {
      console.log(
        `  ${route}: ${asset} answered ${response.status} as "${type}" — a page naming a bundle the host does not serve`,
      )
      failures += 1
    }
  }

  console.log(`  ${route}: ok (${assets.length} assets)`)
}

// The conventional paths nothing links but everything requests. On this host an
// absent file falls into the SPA rewrite and answers HTML with a 200, which is
// how Google's favicon fetcher once received a web page instead of an icon and
// drew a generic globe in the search results. Each of these must answer as what
// it claims to be, not merely answer.
const WELL_KNOWN = [
  ['/favicon.ico', 'icon'],
  ['/favicon.svg', 'svg'],
  ['/favicon-48.png', 'png'],
  ['/apple-touch-icon.png', 'png'],
  ['/robots.txt', 'text/plain'],
  ['/sitemap.xml', 'xml'],
  ['/ubl-share.jpg', 'jpeg'],
]

for (const [path, expected] of WELL_KNOWN) {
  const response = await fetch(`${HOST}${path}`, fresh)
  const type = response.headers.get('content-type') ?? ''
  if (!response.ok || !type.includes(expected)) {
    console.log(
      `  ${path}: answered ${response.status} as "${type}" — the rewrite wearing a costume`,
    )
    failures += 1
  } else {
    console.log(`  ${path}: ok (${type})`)
  }
}

if (failures > 0) {
  console.error(`\n${failures} page/asset pairs are broken on ${HOST}.`)
  process.exit(1)
}
console.log(`\nEvery page on ${HOST} names assets the host actually serves.`)
