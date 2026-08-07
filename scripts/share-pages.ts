/**
 * Prints the share-card pages as JSON, one line of plumbing between the route
 * table and `build-share-cards.py`: the drawing script is Python because the
 * icons already are, and Python cannot import a TypeScript module. Run through
 * `npm run build:share-cards`.
 */

import { shareCardPages } from '../src/utils/site-routes'

process.stdout.write(JSON.stringify(shareCardPages(), null, 2))
