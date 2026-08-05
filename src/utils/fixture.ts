/**
 * The fixture, grouped the way the league actually plays it.
 *
 * Two matches run at the same time in the two cabeceras, so a time slot holds
 * more than one match and a view that assumes otherwise silently hides half of
 * every round. Grouping by date and then by time is what makes that structure
 * visible instead of accidental.
 */

import type { CompetitionKey, Match, MatchStage } from '../data/types'

export interface FixtureSlot {
  /** `HH:MM`. */
  time: string
  /** Every match starting at this time, one per cabecera. */
  matches: readonly Match[]
}

export interface FixtureRound {
  /** `YYYY-MM-DD`. */
  date: string
  slots: readonly FixtureSlot[]
}

/**
 * Every match of one competition, by date and time. Playoff rows are included:
 * a fixture that stopped at the regular season would hide the only matches still
 * to be played.
 */
export function fixtureRounds(
  matches: readonly Match[],
  { competition }: { competition: CompetitionKey },
): FixtureRound[] {
  const rounds = new Map<string, Map<string, Match[]>>()

  for (const match of matches) {
    if (match.competition !== competition) continue

    const slots = rounds.get(match.date) ?? new Map<string, Match[]>()
    rounds.set(match.date, slots)
    slots.set(match.time, [...(slots.get(match.time) ?? []), match])
  }

  return [...rounds.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, slots]) => ({
      date,
      slots: [...slots.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, slotMatches]) => ({
          time,
          // Bahía before Poli, and a slot with no cabecera assigned last, so the
          // order on screen is the order on the sheet.
          matches: [...slotMatches].sort((a, b) =>
            (a.venue ?? 'zzz').localeCompare(b.venue ?? 'zzz'),
          ),
        })),
    }))
}

/** The rounds a bracket is drawn in, in the order they are played. */
export const BRACKET_STAGES = [
  'playin',
  'quarterfinal',
  'semifinal',
  'third-place',
  'fifth-place',
  'final',
] as const satisfies readonly MatchStage[]

export interface BracketRound {
  stage: (typeof BRACKET_STAGES)[number]
  matches: readonly Match[]
}

/**
 * The playoff rounds of one competition, in playing order, skipping a round the
 * competition does not have. Nothing is inferred about who will play: a bracket
 * row whose sides the sheet prints as positions keeps no teams, and its `notes`
 * carry what was printed, so the site can show "3er Lugar" rather than a blank.
 */
export function bracketRounds(
  matches: readonly Match[],
  { competition }: { competition: CompetitionKey },
): BracketRound[] {
  return BRACKET_STAGES.map((stage) => ({
    stage,
    matches: matches
      .filter(
        (match) => match.competition === competition && match.stage === stage,
      )
      .sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      ),
  })).filter((round) => round.matches.length > 0)
}

export interface SplitFixture {
  /** Today and later, soonest first: what somebody opening the site is looking for. */
  upcoming: FixtureRound[]
  /** Yesterday and earlier, most recent first. */
  past: FixtureRound[]
}

/**
 * The fixture cut in two, because the two halves answer different questions.
 *
 * A visitor opens the site to find out when the next match is, and reads the past
 * only to check a result they half remember. One long list ordered by date serves
 * neither: the thing being looked for is either at the very bottom, or buried
 * under rounds that were played months ago.
 *
 * So what is still to come is ordered soonest first, and what has been played is
 * ordered most recent first. Both orders point at today, from opposite sides.
 *
 * `today` is a parameter and not a reading of the clock, for the same reason
 * every other rule in this directory takes its inputs: a function that asks the
 * machine what day it is cannot be tested on the interesting days, and the
 * interesting day here is the one a round falls on.
 *
 * A round that falls on today counts as upcoming for the whole day, including
 * after its matches have been played. That is deliberate: on a match day the
 * question is what is on tonight, and having the round vanish at some hour into
 * a collapsed list of the past would hide exactly what the site is being opened
 * for. Dates compare as text because `YYYY-MM-DD` sorts chronologically.
 *
 * A match whose date has passed and whose result nobody reported stays in the
 * past, showing the gap. It is not promoted back into the upcoming half: the
 * league's own sheet has such a row from May, and a fixture that kept offering it
 * as a coming attraction would be lying about the season rather than admitting
 * what it does not know.
 */
export function splitFixtureByDate(
  rounds: readonly FixtureRound[],
  today: string,
): SplitFixture {
  const upcoming = rounds
    .filter((round) => round.date >= today)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))

  const past = rounds
    .filter((round) => round.date < today)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))

  return { upcoming, past }
}
