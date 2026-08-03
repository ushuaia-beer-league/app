/**
 * The Spanish the panel calls things.
 *
 * One place, because the matches list and the match sheet name the same
 * vocabularies and a second spelling of "Repechaje" is a bug waiting to be
 * noticed by nobody. Every record here is keyed by a union from
 * `src/data/types.ts`, so adding a stage or a resolution there stops compiling
 * until it is named here too.
 *
 * These are user-facing strings, which is why they are the one thing in this
 * repository that is not English.
 */

import type { MatchResolution, MatchStage, Venue } from '../data/types'

/** The two cabeceras. Two matches run at once, one in each. */
export const VENUE_NAMES: Record<Venue, string> = {
  bahia: 'Bahía',
  poli: 'Poli',
}

export const STAGE_NAMES: Record<MatchStage, string> = {
  regular: 'Fase regular',
  playin: 'Repechaje',
  quarterfinal: 'Cuartos',
  semifinal: 'Semifinal',
  final: 'Final',
  'third-place': 'Tercer puesto',
  'fifth-place': 'Quinto puesto',
  'all-star': 'Juego de estrellas',
}

/**
 * How a match ended, as the sheet says it. No points are named here on purpose:
 * a win is worth 2 and a shootout loss 1, and the standings are the only place
 * that decides so.
 */
export const RESOLUTION_NAMES: Record<MatchResolution, string> = {
  regulation: 'En tiempo reglamentario',
  shootout: 'Definido por shootout',
  draw: 'Empate',
}
