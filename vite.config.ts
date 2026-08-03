import { copyFileSync } from 'node:fs'
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

export default defineConfig({
  // The repository is `ushuaia-beer-league/app`, so Pages serves it under /app/.
  base: '/app/',
  plugins: [react(), spaFallback()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
