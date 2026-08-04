/**
 * Sponsors and photographs as drafts, and the rows those drafts become.
 *
 * The same shape as `matchSheetDraft.ts` and for the same reason: everything
 * here is pure, so what the panel refuses, what it writes and what it writes
 * nothing about can be read and tested without a database and without a
 * browser. The screens render this vocabulary and `adminQueries.ts` issues the
 * rows it produces.
 *
 * Three ideas run through it.
 *
 * The first is that a gap is published, not hidden. A sponsor whose logo has not
 * arrived is a name (`sponsors.logo_path` is nullable exactly for that), a
 * photograph nobody captioned is a photograph, and a photograph nobody dated is
 * still on the wall. None of those blocks a save.
 *
 * The second is that position in the list *is* the display order.
 * `display_order` is deliberately not unique in the schema, so moving a row is
 * moving it in this array and writing the index of everything that moved; no
 * temporary third value is ever needed and no swap can leave the order
 * corrupted. Ties, which the database still allows, break by name for sponsors
 * and by upload order for photographs.
 *
 * The third is that a row the operator adds gets its uuid here rather than from
 * the database, so every write is an upsert on the primary key and saving the
 * same draft twice writes the same rows twice and doubles nothing.
 *
 * A sponsor is never deleted. Retiring one sets `active = false`, because last
 * season still has to show who backed it. A photograph is deleted, since a
 * gallery is a choice rather than a record.
 */

// ---------------------------------------------------------------------------
// What the panel loaded
// ---------------------------------------------------------------------------

/** One row of `sponsors`, as the database handed it over. */
export interface SponsorRecord {
  id: string
  name: string
  url: string | null
  /**
   * The object path inside the `media` bucket, never a URL. Null is a sponsor
   * whose logo has not arrived, which is published as a name.
   */
  logoPath: string | null
  displayOrder: number
  active: boolean
}

/** One row of `photos`, as the database handed it over. */
export interface PhotoRecord {
  id: string
  /** The object path inside the bucket. Unique, so one image is one row. */
  storagePath: string
  caption: string | null
  /** `YYYY-MM-DD`, or null when nobody wrote down when it was taken. */
  takenOn: string | null
  displayOrder: number
}

/**
 * A season's sponsors with the season's own id, which the panel needs because
 * every row it writes names it.
 */
export interface SponsorsPage {
  seasonId: string
  sponsors: readonly SponsorRecord[]
}

export interface PhotosPage {
  seasonId: string
  photos: readonly PhotoRecord[]
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/**
 * Text as typed, or null. An empty field is an absent fact rather than an empty
 * string, and the columns that hold these are nullable for that reason.
 */
function saidOrNull(text: string): string | null {
  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * The same list with one row one place up or down. Out of range is a no-op
 * rather than an error: the first row's "up" button is pressed by accident all
 * the time and nothing should happen.
 */
function movedBy<T extends { id: string }>(
  list: readonly T[],
  id: string,
  offset: number,
): T[] {
  const from = list.findIndex((row) => row.id === id)
  const to = from + offset
  if (from === -1 || to < 0 || to >= list.length) return [...list]

  const moved = [...list]
  const [row] = moved.splice(from, 1)
  if (row === undefined) return [...list]

  moved.splice(to, 0, row)
  return moved
}

// ---------------------------------------------------------------------------
// Sponsors
// ---------------------------------------------------------------------------

/** One sponsor as the operator is editing it. */
export interface DraftSponsor {
  /**
   * The uuid the row has or will have, generated here when the operator adds
   * one so a second save upserts instead of inserting a second sponsor.
   */
  id: string
  name: string
  /** As typed. Empty means the sponsor has no site, which is common. */
  url: string
  logoPath: string | null
  active: boolean
}

export function sponsorsDraftFrom(page: SponsorsPage): DraftSponsor[] {
  return page.sponsors.map((sponsor) => ({
    id: sponsor.id,
    name: sponsor.name,
    url: sponsor.url ?? '',
    logoPath: sponsor.logoPath,
    active: sponsor.active,
  }))
}

/** A sponsor the operator has just named. The logo can arrive later or never. */
export function newSponsor(name: string): DraftSponsor {
  return {
    id: crypto.randomUUID(),
    name,
    url: '',
    logoPath: null,
    active: true,
  }
}

export function moveSponsor(
  draft: readonly DraftSponsor[],
  id: string,
  offset: number,
): DraftSponsor[] {
  return movedBy(draft, id, offset)
}

/** Something the database would refuse, said in Spanish before it is sent. */
export interface ContentProblem {
  /** The row it is about, so the screen can put it next to that row. */
  id: string
  message: string
}

/**
 * What stops this draft from being saved.
 *
 * Only the two things `sponsors` actually refuses: a name that is blank
 * (`sponsors_name_present`) and a link that is not one (`sponsors_url_shape`,
 * which asks for `http%`; the panel asks for the whole scheme, because
 * `httpfoo` would satisfy the column and take nobody anywhere). A missing logo
 * is not here: it is the case the nullable column exists for.
 */
export function sponsorProblems(
  draft: readonly DraftSponsor[],
): ContentProblem[] {
  const problems: ContentProblem[] = []

  draft.forEach((sponsor, index) => {
    const named = sponsor.name.trim()
    const whichOne = named === '' ? `el sponsor ${index + 1}` : named

    if (named === '') {
      problems.push({
        id: sponsor.id,
        message: `Falta el nombre de ${whichOne}. El nombre es lo que se publica cuando todavía no hay logo, así que no puede quedar vacío.`,
      })
    }

    const url = sponsor.url.trim()
    if (url !== '' && !/^https?:\/\/./i.test(url)) {
      problems.push({
        id: sponsor.id,
        message: `El link de ${whichOne} tiene que empezar con http:// o https://.`,
      })
    }
  })

  return problems
}

/** One row of `sponsors`, as it is written. */
export interface SponsorRow {
  id: string
  season_id: string
  name: string
  url: string | null
  logo_path: string | null
  display_order: number
  active: boolean
}

export interface SponsorWrites {
  seasonId: string
  /** Only the rows that changed, keyed on `id`, so a second save writes nothing. */
  upsert: SponsorRow[]
}

/** The draft as the database would hold it, which is the next baseline. */
export function sponsorRecordsOf(
  draft: readonly DraftSponsor[],
): SponsorRecord[] {
  return draft.map((sponsor, index) => ({
    id: sponsor.id,
    name: sponsor.name.trim(),
    url: saidOrNull(sponsor.url),
    logoPath: sponsor.logoPath,
    displayOrder: index,
    active: sponsor.active,
  }))
}

/**
 * What has to be written for this draft to become the truth.
 *
 * A row is sent when anything about it changed, its place in the list included.
 * The first save of a season loaded with every `display_order` at the column's
 * default of zero therefore rewrites all of them, once, into 0…n-1; every save
 * after that touches only what moved.
 */
export function sponsorWrites(
  seasonId: string,
  baseline: readonly SponsorRecord[],
  draft: readonly DraftSponsor[],
): SponsorWrites {
  const before = new Map(baseline.map((row) => [row.id, row]))
  const wanted = sponsorRecordsOf(draft)

  const upsert: SponsorRow[] = []
  for (const row of wanted) {
    const was = before.get(row.id)
    const unchanged =
      was !== undefined &&
      was.name === row.name &&
      was.url === row.url &&
      was.logoPath === row.logoPath &&
      was.displayOrder === row.displayOrder &&
      was.active === row.active
    if (unchanged) continue

    upsert.push({
      id: row.id,
      season_id: seasonId,
      name: row.name,
      url: row.url,
      logo_path: row.logoPath,
      display_order: row.displayOrder,
      active: row.active,
    })
  }

  return { seasonId, upsert }
}

// ---------------------------------------------------------------------------
// Photographs
// ---------------------------------------------------------------------------

/** One photograph as the operator is editing it. */
export interface DraftPhoto {
  id: string
  /** Already in the bucket: the upload happens when the file is picked. */
  storagePath: string
  caption: string
  /** `YYYY-MM-DD` as a date field gives it, or empty. */
  takenOn: string
  /**
   * `name:size` of the file this row came from, when it was picked in this
   * session. Never written anywhere: it is only what lets the panel refuse the
   * same file being picked twice in one sitting, which is the mistake the
   * unique `storage_path` cannot prevent on its own, because every upload gets
   * its own random path.
   */
  pickedFrom: string | null
}

export function photosDraftFrom(page: PhotosPage): DraftPhoto[] {
  return page.photos.map((photo) => ({
    id: photo.id,
    storagePath: photo.storagePath,
    caption: photo.caption ?? '',
    takenOn: photo.takenOn ?? '',
    pickedFrom: null,
  }))
}

/** A photograph that has just landed in the bucket and has no caption yet. */
export function newPhoto(storagePath: string, pickedFrom?: string): DraftPhoto {
  return {
    id: crypto.randomUUID(),
    storagePath,
    caption: '',
    takenOn: '',
    pickedFrom: pickedFrom ?? null,
  }
}

/** How a picked file is recognised if it is picked again. */
export function pickedKey(file: { name: string; size: number }): string {
  return `${file.name}:${file.size}`
}

export function movePhoto(
  draft: readonly DraftPhoto[],
  id: string,
  offset: number,
): DraftPhoto[] {
  return movedBy(draft, id, offset)
}

export function withoutPhoto(
  draft: readonly DraftPhoto[],
  id: string,
): DraftPhoto[] {
  return draft.filter((photo) => photo.id !== id)
}

/**
 * What stops this gallery from being saved: only a date outside the range
 * `photos_taken_on_range` allows. No caption and no date are not problems.
 */
export function photoProblems(draft: readonly DraftPhoto[]): ContentProblem[] {
  const problems: ContentProblem[] = []

  draft.forEach((photo, index) => {
    const taken = photo.takenOn.trim()
    if (taken === '') return
    if (taken >= '2023-01-01' && taken <= '2100-01-01') return

    problems.push({
      id: photo.id,
      message: `La fecha de la foto ${index + 1} está fuera de rango: la base acepta desde 2023.`,
    })
  })

  return problems
}

/** One row of `photos`, as it is written. */
export interface PhotoRow {
  id: string
  season_id: string
  storage_path: string
  caption: string | null
  taken_on: string | null
  display_order: number
}

/**
 * The three writes a gallery save issues, reported apart because they are
 * refused apart.
 */
export type PhotoPart =
  /** The rows themselves: what was added, captioned, dated or moved. */
  | 'rows'
  /** The rows the operator took out of the gallery. */
  | 'removed'
  /** The objects in the bucket behind those rows. */
  | 'files'

export interface PhotoWrites {
  seasonId: string
  upsert: PhotoRow[]
  removeIds: string[]
  /**
   * The object paths behind the removed rows. The row is what unpublishes the
   * photograph, so it goes first; the file is deleted after, because leaving it
   * behind spends a gigabyte the league does not have.
   */
  removePaths: string[]
}

export function photoRecordsOf(draft: readonly DraftPhoto[]): PhotoRecord[] {
  return draft.map((photo, index) => ({
    id: photo.id,
    storagePath: photo.storagePath,
    caption: saidOrNull(photo.caption),
    takenOn: saidOrNull(photo.takenOn),
    displayOrder: index,
  }))
}

export function photoWrites(
  seasonId: string,
  baseline: readonly PhotoRecord[],
  draft: readonly DraftPhoto[],
): PhotoWrites {
  const before = new Map(baseline.map((row) => [row.id, row]))
  const wanted = photoRecordsOf(draft)

  const upsert: PhotoRow[] = []
  for (const row of wanted) {
    const was = before.get(row.id)
    const unchanged =
      was !== undefined &&
      was.storagePath === row.storagePath &&
      was.caption === row.caption &&
      was.takenOn === row.takenOn &&
      was.displayOrder === row.displayOrder
    if (unchanged) continue

    upsert.push({
      id: row.id,
      season_id: seasonId,
      storage_path: row.storagePath,
      caption: row.caption,
      taken_on: row.takenOn,
      display_order: row.displayOrder,
    })
  }

  const kept = new Set(draft.map((photo) => photo.id))
  const gone = baseline.filter((row) => !kept.has(row.id))

  return {
    seasonId,
    upsert,
    removeIds: gone.map((row) => row.id),
    removePaths: gone.map((row) => row.storagePath),
  }
}

/**
 * Which groups this save would touch. `files` is never listed: nobody asks for
 * a bucket cleanup, it is what follows a removal, and it only ever shows up in
 * a report as something that did not happen.
 */
export function photoPartsOf(writes: PhotoWrites): PhotoPart[] {
  const parts: PhotoPart[] = []
  if (writes.upsert.length > 0) parts.push('rows')
  if (writes.removeIds.length > 0) parts.push('removed')
  return parts
}

export interface PhotosSaveReport {
  saved: PhotoPart[]
  failed: { part: PhotoPart; because: string }[]
}

/**
 * The baseline moved forward over the parts that landed and left alone over the
 * parts that did not, which is what makes a refusal harmless: the captions stay
 * on screen, what the database accepted stops being pending, and pressing save
 * again retries exactly what failed.
 */
export function withSavedPhotos(
  baseline: readonly PhotoRecord[],
  draft: readonly DraftPhoto[],
  saved: readonly PhotoPart[],
): PhotoRecord[] {
  const wrote = saved.includes('rows') ? photoRecordsOf(draft) : []
  const removed = saved.includes('removed')
  const drafted = new Set(draft.map((photo) => photo.id))

  const rows: PhotoRecord[] = []
  for (const row of baseline) {
    // Taken out of the gallery and the database agreed: it is gone.
    if (!drafted.has(row.id) && removed) continue
    rows.push(wrote.find((written) => written.id === row.id) ?? row)
  }

  for (const written of wrote) {
    if (!baseline.some((row) => row.id === written.id)) rows.push(written)
  }

  return rows
}
