import { Section } from './Section'
import './ContactSection.css'
import { anchorFor } from '../utils/site-routes'

type ContactChannel = {
  /** What the visitor reads, in Spanish: "Instagram", "Correo", and so on. */
  label: string
  /** Where it goes: a `mailto:` address or the profile's URL. */
  href: string
  /** Optional emoji, decorative only. */
  glyph?: string
}

type ContactSectionProps = {
  /**
   * The league's channels. The functional document asks for an email address
   * and the social accounts; neither is recorded in any source handed over, so
   * nothing is hardcoded here and no address is invented.
   *
   * TODO phase 5: pass the confirmed channels in, once the organisation states
   * which address and which accounts are the public ones.
   */
  channels?: ContactChannel[]
}

/**
 * Contact. The section the functional document asks for and the reference site
 * never had.
 */
export function ContactSection({ channels = [] }: ContactSectionProps) {
  return (
    <Section id={anchorFor('contacto')} eyebrow="Escribinos" title="Contacto">
      {channels.length === 0 ? (
        <p className="contact__empty">
          Todavía no hay canales de contacto publicados.
        </p>
      ) : (
        <ul className="contact">
          {channels.map((channel) => (
            <li key={channel.href}>
              <a className="contact__channel" href={channel.href}>
                <span className="contact__glyph" aria-hidden="true">
                  {channel.glyph ?? '✉'}
                </span>
                {channel.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
