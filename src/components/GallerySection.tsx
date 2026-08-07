import { Section } from './Section'
import './GallerySection.css'
import { anchorFor } from '../utils/site-routes'
import { useT } from '../i18n/useLanguage'

/** As many slots as the reference draws, so the grid keeps its proportions. */
const PLACEHOLDER_SLOTS = [0, 1, 2, 3, 4, 5]

/**
 * The gallery shell.
 *
 * No image is wired on purpose: the photographs are files in Supabase Storage
 * with a description, an event and a season, and the functional document rules
 * out a gallery built from external links. The slots are dashed frames so the
 * section reads as waiting for content rather than as broken.
 *
 * TODO phase 4: accept the season's photographs and render them here, each with
 * its own Spanish alternative text. The reference's tall and wide slot variants
 * only make sense once there are real images to arrange.
 */
type GallerySectionProps = {
  /** The published gallery, newest ordering decided by the panel. */
  photos?: { url: string; caption: string | null }[]
}

export function GallerySection({ photos = [] }: GallerySectionProps) {
  const t = useT()
  return (
    <Section
      id={anchorFor('fotos')}
      eyebrow={t('Galería')}
      title={t('Fotos & Momentos')}
    >
      {photos.length > 0 ? (
        <div className="gallery">
          {photos.map((photo) => (
            <figure className="gallery__photo" key={photo.url}>
              <img src={photo.url} alt={photo.caption ?? ''} loading="lazy" />
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
    </Section>
  )
}
