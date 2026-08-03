/**
 * Domain types for the Ushuaia Beer League.
 *
 * The rules these types encode are the league's own, not ordinary hockey's:
 * see the "Domain rules" section of `CLAUDE.md` and section 4 of
 * `docs/knowledge-base.md`.
 */

/** The competitions the league runs. `stars` and `milkshake` are not built yet. */
export type CompetitionKey = 'beer' | 'wubl'

/** The two rinks, called cabeceras. Two matches run at once, one in each. */
export type Venue = 'bahia' | 'poli'

/**
 * Where a match sits in the season. Only `regular` feeds the standings: the
 * 6th-versus-7th play-in of 4 July 2026 decides a playoff berth and is not
 * counted as a seventh regular game in the published table.
 */
export type MatchStage =
  | 'regular'
  | 'playin'
  /**
   * Six teams reach the 2026 bracket, so the two 21:30 matches of 8 August are
   * quarterfinals: their winners meet the first and the second seed in the
   * semifinals the sheet labels as such, later the same night.
   */
  | 'quarterfinal'
  | 'semifinal'
  | 'final'
  | 'third-place'
  | 'fifth-place'
  | 'all-star'

/**
 * How a match ended. A draw is a real result in the women's competition, where
 * the standings sheet carries an "empate" column instead of PPSO.
 */
export type MatchResolution = 'regulation' | 'shootout' | 'draw'

/** A recorded score. Absent while a match is unplayed or unreported. */
export interface MatchScore {
  home: number
  away: number
  resolution: MatchResolution
}

/**
 * One fixture row. Teams are nullable because the source sheet holds a row with
 * a time and a venue and no teams, and that gap is published as a gap rather
 * than filled in with a guess.
 */
export interface Match {
  id: string
  competition: CompetitionKey
  stage: MatchStage
  /** Calendar day, `YYYY-MM-DD`. */
  date: string
  /** Local start time, `HH:MM`. */
  time: string
  /**
   * Null while the cabecera is still unassigned, which is how the 2026 sheet
   * leaves the semifinals, the finals and the all-star game.
   */
  venue: Venue | null
  homeTeamId: string | null
  awayTeamId: string | null
  score: MatchScore | null
  /**
   * What the sheet said where a fact is missing: the sides printed as positions
   * ("3er Lugar (hanta)"), a winner column naming a team that did not play, a
   * slot with no teams at all. Null when the row needs no explanation. This is
   * how an incomplete fact stays readable instead of being merely absent.
   */
  notes: string | null
}

/** What one team took from one match. */
export type Outcome =
  | 'regulation-win'
  | 'shootout-win'
  | 'draw'
  | 'shootout-loss'
  | 'regulation-loss'

/**
 * A standings row. Every total here is derived from match records on read and
 * never stored, so the table cannot drift from the results behind it.
 */
export interface StandingsRow {
  teamId: string
  /** PJ. */
  played: number
  points: number
  /** PG: every win, in regulation or in a shootout. */
  wins: number
  /** PGR: wins outside a shootout, the first tiebreaker. */
  regulationWins: number
  /** PPSO. */
  shootoutLosses: number
  draws: number
  /** PP: losses in regulation. */
  losses: number
  /** GA. */
  goalsFor: number
  /** GE. */
  goalsAgainst: number
  /** DIF. */
  goalDifference: number
}

/**
 * One goal as the match sheet records it. `scorerId` is nullable because some
 * sheets carry the goal without the scorer, and inventing a name is worse than
 * publishing the gap.
 */
export interface GoalRecord {
  matchId: string
  competition: CompetitionKey
  teamId: string
  scorerId: string | null
  assistId: string | null
}

/** A player's scoring line, derived from goal records. */
export interface ScoringRow {
  playerId: string
  goals: number
  assists: number
  /** Goals plus assists; the league publishes no first/second assist split. */
  points: number
}

/**
 * A goalkeeper's appearance in one match. Shots faced are written on the sheet;
 * the save percentage never is.
 */
export interface GoalieLine {
  matchId: string
  competition: CompetitionKey
  playerId: string
  teamId: string
  shotsFaced: number
  goalsAgainst: number
}

/** A goalkeeper's aggregate, derived from their lines. */
export interface GoalkeepingRow {
  playerId: string
  gamesPlayed: number
  shotsFaced: number
  goalsAgainst: number
  /** `(shots - goals) / shots` as a ratio, or null when nothing was faced. */
  savePercentage: number | null
}
