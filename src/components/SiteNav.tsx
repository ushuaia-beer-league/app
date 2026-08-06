import { useState } from 'react'
import { LanguagePicker } from '../i18n/LanguagePicker'
import type { StringKey } from '../i18n/language'
import { useT } from '../i18n/useLanguage'
import { Crest } from './Crest'
import { Wordmark } from './Wordmark'
import './SiteNav.css'

/**
 * Only the sections that exist. The reference also links "Ligas" and
 * "Playoffs"; both arrive with the tournament tables in a later slice of phase
 * 3 of `docs/plan.md`, and linking to an anchor that is not on the page yet
 * would strand a visitor at the bottom of the document.
 *
 * The playoff bracket is a tab inside the Ligas section rather than a section of
 * its own, so the competition selector governs it too and there is only one
 * place to choose Beer League or WUBL.
 *
 * TODO phase 4: the reference's `⚙ Admin` button, which opened an in-page
 * panel guarded by a password in the browser. It becomes a link to `/admin/`
 * behind Google sign-in.
 */
const NAV_ITEMS: { href: string; label: StringKey }[] = [
  { href: '#historia', label: 'Historia' },
  { href: '#ligas', label: 'Ligas & Estadísticas' },
  { href: '#equipos', label: 'Equipos' },
  { href: '#galeria', label: 'Fotos' },
  { href: '#sponsors', label: 'Sponsors' },
  { href: '#contacto', label: 'Contacto' },
]

const LINKS_ID = 'site-nav-links'

/**
 * The fixed bar at the top of the page.
 *
 * The reference simply hides its links below 680px, leaving a phone with no way
 * to navigate. Here the links are a disclosure: a labelled button on a small
 * screen, a plain row from `42.5em` up.
 */
export function SiteNav() {
  const [isOpen, setIsOpen] = useState(false)
  const t = useT()

  return (
    <header className="site-nav">
      <nav className="site-nav__bar" aria-label={t('Navegación principal')}>
        <a className="site-nav__brand" href="#hero">
          <Crest size="sm" />
          <Wordmark size="sm" />
        </a>

        <button
          className="site-nav__toggle"
          type="button"
          aria-expanded={isOpen}
          aria-controls={LINKS_ID}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="site-nav__toggle-glyph" aria-hidden="true">
            {isOpen ? '✕' : '☰'}
          </span>
          {isOpen ? t('Cerrar menú') : t('Menú')}
        </button>

        <ul
          className={`site-nav__links${isOpen ? ' site-nav__links--open' : ''}`}
          id={LINKS_ID}
        >
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a href={item.href} onClick={() => setIsOpen(false)}>
                {t(item.label)}
              </a>
            </li>
          ))}
          {/* Inside the disclosure on a phone, so a small screen does not have to
           * find room for it beside the league's name, and on the bar from the
           * breakpoint up. */}
          <li className="site-nav__language">
            <LanguagePicker />
          </li>
        </ul>
      </nav>
    </header>
  )
}
