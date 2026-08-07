import { mediaUrl } from '../admin/mediaFiles'
import {
  PUBLIC_CONTACT_SELECT,
  PUBLIC_PHOTOS_SELECT,
  PUBLIC_SPONSORS_SELECT,
} from './queries'
import { getSupabaseClient } from './supabase-client'

/**
 * What the panel publishes for the public site: sponsors and photographs.
 *
 * This module exists because of a real loss: the panel wrote sponsors to the
 * database and the public page rendered an empty list forever, because nothing
 * ever read them back. An administrator's afternoon of work, invisible. Every
 * failure here answers an empty list for the same reason the season falls back
 * to the seed: a paused database must cost a section its content, never the page.
 */
export interface PublicSponsor {
  name: string
  href?: string
  logoUrl?: string
}

export interface PublicPhoto {
  url: string
  caption: string | null
}

export async function loadPublicSponsors(): Promise<PublicSponsor[]> {
  try {
    const client = await getSupabaseClient()
    if (!client) return []
    const { data, error } = await client
      .from('sponsors')
      .select(PUBLIC_SPONSORS_SELECT)
      .eq('active', true)
      .order('display_order')
    if (error || !data) return []
    return data.map((row) => ({
      name: row.name,
      ...(row.url ? { href: row.url } : {}),
      ...(row.logo_path
        ? { logoUrl: mediaUrl(row.logo_path) ?? undefined }
        : {}),
    }))
  } catch {
    return []
  }
}

export async function loadPublicPhotos(): Promise<PublicPhoto[]> {
  try {
    const client = await getSupabaseClient()
    if (!client) return []
    const { data, error } = await client
      .from('photos')
      .select(PUBLIC_PHOTOS_SELECT)
      .order('display_order')
    if (error || !data) return []
    return data.flatMap((row) => {
      const url = mediaUrl(row.storage_path)
      return url === null ? [] : [{ url, caption: row.caption }]
    })
  } catch {
    return []
  }
}

export interface PublicContactChannel {
  label: string
  href: string
  glyph?: string
}

/**
 * Whether a stored href may become a link. The database constraint already
 * refuses anything that is not web or mailto, but the browser is the layer that
 * executes an href, so it checks again: two layers, one rule.
 */
function isContactHref(href: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(href.trim())
}

/** The places a league actually links, by host, in the words people use. */
const CHANNEL_NAMES: readonly (readonly [string, string])[] = [
  ['instagram.com', 'Instagram'],
  ['facebook.com', 'Facebook'],
  ['wa.me', 'WhatsApp'],
  ['whatsapp.com', 'WhatsApp'],
  ['youtube.com', 'YouTube'],
  ['tiktok.com', 'TikTok'],
  ['x.com', 'X'],
  ['twitter.com', 'X'],
]

/**
 * A readable name for a channel whose label is just its address.
 *
 * The panel asks for a name and an address separately, and the first thing an
 * operator did was paste the address into both — so the contact page printed
 * HTTPS://WWW.INSTAGRAM.COM/... in display capitals. Their data is left exactly
 * as they wrote it; what changes is that the site refuses to *print* a URL as a
 * name: a known host gets its everyday name, a mailto gets its address, and
 * anything else gets its hostname.
 */
export function friendlyChannelLabel(label: string, href: string): string {
  const looksLikeAddress = /^(https?:\/\/|mailto:|www\.)/i.test(label.trim())
  if (!looksLikeAddress) return label

  if (/^mailto:/i.test(href)) return href.replace(/^mailto:/i, '')
  try {
    const host = new URL(href).hostname.toLowerCase().replace(/^www\./, '')
    const known = CHANNEL_NAMES.find(
      ([name]) => host === name || host.endsWith(`.${name}`),
    )
    return known ? known[1] : host
  } catch {
    return label
  }
}

export async function loadContactChannels(): Promise<PublicContactChannel[]> {
  try {
    const client = await getSupabaseClient()
    if (!client) return []
    const { data, error } = await client
      .from('contact_channels')
      .select(PUBLIC_CONTACT_SELECT)
      .eq('active', true)
      .order('display_order')
    if (error || !data) return []
    return data.flatMap((row) =>
      isContactHref(row.href)
        ? [
            {
              label: friendlyChannelLabel(row.label, row.href),
              href: row.href,
              ...(row.glyph ? { glyph: row.glyph } : {}),
            },
          ]
        : [],
    )
  } catch {
    return []
  }
}
