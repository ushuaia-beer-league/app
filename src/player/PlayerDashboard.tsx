import { useCallback, useState } from 'react'
import { formatDate } from '../components/dates'
import type { CompetitionKey } from '../data/types'
import { fill } from '../i18n/language'
import { useLanguage, useT } from '../i18n/useLanguage'
import { PlayerLoadError } from './PlayerLoadError'
import {
  loadPlayerHistory,
  loadPlayerSeasons,
  type PlayerHistory,
} from './playerHistory'
import { usePlayerResource } from './usePlayerResource'

export function PlayerDashboard({ playerId }: { playerId: string }) {
  const t = useT()
  const load = useCallback(() => loadPlayerSeasons(playerId), [playerId])
  const { data, failed, reload } = usePlayerResource(load)
  if (failed) return <PlayerLoadError onRetry={reload} />
  if (!data) return <p role="status">{t('Cargando tu historial…')}</p>
  return <DashboardFilters playerId={playerId} options={data} />
}

function DashboardFilters({
  playerId,
  options,
}: {
  playerId: string
  options: Awaited<ReturnType<typeof loadPlayerSeasons>>
}) {
  const t = useT()
  const { player, seasons, competitions } = options
  const [seasonId, setSeason] = useState(
    () =>
      seasons.find((season) => season.status === 'active')?.id ??
      seasons[0]?.id ??
      '',
  )
  const [competition, setCompetition] = useState<CompetitionKey | ''>(
    () => competitions[0]?.key ?? '',
  )

  return (
    <div className="player-dashboard">
      <section className="player-card">
        <h2>{player.full_name}</h2>
        {(player.position || player.level) && (
          <p>{[player.position, player.level].filter(Boolean).join(' · ')}</p>
        )}
        {seasons.length > 0 && competitions.length > 0 ? (
          <div className="player-filters">
            <label>
              {t('Temporada')}
              <select
                value={seasonId}
                onChange={(event) => setSeason(event.target.value)}
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.year}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('Competencia')}
              <select
                value={competition}
                onChange={(event) => {
                  const choice = competitions.find(
                    (item) => item.key === event.target.value,
                  )
                  if (choice) setCompetition(choice.key)
                }}
              >
                {competitions.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <p>{t('Todavía no hay temporadas y competencias para consultar.')}</p>
        )}
      </section>
      {seasonId && competition && (
        <SportingHistory
          playerId={playerId}
          seasonId={seasonId}
          competition={competition}
        />
      )}
    </div>
  )
}

function SportingHistory({
  playerId,
  seasonId,
  competition,
}: {
  playerId: string
  seasonId: string
  competition: CompetitionKey
}) {
  const t = useT()
  const load = useCallback(
    () => loadPlayerHistory(playerId, seasonId, competition),
    [playerId, seasonId, competition],
  )
  const { data, failed, reload } = usePlayerResource(load)
  if (failed) return <PlayerLoadError onRetry={reload} />
  if (!data) return <p role="status">{t('Cargando tu historial…')}</p>
  return (
    <>
      <section className="player-card">
        <h3>{t('Estadísticas')}</h3>
        <Statistics statistics={data.statistics} />
        <p className="player-muted">
          {t(
            'Los totales pueden incluir partidos sin planilla individual disponible.',
          )}
        </p>
      </section>
      <section className="player-card">
        <h3>{t('Equipos')}</h3>
        {data.rosters.length === 0 ? (
          <p>{t('No hay equipos registrados para esta selección.')}</p>
        ) : (
          <ul className="player-list">
            {data.rosters.map((row) => (
              <li key={row.id}>
                {row.team?.short_name ?? t('Equipo')}
                {row.jersey_number !== null && ` · #${row.jersey_number}`}
                {!row.active && ` · ${t('Plantel anterior')}`}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="player-card">
        <h3>{t('Próximos partidos')}</h3>
        {data.upcoming.length === 0 ? (
          <p>{t('Tu plantel no tiene próximos partidos publicados.')}</p>
        ) : (
          <ul className="player-list player-match-list">
            {data.upcoming.map((match) => (
              <li key={match.id}>
                <MatchInfo match={match} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="player-card">
        <h3>{t('Partidos jugados')}</h3>
        {data.games.length === 0 ? (
          <p>
            {t(
              'No hay participaciones registradas en las planillas de esta selección.',
            )}
          </p>
        ) : (
          <ul className="player-list player-match-list">
            {data.games.map(
              ({ match, is_substitute, is_franchise, team_id }) => {
                const goals = data.goalEvents.filter(
                  (goal) =>
                    goal.matchId === match.id && goal.scorerId === playerId,
                ).length
                const assists = data.goalEvents.filter(
                  (goal) =>
                    goal.matchId === match.id && goal.assistId === playerId,
                ).length
                const goalie = data.goalieLines.find(
                  (line) => line.matchId === match.id,
                )
                const team =
                  match.home_team_id === team_id
                    ? match.home_team
                    : match.away_team
                return (
                  <li key={match.id}>
                    <MatchInfo match={match} />
                    {team?.short_name && (
                      <p>
                        {fill(t('Tu equipo: {name}'), {
                          name: team.short_name,
                        })}
                      </p>
                    )}
                    {(is_substitute || is_franchise) && (
                      <p>
                        {[
                          is_substitute && t('Suplente'),
                          is_franchise && t('Franquicia'),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    {(goals > 0 || assists > 0) && (
                      <p>
                        {t('Goles')}: {goals} · {t('Asistencias')}: {assists}
                      </p>
                    )}
                    {goalie && (
                      <p>
                        {t('Tiros recibidos')}: {goalie.shotsFaced} ·{' '}
                        {t('Goles recibidos')}: {goalie.goalsAgainst}
                      </p>
                    )}
                  </li>
                )
              },
            )}
          </ul>
        )}
      </section>
    </>
  )
}

function MatchInfo({ match }: { match: PlayerHistory['upcoming'][number] }) {
  const t = useT()
  const score =
    match.home_goals !== null && match.away_goals !== null
      ? `${match.home_goals}–${match.away_goals}`
      : '–'
  return (
    <>
      <strong>
        {match.home_team?.short_name ?? t('Por confirmar')} {score}{' '}
        {match.away_team?.short_name ?? t('Por confirmar')}
      </strong>
      <p>
        <time dateTime={`${match.match_date}T${match.start_time}`}>
          {formatDate(match.match_date)} · {match.start_time.slice(0, 5)}
        </time>
      </p>
    </>
  )
}

function Statistics({
  statistics,
}: {
  statistics: PlayerHistory['statistics']
}) {
  const { language, t } = useLanguage()
  const { scoring, goalie } = statistics
  if (!scoring && !goalie)
    return (
      <p>
        {t('Todavía no hay estadísticas individuales para esta selección.')}
      </p>
    )
  const percentage =
    goalie?.savePercentage == null
      ? '–'
      : new Intl.NumberFormat(language, {
          style: 'percent',
          maximumFractionDigits: 1,
        }).format(goalie.savePercentage)
  return (
    <dl className="player-statistics">
      {scoring && (
        <>
          <div>
            <dt>{t('Goles')}</dt>
            <dd>{scoring.goals}</dd>
          </div>
          <div>
            <dt>{t('Asistencias')}</dt>
            <dd>{scoring.assists}</dd>
          </div>
          <div>
            <dt>{t('Puntos')}</dt>
            <dd>{scoring.points}</dd>
          </div>
        </>
      )}
      {goalie && (
        <>
          <div>
            <dt>{t('Partidos como arquero')}</dt>
            <dd>{goalie.gamesPlayed}</dd>
          </div>
          <div>
            <dt>{t('Tiros recibidos')}</dt>
            <dd>{goalie.shotsFaced}</dd>
          </div>
          <div>
            <dt>{t('Goles recibidos')}</dt>
            <dd>{goalie.goalsAgainst}</dd>
          </div>
          <div>
            <dt>{t('Porcentaje de atajadas')}</dt>
            <dd>{percentage}</dd>
          </div>
        </>
      )}
    </dl>
  )
}
