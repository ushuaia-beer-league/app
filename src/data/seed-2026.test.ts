/**
 * The generated seed against the season transcribed by hand.
 *
 * `src/utils/fixtures/season-2026.ts` was typed out of section 6.5 of the
 * knowledge base by a person; `src/data/seed-2026.ts` is parsed out of the CSV by
 * `npm run parse:sources`. Two independent readings of the same sheet, so where
 * they disagree one of them is wrong, and a parser that starts dropping a match
 * or misreading the shootout marker fails here rather than on the site.
 */

import {
  PUBLISHED_BEER_STANDINGS,
  PUBLISHED_WUBL_STANDINGS,
  SEASON_2026_MATCHES,
} from '../utils/fixtures/season-2026'
import { standings } from '../utils/standings'
import { SEED_2026 } from './seed-2026'
import { BEER_TEAMS_2026, WUBL_TEAMS_2026 } from './teams-2026'

const beerTeamIds = BEER_TEAMS_2026.map((team) => team.slug)
const wublTeamIds = WUBL_TEAMS_2026.map((team) => team.slug)

describe('the 2026 seed', () => {
  it('carries the season and the date the totals were published', () => {
    expect(SEED_2026.season).toBe(2026)
    expect(SEED_2026.publishedOn).toBe('2026-07-04')
  })

  it('produces the Beer League table the league published', () => {
    expect(
      standings(SEED_2026.matches, {
        competition: 'beer',
        teamIds: beerTeamIds,
      }),
    ).toEqual(PUBLISHED_BEER_STANDINGS)
  })

  it('produces the Women’s Beer League table the league published', () => {
    expect(
      standings(SEED_2026.matches, {
        competition: 'wubl',
        teamIds: wublTeamIds,
      }),
    ).toEqual(PUBLISHED_WUBL_STANDINGS)
  })

  it('agrees with the season transcribed by hand, competition by competition', () => {
    for (const competition of ['beer', 'wubl'] as const) {
      expect(standings(SEED_2026.matches, { competition })).toEqual(
        standings(SEASON_2026_MATCHES, { competition }),
      )
    }
  })

  it('keeps the fixture row the sheet leaves without teams', () => {
    // The bracket rows name no teams either, but for a different reason: their
    // sides are printed as positions. This is about the round-1 slot the sheet
    // leaves blank.
    const empty = SEED_2026.matches.filter(
      (match) =>
        match.stage === 'regular' &&
        match.homeTeamId === null &&
        match.awayTeamId === null,
    )

    expect(empty).toHaveLength(1)
    expect(empty[0]).toMatchObject({
      date: '2026-05-23',
      time: '21:30',
      venue: 'bahia',
      score: null,
    })
  })

  it('carries the playoff rounds, with their sides still undecided', () => {
    const bracket = SEED_2026.matches.filter(
      (match) => match.stage !== 'regular',
    )

    expect(bracket.map((match) => match.stage).sort()).toEqual([
      'fifth-place',
      'final',
      'final',
      'playin',
      'quarterfinal',
      'quarterfinal',
      'semifinal',
      'semifinal',
      'semifinal',
      'semifinal',
      'third-place',
      'third-place',
    ])
    // Only the play-in has been decided; every other bracket row is still a
    // placeholder on the sheet, so it carries no teams and no score.
    for (const match of bracket.filter(
      (candidate) => candidate.stage !== 'playin',
    )) {
      expect(match.homeTeamId).toBeNull()
      expect(match.score).toBeNull()
    }
  })

  it('leaves the cabecera unset where the sheet has not assigned one', () => {
    const unassigned = SEED_2026.matches.filter((match) => match.venue === null)

    expect(unassigned.length).toBeGreaterThan(0)
    for (const match of unassigned) {
      expect(match.stage).not.toBe('regular')
    }
  })

  it('holds the roster the sheet publishes, gaps included', () => {
    const beer = SEED_2026.rosters.filter(
      (entry) => entry.competition === 'beer',
    )

    // The roster sheet is the Beer League's, and this is it: seventy people, one
    // of whom the sheet gives no number.
    expect(beer).toHaveLength(70)
    expect(beer.filter((entry) => entry.jerseyNumber === null)).toHaveLength(1)
  })

  it('holds the women’s roster derived from the statistics, with no numbers', () => {
    const wubl = SEED_2026.rosters.filter(
      (entry) => entry.competition === 'wubl',
    )

    // No sheet publishes these. Every row comes from a published statistics line
    // naming a woman and her team, which is why not one of them has a number: the
    // statistics never carry one, and inventing one would be inventing a fact.
    expect(wubl).toHaveLength(36)
    expect(wubl.every((entry) => entry.jerseyNumber === null)).toBe(true)

    // Four teams, and each of them has a roster now.
    expect(new Set(wubl.map((entry) => entry.teamSlug)).size).toBe(4)

    expect(SEED_2026.players).toHaveLength(92)
  })

  it('gives a woman who plays in both competitions one identity and two rosters', () => {
    // Fourteen women are on a Beer League roster and on a women's statistics
    // line. Each is one person with two roster rows, never two people, which is
    // the rule the league actually plays by.
    const byPlayer = new Map<string, Set<string>>()
    for (const entry of SEED_2026.rosters) {
      const seen = byPlayer.get(entry.playerSlug) ?? new Set<string>()
      seen.add(entry.competition)
      byPlayer.set(entry.playerSlug, seen)
    }

    const inBoth = [...byPlayer]
      .filter(([, competitions]) => competitions.size === 2)
      .map(([slug]) => slug)

    expect(inBoth).toHaveLength(14)
    expect(inBoth).toContain('guete-nadin')

    // Carbone Ana is deliberately not among them: her only women's line is marked
    // as a substitute, and a substitute is not a roster player in this league.
    expect(inBoth).not.toContain('carbone-ana')

    for (const slug of inBoth) {
      expect(
        SEED_2026.players.filter((player) => player.slug === slug),
      ).toHaveLength(1)
    }
  })

  it('carries the published totals as transcribed lines, with no percentage', () => {
    expect(SEED_2026.publishedPlayerStats.length).toBeGreaterThan(100)
    expect(SEED_2026.publishedGoalieStats).toHaveLength(11)

    for (const line of SEED_2026.publishedGoalieStats) {
      expect(line).not.toHaveProperty('savePercentage')
      expect(line).not.toHaveProperty('printedSavePercentage')
      expect(line.goalsAgainst).toBeLessThanOrEqual(line.shotsFaced)
    }
    for (const line of SEED_2026.publishedPlayerStats) {
      expect(line.points).toBe(line.goals + line.assists)
    }
  })

  it('carries the unresolved facts instead of hiding them', () => {
    expect(SEED_2026.findings.length).toBeGreaterThan(0)
    expect(SEED_2026.findings.join('\n')).toContain('Jersey 28')
  })
})
