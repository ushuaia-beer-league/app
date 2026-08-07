import { mediaUrl } from '../admin/mediaFiles'
import { PUBLIC_PHOTOS_SELECT, PUBLIC_SPONSORS_SELECT } from './queries'
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
