import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ContactSection } from './components/ContactSection'
import { GallerySection } from './components/GallerySection'
import { HeroSection } from './components/HeroSection'
import { HistorySection } from './components/HistorySection'
import { LeaguesSection } from './components/LeaguesSection'
import { SiteFooter } from './components/SiteFooter'
import { SiteNav } from './components/SiteNav'
import { SponsorsSection } from './components/SponsorsSection'
import { TeamsSection } from './components/TeamsSection'
import {
  loadContentOverrides,
  type ContentOverrides,
} from './data/site-content'
import { useSeason } from './hooks/useSeason'
import {
  competitionFor,
  pathForLeagues,
  routeFor,
  withoutCompetition,
  type SectionKey,
} from './utils/site-routes'
import { useT } from './i18n/useLanguage'

/**
 * The public site, as separate pages.
 *
 * It used to be one long document with the navigation jumping between anchors, and
 * the league asked for it to be split so nobody has to scroll past a whole season to
 * reach the teams. Each address now renders its own screen and nothing else.
 *
 * Three things follow from that and are worth knowing before changing it:
 *
 * - **The season is still loaded once, here**, and handed to whichever screen is on.
 *   Moving the load into each screen would fetch it again on every navigation, and on
 *   the free Supabase tier that is the difference between waking the database once
 *   and waking it constantly.
 * - **An address nobody recognises renders the home page** rather than a 404. On a
 *   site this size a "not found" is a dead end a visitor cannot act on, and a
 *   mistyped link is far likelier than a page that existed and went away.
 * - **The tab under `/ligas` comes from the address**, so a shared link opens on the
 *   standings and the back button walks between the tables.
 *
 * There is no error branch because there is nothing to handle: `useSeason` answers
 * with Supabase when it is configured and awake and with the versioned seed whenever
 * it is not, and `LeaguesSection` says which of the two is on screen.
 */
export function App() {
  const { data: season, loading } = useSeason()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const t = useT()

  const [overrides, setOverrides] = useState<ContentOverrides>()

  // Loaded once, like the season: the prose changes when somebody edits it in the
  // panel, not per navigation, and a failed load is simply the built-in text.
  useEffect(() => {
    let current = true
    void loadContentOverrides().then((loaded) => {
      if (current) setOverrides(loaded)
    })
    return () => {
      current = false
    }
  }, [])

  const route = routeFor(withoutCompetition(pathname))
  const competition = competitionFor(pathname)
  const section: SectionKey = route?.section ?? 'inicio'

  // In an effect and not during render: the document is not this component's to
  // change while React is still deciding what to draw, and the lint rule that says so
  // is right. Set here rather than in each screen all the same, because one place
  // knows both the address and its name. A browser tab still showing the previous
  // screen is the classic single page application bug, and it is what a bookmark
  // saves.
  useEffect(() => {
    if (route !== null) document.title = route.title
  }, [route])

  const waiting = (
    <p className="page-loading" aria-live="polite">
      {loading ? t('Cargando la temporada…') : ''}
    </p>
  )

  return (
    <>
      <a className="skip-link" href="#contenido">
        {t('Saltar al contenido')}
      </a>

      <SiteNav />

      <main id="contenido">
        {section === 'inicio' && (
          <>
            <HeroSection season={season?.season} />
            <HistorySection overrides={overrides} />
          </>
        )}

        {section === 'ligas' &&
          (season ? (
            <LeaguesSection
              season={season}
              tab={route?.tab}
              choice={competition}
              onTabChange={(tab) => navigate(pathForLeagues(tab, competition))}
              onChoiceChange={(next) =>
                navigate(pathForLeagues(route?.tab ?? 'fixture', next))
              }
            />
          ) : (
            waiting
          ))}

        {section === 'equipos' &&
          (season ? <TeamsSection season={season} /> : waiting)}

        {section === 'fotos' && <GallerySection />}
        {section === 'sponsors' && <SponsorsSection />}
        {section === 'contacto' && <ContactSection />}
      </main>

      <SiteFooter season={season?.season} />
    </>
  )
}
