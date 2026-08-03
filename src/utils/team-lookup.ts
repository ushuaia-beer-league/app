import type { TeamSeed } from '../data/teams-2026'
import type { CompetitionKey } from '../data/types'
import { matchKey } from './source-notation'

/**
 * Finds a team by any spelling the sources use for it: the fixture's short name,
 * the roster sheet's sponsored name, the bracket's nickname or a recorded alias.
 *
 * Matching is confined to one competition on purpose. Four of the women's teams
 * are named after men's teams, so "Sucucho" without a competition is genuinely
 * ambiguous, and resolving it by guessing would file a women's result under a
 * Beer League team.
 */
export function findTeam(
  teams: readonly TeamSeed[],
  competition: CompetitionKey,
  printedName: string,
): TeamSeed | null {
  const wanted = matchKey(printedName)
  if (wanted === '') return null

  for (const team of teams) {
    if (team.competition !== competition) continue

    const spellings = [
      team.shortName,
      team.fullName,
      team.nickname,
      ...team.aliases,
    ]
    if (
      spellings.some(
        (spelling) => spelling !== null && matchKey(spelling) === wanted,
      )
    ) {
      return team
    }
  }
  return null
}

/**
 * Finds a person by a name that one sheet may have truncated. The statistics
 * exports cut names off mid-word ("Beltrami Ramir", "Amaolo Lanata Euge"), so an
 * exact comparison finds nothing and a prefix comparison is the only thing that
 * can work.
 *
 * A prefix that fits two people is not a match: returning either one would put
 * somebody else's goals on their line. Such a row is left unresolved instead.
 */
export function findByTruncatedName<Person extends { name: string }>(
  people: readonly Person[],
  printedName: string,
): Person | null {
  const printed = matchKey(printedName)
  if (printed === '') return null

  const printedTokens = printed.split(' ')
  const candidates = people.map((person) => {
    const key = matchKey(person.name)
    return { person, key, tokens: key.split(' ') }
  })

  /** One hit is an answer; two hits mean the sheets cannot tell them apart. */
  const only = (hits: typeof candidates) =>
    hits.length === 1 ? hits[0]!.person : null

  // The name as printed, once case and accents stop mattering.
  const exact = candidates.filter((candidate) => candidate.key === printed)
  if (exact.length > 0) return only(exact)

  // Either string may be the truncated one. The statistics sheets cut names off
  // ("Ceravolo Agust"), and the roster sheet has its own short forms
  // ("Ceravolo Agus"), so the comparison has to work in both directions.
  const prefixed = candidates.filter(
    (candidate) =>
      candidate.key.startsWith(printed) || printed.startsWith(candidate.key),
  )
  if (prefixed.length > 0) return only(prefixed)

  // "Ariadna, Avila" against "avila ariadna": the same words, the other way
  // round. Nothing is inferred, the two names hold exactly the same tokens.
  const sorted = [...printedTokens].sort().join(' ')
  const reordered = candidates.filter(
    (candidate) => [...candidate.tokens].sort().join(' ') === sorted,
  )
  if (reordered.length > 0) return only(reordered)

  // Surname plus given name, ignoring whatever sits between them: the roster
  // keeps nicknames in the middle ("Zahr Turco Leandro", "Rodriguez Puma
  // Luciano", "Leuenberger Colo Federico") and the statistics sheets do not.
  // The surname has to be identical, so a different spelling of it is not a
  // match: "Velasquez Lucia" never reaches "Velazquez Luciano", and that pair
  // stays for the organisation to confirm.
  if (printedTokens.length >= 2) {
    const surname = printedTokens[0]
    const given = printedTokens[printedTokens.length - 1]
    const byEnds = candidates.filter((candidate) => {
      if (candidate.tokens.length < 2 || candidate.tokens[0] !== surname)
        return false
      const candidateGiven = candidate.tokens[candidate.tokens.length - 1]!

      // Both given names have to be long enough to mean something. Without this,
      // "Tibaudin Ana J" matches "Tibaudin Jose", because "jose" does start with
      // "j", and a woman's goals end up on a man's line. An initial is not
      // evidence of identity.
      if (Math.min(candidateGiven.length, given!.length) < 3) return false

      return (
        candidateGiven.startsWith(given!) || given!.startsWith(candidateGiven)
      )
    })
    if (byEnds.length > 0) return only(byEnds)
  }

  return null
}
