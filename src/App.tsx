import { ContactSection } from './components/ContactSection'
import { GallerySection } from './components/GallerySection'
import { HeroSection } from './components/HeroSection'
import { HistorySection } from './components/HistorySection'
import { SiteFooter } from './components/SiteFooter'
import { SiteNav } from './components/SiteNav'
import { SponsorsSection } from './components/SponsorsSection'

/**
 * The public page.
 *
 * This is the part of phase 3 of `docs/plan.md` that needs no tournament data:
 * the navigation, the hero, the league's history, the gallery shell, sponsors
 * and contact. Nothing here reads from Supabase or from the seed.
 *
 * TODO phase 3, tables slice: Ligas & Estadísticas (fixture, standings, scoring
 * leaders, goalkeepers with the competition selector) and the playoff bracket
 * go between the history and the gallery, and the season then flows down to the
 * hero, the gallery and the footer.
 */
export function App() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <SiteNav />

      <main id="contenido">
        <HeroSection />
        <HistorySection />
        <GallerySection />
        <SponsorsSection />
        <ContactSection />
      </main>

      <SiteFooter />
    </>
  )
}
