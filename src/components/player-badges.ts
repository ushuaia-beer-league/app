import gonza from '../assets/players/beerizar-gonza.webp'
import juan from '../assets/players/beerizar-juan.webp'
import maite from '../assets/players/beerizar-maite.webp'
import nico from '../assets/players/beerizar-nico.webp'
import ofe from '../assets/players/beerizar-ofe.webp'
import rama from '../assets/players/beerizar-rama.webp'
import reyner from '../assets/players/beerizar-reyner.webp'
import tinchoCosentino from '../assets/players/beerizar-tincho-cosentino.webp'
import tinchoLopez from '../assets/players/beerizar-tincho-lopez.webp'
import vicky from '../assets/players/beerizar-vicky.webp'

/**
 * The badges the league drew for individual players, by team.
 *
 * One team has them: Almirante Beerizar, which is Tipo Nine, and it has ten. They
 * are the same artwork as the team crest with a person's face in it, in the team's
 * orange, and they came from the league along with the crests.
 *
 * **Nobody is identified against the roster here, and that is deliberate.** Each
 * file carries a nickname and nothing else, and eight of the ten are first names
 * only: `gonza`, `ofe`, `rama`, `vicky`. Matching those to roster lines would be
 * exactly the guess that already went wrong once in this repository, when the
 * women's teams were paired to their fixture by arithmetic that fitted and was
 * wrong. So the nickname is shown as the league wrote it, the badge is shown beside
 * its team, and no claim is made about which roster line it belongs to. The league
 * can label them the day it wants to.
 *
 * A team with no badges gets nothing rather than an empty row.
 */
export interface PlayerBadge {
  /** The league's own nickname for the file, capitalised for reading. */
  nickname: string
  src: string
}

/**
 * The ten, in the order the files sort, which is alphabetical and as good as any:
 * no source says these players have an order, and inventing one would put somebody
 * first.
 */
const ALMIRANTE_BEERIZAR: readonly PlayerBadge[] = [
  { nickname: 'Gonza', src: gonza },
  { nickname: 'Juan', src: juan },
  { nickname: 'Maite', src: maite },
  { nickname: 'Nico', src: nico },
  { nickname: 'Ofe', src: ofe },
  { nickname: 'Rama', src: rama },
  { nickname: 'Reyner', src: reyner },
  { nickname: 'Tincho Cosentino', src: tinchoCosentino },
  { nickname: 'Tincho López', src: tinchoLopez },
  { nickname: 'Vicky', src: vicky },
]

const BADGES: Readonly<Record<string, readonly PlayerBadge[]>> = {
  // Beerizar is Tipo Nine, and orange. The league said so on 6 August 2026.
  'tipo-nine': ALMIRANTE_BEERIZAR,
}

/** The player badges a team has, which for ten of the eleven teams is none. */
export function playerBadges(slug: string): readonly PlayerBadge[] {
  return BADGES[slug] ?? []
}
