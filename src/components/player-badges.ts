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
 * The badges the league drew for individual players, attached to the roster line
 * each one belongs to.
 *
 * An earlier version refused to attach them, because the files carry nicknames and
 * pairing nicknames to people is the guess that once crossed two women's rosters.
 * What changed is the evidence, not the caution: Tipo Nine's published roster has
 * exactly ten players and the ten nicknames map onto them one-to-one with nobody
 * left over and no name claimed twice — Alarcon **Gonza**, Atristain **Juan**,
 * Zayas **Maite**na, Piccone **Nico**las, Diaz **Ofe**lia, Beltrami **Ram**iro,
 * Longart **Reyner**, **Cosentino** Martin and **Lopez** Mieres Martin (the two
 * Tinchos, told apart by surname), Seru Campos **Vicky**toria. A bijection is not
 * an inference with a rival reading; still, if the league ever corrects one, this
 * table is the single place to edit.
 *
 * Keyed by the roster's own printed name, so a renamed roster line simply stops
 * matching (the badge disappears rather than landing on somebody else), and the
 * test that checks all ten still match will say so.
 */
const BEERIZAR_BY_ROSTER_NAME: Readonly<Record<string, string>> = {
  'Alarcon Gonza': gonza,
  'Atristain Juan': juan,
  'Zayas Maitena': maite,
  'Piccone Nicolas': nico,
  'Diaz Ofelia': ofe,
  'Beltrami Ramiro': rama,
  'Longart Reyner': reyner,
  'Cosentino Martin': tinchoCosentino,
  'Lopez Mieres Martin': tinchoLopez,
  'Seru Campos Victoria': vicky,
}

const BY_TEAM: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  // Beerizar is Tipo Nine. The league said so on 6 August 2026.
  'tipo-nine': BEERIZAR_BY_ROSTER_NAME,
}

/** The badge for one roster line, or null: ten players have one, everybody else none. */
export function playerBadge(teamSlug: string, playerName: string): string | null {
  return BY_TEAM[teamSlug]?.[playerName] ?? null
}

/** How many names this table expects to find on a team's roster. For the test. */
export function badgeNames(teamSlug: string): readonly string[] {
  return Object.keys(BY_TEAM[teamSlug] ?? {})
}
