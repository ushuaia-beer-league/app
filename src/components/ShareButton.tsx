import { useState } from 'react'
import type { ShareCard } from '../utils/share-card'
import { shareCardImage } from './share-image'
import { fill } from '../i18n/language'
import { useT } from '../i18n/useLanguage'
import './ShareButton.css'

type ShareButtonProps = {
  /**
   * Called at the tap, not at render: the card reads the table on screen, and
   * building it on every render would repeat that work for a button most
   * visitors never press.
   */
  build: () => ShareCard
  /** The file the phone receives, e.g. `goleadoras-ubl.png`. */
  filename: string
  /** The sentence beside the image in apps that show one. */
  text: string
  /** What is being shared, for the accessible name: "las goleadoras". */
  what: string
}

/**
 * Compartir: draws the card and opens the phone's own share sheet, which is
 * where WhatsApp and Instagram actually are. On a desktop with no share sheet
 * the same image downloads instead — a duller door to the same picture.
 */
export function ShareButton({ build, filename, text, what }: ShareButtonProps) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <span className="share-button">
      <button
        type="button"
        className="share-button__action"
        aria-label={fill(t('Compartir {que} como imagen'), { que: what })}
        disabled={busy}
        onClick={() => {
          setBusy(true)
          setFailed(false)
          shareCardImage(build(), { filename, text })
            .catch(() => setFailed(true))
            .finally(() => setBusy(false))
        }}
      >
        <svg
          className="share-button__icon"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {t('Compartir')}
      </button>
      {failed && (
        <span role="status" className="share-button__error">
          {t('No se pudo armar la imagen para compartir.')}
        </span>
      )}
    </span>
  )
}
