import { useEffect, useState } from 'react'
import { isStale, publishedVersion, runningVersion } from './fresh-version'
import { useT } from '../i18n/useLanguage'
import './NewVersionBanner.css'

/** Every ten minutes, which is often enough for a league and cheap enough. */
const EVERY = 10 * 60 * 1000

/**
 * Tells somebody their page is older than the site, and offers the reload.
 *
 * Checked when the tab comes back to the front — which is when a phone that has
 * been in a pocket since yesterday is about to be looked at — and every ten
 * minutes while it is open. The file it asks for is one line long.
 *
 * It never appears unless both versions are known and they differ, so a failed
 * request, a development build or a paused host say nothing at all.
 */
export function NewVersionBanner() {
  const t = useT()
  const [stale, setStale] = useState(false)

  useEffect(() => {
    const running = runningVersion(import.meta.url)
    if (running === null) return

    let current = true
    const look = () => {
      void publishedVersion().then((published) => {
        if (current && isStale(running, published)) setStale(true)
      })
    }

    look()
    const timer = setInterval(look, EVERY)
    const onFocus = () => {
      if (document.visibilityState === 'visible') look()
    }
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      current = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  if (!stale) return null

  return (
    <div className="new-version" role="status">
      <span>{t('Hay una versión nueva del sitio.')}</span>
      <button
        className="new-version__reload"
        onClick={() => window.location.reload()}
        type="button"
      >
        {t('Actualizar')}
      </button>
    </div>
  )
}
