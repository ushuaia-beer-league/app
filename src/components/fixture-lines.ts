import type { Match, MatchResolution, Venue } from '../data/types'
import type { FixtureRound } from '../utils/fixture'
import type { ShareLine } from '../utils/share-card'
import { competitionLabel } from './competitions'
import { stageKeyFor } from './stages'

/** The two cabeceras, spelled as the league spells them. */
export const VENUES: Record<Venue, string> = {
  bahia: 'Bahía',
  poli: 'Poli',
}

/** Only a result that is not the plain one is worth saying out loud. */
export const RESOLUTIONS: Record<MatchResolution, string | null> = {
  regulation: null,
  shootout: 'Penales',
  draw: 'Empate',
}

/** What the bracket resolver knows about a match the sheet left teamless. */
export type ResolvedSides = ReadonlyMap<
  string,
  { home: string | null; away: string | null }
>

/**
 * What the sheet printed where a team should be.
 *
 * A bracket row names a position rather than a team, and one round-1 row names
 * nobody at all. The importer records that gap in `Match.notes` and quotes the
 * sheet's own words while doing it: `scripts/parse-sources.ts` writes `Home side
 * printed as "3er Lugar (hanta)"`. Reading the quotation back is what lets the
 * row show "3er Lugar (hanta)" instead of a blank, without any of it being
 * inferred here.
 */
function printedSide(
  notes: string | null,
  side: 'Home' | 'Away',
): string | null {
  if (notes === null) return null

  const quoted = new RegExp(`${side} side printed as "([^"]+)"`).exec(notes)
  return quoted?.[1] ?? null
}

function sideLabel(
  match: Match,
  side: 'home' | 'away',
  teamName: (teamId: string) => string,
): { text: string | null; printed: boolean } {
  const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId
  if (teamId !== null) return { text: teamName(teamId), printed: false }

  const printed = printedSide(match.notes, side === 'home' ? 'Home' : 'Away')
  // A row with neither a team nor a printed side is a slot the sheet left blank.
  // It is still published, as the gap it is.
  return { text: printed, printed: true }
}

/**
 * Both sides of a match: the sheet's team, or the one the resolver derived
 * where the sheet printed a placeholder. One function because the rendered
 * row and the drawn share card must agree about who is playing.
 */
export function matchSides(
  match: Match,
  derived: { home: string | null; away: string | null } | undefined,
  teamName: (teamId: string) => string,
): {
  homeId: string | null
  awayId: string | null
  home: { text: string | null; printed: boolean }
  away: { text: string | null; printed: boolean }
} {
  const homeId = match.homeTeamId ?? derived?.home ?? null
  const awayId = match.awayTeamId ?? derived?.away ?? null
  return {
    homeId,
    awayId,
    home:
      match.homeTeamId === null && homeId !== null
        ? { text: teamName(homeId), printed: false }
        : sideLabel(match, 'home', teamName),
    away:
      match.awayTeamId === null && awayId !== null
        ? { text: teamName(awayId), printed: false }
        : sideLabel(match, 'away', teamName),
  }
}

/**
 * A round as share-card lines: one per match, spelled with the same sides,
 * venues and resolutions the rendered rows show. Exported for its tests.
 */
export function roundShareLines(
  round: FixtureRound,
  {
    resolvedSides,
    teamName,
    unregistered,
    showCompetition,
  }: {
    resolvedSides?: ResolvedSides
    teamName: (teamId: string) => string
    /** What a side the sheet left blank is called, e.g. "Sin registrar". */
    unregistered: string
    showCompetition: boolean
  },
): ShareLine[] {
  return round.slots.flatMap((slot) =>
    slot.matches.map((match) => {
      const { home, away } = matchSides(
        match,
        resolvedSides?.get(match.id),
        teamName,
      )
      const resolution =
        match.score === null ? null : RESOLUTIONS[match.score.resolution]
      const stageKey = stageKeyFor(match.stage)
      const stage = stageKey === null ? null : stageKey
      const sub = [
        slot.time,
        match.venue === null ? 'Cabecera a definir' : VENUES[match.venue],
        // Spanish here, unlike the rendered row: a drawn card carries no
        // translator, and the league shares these in Spanish.
        stage,
        resolution,
        showCompetition ? competitionLabel(match.competition) : null,
      ]
        .filter((part) => part !== null)
        .join(' · ')
      return {
        left: `${home.text ?? unregistered} — ${away.text ?? unregistered}`,
        right:
          match.score === null
            ? match.time
            : `${match.score.home}-${match.score.away}`,
        sub,
      }
    }),
  )
}
