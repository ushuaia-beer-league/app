import { useEffect, useState } from 'react'
import { SEED_2026 } from '../data/seed-2026'
import {
  loadPhotos,
  savePhotos,
  uploadMedia,
  type Result,
} from './adminQueries'
import {
  movePhoto,
  newPhoto,
  photoPartsOf,
  photoProblems,
  photoWrites,
  photosDraftFrom,
  pickedKey,
  withSavedPhotos,
  withoutPhoto,
  type DraftPhoto,
  type PhotoPart,
  type PhotoRecord,
  type PhotoWrites,
  type PhotosPage,
  type PhotosSaveReport,
} from './contentDrafts'
import { ACCEPTED_MEDIA_TYPES, mediaRejection, mediaUrl } from './mediaFiles'
import './contentPanel.css'
import './PhotosScreen.css'

interface PhotosScreenProps {
  /**
   * The database and the bucket, injected. The real ones are the defaults; a
   * test hands over fakes, because every write here is allowed or refused by row
   * level security and there is no local Supabase to be refused by.
   */
  load?: () => Promise<Result<PhotosPage>>
  save?: (writes: PhotoWrites) => Promise<PhotosSaveReport>
  /** Puts one file in the bucket and answers with the object path it landed on. */
  upload?: (file: File) => Promise<Result<string>>
  imageUrl?: (path: string) => string | null
}

const SEASON = SEED_2026.season
const readPhotos = () => loadPhotos(SEASON)
const uploadPhoto = (file: File) => uploadMedia('photos', SEASON, file)

const PART_NAMES: Record<PhotoPart, string> = {
  rows: 'las fotos',
  removed: 'las que sacaste',
  files: 'los archivos del depósito',
}

/** "las fotos y las que sacaste". */
function listed(items: readonly string[]): string {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

/**
 * The season's gallery, loaded by the organisation itself.
 *
 * The upload and the row are two different moments, and keeping them apart is
 * what makes the screen survive a bad connection at the rink. Picking files puts
 * them in the bucket one at a time and says which ones landed; the captions, the
 * dates, the order and the deletions are one save afterwards. An upload that
 * fails halfway therefore loses only the file it failed on, and a save the
 * database refuses loses nothing at all.
 *
 * A photograph with no caption is a photograph: `photos.caption` is nullable and
 * an invented caption is not a fact. So is one nobody dated. An empty gallery
 * says it is empty instead of showing placeholders that will never fill.
 *
 * Deleting is the one real delete in this panel. A gallery is a choice rather
 * than a record, so the row goes and the object behind it goes too — in that
 * order, because the row is what publishes the photograph.
 */
export function PhotosScreen({
  load = readPhotos,
  save = savePhotos,
  upload = uploadPhoto,
  imageUrl = mediaUrl,
}: PhotosScreenProps = {}) {
  const [page, setPage] = useState<Result<PhotosPage> | null>(null)

  useEffect(() => {
    let current = true

    void load().then((result) => {
      if (current) setPage(result)
    })

    return () => {
      current = false
    }
  }, [load])

  if (page === null) {
    return (
      <p className="admin__waiting" aria-live="polite">
        Cargando las fotos…
      </p>
    )
  }

  if (!page.ok) {
    return (
      <p className="admin__error" role="alert">
        No pudimos leer las fotos: {page.because}
      </p>
    )
  }

  return (
    <PhotosGallery
      imageUrl={imageUrl}
      key={page.data.seasonId}
      page={page.data}
      save={save}
      upload={upload}
    />
  )
}

interface PhotosGalleryProps {
  page: PhotosPage
  save: (writes: PhotoWrites) => Promise<PhotosSaveReport>
  upload: (file: File) => Promise<Result<string>>
  imageUrl: (path: string) => string | null
}

function PhotosGallery({ page, save, upload, imageUrl }: PhotosGalleryProps) {
  const [baseline, setBaseline] = useState<readonly PhotoRecord[]>(page.photos)
  const [draft, setDraft] = useState<readonly DraftPhoto[]>(() =>
    photosDraftFrom(page),
  )
  const [saving, setSaving] = useState(false)
  const [report, setReport] = useState<PhotosSaveReport | null>(null)
  /** How many of this pick are still going up, so the screen can say so. */
  const [uploading, setUploading] = useState(0)
  /**
   * How the last pick went: a line per file that did not make it, and how many
   * did. Both halves, because "the others did go up" is only true when some of
   * them did.
   */
  const [lastPick, setLastPick] = useState<{
    landed: number
    failures: readonly string[]
  } | null>(null)

  const edit = (change: (current: readonly DraftPhoto[]) => DraftPhoto[]) => {
    setReport(null)
    setDraft(change)
  }

  const writes = photoWrites(page.seasonId, baseline, draft)
  const problems = photoProblems(draft)
  const pending = photoPartsOf(writes)

  /**
   * Files are uploaded one at a time rather than all at once: the free tier is
   * the whole budget and a phone at the rink drops a parallel burst, so an
   * upload that fails halfway has to leave the ones before it standing.
   */
  const pick = async (files: readonly File[]) => {
    setReport(null)
    setLastPick(null)

    const failures: string[] = []
    const landed: DraftPhoto[] = []
    let remaining = files.length
    setUploading(remaining)

    for (const file of files) {
      const rejection = mediaRejection(file)
      if (rejection !== null) {
        // Refused before an upload is spent on it. The bucket refuses the same
        // file, and that is the enforcement; this is the courtesy.
        failures.push(rejection)
        remaining -= 1
        setUploading(remaining)
        continue
      }

      const key = pickedKey(file)
      const already =
        draft.some((photo) => photo.pickedFrom === key) ||
        landed.some((photo) => photo.pickedFrom === key)

      if (already) {
        failures.push(
          `«${file.name}» ya está en esta lista. Una foto entra una sola vez.`,
        )
        remaining -= 1
        setUploading(remaining)
        continue
      }

      const result = await upload(file)
      remaining -= 1
      setUploading(remaining)

      if (result.ok) landed.push(newPhoto(result.data, key))
      else failures.push(`«${file.name}»: ${result.because}`)
    }

    setLastPick({ landed: landed.length, failures })
    if (landed.length > 0) edit((current) => [...current, ...landed])
  }

  const onSubmit = async () => {
    if (saving || problems.length > 0) return

    setSaving(true)
    const result = await save(writes)
    setBaseline((current) => withSavedPhotos(current, draft, result.saved))
    setReport(result)
    setSaving(false)
  }

  return (
    <section className="editor photo-panel">
      <header className="editor__header">
        <h1 className="editor__title">Fotos</h1>
        <p className="editor__count">
          {draft.length === 0
            ? 'Todavía no hay fotos en la galería de esta temporada.'
            : `${draft.length} fotos en la galería.`}
        </p>
      </header>

      <form
        className="editor__form"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit()
        }}
      >
        <fieldset className="editor__block">
          <legend className="editor__block-title">Agregar fotos</legend>

          <p className="editor__field">
            <label htmlFor="photo-new-files">Elegí una o varias fotos</label>
            <input
              accept={ACCEPTED_MEDIA_TYPES.join(',')}
              id="photo-new-files"
              multiple
              onChange={(event) => {
                const files = [...(event.target.files ?? [])]
                // Cleared so choosing the same file again is a new pick.
                event.target.value = ''
                if (files.length > 0) void pick(files)
              }}
              type="file"
            />
          </p>

          {uploading > 0 && (
            <p className="editor__waiting" aria-live="polite">
              Subiendo {uploading === 1 ? 'una foto' : `${uploading} fotos`}…
            </p>
          )}

          <p className="editor__hint">
            Tienen que ser JPG, PNG, WEBP o AVIF. El panel las reduce antes de
            subirlas, así una temporada de fotos no se come el depósito. El
            epígrafe y la fecha pueden quedar vacíos: una foto sin epígrafe
            sigue siendo una foto.
          </p>

          {lastPick !== null && lastPick.failures.length > 0 && (
            <div className="editor__refused" role="alert">
              {lastPick.failures.map((failure, index) => (
                // Two files can be refused for the same reason, so the place in
                // the list is what makes the key unique.
                <p key={`${index}-${failure}`}>{failure}</p>
              ))}
              {lastPick.landed > 0 && (
                <p>Las demás sí subieron y están en la lista.</p>
              )}
            </div>
          )}
        </fieldset>

        <ul className="editor__rows">
          {draft.map((photo, index) => {
            const url = imageUrl(photo.storagePath)
            const caption = photo.caption.trim()

            return (
              <li className="editor__row" key={photo.id}>
                <div className="editor__media">
                  {url === null ? (
                    <p className="editor__gap">
                      Archivo cargado: {photo.storagePath}
                    </p>
                  ) : (
                    <img
                      alt={
                        caption === ''
                          ? `Foto ${index + 1} de la galería, sin epígrafe`
                          : caption
                      }
                      className="photo-panel__image"
                      src={url}
                    />
                  )}
                </div>

                <p className="editor__field">
                  <label htmlFor={`photo-caption-${photo.id}`}>Epígrafe</label>
                  <input
                    id={`photo-caption-${photo.id}`}
                    onChange={(event) =>
                      edit((current) =>
                        current.map((row) =>
                          row.id === photo.id
                            ? { ...row, caption: event.target.value }
                            : row,
                        ),
                      )
                    }
                    type="text"
                    value={photo.caption}
                  />
                </p>

                <p className="editor__field">
                  <label htmlFor={`photo-date-${photo.id}`}>Fecha</label>
                  <input
                    id={`photo-date-${photo.id}`}
                    onChange={(event) =>
                      edit((current) =>
                        current.map((row) =>
                          row.id === photo.id
                            ? { ...row, takenOn: event.target.value }
                            : row,
                        ),
                      )
                    }
                    type="date"
                    value={photo.takenOn}
                  />
                </p>

                <div className="editor__row-actions">
                  <button
                    aria-label={`Subir la foto ${index + 1} en el orden`}
                    className="editor__move"
                    disabled={index === 0}
                    onClick={() =>
                      edit((current) => movePhoto(current, photo.id, -1))
                    }
                    type="button"
                  >
                    Subir
                  </button>

                  <button
                    aria-label={`Bajar la foto ${index + 1} en el orden`}
                    className="editor__move"
                    disabled={index === draft.length - 1}
                    onClick={() =>
                      edit((current) => movePhoto(current, photo.id, 1))
                    }
                    type="button"
                  >
                    Bajar
                  </button>

                  <button
                    aria-label={`Quitar la foto ${index + 1} de la galería`}
                    className="editor__remove"
                    onClick={() =>
                      edit((current) => withoutPhoto(current, photo.id))
                    }
                    type="button"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        {writes.removeIds.length > 0 && (
          <p className="editor__hint">
            {writes.removeIds.length === 1
              ? 'Una foto sale de la galería cuando guardes, y su archivo se borra del depósito.'
              : `${writes.removeIds.length} fotos salen de la galería cuando guardes, y sus archivos se borran del depósito.`}
          </p>
        )}

        <div className="editor__actions">
          {problems.length > 0 && (
            <div className="editor__problems">
              <p className="editor__problems-title">
                Antes de guardar hay que corregir esto:
              </p>
              <ul>
                {problems.map((problem, index) => (
                  <li key={`${problem.id}-${index}`}>{problem.message}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            className="editor__save"
            disabled={saving || problems.length > 0}
            type="submit"
          >
            {saving ? 'Guardando…' : 'Guardar la galería'}
          </button>

          <p className="editor__pending">
            {pending.length === 0
              ? 'No hay cambios sin guardar.'
              : `Falta guardar ${listed(pending.map((part) => PART_NAMES[part]))}.`}
          </p>

          {report !== null && report.saved.length > 0 && (
            <p className="editor__saved" role="status">
              Guardamos {listed(report.saved.map((part) => PART_NAMES[part]))}.
            </p>
          )}

          {report !== null &&
            report.saved.length === 0 &&
            report.failed.length === 0 && (
              <p className="editor__saved" role="status">
                No había nada nuevo para guardar.
              </p>
            )}

          {report !== null && report.failed.length > 0 && (
            <div className="editor__refused" role="alert">
              {report.failed.map((failure) => (
                <p key={failure.part}>
                  {failure.part === 'files'
                    ? `Sacamos las fotos de la galería, pero los archivos quedaron en el depósito: ${failure.because}`
                    : `No pudimos guardar ${PART_NAMES[failure.part]}: ${failure.because}`}
                </p>
              ))}
              <p>
                Lo que cargaste sigue en pantalla. Podés volver a intentar sin
                cargarlo de nuevo.
              </p>
            </div>
          )}
        </div>
      </form>
    </section>
  )
}
