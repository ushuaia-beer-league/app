/**
 * The teams of the 2026 season, and every spelling of them the sources use.
 *
 * This table exists because no single sheet names a team the same way twice. The
 * fixture writes "Short Shift Soft Sticks" and, in its winner column, "SSSS";
 * the roster sheet writes the sponsored name "Beerros Azulvetrados"; the playoff
 * bracket writes the nickname "azul". Importing any of them without a table like
 * this one produces four teams where there is one.
 *
 * The short-name to sponsored-name mapping was inferred by cross-checking the
 * standings against the playoff brackets, and the organisation has not confirmed
 * it (open questions 1 and 2 of `docs/knowledge-base.md`). It is marked per row.
 */

import type { CompetitionKey } from './types'

export interface TeamSeed {
  slug: string
  competition: CompetitionKey
  /** The name the fixture uses. */
  shortName: string
  /** The sponsored name the roster sheet uses, null while unknown. */
  fullName: string | null
  /** The label the playoff bracket uses. */
  nickname: string | null
  /** Every spelling seen in any source, used only for matching. */
  aliases: readonly string[]
  /** True when the organisation has not confirmed the name mapping. */
  mappingInferred: boolean
  /**
   * A crest uploaded from the panel: a storage path (or a full URL from the old
   * text field). Absent in the seed, where the repo's own artwork is the crest,
   * which is also what the site falls back to when the database sleeps.
   */
  logoUrl?: string | null
}

export const BEER_TEAMS_2026: readonly TeamSeed[] = [
  {
    slug: 'birra-del-fuego',
    competition: 'beer',
    shortName: 'Birra del Fuego',
    fullName: 'Green Seven Birra del fuego',
    nickname: 'verde',
    aliases: ['bdf'],
    mappingInferred: true,
  },
  {
    slug: 'short-shift-soft-sticks',
    competition: 'beer',
    shortName: 'Short Shift Soft Sticks',
    fullName: 'Beerros Azulvetrados',
    nickname: 'azul',
    aliases: ['SSSS'],
    mappingInferred: true,
  },
  {
    slug: 'rock-choppers',
    competition: 'beer',
    shortName: 'Rock Choppers',
    fullName: 'Hantachoppers',
    nickname: 'hanta',
    aliases: [],
    mappingInferred: true,
  },
  {
    slug: 'blanco',
    competition: 'beer',
    shortName: 'Blanco',
    fullName: 'Blancaspuma y las 7 pintas',
    nickname: 'vitox',
    aliases: ['Blancaspuma'],
    mappingInferred: true,
  },
  {
    slug: 'sucucho',
    competition: 'beer',
    shortName: 'Sucucho',
    fullName: 'Frozen Sucucho',
    nickname: 'suc',
    aliases: [],
    mappingInferred: true,
  },
  {
    slug: 'tipo-nine',
    competition: 'beer',
    shortName: 'Tipo Nine',
    fullName: 'Beerizar Rompehielos T9',
    nickname: 't9',
    aliases: ['T9'],
    mappingInferred: true,
  },
  {
    slug: 'zhockey',
    competition: 'beer',
    shortName: 'Zhockey',
    fullName: 'Castores Zhockey',
    nickname: 'z hockey',
    aliases: [],
    mappingInferred: true,
  },
]

/**
 * The women's competition names its teams after the men's ones in the fixture and
 * the standings, and after itself in the statistics sheets: Turbeerras, Frozen
 * Queens, Zambirreras and Moby Drink. Those four are the teams' real names; what
 * the fixture wrote were the sponsors on the jerseys.
 *
 * All four pairings are the league's own answer, given on 6 August 2026, and two
 * of them are confirmed a second time by the badges the league sent, which print
 * both names: Turbeerras carries "Birra del Fuego" and Frozen Queens carries
 * "Sucucho".
 *
 * The other two are worth a paragraph, because arithmetic said otherwise and lost.
 * The published statistics give each woman's goals beside her team, and summed per
 * printed team they came to Zambirreras 10 and Moby Drink 8, against a fixture
 * where Tipo Nine scored 10 and Zhockey 11. The exact match pointed at Zambirreras
 * being Tipo Nine. The league says Zambirreras is Zhockey and Moby Drink is Tipo
 * Nine, so that is what this table holds: eleven goals with three unattributed
 * beats ten that lines up, when the people who played the games say so.
 *
 * The lesson is worth keeping rather than tidying away. Two goals of slop in a
 * sheet that already fails to attribute three of them is not evidence, and a
 * derivation that fits is not the same as a derivation that is right.
 */
export const WUBL_TEAMS_2026: readonly TeamSeed[] = [
  {
    slug: 'wubl-sucucho',
    competition: 'wubl',
    shortName: 'Sucucho',
    fullName: null,
    nickname: 'sucucho',
    aliases: ['Frozen Queens'],
    mappingInferred: true,
  },
  {
    slug: 'wubl-birra-del-fuego',
    competition: 'wubl',
    shortName: 'Birra del Fuego',
    fullName: null,
    nickname: 'bdf',
    aliases: ['Turbeerras'],
    mappingInferred: true,
  },
  {
    slug: 'wubl-tipo-nine',
    competition: 'wubl',
    shortName: 'Tipo Nine',
    fullName: null,
    nickname: 't9',
    aliases: ['Moby Drink'],
    mappingInferred: true,
  },
  {
    slug: 'wubl-zhockey',
    competition: 'wubl',
    shortName: 'Zhockey',
    fullName: null,
    nickname: 'z hockey',
    aliases: ['Zambirreras'],
    mappingInferred: true,
  },
]

/** The four names the women's statistics sheets use, with no confirmed team. */
export const WUBL_STATISTICS_TEAM_NAMES = [
  'Turbeerras',
  'Zambirreras',
  'Frozen Queens',
  'Moby Drink',
] as const

export const TEAMS_2026: readonly TeamSeed[] = [
  ...BEER_TEAMS_2026,
  ...WUBL_TEAMS_2026,
]

/**
 * The slugs an operator renamed in the database on 2026-08-07 (sponsor-based),
 * mapped back to the identity the seed, the rosters and the artwork still use.
 *
 * A slug was supposed to be fixed for the life of the row and the panel let it
 * be edited anyway; the first rename silently disconnected the women's rosters
 * and their crests, which are keyed by the old spelling. This table is the
 * bridge, in one place, so every join can resolve either spelling. The durable
 * fix — freezing the slug once anything references it — is future panel work.
 */
export const RENAMED_SLUGS: Readonly<Record<string, string>> = {
  'wubl-brolas': 'wubl-birra-del-fuego',
  'wubl-drake': 'wubl-sucucho',
  'wubl-taun': 'wubl-zhockey',
  'wubl-vertice': 'wubl-tipo-nine',
}

/** A slug resolved to the identity the seed uses, whichever spelling arrives. */
export function canonicalSlug(slug: string): string {
  return RENAMED_SLUGS[slug] ?? slug
}
