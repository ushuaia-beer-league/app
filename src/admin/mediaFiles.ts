/**
 * The images the organisation loads, on their way to the bucket.
 *
 * Two rules decide everything here and neither of them is this file's. The
 * bucket accepts four MIME types, refuses anything over five megabytes, and
 * only lets `private.can_manage_content()` write at all: that is
 * `20260803224307_media_bucket_policies.sql`, and it is the enforcement. What
 * this file adds is refusing the same things earlier, in Spanish, so a phone on
 * the rink's wifi does not spend an upload discovering that a PDF is not a
 * photograph.
 *
 * The resize is an economy rather than a rule. The whole free tier is a
 * gigabyte and one phone photograph is several megabytes, so an image is scaled
 * to fit 1600 px on its longest side before it is sent: that is enough for a
 * gallery photograph shown full width on a laptop, twice over on a phone, and
 * it lands around two hundred kilobytes as JPEG. The scaling happens on a
 * canvas in the browser and gives up quietly — returning the file untouched —
 * whenever the browser cannot do it, because a slightly heavy photograph that
 * uploads is better than a photograph that does not.
 *
 * Everything except the canvas itself is pure, so what the panel refuses and
 * what it names can be tested without a browser and without a bucket.
 */

import { supabaseConfig } from '../data/supabase-client'

/** The bucket, created by hand in the dashboard because a token cannot. */
export const MEDIA_BUCKET = 'media'

/**
 * Exactly the bucket's `allowed_mime_types`. Kept as a literal rather than read
 * from the API: the panel has to be able to say no before it has spoken to
 * anybody, and if the two ever disagree the bucket is right.
 */
export const ACCEPTED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const

/** The bucket's `file_size_limit`. What arrives has to be under it. */
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024

/**
 * What the form accepts before resizing, which is deliberately far above the
 * bucket's own limit: an eight-megabyte photograph out of a phone is exactly
 * what this panel is for, and the resize is what brings it under. Past this the
 * file is not a photograph anybody meant to publish.
 */
export const MEDIA_MAX_PICK_BYTES = 25 * 1024 * 1024

/** The longest side a stored image keeps. */
export const MEDIA_MAX_SIDE = 1600

/** JPEG and WEBP re-encoding quality. Visually clean, roughly a fifth the size. */
export const MEDIA_QUALITY = 0.82

/** The part of a `File` any of this needs, so a test can hand over an object. */
export interface PickedFile {
  name: string
  type: string
  size: number
}

/** The extension each accepted type is stored as when the file name has none. */
const TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

/** Extensions kept verbatim, because the original name is the better witness. */
const KNOWN_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif']

function megabytes(bytes: number): string {
  // A comma, because the people reading this write numbers in Spanish.
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export function acceptedMedia(file: PickedFile): boolean {
  return (ACCEPTED_MEDIA_TYPES as readonly string[]).includes(file.type)
}

/**
 * Why this file cannot be uploaded, or null when it can.
 *
 * The form asks this before spending anything. A refusal names the file,
 * because these are picked several at a time and "no se pudo" about an unnamed
 * one of five is not information.
 */
export function mediaRejection(file: PickedFile): string | null {
  if (!acceptedMedia(file)) {
    return `«${file.name}» no es una imagen de las que el depósito acepta. Tienen que ser JPG, PNG, WEBP o AVIF.`
  }

  if (file.size > MEDIA_MAX_PICK_BYTES) {
    return `«${file.name}» pesa ${megabytes(file.size)} y el panel acepta hasta ${megabytes(
      MEDIA_MAX_PICK_BYTES,
    )}. Exportala más chica y volvé a intentar.`
  }

  return null
}

/** Why the resized image still cannot go up. */
export function tooHeavy(file: PickedFile, bytes: number): string {
  return `«${file.name}» todavía pesa ${megabytes(bytes)} después de reducirla, y el depósito acepta hasta ${megabytes(
    MEDIA_MAX_BYTES,
  )}. Guardala en JPG y volvé a intentar.`
}

/**
 * The extension the object keeps: the file's own when it is one of the four,
 * otherwise the one its MIME type implies.
 */
export function mediaExtension(file: PickedFile): string {
  const dot = file.name.lastIndexOf('.')
  const named = dot === -1 ? '' : file.name.slice(dot + 1).toLowerCase()

  if (KNOWN_EXTENSIONS.includes(named)) return named
  return TYPE_EXTENSIONS[file.type] ?? 'img'
}

/**
 * Where the object lives inside the bucket.
 *
 * The season is in the path so a year's images can be found, listed and
 * budgeted without a table, and the id is random so two people uploading two
 * photographs of the same match on the same evening cannot overwrite each
 * other. The original extension is kept because that is what the file is.
 *
 * This is a path, never a URL: `sponsors.logo_path` and `photos.storage_path`
 * store exactly this string, so the bucket can be renamed or fronted by a CDN
 * without rewriting a single row.
 */
export function mediaObjectPath(
  folder: 'sponsors' | 'photos',
  year: number,
  file: PickedFile,
  id: string,
): string {
  return `${folder}/${year}/${id}.${mediaExtension(file)}`
}

/**
 * Where a stored object can be read from.
 *
 * The bucket is public, which is how the site shows a logo to a visitor with no
 * session at all, so the address is the project's public object route with the
 * path appended. Built here rather than asked of the storage client because an
 * `<img>` needs it while it renders and the client is reached asynchronously.
 *
 * Null when this build has no Supabase configuration, which is the same case
 * that leaves the panel with nothing to list: the screen then names the file
 * instead of showing a broken image.
 */
export function mediaUrl(path: string): string | null {
  const config = supabaseConfig()
  if (!config) return null

  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `${config.url}/storage/v1/object/public/${MEDIA_BUCKET}/${encoded}`
}

/**
 * The size an image is stored at: itself when it already fits, and otherwise
 * scaled to the longest side with its proportions kept. Never below one pixel,
 * which is what rounding a very thin image down would produce.
 */
export function scaledTo(
  width: number,
  height: number,
  maxSide: number = MEDIA_MAX_SIDE,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxSide || longest === 0) return { width, height }

  const factor = maxSide / longest
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  }
}

/**
 * The file as it should be uploaded.
 *
 * Scaled on a canvas when the browser can, and handed back untouched whenever
 * it cannot: no `createImageBitmap`, no 2D context, an AVIF (which browsers
 * decode and do not encode), or a re-encoding that came out bigger than the
 * original. None of those is an error worth stopping an upload for, because the
 * bucket's five-megabyte limit is the actual enforcement and it is still there.
 */
export async function resizedForUpload(file: File): Promise<Blob> {
  const encodable =
    file.type === 'image/jpeg' ||
    file.type === 'image/png' ||
    file.type === 'image/webp'

  if (!encodable) return file
  if (typeof createImageBitmap !== 'function') return file
  if (typeof document === 'undefined') return file

  try {
    // `from-image` so a photograph taken sideways is stored the way it was
    // taken: the orientation lives in the EXIF and drawing it drops that.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    })
    const size = scaledTo(bitmap.width, bitmap.height)

    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height

    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return file
    }

    context.drawImage(bitmap, 0, 0, size.width, size.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, file.type, MEDIA_QUALITY)
    })

    return blob === null || blob.size >= file.size ? file : blob
  } catch {
    return file
  }
}
