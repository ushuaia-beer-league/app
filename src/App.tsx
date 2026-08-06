import { ContactSection } from './components/ContactSection'
import { GallerySection } from './components/GallerySection'
import { HeroSection } from './components/HeroSection'
import { HistorySection } from './components/HistorySection'
import { LeaguesSection } from './components/LeaguesSection'
import { SiteFooter } from './components/SiteFooter'
import { SiteNav } from './components/SiteNav'
import { SponsorsSection } from './components/SponsorsSection'
import { TeamsSection } from './components/TeamsSection'
import { useSeason } from './hooks/useSeason'
import { anchorFor } from './utils/site-routes'
import { useT } from './i18n/useLanguage'

/**
 * The public page.
 *
 * The season is loaded once, here, and handed down. There is no error branch
 * because there is no error to handle: `useSeason` answers with Supabase when it
 * is configured and awake and with the versioned seed whenever it is not, and
 * `LeaguesSection` says which of the two the visitor is looking at.
 *
 * TODO phase 4: `/admin/`, and the sponsors and photographs the organisation
 * loads from it, which is what turns the two placeholder sections below into
 * real ones.
 */
export function App() {
  const { data: season, loading } = useSeason()
  const t = useT()

  return (
    <>
      <a className="skip-link" href="#contenido">
        {t('Saltar al contenido')}
      </a>

      <SiteNav />

      <main id="contenido">
        <HeroSection season={season?.season} />
        <HistorySection />

        {season ? (
          <LeaguesSection season={season} />
        ) : (
          <p
            className="page-loading"
            id={anchorFor('ligas')}
            aria-live="polite"
          >
            {loading ? t('Cargando la temporada…') : ''}
          </p>
        )}

        {season && <TeamsSection season={season} />}

        <GallerySection />
        <SponsorsSection />
        <ContactSection />
      </main>

      <SiteFooter season={season?.season} />
    </>
  )
}
