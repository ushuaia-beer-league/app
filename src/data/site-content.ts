import type { Language, StringKey } from '../i18n/language'
import { getSupabaseClient } from './supabase-client'
import { SITE_CONTENT_SELECT } from './queries'

/**
 * The panel-edited overrides for the site's prose.
 *
 * A block edited from the panel overrides the built-in text for that block in that
 * language; a block nobody edited, or a language nobody edited it in, keeps the
 * text shipped in the code. So editing the Spanish never blanks the English, and a
 * paused database is a site that still says everything (the same offline rule as
 * the season itself).
 *
 * The ten commandments have no key here and never get one: they are the league's
 * rulebook, quoted verbatim.
 */
export const CONTENT_KEYS = [
  'historia-nacimiento',
  'historia-beer-league',
  'historia-comienzo',
  'historia-apoyo',
  'historia-hoy',
] as const

export type ContentKey = (typeof CONTENT_KEYS)[number]

export interface ContentBlock {
  key: ContentKey
  language: Language
  title: string | null
  body: string
}

export type ContentOverrides = ReadonlyMap<string, ContentBlock>

const mapKey = (key: string, language: string) => `${key}#${language}`

/** The override for one block in one language, or null meaning use the built-in. */
export function overrideFor(
  overrides: ContentOverrides | undefined,
  key: ContentKey,
  language: Language,
): ContentBlock | null {
  return overrides?.get(mapKey(key, language)) ?? null
}

/** Body text split into the paragraphs the editor separated with blank lines. */
export function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
}

/**
 * Loads every override in one request. Empty on any failure, because a page that
 * falls back to its built-in prose is a working page.
 */
export async function loadContentOverrides(): Promise<ContentOverrides> {
  const empty = new Map<string, ContentBlock>()
  try {
    const client = await getSupabaseClient()
    if (!client) return empty
    const { data, error } = await client
      .from('site_content')
      .select(SITE_CONTENT_SELECT)
    if (error || !data) return empty
    for (const row of data as unknown as ContentBlock[]) {
      empty.set(mapKey(row.key, row.language), row)
    }
    return empty
  } catch {
    return empty
  }
}

/**
 * The built-in text of each block, as catalogue keys, so the panel can show the
 * current words in the chosen language and the operator edits over them instead
 * of retyping from a blank box — which is what they asked for, in these words:
 * "estaría bueno editar por sobre lo hecho".
 *
 * Paragraph = a list of keys joined with spaces; paragraphs join with a blank
 * line, the same convention the editor saves with. The italics of the built-in
 * rendering are lost when a block is edited, and that is the accepted trade.
 */
const BUILT_IN: Readonly<
  Record<ContentKey, { title: StringKey; paragraphs: StringKey[][] }>
> = {
  'historia-nacimiento': {
    title: 'Cómo nació la UBL',
    paragraphs: [
      [
        'Toda gran historia arranca más o menos igual: cuatro amigos, muchas ganas de jugar y una pregunta simple:',
        '"¿Y si armamos algo para competir... pero pasándola bien?"',
      ],
      [
        'Así nació la Ushuaia Beer League. Un grupo de apasionados por el deporte que buscaba un espacio donde lo importante no fuera solo ganar, sino también divertirse, reencontrarse, mover el cuerpo, quemar algunas calorías y compartir buenos momentos dentro y fuera de la cancha.',
      ],
    ],
  },
  'historia-beer-league': {
    title: '¿Qué significa Beer League?',
    paragraphs: [
      [
        'El concepto viene de la cultura del hockey sobre hielo. En muchas partes del mundo, las Beer Leagues son ligas recreativas pensadas para quienes aman competir, pero ya no viven el deporte desde la exigencia profesional: jugadores fuera del circuito competitivo, madres y padres con agenda completa, ex deportistas, gente que vuelve después de años, amateurs con hambre de juego y sí... también algún que otro gordito cervecero 😎🍺',
      ],
      ['Es competencia con otra energía: menos presión, más comunidad.'],
    ],
  },
  'historia-comienzo': {
    title: 'El comienzo',
    paragraphs: [
      [
        'En 2023, esa idea tomó forma en Ushuaia. Lo que arrancó como una prueba entre amigos empezó a crecer fecha tras fecha, temporada tras temporada. Más jugadores. Más equipos. Más historias. Más ganas de participar.',
      ],
      [
        'Siempre con algo que valoramos muchísimo: la buena predisposición de quienes se suman, colaboran y hacen que cada edición salga adelante.',
      ],
    ],
  },
  'historia-apoyo': {
    title: 'El primer gran apoyo',
    paragraphs: [
      [
        'Si hablamos de comienzos, hay que nombrar a quienes confiaron desde el día uno. Nuestro primer sponsor fue',
        ', acompañando el proyecto desde sus primeros pasos y entendiendo perfecto el espíritu de esta locura organizada. Porque si había Beer League... tenía que haber buena birra cerca.',
      ],
    ],
  },
  'historia-hoy': {
    title: 'Lo que somos hoy',
    paragraphs: [
      [
        'La UBL es mucho más que un torneo. Es una comunidad. Es deporte con identidad fueguina. Es competencia sana. Es gente que se encuentra para jugar, reírse y compartir.',
      ],
      ['Y lo mejor de todo es que esto recién empieza.'],
      ['Fin del mundo. Comienzo de todo... tercer tiempo.'],
    ],
  },
}

/** The block's current built-in words in one language, ready to edit over. */
export function builtInBlock(
  key: ContentKey,
  t: (k: StringKey) => string,
): { title: string; body: string } {
  const block = BUILT_IN[key]
  const body = block.paragraphs
    .map((paragraph) =>
      paragraph
        .map((part, i) =>
          // The sponsor's name sits between the two halves of its sentence and is
          // a proper noun, not a catalogue key.
          key === 'historia-apoyo' && i === 1
            ? `Birra del Fuego${t(part)}`
            : t(part),
        )
        .join(' '),
    )
    .join('\n\n')
  return { title: t(block.title), body }
}
