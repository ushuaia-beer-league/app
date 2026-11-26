import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MembershipSummary } from '../player/MembershipStatements'
import {
  assignMembershipStatement,
  loadMembershipStatements,
} from '../player/membershipQueries'
import {
  loadPlayerCatalog,
  loadPlayerLinksForReview,
  playerErrorCode,
} from '../player/playerAccounts'
import { findPlayerNames } from '../player/playerNames'
import { PlayerPicker } from '../player/PlayerPicker'
import { usePlayerResource } from '../player/usePlayerResource'

async function loadScreen() {
  const [statements, players, links] = await Promise.all([
    loadMembershipStatements(),
    loadPlayerCatalog(),
    loadPlayerLinksForReview(),
  ])
  return { statements, players, accounts: links.accounts }
}

type ScreenData = Awaited<ReturnType<typeof loadScreen>>
type Statement = ScreenData['statements'][number]

export function MembershipStatementsScreen() {
  const { data, failed, loading, reload } = usePlayerResource(loadScreen)
  const [query, setQuery] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [selected, setSelected] = useState<Statement | null>(null)
  const [notice, setNotice] = useState(false)
  const visible = (data?.statements ?? []).filter(
    (statement) => !pendingOnly || !statement.player_id,
  )
  const filtered = query.trim()
    ? findPlayerNames(
        visible.map((statement) => ({
          ...statement,
          full_name: statement.source_name,
        })),
        query,
      )
    : visible

  return (
    <div className="player-dashboard">
      <h1>Cuentas corrientes</h1>
      <Link className="admin__help" to="/admin/manual#cuentas-corrientes">
        ¿Cómo funciona?
      </Link>
      {loading && <p role="status">Cargando cuentas corrientes…</p>}
      {failed && (
        <p role="alert">
          No pudimos cargar las cuentas corrientes.{' '}
          <button type="button" onClick={reload}>
            Reintentar
          </button>
        </p>
      )}
      {notice && <p role="status">La asignación quedó guardada.</p>}
      {data && (
        <section className="player-card">
          <label>
            Buscar por nombre en la planilla
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="player-checkbox">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={(event) => setPendingOnly(event.target.checked)}
            />{' '}
            Solo cuentas sin ficha asignada
          </label>
          {filtered.length === 0 && <p>No hay cuentas para mostrar.</p>}
          <ul className="player-list player-match-list">
            {filtered.map((statement) => {
              const player = data.players.find(
                (item) => item.id === statement.player_id,
              )
              const account = data.accounts.find(
                (item) => item.user_id === statement.visible_to,
              )
              return (
                <li key={statement.id}>
                  <h2>{statement.source_name}</h2>
                  <MembershipSummary statement={statement} />
                  <p>
                    {player
                      ? `Ficha asignada · ${player.full_name}`
                      : 'Sin ficha asignada'}
                  </p>
                  <p>
                    {account
                      ? `Visible para @${account.username}`
                      : 'Visibilidad para el jugador pendiente'}
                  </p>
                  <button
                    type="button"
                    className="player-action"
                    onClick={() => {
                      setNotice(false)
                      setSelected(statement)
                    }}
                  >
                    {player ? 'Editar asignación' : 'Asignar ficha'}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {data && selected && (
        <StatementAssignment
          key={selected.id}
          data={data}
          statement={selected}
          onCancel={() => setSelected(null)}
          onSaved={() => {
            setSelected(null)
            setNotice(true)
            reload()
          }}
        />
      )}
    </div>
  )
}

function StatementAssignment({
  data,
  statement,
  onCancel,
  onSaved,
}: {
  data: ScreenData
  statement: Statement
  onCancel: () => void
  onSaved: () => void
}) {
  const [playerId, setPlayerId] = useState(statement.player_id)
  const [choose, setChoose] = useState(!statement.player_id)
  const [share, setShare] = useState(Boolean(statement.visible_to))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const player = data.players.find((item) => item.id === playerId)
  const account = playerId
    ? data.accounts.find((item) => item.player_id === playerId)
    : undefined

  async function save() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await assignMembershipStatement(
        statement.id,
        playerId,
        share ? (account?.user_id ?? null) : null,
      )
      onSaved()
    } catch (failure) {
      setError(
        playerErrorCode(failure) === '23505'
          ? 'La ficha ya tiene una cuenta corriente para esa temporada y competencia.'
          : 'No pudimos guardar la asignación. Verificá que la ficha siga vinculada a la cuenta correcta.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="player-card">
      <h2>Asignar la cuenta de {statement.source_name}</h2>
      <p>
        {player ? `Ficha elegida · ${player.full_name}` : 'Sin ficha elegida'}
      </p>
      {choose && (
        <PlayerPicker
          players={data.players}
          initialQuery={statement.source_name}
          disabled={busy}
          onChoose={(choice) => {
            setPlayerId(choice.id)
            setChoose(false)
            setShare(false)
          }}
        />
      )}
      {!choose && (
        <button
          type="button"
          className="player-action player-action--quiet"
          disabled={busy}
          onClick={() => setChoose(true)}
        >
          Elegir otra ficha
        </button>
      )}
      {account && (
        <label className="player-checkbox">
          <input
            type="checkbox"
            checked={share}
            onChange={(event) => setShare(event.target.checked)}
            disabled={busy}
          />
          Habilitar la consulta privada para @{account.username}
        </label>
      )}
      {player && !account && (
        <p>El jugador todavía no tiene una cuenta vinculada a esta ficha.</p>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="player-actions">
        <button
          type="button"
          className="player-action"
          disabled={busy || choose}
          onClick={() => void save()}
        >
          Guardar asignación
        </button>
        {statement.player_id && (
          <button
            type="button"
            className="player-action player-action--quiet"
            disabled={busy}
            onClick={() => {
              setPlayerId(null)
              setShare(false)
              setChoose(false)
            }}
          >
            Quitar ficha asignada
          </button>
        )}
        <button
          type="button"
          className="player-action player-action--quiet"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </section>
  )
}
