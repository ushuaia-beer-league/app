import birraDelFuego from '../assets/logos/birra-del-fuego.webp'
import blanco from '../assets/logos/blanco.webp'
import rockChoppers from '../assets/logos/rock-choppers.webp'
import shortShiftSoftSticks from '../assets/logos/short-shift-soft-sticks.webp'
import sucucho from '../assets/logos/sucucho.webp'
import tipoNine from '../assets/logos/tipo-nine.webp'
import wublBirraDelFuego from '../assets/logos/wubl-birra-del-fuego.webp'
import wublSucucho from '../assets/logos/wubl-sucucho.webp'
import wublTipoNine from '../assets/logos/wubl-tipo-nine.webp'
import wublZhockey from '../assets/logos/wubl-zhockey.webp'
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
 * The four women's badges arrived later and are here too, so every team of the
 * season has its own. They are JPEG on a black ground rather than transparent
 * PNG, which happens to suit a dark page: no cutting out, no filter.
 *
 * A team with no entry still shows the empty frame rather than somebody else's
 * crest, which is what a competition the league has not run yet would get.
 *
 * The women's four are keyed by slug like the rest, and the slug is the old
 * sponsor the fixture used ("wubl-birra-del-fuego" is Turbeerras). If the league
 * corrects which team played which of those fixtures, the names move between rows
 * and two of these entries move with them.
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
  'wubl-birra-del-fuego': wublBirraDelFuego,
  // The same four teams under the slugs an operator renamed them to on
  // 2026-08-07 (sponsor-based: brolas/drake/taun/vertice). The database rows
  // moved; the seed and these keys had not, and the women's fixture lost its
  // crests. Both spellings resolve so neither copy of the data goes badgeless.
  'wubl-brolas': wublBirraDelFuego,
  'wubl-drake': wublSucucho,
  'wubl-taun': wublZhockey,
  'wubl-vertice': wublTipoNine,
  'wubl-sucucho': wublSucucho,
  'wubl-tipo-nine': wublTipoNine,
  'wubl-zhockey': wublZhockey,
}

/** The crest for a slug, or null when the league has not sent one. */
export function teamLogo(slug: string): string | null {
  return TEAM_LOGOS[slug] ?? null
}
