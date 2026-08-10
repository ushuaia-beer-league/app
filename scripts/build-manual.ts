/**
 * Writes `docs/COMO-FUNCIONA.md` from `src/admin/manual.ts`.
 *
 *     npm run build:manual
 *
 * The panel renders that same data at `/admin/manual`, so this exists to keep
 * the file people share on GitHub from drifting away from the one operators
 * read while they work. `manual.test.ts` fails when they do, which is what
 * makes this a build step rather than a good intention.
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { manualMarkdown } from '../src/admin/manualMarkdown'

const target = join(process.cwd(), 'docs/COMO-FUNCIONA.md')
writeFileSync(target, manualMarkdown())
process.stdout.write(
  `docs/COMO-FUNCIONA.md escrito desde src/admin/manual.ts\n`,
)
