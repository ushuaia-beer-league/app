import { useEffect, useState } from 'react'
import { SEED_2026 } from '../data/seed-2026'
import {
  loadSponsors,
  saveSponsors,
  uploadMedia,
  type Result,
} from './adminQueries'
import {
  moveSponsor,
  newSponsor,
  sponsorProblems,
  sponsorRecordsOf,
  sponsorWrites,
  sponsorsDraftFrom,
  type DraftSponsor,
  type SponsorRecord,
  type SponsorWrites,
  type SponsorsPage,
} from './contentDrafts'
import { ACCEPTED_MEDIA_TYPES, mediaRejection, mediaUrl } from './mediaFiles'
import './contentPanel.css'
import './SponsorsScreen.css'

interface SponsorsScreenProps {
  /**
   * The database and the bucket, injected. The real ones are the defaults; a
   * test hands over fakes, which is the only way any of this can be exercised:
   * every write here is allowed or refused by row level security and there is no
   * local Supabase to be refused by.
   */
  load?: () => Promise<Result<SponsorsPage>>
  save?: (writes: SponsorWrites) => Promise<Result<null>>
  /** Puts one file in the bucket and answers with the object path it landed on. */
  upload?: (file: File) => Promise<Result<string>>
  /** Where a stored object can be read from, for the thumbnail. */
  imageUrl?: (path: string) => string | null
}

const SEASON = SEED_2026.season
const readSponsors = () => loadSponsors(SEASON)
const uploadLogo = (file: File) => uploadMedia('sponsors', SEASON, file)

/**
 * The sponsors of the season, loaded by the organisation itself.
 *
 * Nothing on this screen is a deploy and nothing on it is a file in the
 * repository: somebody signs in, writes a name, drags a logo in, and it is
 * live. That is the whole point of point 16 of the plan.
 *
 * Three decisions are worth knowing about.
 *
 * A sponsor with no logo is a saved, published sponsor. `sponsors.logo_path` is
 * nullable for exactly this and the row says so out loud, because the logo of a
 * small local sponsor arrives by WhatsApp a fortnight after the money does, and
 * a panel that refuses the name until the image exists is a panel that loses the
 * name.
 *
 * Retiring never deletes. It clears `active`, so last season still shows who
 * backed it, and it can be undone from the same button.
 *
 * The order is the order of this list. `display_order` is deliberately not
 * unique in the schema, so moving a row up is moving it here and writing the new
 * index of everything that moved: no temporary third value, and no swap that can
 * leave the wall in an order nobody chose.
 */
export function SponsorsScreen({
  load = readSponsors,
  save = saveSponsors,
  upload = uploadLogo,
  imageUrl = mediaUrl,
}: SponsorsScreenProps = {}) {
  const [page, setPage] = useState<Result<SponsorsPage> | null>(null)

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
        Cargando los sponsors…
      </p>
    )
  }

  if (!page.ok) {
    return (
      <p className="admin__error" role="alert">
        No pudimos leer los sponsors: {page.because}
      </p>
    )
  }

  // Keyed by the season, so loading another one starts from its own rows rather
  // than inheriting the last one's unsaved draft.
  return (
    <SponsorsList
      imageUrl={imageUrl}
      key={page.data.seasonId}
      page={page.data}
      save={save}
      upload={upload}
    />
  )
}

interface SponsorsListProps {
  page: SponsorsPage
  save: (writes: SponsorWrites) => Promise<Result<null>>
  upload: (file: File) => Promise<Result<string>>
  imageUrl: (path: string) => string | null
}

/** How a sponsor is named in a message, including before it has a name. */
function labelOf(sponsor: DraftSponsor, index: number): string {
  const named = sponsor.name.trim()
  return named === '' ? `el sponsor ${index + 1}` : named
}

function SponsorsList({ page, save, upload, imageUrl }: SponsorsListProps) {
  /** What the database held the last time it and this screen agreed. */
  const [baseline, setBaseline] = useState<readonly SponsorRecord[]>(
    page.sponsors,
  )
  const [draft, setDraft] = useState<readonly DraftSponsor[]>(() =>
    sponsorsDraftFrom(page),
  )
  const [adding, setAdding] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [refused, setRefused] = useState<string | null>(null)
  /** The row whose logo is going up right now, so its own row can say so. */
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [uploadFailure, setUploadFailure] = useState<string | null>(null)

  /** Any edit makes the last save report stale, so it goes. */
  const edit = (
    change: (current: readonly DraftSponsor[]) => DraftSponsor[],
  ) => {
    setSaved(null)
    setRefused(null)
    setDraft(change)
  }

  const writes = sponsorWrites(page.seasonId, baseline, draft)
  const problems = sponsorProblems(draft)
  const pending = writes.upsert.length

  const add = () => {
    const name = adding.trim()
    if (name === '') return

    edit((current) => [...current, newSponsor(name)])
    setAdding('')
  }

  const pickLogo = async (
    sponsor: DraftSponsor,
    label: string,
    file: File | undefined,
  ) => {
    if (file === undefined) return

    setUploadFailure(null)
    setSaved(null)

    // Refused here, in Spanish, before an upload is spent on it. The bucket
    // refuses the same file, and that is the enforcement; this is the courtesy.
    const rejection = mediaRejection(file)
    if (rejection !== null) {
      setUploadFailure(rejection)
      return
    }

    setUploadingFor(sponsor.id)
    const result = await upload(file)
    setUploadingFor(null)

    if (!result.ok) {
      setUploadFailure(
        `No pudimos subir el logo de ${label}: ${result.because}`,
      )
      return
    }

    // The object is in the bucket; the row that points at it is saved with the
    // rest. An unsaved logo is a few kilobytes left behind in a gigabyte, which
    // is cheaper than losing the file the operator already chose.
    edit((current) =>
      current.map((row) =>
        row.id === sponsor.id ? { ...row, logoPath: result.data } : row,
      ),
    )
  }

  const onSubmit = async () => {
    if (saving || problems.length > 0) return

    setSaving(true)
    const result = await save(writes)
    setSaving(false)

    if (!result.ok) {
      setRefused(result.because)
      setSaved(null)
      return
    }

    setBaseline(sponsorRecordsOf(draft))
    setRefused(null)
    setSaved(
      pending === 0
        ? 'No había nada nuevo para guardar.'
        : pending === 1
          ? 'Guardamos un sponsor.'
          : `Guardamos ${pending} sponsors.`,
    )
  }

  return (
    <section className="editor sponsor-panel">
      <header className="editor__header">
        <h1 className="editor__title">Sponsors</h1>
        <p className="editor__count">
          {draft.length === 0
            ? 'Todavía no hay sponsors cargados en esta temporada.'
            : `${draft.length} sponsors en esta temporada.`}
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
          <legend className="editor__block-title">Agregar un sponsor</legend>

          <p className="editor__field">
            <label htmlFor="sponsor-new-name">Nombre del nuevo sponsor</label>
            <input
              id="sponsor-new-name"
              onChange={(event) => setAdding(event.target.value)}
              type="text"
              value={adding}
            />
          </p>

          <button className="editor__add" onClick={add} type="button">
            Agregar sponsor
          </button>

          <p className="editor__hint">
            El nombre alcanza. El logo puede llegar después, y hasta que llegue
            el sponsor se publica igual, con su nombre.
          </p>
        </fieldset>

        <ul className="editor__rows">
          {draft.map((sponsor, index) => {
            const label = labelOf(sponsor, index)
            const url =
              sponsor.logoPath === null ? null : imageUrl(sponsor.logoPath)

            return (
              <li className="editor__row" key={sponsor.id}>
                <div className="editor__row-head">
                  <h2 className="editor__row-title">{label}</h2>
                  {!sponsor.active && (
                    <span className="editor__chip">Retirado</span>
                  )}
                </div>

                <div className="editor__media">
                  {sponsor.logoPath === null ? (
                    <p className="editor__gap">
                      Sin logo todavía: se publica el nombre.
                    </p>
                  ) : url === null ? (
                    <p className="editor__gap">
                      Logo cargado: {sponsor.logoPath}
                    </p>
                  ) : (
                    <img
                      alt={`Logo de ${label}`}
                      className="sponsor-panel__logo"
                      src={url}
                    />
                  )}
                </div>

                <p className="editor__field">
                  <label htmlFor={`sponsor-name-${sponsor.id}`}>Nombre</label>
                  <input
                    id={`sponsor-name-${sponsor.id}`}
                    onChange={(event) =>
                      edit((current) =>
                        current.map((row) =>
                          row.id === sponsor.id
                            ? { ...row, name: event.target.value }
                            : row,
                        ),
                      )
                    }
                    type="text"
                    value={sponsor.name}
                  />
                </p>

                <p className="editor__field">
                  <label htmlFor={`sponsor-url-${sponsor.id}`}>Link</label>
                  <input
                    id={`sponsor-url-${sponsor.id}`}
                    inputMode="url"
                    onChange={(event) =>
                      edit((current) =>
                        current.map((row) =>
                          row.id === sponsor.id
                            ? { ...row, url: event.target.value }
                            : row,
                        ),
                      )
                    }
                    placeholder="https://"
                    type="text"
                    value={sponsor.url}
                  />
                </p>

                <p className="editor__field">
                  <label htmlFor={`sponsor-logo-${sponsor.id}`}>Logo</label>
                  <input
                    accept={ACCEPTED_MEDIA_TYPES.join(',')}
                    id={`sponsor-logo-${sponsor.id}`}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      // Cleared so choosing the same file again is a new pick.
                      event.target.value = ''
                      void pickLogo(sponsor, label, file)
                    }}
                    type="file"
                  />
                </p>

                {uploadingFor === sponsor.id && (
                  <p className="editor__waiting" aria-live="polite">
                    Subiendo el logo…
                  </p>
                )}

                <div className="editor__row-actions">
                  <button
                    aria-label={`Subir ${label} en el orden`}
                    className="editor__move"
                    disabled={index === 0}
                    onClick={() =>
                      edit((current) => moveSponsor(current, sponsor.id, -1))
                    }
                    type="button"
                  >
                    Subir
                  </button>

                  <button
                    aria-label={`Bajar ${label} en el orden`}
                    className="editor__move"
                    disabled={index === draft.length - 1}
                    onClick={() =>
                      edit((current) => moveSponsor(current, sponsor.id, 1))
                    }
                    type="button"
                  >
                    Bajar
                  </button>

                  <button
                    className="editor__retire"
                    onClick={() =>
                      edit((current) =>
                        current.map((row) =>
                          row.id === sponsor.id
                            ? { ...row, active: !row.active }
                            : row,
                        ),
                      )
                    }
                    type="button"
                  >
                    {sponsor.active ? 'Retirar' : 'Reactivar'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <p className="editor__hint">
          Retirar no borra nada: el sponsor deja de publicarse y la temporada
          pasada sigue mostrando quién la acompañó. Los logos tienen que ser
          JPG, PNG, WEBP o AVIF, y el panel los reduce antes de subirlos.
        </p>

        <div className="editor__actions">
          {problems.length > 0 && (
            <div className="editor__problems">
              <p className="editor__problems-title">
                Antes de guardar hay que corregir esto:
              </p>
              <ul>
                {problems.map((problem, index) => (
                  // One row can raise two problems, so its place in the list is
                  // what makes the key unique.
                  <li key={`${problem.id}-${index}`}>{problem.message}</li>
                ))}
              </ul>
            </div>
          )}

          {uploadFailure !== null && (
            <p className="editor__refused" role="alert">
              {uploadFailure}
            </p>
          )}

          <button
            className="editor__save"
            disabled={saving || problems.length > 0}
            type="submit"
          >
            {saving ? 'Guardando…' : 'Guardar los sponsors'}
          </button>

          <p className="editor__pending">
            {pending === 0
              ? 'No hay cambios sin guardar.'
              : pending === 1
                ? 'Falta guardar un sponsor.'
                : `Falta guardar ${pending} sponsors.`}
          </p>

          {saved !== null && (
            <p className="editor__saved" role="status">
              {saved}
            </p>
          )}

          {refused !== null && (
            <div className="editor__refused" role="alert">
              <p>No pudimos guardar los sponsors: {refused}</p>
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
