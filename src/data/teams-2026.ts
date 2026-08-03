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
 * The women's competition names its teams after the men's ones in the fixture
 * and the standings, and after something else entirely in the statistics sheets:
 * Turbeerras, Zambirreras, Frozen Queens and Moby Drink. The rosters do not
 * mirror the men's, so the two sets cannot be matched by inference.
 *
 * Only one pairing has evidence, Frozen Queens with Frozen Sucucho, and it is
 * the only one recorded here. A statistics line for a team with no pairing is
 * imported with the printed text and no team, which is the visible gap the
 * organisation has to close (open question 2).
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
    aliases: [],
    mappingInferred: true,
  },
  {
    slug: 'wubl-tipo-nine',
    competition: 'wubl',
    shortName: 'Tipo Nine',
    fullName: null,
    nickname: 't9',
    aliases: [],
    mappingInferred: true,
  },
  {
    slug: 'wubl-zhockey',
    competition: 'wubl',
    shortName: 'Zhockey',
    fullName: null,
    nickname: 'z hockey',
    aliases: [],
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
