import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'
import { SITE_ROUTES } from './src/utils/site-routes'

/**
 * GitHub Pages answers an unknown path with `404.html`. Shipping a copy of the
 * entry document there lets a client-side route survive a hard refresh or a
 * shared link, which a static host cannot resolve on its own.
 */
function spaFallback(onCloudflare: boolean): Plugin {
  let outDir = 'dist'

  return {
    name: 'ubl-spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      // Two hosts, two mechanisms, and they must not both be present.
      //
      // GitHub Pages answers an unknown path with `404.html`, so a copy of the entry
      // document there is what lets a deep link survive.
      //
      // Cloudflare Pages reads `_redirects`, and `200` there is a rewrite rather than
      // a redirect: the address stays as it was typed and the status is right. But it
      // only reaches that rule when there is no `404.html`, which is why one is
      // skipped on the other's host. With both files present every address except the
      // home page drew the correct screen and answered 404, which is the worst
      // combination available: a visitor sees the page and every crawler and link
      // preview is told it does not exist.
      if (onCloudflare) {
        writeFileSync(join(outDir, '_redirects'), '/*    /index.html   200\n')

        // One HTML file per address, so a scraper that runs no JavaScript still
        // gets that address's own title, description and card. WhatsApp, Facebook
        // and search engines all read the static document and nothing else, so
        // without these every shared link showed the home page's card whatever it
        // pointed at. Static files win over the `_redirects` rewrite, so the
        // visitor gets the same application either way; only the head differs.
        //
        // The routes and their words come from `site-routes.ts`, which is the one
        // place that knows both, and they are the league's own texts.
        // A real sitemap, because the SPA rewrite answers 200 for any path: a
        // crawler asking for sitemap.xml would otherwise be handed HTML with a
        // straight face. One entry per address, the same table as everything else.
        const urls = SITE_ROUTES.map(
          (r) =>
            `  <url><loc>${PRODUCTION}${r.path === '/' ? '/' : r.path}</loc></url>`,
        ).join('\n')
        writeFileSync(
          join(outDir, 'sitemap.xml'),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        )

        const entry = readFileSync(join(outDir, 'index.html'), 'utf8')
        for (const route of SITE_ROUTES) {
          if (route.path === '/') continue

          const address = `${PRODUCTION}${route.path}`
          const html = entry
            .replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
            .replace(
              /(<meta\s+name="description"\s+content=")[^"]*/,
              `$1${route.description}`,
            )
            .replace(
              /(<meta\s+property="og:title"\s+content=")[^"]*/,
              `$1${route.title}`,
            )
            .replace(
              /(<meta\s+property="og:description"\s+content=")[^"]*/,
              `$1${route.description}`,
            )
            .replace(
              /(<meta\s+property="og:url"\s+content=")[^"]*/,
              `$1${address}`,
            )
            .replace(/(<link\s+rel="canonical"\s+href=")[^"]*/, `$1${address}`)

          // The build is its own test: a head this file failed to rewrite is a
          // shared link that lies, so it fails loudly here instead of shipping.
          if (!html.includes(route.title) || !html.includes(address)) {
            throw new Error(`route page not rewritten: ${route.path}`)
          }

          const target = join(outDir, `${route.path.slice(1)}.html`)
          mkdirSync(dirname(target), { recursive: true })
          writeFileSync(target, html)
        }

        // The security headers, which a static host does not send unless told.
        //
        // The policy names everything the site legitimately talks to and nothing
        // else: itself, Supabase (data and auth), and Google Analytics. A script
        // injected from anywhere else does not load, an image cannot smuggle a
        // request out, and the site cannot be framed, which is what clickjacking
        // needs. `unsafe-inline` for styles only: React writes style attributes
        // (the visits screen's bars), and blocking those breaks real screens to
        // stop an attack that script-src already stops upstream.
        //
        // The JSON-LD block is fine under this: CSP governs executable scripts,
        // and a data block is never executed.
        const csp = [
          "default-src 'self'",
          // static.cloudflareinsights.com is Cloudflare's own beacon, which Pages
          // injects into every site it serves; blocking it fills the console with
          // CSP errors and measures nothing we chose. Allowed rather than fought.
          "script-src 'self' https://www.googletagmanager.com https://static.cloudflareinsights.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https://*.supabase.co",
          "font-src 'self'",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co" +
            ' https://*.google-analytics.com https://*.analytics.google.com' +
            ' https://*.googletagmanager.com https://cloudflareinsights.com',
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')

        writeFileSync(
          join(outDir, '_headers'),
          [
            '/*',
            `  Content-Security-Policy: ${csp}`,
            '  X-Content-Type-Options: nosniff',
            '  X-Frame-Options: DENY',
            '  Referrer-Policy: strict-origin-when-cross-origin',
            '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
            '',
          ].join('\n'),
        )
      } else {
        copyFileSync(join(outDir, 'index.html'), join(outDir, '404.html'))
      }
    },
  }
}

/**
 * The league's own address, which is what the static HTML names everywhere.
 *
 * Not the host any particular build is served from: three of them serve this site
 * and only one of them is its name.
 */
const PRODUCTION = 'https://ubl.com.ar'

/** The stable address of the copy built for looking at a change before it is live. */
const PREVIEW = 'https://ushuaia-beer-league.vercel.app'

/**
 * Keeps the test site out of the search results, and lets it still preview itself.
 *
 * The same code is published twice: the league's site on Pages and a copy on Vercel.
 * Two identical sites are two candidates for the same search and the preview can
 * win, which would send players to a branch instead of to the league.
 *
 * `noindex` is what keeps it out, and the first version of this also sent
 * `Disallow: /`, which was a mistake worth writing down because it looks like extra
 * safety and is the opposite. `Disallow` stops a crawler from *reading* the page,
 * so it never reads the `noindex` either; Google can still list a disallowed URL it
 * learned about elsewhere, and now has no instruction telling it not to. Allowing
 * the read and answering `noindex` is what actually removes a page.
 *
 * It also broke the thing the preview exists for. WhatsApp and Facebook honour
 * `robots.txt` when they build a link card, so `Disallow` meant a shared preview
 * link showed no card at all, and there was no way to check a card before it went
 * live.
 *
 * The other half of that: the preview's card has to point at the preview. The static
 * HTML names production, correctly, so a scraper on the preview went looking for an
 * image at an address that does not have it yet and found a 404. Here `og:url` and
 * `og:image` are rewritten to this host, and only those two: `canonical` keeps
 * naming production, because that is the whole point of a canonical.
 *
 * Vercel sets `VERCEL` in its own build environment and nothing else does, so the
 * preview identifies itself without a variable anybody has to remember.
 */
function previewIdentity(isPreview: boolean): Plugin {
  let outDir = 'dist'

  return {
    name: 'ubl-preview-identity',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    transformIndexHtml(html) {
      if (!isPreview) return html

      // Only these two tags, each matched with its property name attached, so
      // `canonical` and the structured data are left naming production.
      return html
        .replace(
          /(<meta\s+property="og:url"\s+content=")[^"]*/,
          `$1${PREVIEW}/`,
        )
        .replace(
          /(<meta\s+property="og:image"\s+content=")[^"]*/,
          `$1${PREVIEW}/ubl-share.jpg`,
        )
        .replace(
          '</head>',
          '  <meta name="robots" content="noindex, nofollow" />\n  </head>',
        )
    },
    closeBundle() {
      // Production says come in. The preview says come in too, and relies on the
      // `noindex` in the document, for the reasons at the top of this function.
      const body = isPreview
        ? [
            '# The test copy of the league site. Not the league site.',
            '#',
            '# Crawling is allowed on purpose: the pages answer "noindex", which is',
            '# what keeps them out of a search index, and a crawler has to be able to',
            '# read a page to be told that. Disallowing instead left the link cards',
            '# broken and the pages indexable by URL.',
            'User-agent: *',
            'Allow: /',
            '',
          ].join('\n')
        : `# ${PRODUCTION}/\nUser-agent: *\nAllow: /\nSitemap: ${PRODUCTION}/sitemap.xml\n`

      writeFileSync(join(outDir, 'robots.txt'), body)
    },
  }
}

/**
 * Where the site is mounted, which is not the same on every host.
 *
 * GitHub Pages serves the repository `ushuaia-beer-league/app` under `/app/`, so
 * that is the default and every existing link keeps working. Cloudflare Pages and
 * Vercel serve at the root, and both announce themselves in their own build
 * environment, so neither needs a special build command and nobody has to remember
 * to pass `--base`. Forgetting it produces a site whose every asset 404s, which is
 * the kind of thing that looks like a broken deploy rather than a missing flag.
 */
const base =
  process.env.CF_PAGES !== undefined || process.env.VERCEL !== undefined
    ? '/'
    : '/app/'

export default defineConfig({
  base,
  plugins: [
    react(),
    spaFallback(process.env.CF_PAGES !== undefined),
    previewIdentity(process.env.VERCEL !== undefined),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
