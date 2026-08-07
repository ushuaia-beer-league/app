import { Section } from './Section'
import './SponsorsSection.css'
import { anchorFor } from '../utils/site-routes'
import { useT } from '../i18n/useLanguage'

type Sponsor = {
  name: string
  /** The sponsor's category, when one is worth printing. */
  category?: string
  /** The uploaded logo, already a full URL. */
  logoUrl?: string
  /** Optional emoji standing in for the logo until the real file is uploaded. */
  glyph?: string
  /** Optional link to the sponsor's own site. */
  href?: string
}

type SponsorsSectionProps = {
  /**
   * The season's sponsors. A sponsor is a row in the database (name, logo, link
   * and category), so this component never names one.
   *
   * TODO phase 4: the back office manages sponsors and their logos, and the
   * card's glyph becomes the uploaded image.
   */
  sponsors?: Sponsor[]
}

/**
 * The sponsors wall. With nothing to show it says so, rather than hiding the
 * section or inventing a logo: an empty list is a normal state here.
 */
/**
 * Whether a stored link is safe to hand to an anchor.
 *
 * The panel stores whatever an administrator types, and row level security decides
 * who may type it, but a `javascript:` value in an href runs as the visitor: that is
 * stored XSS, gated only by trusting every present and future administrator's
 * account. So only a web address becomes a link, and anything else renders as the
 * sponsor's plain name rather than as an error.
 */
function isWebAddress(href: string | undefined): href is string {
  return href !== undefined && /^https?:\/\//i.test(href.trim())
}

function CardBody({ sponsor }: { sponsor: Sponsor }) {
  const inner = (
    <>
      {sponsor.logoUrl !== undefined ? (
        <img
          className="sponsors__logo"
          src={sponsor.logoUrl}
          alt=""
          loading="lazy"
        />
      ) : (
        <span className="sponsors__glyph" aria-hidden="true">
          {sponsor.glyph ?? '⭐'}
        </span>
      )}
      <span className="sponsors__name">{sponsor.name}</span>
      {sponsor.category !== undefined && (
        <span className="sponsors__category">{sponsor.category}</span>
      )}
    </>
  )

  return isWebAddress(sponsor.href) ? (
    <a
      className="sponsors__card-link"
      href={sponsor.href}
      rel="noreferrer noopener"
      target="_blank"
    >
      {inner}
    </a>
  ) : (
    inner
  )
}

export function SponsorsSection({ sponsors = [] }: SponsorsSectionProps) {
  const t = useT()
  return (
    <Section
      id={anchorFor('sponsors')}
      eyebrow={t('Gracias a ellos es posible')}
      title={t('Sponsors')}
      tone="alt"
    >
      {sponsors.length === 0 ? (
        <p className="sponsors__empty">
          {t('Todavía no hay sponsors publicados.')}
        </p>
      ) : (
        <ul className="sponsors">
          {sponsors.map((sponsor) => (
            <li className="sponsors__card" key={sponsor.name}>
              {/* The whole card is the link, at the operators' request: a
               * sponsor's card is one target, not a name with a margin. A card
               * with no link is the same card, not an anchor to nowhere. */}
              <CardBody sponsor={sponsor} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
