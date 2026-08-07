import { copyFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

/**
 * GitHub Pages answers an unknown path with `404.html`. Shipping a copy of the
 * entry document there lets a client-side route survive a hard refresh or a
 * shared link, which a static host cannot resolve on its own.
 */
function spaFallback(): Plugin {
  let outDir = 'dist'

  return {
    name: 'ubl-spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      copyFileSync(join(outDir, 'index.html'), join(outDir, '404.html'))
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
        : `# ${PRODUCTION}/\nUser-agent: *\nAllow: /\n`

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
    spaFallback(),
    previewIdentity(process.env.VERCEL !== undefined),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
