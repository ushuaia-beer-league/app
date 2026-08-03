import type { ReactNode } from 'react'
import './Section.css'

type SectionTone = 'base' | 'alt'

type SectionProps = {
  /** Anchor target, so the navigation can link to the section. */
  id: string
  /** The gold eyebrow above the title. Spanish, like every user-facing string. */
  eyebrow: string
  /** The section title, rendered as the page's only level-two heading per section. */
  title: string
  /**
   * `base` and `alt` alternate down the page. `alt` is translucent so the
   * backdrop shows through, which is what makes the alternation read.
   */
  tone?: SectionTone
  children: ReactNode
}

/**
 * The wrapper every content section shares: the landmark, the content column,
 * the eyebrow, the title and the gold rule under it.
 */
export function Section({
  id,
  eyebrow,
  title,
  tone = 'base',
  children,
}: SectionProps) {
  // The anchor is Spanish because it ends up in the address bar; this one never
  // leaves the DOM, so it follows the repository's English rule.
  const headingId = `${id}-title`

  return (
    <section
      className={`section section--${tone}`}
      id={id}
      aria-labelledby={headingId}
    >
      <div className="section__inner">
        <p className="section__eyebrow">{eyebrow}</p>
        <h2 className="section__title" id={headingId}>
          {title}
        </h2>
        <div className="section__rule" aria-hidden="true" />
        {children}
      </div>
    </section>
  )
}
