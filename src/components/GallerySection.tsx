import { useEffect, useRef, useState } from 'react'
import { Section } from './Section'
import './GallerySection.css'
import { anchorFor } from '../utils/site-routes'
import { useT } from '../i18n/useLanguage'

/** As many slots as the reference draws, so the grid keeps its proportions. */
const PLACEHOLDER_SLOTS = [0, 1, 2, 3, 4, 5]

/**
 * The gallery: the season's photographs packed like a masonry wall, each one
 * opening full-size in a lightbox.
 *
 * Masonry because the photographs are not one shape: a rink is landscape but
 * a team posing is portrait, and the row grid this used to be stretched every
 * row to its tallest photo — one vertical shot left a hole the size of two
 * photographs beside it. CSS columns pack each column independently, cost no
 * JavaScript, and only reorder reading order top-to-bottom per column, which
 * for a wall of photos is no order anybody was counting on.
 *
 * The lightbox is a native `<dialog>`: Escape, focus containment and the
 * backdrop come from the platform instead of being reimplemented. The arrow
 * keys page through the wall without closing it.
 */
type GallerySectionProps = {
  /** The published gallery, newest ordering decided by the panel. */
  photos?: { url: string; caption: string | null }[]
}

export function GallerySection({ photos = [] }: GallerySectionProps) {
  const t = useT()
  const [shown, setShown] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  // Where a touch began, so lifting the finger can say which way it swiped.
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    // jsdom renders dialogs without implementing showModal; the attribute
    // fallback keeps the tests honest about what opens and closes, and a
    // browser never takes that branch.
    if (shown !== null && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }
    if (shown === null && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [shown])

  const move = (step: number) => {
    if (shown === null || photos.length === 0) return
    setShown((shown + step + photos.length) % photos.length)
  }

  const opened = shown === null ? null : (photos[shown] ?? null)

  /**
   * Shares the open photograph itself — no drawn card, the photo is already
   * the picture. The phone's share sheet where there is one, a download
   * where there is not.
   */
  const sharePhoto = async () => {
    if (opened === null) return
    try {
      const blob = await (await fetch(opened.url)).blob()
      const file = new File([blob], 'foto-ubl.jpg', {
        type: blob.type || 'image/jpeg',
      })
      if (
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          text: 'https://ubl.com.ar/fotos',
        })
        return
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.name
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      // Closing the sheet, or a photo the network refused: nothing to say.
    }
  }

  return (
    <Section
      id={anchorFor('fotos')}
      eyebrow={t('Galería')}
      title={t('Fotos & Momentos')}
    >
      {photos.length > 0 ? (
        <div className="gallery gallery--masonry">
          {photos.map((photo, index) => (
            <figure className="gallery__photo" key={photo.url}>
              <button
                type="button"
                className="gallery__open"
                aria-label={t('Ampliar la foto')}
                onClick={() => setShown(index)}
              >
                <img src={photo.url} alt={photo.caption ?? ''} loading="lazy" />
              </button>
              {photo.caption !== null && (
                <figcaption className="gallery__caption">
                  {photo.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      ) : (
        <div className="gallery" aria-hidden="true">
          {PLACEHOLDER_SLOTS.map((slot) => (
            <div className="gallery__slot" key={slot}>
              <span className="gallery__glyph">📷</span>
            </div>
          ))}
        </div>
      )}

      <p className="gallery__note">
        📁 Las fotos se van agregando a lo largo de la temporada
      </p>

      <dialog
        className="gallery__lightbox"
        ref={dialogRef}
        aria-label={t('Galería')}
        onClose={() => setShown(null)}
        onClick={(event) => {
          // The backdrop is the dialog element itself; anything inside it is
          // the figure, the caption or a button.
          if (event.target === dialogRef.current) setShown(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') move(1)
          if (event.key === 'ArrowLeft') move(-1)
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0]
          touchStart.current = touch
            ? { x: touch.clientX, y: touch.clientY }
            : null
        }}
        onTouchEnd={(event) => {
          // A swipe on a phone pages the wall like the arrows do. Mostly
          // horizontal and longer than a fidget, so a scroll or a tap on the
          // buttons never turns the page by accident.
          const start = touchStart.current
          touchStart.current = null
          const touch = event.changedTouches[0]
          if (start === null || touch === undefined) return
          const dx = touch.clientX - start.x
          const dy = touch.clientY - start.y
          if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return
          move(dx < 0 ? 1 : -1)
        }}
      >
        {opened !== null && (
          <figure className="gallery__stage">
            <img src={opened.url} alt={opened.caption ?? ''} />
            <figcaption className="gallery__stage-caption">
              {opened.caption}
              <span className="gallery__counter">
                {(shown ?? 0) + 1} / {photos.length}
              </span>
            </figcaption>
          </figure>
        )}
        <button
          type="button"
          className="gallery__nav gallery__nav--prev"
          aria-label={t('Foto anterior')}
          onClick={() => move(-1)}
        >
          ‹
        </button>
        <button
          type="button"
          className="gallery__nav gallery__nav--next"
          aria-label={t('Foto siguiente')}
          onClick={() => move(1)}
        >
          ›
        </button>
        <button
          type="button"
          className="gallery__share"
          aria-label={t('Compartir')}
          onClick={() => {
            void sharePhoto()
          }}
        >
          <svg
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
        </button>
        <button
          type="button"
          className="gallery__close"
          aria-label={t('Cerrar')}
          onClick={() => setShown(null)}
        >
          ✕
        </button>
      </dialog>
    </Section>
  )
}
