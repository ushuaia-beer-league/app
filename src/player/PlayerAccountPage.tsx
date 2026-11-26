import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { SiteNav } from '../components/SiteNav'
import { SiteFooter } from '../components/SiteFooter'
import { useLeagueSession } from '../hooks/useLeagueSession'
import { fill, type StringKey } from '../i18n/language'
import { useT } from '../i18n/useLanguage'
import { MembershipStatements } from './MembershipStatements'
import { PlayerDashboard } from './PlayerDashboard'
import { PlayerLoadError } from './PlayerLoadError'
import { PlayerPicker } from './PlayerPicker'
import {
  loadPlayerAccount,
  loadPlayerCatalog,
  playerErrorCode,
  registerPlayer,
  requestPlayerLink,
  type PlayerCandidate,
} from './playerAccounts'
import { usePlayerResource } from './usePlayerResource'
import './player-account.css'

export function PlayerAccountPage() {
  const t = useT()
  const { status, signIn, signOut, retry, error } =
    useLeagueSession('mi-cuenta')

  useEffect(() => {
    document.title = `${t('Mi cuenta')} · Ushuaia Beer League`
  }, [t])

  return (
    <>
      <a className="skip-link" href="#contenido">
        {t('Saltar al contenido')}
      </a>
      <SiteNav />
      <main className="player-page" id="contenido">
        <header className="player-page__header">
          <h1>{t('Mi cuenta')}</h1>
          {status.state === 'signed-in' && (
            <button
              className="player-action player-action--quiet"
              type="button"
              onClick={() => void signOut()}
            >
              {t('Cerrar sesión')}
            </button>
          )}
        </header>
        {error && (
          <p role="alert">
            {t(
              error === 'sign-in'
                ? 'No pudimos iniciar sesión.'
                : 'No pudimos cerrar la sesión.',
            )}
          </p>
        )}
        {status.state === 'loading' && (
          <p role="status">{t('Verificando tu sesión…')}</p>
        )}
        {status.state === 'unconfigured' && (
          <p role="alert">{t('El acceso a las cuentas no está disponible.')}</p>
        )}
        {status.state === 'failed' && <PlayerLoadError onRetry={retry} />}
        {status.state === 'signed-out' && (
          <section className="player-card">
            <p>
              {t('Entrá para vincular tu ficha y ver tu historial en la liga.')}
            </p>
            <button
              className="player-action"
              type="button"
              onClick={() => void signIn()}
            >
              {t('Ingresar con Google')}
            </button>
          </section>
        )}
        {status.state === 'signed-in' && (
          <SignedInAccount
            key={status.session.user.id}
            userId={status.session.user.id}
          />
        )}
      </main>
      <SiteFooter />
    </>
  )
}

function SignedInAccount({ userId }: { userId: string }) {
  const t = useT()
  const load = useCallback(() => loadPlayerAccount(userId), [userId])
  const { data, loading, failed, reload } = usePlayerResource(load)
  const [search, setSearch] = useState(true)

  if (failed) return <PlayerLoadError onRetry={reload} />
  if (loading || !data) return <p role="status">{t('Cargando tu cuenta…')}</p>
  if (!data.account)
    return <Registration userId={userId} onRegistered={reload} />

  const { account, request } = data
  if (account.player_id)
    return (
      <div className="player-dashboard" key={account.player_id}>
        <MembershipStatements userId={userId} />
        <PlayerDashboard playerId={account.player_id} />
      </div>
    )

  return (
    <section className="player-card">
      <h2>{account.full_name}</h2>
      <p>@{account.username}</p>
      {request?.status === 'pending' ? (
        <>
          <h3>{t('Solicitud pendiente')}</h3>
          <p>
            {request.player?.full_name
              ? fill(t('La liga está revisando tu solicitud para {name}.'), {
                  name: request.player.full_name,
                })
              : t('La liga está revisando tu solicitud.')}
          </p>
          <button
            className="player-action player-action--quiet"
            type="button"
            onClick={reload}
          >
            {t('Actualizar estado')}
          </button>
        </>
      ) : (
        <>
          {request?.status === 'rejected' && (
            <p>
              {t('Tu última solicitud fue rechazada. Podés buscar otra ficha.')}
            </p>
          )}
          {search ? (
            <ClaimPicker
              name={account.full_name}
              onRequested={reload}
              onSkip={() => setSearch(false)}
            />
          ) : (
            <>
              <p>
                {t(
                  'Tu cuenta está lista. La liga también puede vincular tu ficha desde administración.',
                )}
              </p>
              <button
                className="player-action"
                type="button"
                onClick={() => setSearch(true)}
              >
                {t('Buscar mi ficha')}
              </button>
              <button
                className="player-action player-action--quiet"
                type="button"
                onClick={reload}
              >
                {t('Actualizar estado')}
              </button>
            </>
          )}
        </>
      )}
    </section>
  )
}

function Registration({
  userId,
  onRegistered,
}: {
  userId: string
  onRegistered: () => void
}) {
  const t = useT()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<StringKey | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const fields = new FormData(event.currentTarget)
    const username = String(fields.get('username') ?? '')
      .trim()
      .toLowerCase()
    const fullName = String(fields.get('fullName') ?? '').trim()
    if (!/^[a-z0-9_][a-z0-9_-]{2,29}$/.test(username) || fullName.length < 2) {
      setError('Revisá el nombre completo y el nombre de usuario.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await registerPlayer(userId, username, fullName)
      onRegistered()
    } catch (failure) {
      setError(
        playerErrorCode(failure) === '23505'
          ? 'Ese nombre de usuario ya está en uso.'
          : 'No pudimos crear tu cuenta.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="player-card" onSubmit={(event) => void submit(event)}>
      <h2>{t('Creá tu cuenta')}</h2>
      <label>
        {t('Nombre completo')}
        <input
          name="fullName"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          disabled={saving}
        />
      </label>
      <label>
        {t('Nombre de usuario')}
        <input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          minLength={3}
          maxLength={30}
          aria-describedby="player-username-format"
          disabled={saving}
        />
      </label>
      <p id="player-username-format">
        {t(
          'Usá entre 3 y 30 letras sin tildes, números, guiones o guiones bajos.',
        )}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      <button className="player-action" type="submit" disabled={saving}>
        {t('Crear cuenta')}
      </button>
    </form>
  )
}

function ClaimPicker({
  name,
  onRequested,
  onSkip,
}: {
  name: string
  onRequested: () => void
  onSkip: () => void
}) {
  const t = useT()
  const catalog = usePlayerResource(loadPlayerCatalog)
  const [choice, setChoice] = useState<PlayerCandidate | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<StringKey | null>(null)

  async function submit() {
    if (!choice || saving) return
    setError(null)
    setSaving(true)
    try {
      await requestPlayerLink(choice.id)
      onRequested()
    } catch (failure) {
      const code = playerErrorCode(failure)
      if (code === '23505' || code === '42501') {
        onRequested()
      } else {
        setError(
          code === '22023'
            ? 'Esta ficha ya no está disponible.'
            : 'No pudimos enviar la solicitud.',
        )
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h3>{t('Buscá tu ficha')}</h3>
      {catalog.failed && <PlayerLoadError onRetry={catalog.reload} />}
      {catalog.loading && <p role="status">{t('Buscando fichas…')}</p>}
      {catalog.data && !choice && (
        <PlayerPicker
          players={catalog.data.filter((player) => player.active)}
          initialQuery={name}
          onChoose={setChoice}
        />
      )}
      {choice && (
        <>
          <p>{fill(t('Ficha elegida: {name}'), { name: choice.full_name })}</p>
          <div className="player-actions">
            <button
              className="player-action"
              type="button"
              disabled={saving}
              onClick={() => void submit()}
            >
              {t('Esta ficha es mía')}
            </button>
            <button
              className="player-action player-action--quiet"
              type="button"
              disabled={saving}
              onClick={() => {
                setChoice(null)
                setError(null)
              }}
            >
              {t('Elegir otra ficha')}
            </button>
          </div>
        </>
      )}
      {error && <p role="alert">{t(error)}</p>}
      <button
        className="player-action player-action--quiet"
        type="button"
        disabled={saving}
        onClick={onSkip}
      >
        {t('Seguir sin vincular')}
      </button>
    </>
  )
}
