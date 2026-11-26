import { todayIso } from '../components/dates'
import {
  PLAYER_APPEARANCE_SELECT,
  PLAYER_GOALIE_SELECT,
  PLAYER_GOAL_SELECT,
  PLAYER_MATCH_SELECT,
} from '../data/queries'
import type { CompetitionKey } from '../data/types'
import { playerClient, resultData } from './playerAccounts'
import { personalStatistics } from './playerStatistics'

export async function loadPlayerSeasons(playerId: string) {
  const client = await playerClient()
  const [seasons, competitions, player] = await Promise.all([
    client
      .from('seasons')
      .select('id, year, status')
      .order('year', { ascending: false }),
    client.from('competitions').select('key, name').order('key'),
    client
      .from('players')
      .select('full_name, level, position')
      .eq('id', playerId)
      .single(),
  ])
  const profile = resultData(player)
  if (!profile) throw new Error('The linked player was not found')
  const eligibleCompetitions = (resultData(competitions) ?? []).flatMap<{
    key: CompetitionKey
    name: string
  }>((row) =>
    row.key === 'beer' || row.key === 'wubl' ? [{ ...row, key: row.key }] : [],
  )
  return {
    seasons: resultData(seasons) ?? [],
    competitions: eligibleCompetitions,
    player: profile,
  }
}

export async function loadPlayerHistory(
  playerId: string,
  seasonId: string,
  competition: CompetitionKey,
) {
  const client = await playerClient()
  const [
    roster,
    appearances,
    goals,
    goalies,
    scoringPublication,
    goaliePublication,
  ] = await Promise.all([
    client
      .from('team_players')
      .select(
        'id, team_id, jersey_number, active, team:team_players_team_fkey (short_name)',
      )
      .eq('player_id', playerId)
      .eq('season_id', seasonId)
      .eq('competition_key', competition)
      .order('id'),
    client
      .from('match_players')
      .select(PLAYER_APPEARANCE_SELECT)
      .eq('player_id', playerId)
      .eq('match.season_id', seasonId)
      .eq('match.competition_key', competition),
    client
      .from('match_goals')
      .select(PLAYER_GOAL_SELECT)
      .or(`scorer_id.eq.${playerId},assist_id.eq.${playerId}`)
      .eq('match.season_id', seasonId)
      .eq('match.competition_key', competition),
    client
      .from('goalie_lines')
      .select(PLAYER_GOALIE_SELECT)
      .eq('player_id', playerId)
      .eq('match.season_id', seasonId)
      .eq('match.competition_key', competition),
    client
      .from('published_player_stats')
      .select('published_on')
      .eq('season_id', seasonId)
      .eq('competition_key', competition)
      .order('published_on', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('published_goalie_stats')
      .select('published_on')
      .eq('season_id', seasonId)
      .eq('competition_key', competition)
      .order('published_on', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const rosters = resultData(roster) ?? []
  const games = resultData(appearances) ?? []
  const goalEvents = (resultData(goals) ?? []).flatMap((row) =>
    row.match
      ? [
          {
            date: row.match.match_date,
            matchId: row.match_id,
            teamId: row.team_id,
            competition,
            scorerId: row.scorer_id,
            assistId: row.assist_id,
          },
        ]
      : [],
  )
  const goalieLines = (resultData(goalies) ?? []).flatMap((row) =>
    row.match
      ? [
          {
            date: row.match.match_date,
            matchId: row.match_id,
            teamId: row.team_id,
            playerId: row.player_id,
            competition,
            shotsFaced: row.shots_faced,
            goalsAgainst: row.goals_against,
          },
        ]
      : [],
  )

  const scoringOn = resultData(scoringPublication)?.published_on ?? null
  const goalieOn = resultData(goaliePublication)?.published_on ?? null
  const teamIds = [
    ...new Set(rosters.filter((row) => row.active).map((row) => row.team_id)),
  ]
  const [publishedScoring, publishedGoalie, upcoming] = await Promise.all([
    scoringOn
      ? client
          .from('published_player_stats')
          .select('goals, assists, points')
          .eq('player_id', playerId)
          .eq('season_id', seasonId)
          .eq('competition_key', competition)
          .eq('published_on', scoringOn)
          .order('source_file')
          .order('id')
          .limit(1)
          .maybeSingle()
      : null,
    goalieOn
      ? client
          .from('published_goalie_stats')
          .select('games_played, shots_faced, goals_against')
          .eq('player_id', playerId)
          .eq('season_id', seasonId)
          .eq('competition_key', competition)
          .eq('published_on', goalieOn)
          .order('source_file')
          .order('id')
          .limit(1)
          .maybeSingle()
      : null,
    teamIds.length
      ? client
          .from('matches')
          .select(PLAYER_MATCH_SELECT)
          .eq('season_id', seasonId)
          .eq('competition_key', competition)
          .is('home_goals', null)
          .gte('match_date', todayIso())
          .or(
            `home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`,
          )
          .order('match_date')
          .order('start_time')
      : null,
  ])

  return {
    rosters,
    goalEvents,
    goalieLines,
    games: games
      .flatMap((row) => (row.match ? [{ ...row, match: row.match }] : []))
      .sort(
        (left, right) =>
          right.match.match_date.localeCompare(left.match.match_date) ||
          right.match.start_time.localeCompare(left.match.start_time),
      ),
    upcoming: upcoming ? (resultData(upcoming) ?? []) : [],
    statistics: personalStatistics({
      playerId,
      competition,
      scoringOn,
      goalieOn,
      goals: goalEvents,
      goalieLines,
      publishedScoring: publishedScoring ? resultData(publishedScoring) : null,
      publishedGoalie: publishedGoalie ? resultData(publishedGoalie) : null,
    }),
  }
}

export type PlayerHistory = Awaited<ReturnType<typeof loadPlayerHistory>>
