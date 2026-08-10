import type { MatchStage } from '../data/types'
import type { StringKey } from '../i18n/es'

/**
 * What a match of each stage is called on the public site, or nothing.
 *
 * Nothing for the regular phase: forty rows of the fixture are regular-phase
 * matches and saying so on each one tells the reader what they already assumed.
 * The bracket rounds are the ones worth naming, and they were unnamed until
 * 2026-08-10 — a visitor looking at the 15 August fixture saw two teams and no
 * way to tell the final from the fifth-place match. It read as information the
 * site had lost, because it was: before the resolver named the sides, the row
 * showed the sheet's own "Partido 3er lugar", and that text went away exactly
 * when the teams arrived.
 *
 * Singular, unlike `PlayoffBracket`'s labels: that names a round of the bracket
 * and this names one match inside it.
 */
const STAGE_KEYS: Record<MatchStage, StringKey | null> = {
  regular: null,
  playin: 'Repechaje',
  quarterfinal: 'Cuartos',
  semifinal: 'Semifinal',
  final: 'Final',
  'third-place': 'Tercer puesto',
  'fifth-place': 'Quinto puesto',
  'all-star': 'Juego de estrellas',
}

export function stageKeyFor(stage: MatchStage): StringKey | null {
  return STAGE_KEYS[stage]
}
