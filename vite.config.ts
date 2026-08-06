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
 * Keeps the test site out of the search results.
 *
 * The same code is published twice: the league's site on Pages and a copy on
 * Vercel for looking at a change before it is live. Two identical sites are two
 * candidates for the same search, and the preview can win, which would send
 * players to a branch instead of to the league. Worse, the copy carries the
 * production `og:url`, so a shared preview link would print the real address on a
 * card pointing somewhere else.
 *
 * Vercel sets `VERCEL` in its own build environment and nothing else does, so the
 * preview identifies itself without a variable anybody has to remember. Two
 * measures, because a crawler may honour one and not the other: a `robots.txt`
 * that refuses everything, and a `noindex` tag inside the document for anything
 * that reaches a page without reading the file.
 *
 * Production gets the opposite file, an explicit welcome. A missing `robots.txt`
 * is not a problem in itself, but on a host that answers every unknown path with
 * the application, a crawler asking for it is handed HTML with a 200, which is a
 * worse answer than a plain one.
 */
function robots(isPreview: boolean): Plugin {
  let outDir = 'dist'

  return {
    name: 'ubl-robots',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    transformIndexHtml(html) {
      if (!isPreview) return html
      return html.replace(
        '</head>',
        '  <meta name="robots" content="noindex, nofollow" />\n  </head>',
      )
    },
    closeBundle() {
      const body = isPreview
        ? '# The test copy of the league site. Not the league site.\nUser-agent: *\nDisallow: /\n'
        : '# https://ushuaia-beer-league.github.io/app/\nUser-agent: *\nAllow: /\n'
      writeFileSync(join(outDir, 'robots.txt'), body)
    },
  }
}

export default defineConfig({
  // The repository is `ushuaia-beer-league/app`, so Pages serves it under /app/.
  base: '/app/',
  plugins: [react(), spaFallback(), robots(process.env.VERCEL !== undefined)],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
