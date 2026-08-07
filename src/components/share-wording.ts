import type { StringKey } from '../i18n/es'
import type { ShareWording } from '../utils/share-card'

/**
 * The translated strings every drawn card composes with, built once per
 * caller from the same translator the page renders with — so the image a
 * visitor shares speaks the language they were reading.
 *
 * The marks' explanations are Spanish literals, exactly like the legend under
 * the published tables (`PublishedMarksLegend`), which has never been
 * translated: the marks quote the league's own sheets, and the sheets are
 * Argentine. The site's address is a literal because an address has no
 * language.
 */
export function shareWording(t: (key: StringKey) => string): ShareWording {
  return {
    andMore: t('y {n} más en ubl.com.ar'),
    site: 'ubl.com.ar',
    printedNote: '* Nombre como lo imprime la planilla, sin confirmar.',
    substituteNote: 'Sup: suplente, jugó sin integrar el plantel.',
    substituteMark: 'Sup',
    noTeam: t('Sin equipo'),
  }
}
