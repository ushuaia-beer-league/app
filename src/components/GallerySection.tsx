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
