import './Wordmark.css'

type WordmarkSize = 'sm' | 'md'

type WordmarkProps = {
  /** `sm` is the navigation bar, `md` the footer. */
  size?: WordmarkSize
}

/**
 * The league's name set as the reference sets it: "USHUAIA" in ice, "BEER
 * LEAGUE" in gold. It is one accessible string, so the two colours must not
 * become two separate labels.
 */
export function Wordmark({ size = 'sm' }: WordmarkProps) {
  return (
    <span className={`wordmark wordmark--${size}`}>
      USHUAIA <span className="wordmark__accent">BEER LEAGUE</span>
    </span>
  )
}
