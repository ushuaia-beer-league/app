import { Crest } from './Crest'
import './HeroSection.css'

/** One of the four figures the reference prints under the title. */
type HeroStat = {
  /** Already formatted for display: this component does no arithmetic. */
  value: string
  /** Spanish label, for instance "Equipos". */
  label: string
}

/** A competition badge. The tone matches the competition tokens in `tokens.css`. */
type HeroCompetition = {
  name: string
  tone: 'beer' | 'wubl' | 'milkshake' | 'stars'
}

type HeroSectionProps = {
  /**
   * The season being shown. Absent while no season is loaded, in which case the
   * eyebrow drops the year rather than printing a year nobody confirmed.
   */
  season?: number
  /**
   * Teams, competitions, matches and the founding year, in that order in the
   * reference. Every figure is derived from tournament data, so the caller
   * supplies them and the row is left out when there are none.
   *
   * TODO phase 3, tables slice: pass these down once the seed is wired up.
   */
  stats?: HeroStat[]
  /**
   * The competition badges. They come from the `competitions` table, so this
   * component never names one.
   *
   * TODO phase 3, tables slice: the reference makes each badge scroll to the
   * competition selector, which does not exist yet.
   */
  competitions?: HeroCompetition[]
}

/**
 * The opening screen: the crest, the league's name as the page's only level-one
 * heading, the tagline and, when a season is loaded, its headline figures.
 */
export function HeroSection({
  season,
  stats = [],
  competitions = [],
}: HeroSectionProps) {
  return (
    <section className="hero" id="hero" aria-labelledby="hero-title">
      <div className="hero__backdrop" aria-hidden="true" />
      <div className="hero__ring hero__ring--outer" aria-hidden="true" />
      <div className="hero__ring hero__ring--inner" aria-hidden="true" />

      <div className="hero__content">
        <Crest size="md" label="Escudo de la Ushuaia Beer League" />

        <p className="hero__eyebrow">
          🏒 {season === undefined ? '' : `Temporada ${season} · `}Hockey sobre
          Hielo
        </p>

        <h1 className="hero__title" id="hero-title">
          <span className="hero__word hero__word--ice">Ushuaia</span>{' '}
          <span className="hero__word hero__word--white">Beer</span>{' '}
          <span className="hero__word hero__word--gold">League</span>
        </h1>

        <p className="hero__tagline">
          Hockey , <span className="hero__tagline-accent">Birra</span> , Fin del
          Mundo · Desde 2023
        </p>

        {stats.length > 0 && (
          <dl className="hero__stats">
            {stats.map((stat) => (
              <div className="hero__stat" key={stat.label}>
                <dt className="hero__stat-label">{stat.label}</dt>
                <dd className="hero__stat-value">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="hero__cta">
          <a className="hero__button" href="#historia">
            Historia UBL
          </a>
        </p>

        {competitions.length > 0 && (
          <ul className="hero__pills">
            {competitions.map((competition) => (
              <li
                className={`hero__pill hero__pill--${competition.tone}`}
                key={competition.name}
              >
                {competition.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
