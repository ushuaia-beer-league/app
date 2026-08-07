/**
 * The drawing half of the shared images: a `ShareCard` in, a PNG out, and the
 * phone's own share sheet to send it.
 *
 * Why an image at all: the league shares into WhatsApp and Instagram. WhatsApp
 * caches a link's preview so hard that a fresh card would still show days-old
 * art, and Instagram simply has nowhere to put a link. An image drawn at the
 * moment of tapping sidesteps both — it is as current as the page it came
 * from, and it lands in either app as a picture that looks like the site.
 *
 * Everything the image *says* was decided by `share-card.ts`, which is pure
 * and tested. This file only paints, which is why it is beside the components
 * and carries no test: a canvas has no jsdom, and a painter with no decisions
 * in it has nothing to assert.
 *
 * The colours are read from the design tokens at paint time rather than
 * copied here, so a retheme cannot leave the shared images wearing last
 * year's palette. The fonts are the site's own `@font-face` files, asked for
 * explicitly because a canvas does not trigger font loading by itself.
 */

import type { ShareCard, ShareLine } from '../utils/share-card'

const WIDTH = 1080
const PADDING = 84

/** A token's current value, with the night palette as the safety net. */
function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value === '' ? fallback : value
}

/** An image that refuses to load becomes no image, never a broken paint. */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    // Without this a cross-origin crest would taint the canvas and the final
    // `toBlob` would throw; the storage bucket answers public reads with CORS.
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

async function loadCrests(
  card: ShareCard,
): Promise<Map<string, HTMLImageElement>> {
  const urls = new Set<string>()
  if (card.crest != null) urls.add(card.crest)
  for (const line of card.lines) if (line.crest != null) urls.add(line.crest)

  const loaded = new Map<string, HTMLImageElement>()
  await Promise.all(
    [...urls].map(async (url) => {
      const image = await loadImage(url)
      if (image !== null) loaded.set(url, image)
    }),
  )
  return loaded
}

function lineHeight(line: ShareLine): number {
  return line.sub === undefined ? 88 : 122
}

/** The card's height follows its content; a roster is taller than a podium. */
function measure(card: ShareCard): number {
  const header = card.crest != null ? 320 : 280
  const lines = card.lines.reduce((sum, line) => sum + lineHeight(line), 0)
  const notes = card.notes.length * 44 + (card.notes.length > 0 ? 24 : 0)
  return Math.max(1080, header + lines + notes + 170)
}

export async function paintShareCard(card: ShareCard): Promise<Blob> {
  try {
    await Promise.all([
      document.fonts.load('400 96px "Bebas Neue"'),
      document.fonts.load('600 46px "Barlow Condensed"'),
      document.fonts.load('400 34px "Barlow"'),
    ])
  } catch {
    // A system font is a poorer card, not a failed one.
  }
  const crests = await loadCrests(card)

  const height = measure(card)
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('canvas unavailable')

  const bg = token('--color-bg', '#0c1017')
  const text = token('--color-text', '#e8e6e3')
  const muted = token('--color-text-muted', '#8b8f98')
  const accent = token('--color-accent', '#e8a820')

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, height)

  // The header: eyebrow rule, title, subtitle, and the crest when there is one.
  let y = PADDING + 8
  ctx.fillStyle = accent
  ctx.fillRect(PADDING, y, 76, 8)
  y += 96

  const headerCrest = card.crest != null ? crests.get(card.crest) : undefined
  if (headerCrest !== undefined) {
    const size = 190
    ctx.drawImage(headerCrest, WIDTH - PADDING - size, PADDING, size, size)
  }

  ctx.fillStyle = text
  ctx.font = '400 96px "Bebas Neue", "Arial Narrow", sans-serif'
  ctx.textBaseline = 'alphabetic'
  const titleRoom = headerCrest === undefined ? WIDTH - PADDING * 2 : 700
  ctx.fillText(card.title.toUpperCase(), PADDING, y, titleRoom)
  y += 58

  ctx.fillStyle = muted
  ctx.font = '600 36px "Barlow Condensed", "Arial Narrow", sans-serif'
  ctx.fillText(card.subtitle.toUpperCase(), PADDING, y, titleRoom)
  y += 64

  // The lines.
  for (const line of card.lines) {
    const rowHeight = lineHeight(line)
    const baseline = y + 56

    let left = PADDING
    if (line.crest != null) {
      const crest = crests.get(line.crest)
      if (crest !== undefined) ctx.drawImage(crest, left, baseline - 48, 60, 60)
      // The column reserves the room even when the crest failed to load, so
      // the names of a round stay aligned.
      left += 84
    }

    let rightEdge = WIDTH - PADDING
    if (line.right !== undefined) {
      ctx.fillStyle = accent
      ctx.font = '600 44px "Barlow Condensed", "Arial Narrow", sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(line.right, rightEdge, baseline)
      rightEdge -= ctx.measureText(line.right).width + 36
      ctx.textAlign = 'left'
    }

    ctx.fillStyle = text
    ctx.font = '600 46px "Barlow Condensed", "Arial Narrow", sans-serif'
    ctx.fillText(line.left, left, baseline, rightEdge - left)

    if (line.sub !== undefined) {
      ctx.fillStyle = muted
      ctx.font = '400 32px "Barlow", system-ui, sans-serif'
      ctx.fillText(line.sub, left, baseline + 42, rightEdge - left)
    }

    ctx.strokeStyle = `${accent}33`
    ctx.beginPath()
    ctx.moveTo(PADDING, y + rowHeight - 10)
    ctx.lineTo(WIDTH - PADDING, y + rowHeight - 10)
    ctx.stroke()

    y += rowHeight
  }

  // The marks' small print, when a line wears one.
  if (card.notes.length > 0) {
    y += 24
    ctx.fillStyle = muted
    ctx.font = '400 28px "Barlow", system-ui, sans-serif'
    for (const note of card.notes) {
      ctx.fillText(note, PADDING, y + 28, WIDTH - PADDING * 2)
      y += 44
    }
  }

  // The footer names the site, and says when the card cut something.
  ctx.fillStyle = accent
  ctx.font = '600 40px "Barlow Condensed", "Arial Narrow", sans-serif'
  ctx.fillText(card.footer, PADDING, height - PADDING + 10)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) reject(new Error('canvas produced no image'))
      else resolve(blob)
    }, 'image/png')
  })
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/**
 * The phone's own share sheet when the browser offers one — which is where
 * WhatsApp and Instagram live — and a plain download everywhere else.
 */
export async function shareCardImage(
  card: ShareCard,
  { filename, text }: { filename: string; text: string },
): Promise<ShareOutcome> {
  const blob = await paintShareCard(card)
  const file = new File([blob], filename, { type: 'image/png' })

  if (
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch (error) {
      // Closing the sheet without picking an app is a decision, not a failure.
      if (error instanceof DOMException && error.name === 'AbortError')
        return 'cancelled'
      // Some browsers advertise `canShare` and then refuse files; the
      // download below is the same image by a duller door.
    }
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
