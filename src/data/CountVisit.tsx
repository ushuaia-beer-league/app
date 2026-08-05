import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { recordView } from './page-views'

/**
 * Counts the page, once per path. Renders nothing.
 *
 * It lives here, beside the counter it calls, rather than under
 * `src/components/`, which is presentation only and this is not presentation. It
 * has to be a component all the same, because the path is what gets counted and
 * only the router knows the path.
 *
 * The ref is not an optimisation. `StrictMode` runs an effect twice in
 * development, so without it every local page load would count as two, and the
 * first numbers anybody looked at would be double.
 */
export function CountVisit() {
  const { pathname } = useLocation()
  const counted = useRef<string | null>(null)

  useEffect(() => {
    if (counted.current === pathname) return
    counted.current = pathname
    void recordView(pathname)
  }, [pathname])

  return null
}
