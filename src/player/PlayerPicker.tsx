import { useState } from 'react'
import { useT } from '../i18n/useLanguage'
import { playerContext, type PlayerCandidate } from './playerAccounts'
import { findPlayerNames } from './playerNames'

interface Props {
  players: readonly PlayerCandidate[]
  initialQuery: string
  disabled?: boolean
  onChoose: (player: PlayerCandidate) => void
}

export function PlayerPicker({
  players,
  initialQuery,
  disabled,
  onChoose,
}: Props) {
  const t = useT()
  const [query, setQuery] = useState(initialQuery)
  const choices = findPlayerNames(players, query)

  return (
    <div className="player-picker">
      <label>
        {t('Nombre en la ficha')}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={100}
          autoComplete="off"
        />
      </label>
      {query.trim().length >= 2 && choices.length === 0 && (
        <p>{t('No encontramos fichas con ese nombre.')}</p>
      )}
      <ul className="player-list">
        {choices.slice(0, 20).map((player) => {
          const context = playerContext(player)
          return (
            <li key={player.id}>
              <button
                className="player-choice"
                type="button"
                disabled={disabled}
                onClick={() => onChoose(player)}
              >
                <strong>{player.full_name}</strong>
                {context.length > 0 && <span>{context.join(' / ')}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {choices.length > 20 && (
        <p>{t('Escribí un nombre más completo para ver menos resultados.')}</p>
      )}
    </div>
  )
}
