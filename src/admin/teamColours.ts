/**
 * The colours a team can wear, and how a stored value becomes a square the
 * operator can see.
 *
 * `teams.colour` is free text, and that is deliberate: the league's sheets give
 * colours as words ("Amarillo", "Turquesa"), and the rows an operator has
 * already saved say exactly that. So the panel does not migrate anything to
 * hex. It offers the league's own words as swatches — a picker whose value is
 * still the word — and, for a kit whose shade is not one of them, a native
 * colour picker whose value is a hex string. Both are legal in a text column,
 * and `swatchFor` is what turns either into something paintable.
 *
 * An unknown word keeps its text and shows no square rather than being
 * guessed at: a colour nobody can name is a colour this file will not invent.
 */

/** The league's own colour words, with the shade the panel paints for each. */
export const NAMED_COLOURS: readonly { name: string; hex: string }[] = [
  { name: 'Negro', hex: '#101418' },
  { name: 'Blanco', hex: '#f2f2f0' },
  { name: 'Gris', hex: '#8b8f98' },
  { name: 'Rojo', hex: '#d02b2b' },
  { name: 'Bordó', hex: '#8a1f38' },
  { name: 'Naranja', hex: '#e8721f' },
  { name: 'Amarillo', hex: '#f2c31a' },
  { name: 'Verde', hex: '#2f9e4f' },
  { name: 'Turquesa', hex: '#24b0a5' },
  { name: 'Celeste', hex: '#5bb7e8' },
  { name: 'Azul', hex: '#2255c4' },
  { name: 'Violeta', hex: '#7b4fd0' },
  { name: 'Rosa', hex: '#e2679f' },
  { name: 'Marrón', hex: '#7a4a25' },
]

/** Lower case, trimmed and without accents, so «Marron» finds «Marrón». */
function plain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

const BY_NAME = new Map(
  NAMED_COLOURS.map((colour) => [plain(colour.name), colour.hex]),
)

/** Whether a stored value is a hex colour rather than a word. */
export function isHexColour(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
}

/**
 * The CSS colour to paint for a stored value, or null when there is nothing
 * to paint: no colour at all, or a word the league has not named.
 */
export function swatchFor(value: string | null): string | null {
  if (value === null) return null

  const trimmed = value.trim()
  if (trimmed === '') return null
  if (isHexColour(trimmed)) return trimmed.toLowerCase()

  return BY_NAME.get(plain(trimmed)) ?? null
}

/** The hex a colour picker should open on, which is black when nothing says. */
export function pickerValue(value: string | null): string {
  return swatchFor(value) ?? '#101418'
}
