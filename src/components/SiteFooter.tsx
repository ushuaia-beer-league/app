import { Crest } from './Crest'
import { Wordmark } from './Wordmark'
import './SiteFooter.css'

type SiteFooterProps = {
  /**
   * The season on show. The reference prints "Temporada 2026" as a literal; a
   * year is data, so it arrives from the caller or the line simply omits it.
   */
  season?: number
}

/** The closing band: crest, wordmark and the league's one-line description. */
export function SiteFooter({ season }: SiteFooterProps) {
  const seasonPart = season === undefined ? '' : `Temporada ${season} · `

  return (
    <footer className="site-footer">
      <p className="site-footer__brand">
        <Crest size="sm" />
        <Wordmark size="md" />
      </p>
      <p className="site-footer__line">
        Hockey sobre Hielo · Fin del Mundo · {seasonPart}Desde 2023
      </p>
    </footer>
  )
}
