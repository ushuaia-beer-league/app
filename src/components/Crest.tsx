import crest from '../assets/crest/ubl-crest.webp'
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
 * The league crest: a beer mug with skates, "Beer League Ushuaia".
 *
 * The league's own artwork, and the version of it drawn for a dark page. That
 * mattered enough to check rather than assume: the file is line art on
 * transparency and the ink was measured before it was trusted, 52 per cent light
 * against 44 per cent dark, which is why the white body of the mug reads against
 * this background and the black linework reads against the white. The other
 * version the league sent is the same drawing in black only, and on this page it
 * would be a hole.
 *
 * No `filter` anywhere. The reference site embeds the crest four times as a 72 KB
 * base64 JPEG on a light background and forces it white with
 * `filter: brightness(0) invert(1)`, which throws away every tone the drawing
 * has. This is a transparent WebP, 82 KB once, served like any other asset.
 *
 * Decorative by default: where it sits beside the wordmark inside one link, a
 * screen reader would otherwise read the league's name twice.
 */
export function Crest({ size = 'sm', label }: CrestProps) {
  return (
    <img
      className={`crest crest--${size}`}
      src={crest}
      alt={label ?? ''}
      {...(label ? {} : { 'aria-hidden': true })}
      // The intrinsic size, so the page does not move when the image lands.
      width={700}
      height={839}
      loading="lazy"
      decoding="async"
    />
  )
}
