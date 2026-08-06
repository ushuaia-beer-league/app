import birraDelFuego from '../assets/logos/birra-del-fuego.webp'
import blanco from '../assets/logos/blanco.webp'
import rockChoppers from '../assets/logos/rock-choppers.webp'
import shortShiftSoftSticks from '../assets/logos/short-shift-soft-sticks.webp'
import sucucho from '../assets/logos/sucucho.webp'
import tipoNine from '../assets/logos/tipo-nine.webp'
import zhockey from '../assets/logos/zhockey.webp'

/**
 * The crest of each team that has one, by slug.
 *
 * Seven of them, which is every Beer League team, sent by the league as its own
 * artwork. They live in the repository rather than in the storage bucket on
 * purpose: the free Supabase tier pauses a project after about a week of
 * inactivity, and a crest served from a paused project is a broken image on a page
 * that is otherwise still working from the versioned seed. These change once a
 * season at most, so the cost of shipping them is a build and the benefit is that
 * they cannot go missing.
 *
 * The four women's teams are absent, and a team with no entry here shows the empty
 * frame rather than somebody else's crest. That is the same gap the rest of this
 * site shows rather than fills.
 *
 * The filenames the league sent name the sponsored team rather than the fixture's
 * short name, and three of them spell it differently than the roster sheet does:
 * "blancaespuma" against Blancaspuma, "azulvestrados" against Azulvetrados, and
 * "almirante_beerizar" against Beerizar Rompehielos T9. Mapped by hand here, which
 * is the honest place for a decision somebody made by reading, and one more thing
 * for the organisation to confirm.
 */
export const TEAM_LOGOS: Readonly<Record<string, string>> = {
  'birra-del-fuego': birraDelFuego,
  blanco,
  'rock-choppers': rockChoppers,
  'short-shift-soft-sticks': shortShiftSoftSticks,
  sucucho,
  'tipo-nine': tipoNine,
  zhockey,
}

/** The crest for a slug, or null when the league has not sent one. */
export function teamLogo(slug: string): string | null {
  return TEAM_LOGOS[slug] ?? null
}
