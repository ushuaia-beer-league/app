import './Crest.css'

type CrestSize = 'sm' | 'md' | 'lg'

type CrestProps = {
  /** Size step. `sm` is the navigation and footer crest, `md` the hero's, `lg` the history section's. */
  size?: CrestSize
  /**
   * Spanish alternative text. Omit it where the crest sits next to the wordmark
   * inside the same link, so a screen reader does not read the league's name
   * twice; pass it where the crest stands alone.
   */
  label?: string
}

/**
 * Placeholder for the league crest.
 *
 * ASSET NEEDED: the crest as a transparent SVG or PNG under `public/images/`.
 * The reference embeds it four times as a 72 KB base64 JPEG with a light
 * background that it then forces to white with `filter: brightness(0)
 * invert(1)`. Neither the bytes nor the filter hack belong in this repository,
 * so until a transparent asset exists this component draws an honest empty
 * frame rather than an invented logo.
 */
export function Crest({ size = 'sm', label }: CrestProps) {
  return (
    <span
      className={`crest crest--${size}`}
      {...(label
        ? { role: 'img', 'aria-label': label }
        : { 'aria-hidden': true })}
    >
      <span className="crest__mark">UBL</span>
    </span>
  )
}
