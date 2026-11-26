import { useT } from '../i18n/useLanguage'

export function PlayerLoadError({ onRetry }: { onRetry: () => void }) {
  const t = useT()
  return (
    <div className="player-card">
      <p role="alert">{t('No pudimos cargar la información.')}</p>
      <button className="player-action" type="button" onClick={onRetry}>
        {t('Reintentar')}
      </button>
    </div>
  )
}
