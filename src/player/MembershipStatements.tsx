import { useCallback } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import { loadOwnMembershipStatements } from './membershipQueries'
import { PlayerLoadError } from './PlayerLoadError'
import { usePlayerResource } from './usePlayerResource'
import type { Tables } from '../data/database.types'

type Statement = Tables<'membership_statements'>

export function MembershipStatements({ userId }: { userId: string }) {
  const { t } = useLanguage()
  const load = useCallback(() => loadOwnMembershipStatements(userId), [userId])
  const { data, failed, reload } = usePlayerResource(load)

  return (
    <section className="player-card">
      <h2>{t('Cuenta corriente')}</h2>
      {failed && <PlayerLoadError onRetry={reload} />}
      {!data && !failed && <p role="status">{t('Cargando tu cuenta…')}</p>}
      {data?.length === 0 && (
        <p>
          {t('La liga todavía no habilitó estados de cuenta para tu usuario.')}
        </p>
      )}
      {data && data.length > 0 && (
        <ul className="player-list">
          {data.map((statement) => (
            <li key={statement.id}>
              <MembershipSummary statement={statement} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function MembershipSummary({ statement }: { statement: Statement }) {
  const { t, language } = useLanguage()
  const money = new Intl.NumberFormat(language === 'es' ? 'es-AR' : language, {
    style: 'currency',
    currency: 'ARS',
  })
  const competition =
    statement.competition_key === 'beer' ? 'Beer League' : 'Women’s Beer League'
  return (
    <>
      <strong>
        {competition} · {statement.season_year}
      </strong>
      <p>
        {t('Pagos registrados')}
        {' · '}
        {statement.payments_cents.length
          ? statement.payments_cents
              .map((amount) => money.format(amount / 100))
              .join(' / ')
          : '–'}
      </p>
      <p>
        {t('Saldo pendiente')}
        {' · '}
        {statement.balance_cents === null
          ? t('Sin confirmar')
          : money.format(statement.balance_cents / 100)}
      </p>
    </>
  )
}
