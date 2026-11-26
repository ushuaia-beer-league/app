import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlayerPicker } from '../player/PlayerPicker'
import {
  loadPlayerCatalog,
  loadPlayerLinksForReview,
  playerContext,
  playerErrorCode,
  reviewPlayerLink,
  type PlayerCandidate,
} from '../player/playerAccounts'
import { findPlayerNames } from '../player/playerNames'
import { usePlayerResource } from '../player/usePlayerResource'
import '../player/player-account.css'

type ReviewData = Awaited<ReturnType<typeof loadPlayerLinksForReview>>
type Account = ReviewData['accounts'][number]
type Request = ReviewData['requests'][number]
type Action = Parameters<typeof reviewPlayerLink>[0]

interface Decision {
  action: Action
  account: Account
  playerId: string
  playerName: string
  requestId?: string
}

const ACTION_LABELS = {
  approve: 'Aprobar solicitud',
  reject: 'Rechazar solicitud',
  link: 'Vincular manualmente',
  unlink: 'Desvincular ficha',
} satisfies Record<Action, string>

export function PlayerLinksScreen() {
  const { data, loading, failed, reload } = usePlayerResource(
    loadPlayerLinksForReview,
  )
  const [notice, setNotice] = useState<string | null>(null)
  return (
    <div className="player-dashboard">
      <h1>Vinculaciones de jugadores</h1>
      <Link className="admin__help" to="/admin/manual#vinculaciones">
        ¿Cómo funciona?
      </Link>
      {notice && <p role="status">{notice}</p>}
      {loading && <p role="status">Cargando cuentas y solicitudes…</p>}
      {failed && (
        <div className="player-card">
          <p role="alert">No pudimos cargar las vinculaciones.</p>
          <button className="player-action" type="button" onClick={reload}>
            Reintentar
          </button>
        </div>
      )}
      {data && (
        <ReviewLinks
          data={data}
          onRefresh={reload}
          onSaved={() => {
            setNotice('La decisión quedó guardada.')
            reload()
          }}
        />
      )}
    </div>
  )
}

function ReviewLinks({
  data,
  onSaved,
  onRefresh,
}: {
  data: ReviewData
  onSaved: () => void
  onRefresh: () => void
}) {
  const [decision, setDecision] = useState<Decision | null>(null)
  const [manualAccount, setManualAccount] = useState<Account | null>(null)
  const [accountQuery, setAccountQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const decisionPanel = useRef<HTMLElement>(null)
  const [error, setError] = useState<string | null>(null)
  const byUser = new Map(
    data.accounts.map((account) => [account.user_id, account]),
  )
  const normalizedQuery = accountQuery.trim().toLowerCase()
  const matchName = new Set(
    findPlayerNames(data.accounts, accountQuery).map(
      (account) => account.user_id,
    ),
  )
  const visibleAccounts = data.accounts.filter(
    (account) =>
      normalizedQuery === '' ||
      account.username.includes(normalizedQuery.replace(/^@/, '')) ||
      matchName.has(account.user_id),
  )
  const unlinked = visibleAccounts.filter(
    (account) => account.player_id === null,
  )
  const linked = visibleAccounts.filter((account) => account.player_id !== null)
  const occupied = new Set(
    data.accounts.flatMap((account) =>
      account.player_id ? [account.player_id] : [],
    ),
  )

  useEffect(() => {
    if (decision) decisionPanel.current?.focus()
  }, [decision])

  function propose(change: Decision) {
    if (saving) return
    setError(null)
    setDecision(change)
  }

  async function commit() {
    if (!decision || saving) return
    setSaving(true)
    setError(null)
    try {
      await reviewPlayerLink(
        decision.action,
        decision.account.user_id,
        decision.playerId,
        decision.requestId,
      )
      onSaved()
    } catch (failure) {
      const code = playerErrorCode(failure)
      setError(
        code === '23505'
          ? 'Otra cuenta ya tiene esta ficha.'
          : code === '22023'
            ? 'La vinculación cambió desde que cargaste esta pantalla. Actualizá la lista.'
            : 'No pudimos guardar la decisión. Probá de nuevo.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className="player-card">
        <h2>Solicitudes pendientes</h2>
        {data.requests.length === 0 && <p>No hay solicitudes pendientes.</p>}
        <ul className="player-list">
          {data.requests.map((request) => {
            const account = byUser.get(request.user_id)
            if (!account) return null
            return (
              <RequestRow
                key={request.id}
                request={request}
                account={account}
                disabled={saving}
                available={!occupied.has(request.player_id)}
                onDecision={propose}
              />
            )
          })}
        </ul>
      </section>
      <section className="player-card">
        <h2>Cuentas de jugadores</h2>
        <label>
          Buscar cuenta por nombre o usuario
          <input
            type="search"
            value={accountQuery}
            onChange={(event) => setAccountQuery(event.target.value)}
            maxLength={100}
          />
        </label>
        <h3>Cuentas sin vincular</h3>
        {unlinked.length === 0 && (
          <p>No hay cuentas sin vincular para esta búsqueda.</p>
        )}
        <ul className="player-list">
          {unlinked.map((account) => (
            <li key={account.user_id} className="player-actions">
              <span>
                {account.full_name} · @{account.username}
              </span>
              <button
                className="player-action player-action--quiet"
                type="button"
                disabled={saving}
                onClick={() => {
                  setDecision(null)
                  setError(null)
                  setManualAccount(account)
                }}
              >
                Elegir ficha
              </button>
            </li>
          ))}
        </ul>
        <h3>Cuentas vinculadas</h3>
        {linked.length === 0 && (
          <p>No hay cuentas vinculadas para esta búsqueda.</p>
        )}
        <ul className="player-list">
          {linked.map(
            (account) =>
              account.player_id && (
                <li key={account.user_id} className="player-actions">
                  <span>
                    {account.full_name} · @{account.username} →{' '}
                    {account.player?.full_name ?? 'Ficha de la liga'}
                  </span>
                  <button
                    className="player-action player-action--quiet"
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (!account.player_id) return
                      propose({
                        action: 'unlink',
                        account,
                        playerId: account.player_id,
                        playerName:
                          account.player?.full_name ?? 'Ficha de la liga',
                      })
                    }}
                  >
                    Desvincular
                  </button>
                </li>
              ),
          )}
        </ul>
      </section>
      {manualAccount && !decision && (
        <ManualLink
          key={manualAccount.user_id}
          account={manualAccount}
          occupied={occupied}
          onChoose={(player) =>
            propose({
              action: 'link',
              account: manualAccount,
              playerId: player.id,
              playerName: [player.full_name, ...playerContext(player)].join(
                ' · ',
              ),
            })
          }
          onCancel={() => setManualAccount(null)}
        />
      )}
      {decision && (
        <section
          className="player-card"
          aria-label="Confirmar decisión"
          tabIndex={-1}
          ref={decisionPanel}
        >
          <h2>{ACTION_LABELS[decision.action]}</h2>
          <p>
            Cuenta <strong>@{decision.account.username}</strong> · Ficha{' '}
            <strong>{decision.playerName}</strong>
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="player-actions">
            <button
              className="player-action"
              type="button"
              disabled={saving}
              onClick={() => void commit()}
            >
              Confirmar
            </button>
            <button
              className="player-action player-action--quiet"
              type="button"
              disabled={saving}
              onClick={() => {
                setDecision(null)
                setError(null)
              }}
            >
              Cancelar
            </button>
            {error && (
              <button
                className="player-action player-action--quiet"
                type="button"
                disabled={saving}
                onClick={onRefresh}
              >
                Actualizar lista
              </button>
            )}
          </div>
        </section>
      )}
    </>
  )
}

function RequestRow({
  request,
  account,
  available,
  disabled,
  onDecision,
}: {
  request: Request
  account: Account
  available: boolean
  disabled: boolean
  onDecision: (decision: Decision) => void
}) {
  const playerName = request.player?.full_name ?? 'Ficha de la liga'
  const context = request.player ? playerContext(request.player) : []
  const decide = (action: 'approve' | 'reject') =>
    onDecision({
      action,
      account,
      playerId: request.player_id,
      playerName: [playerName, ...context].join(' · '),
      requestId: request.id,
    })
  return (
    <li>
      <p>
        {account.full_name} · @{account.username} solicita la ficha{' '}
        <strong>{playerName}</strong>
      </p>
      {context.length > 0 && <p>{context.join(' / ')}</p>}
      {!available && <p>Esa ficha ya está vinculada.</p>}
      <div className="player-actions">
        <button
          className="player-action"
          type="button"
          disabled={disabled || !available}
          onClick={() => decide('approve')}
        >
          Aprobar
        </button>
        <button
          className="player-action player-action--quiet"
          type="button"
          disabled={disabled}
          onClick={() => decide('reject')}
        >
          Rechazar
        </button>
      </div>
    </li>
  )
}

function ManualLink({
  account,
  occupied,
  onChoose,
  onCancel,
}: {
  account: Account
  occupied: Set<string>
  onChoose: (player: PlayerCandidate) => void
  onCancel: () => void
}) {
  const { loading, failed, data, reload } = usePlayerResource(loadPlayerCatalog)
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    panel.current?.focus()
  }, [])
  return (
    <section
      className="player-card"
      ref={panel}
      tabIndex={-1}
      aria-label="Elegir ficha"
    >
      <h2>Elegir ficha para @{account.username}</h2>
      {loading && <p role="status">Cargando fichas…</p>}
      {failed && (
        <>
          <p role="alert">No pudimos cargar las fichas.</p>
          <button className="player-action" type="button" onClick={reload}>
            Reintentar
          </button>
        </>
      )}
      {data && (
        <PlayerPicker
          players={data.filter((player) => !occupied.has(player.id))}
          initialQuery={account.full_name}
          onChoose={onChoose}
        />
      )}
      <button
        className="player-action player-action--quiet"
        type="button"
        onClick={onCancel}
      >
        Cancelar
      </button>
    </section>
  )
}
