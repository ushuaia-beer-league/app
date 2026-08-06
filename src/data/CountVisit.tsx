import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { recordView } from './page-views'
import { recordVisit } from './visit-facts'

/**
 * Counts the page, once per path, and the visit, once per load. Renders nothing.
 *
 * It lives here, beside the counters it calls, rather than under
 * `src/components/`, which is presentation only and this is not presentation. It
 * has to be a component all the same, because the path is what gets counted and
 * only the router knows the path.
 *
 * The two calls are deliberately on different clocks. A page view is per path, so
 * moving from the fixture to the teams counts a second one. The four visit facts
 * describe the arrival, not the screen: which page they landed on, from what, on
 * what, and whether they had been here before. Reporting those again on every
 * internal click would turn each of them into a page counter, and there is
 * already a page counter.
 *
 * The ref is not an optimisation. `StrictMode` runs an effect twice in
 * development, so without it every local page load would count as two, and the
 * first numbers anybody looked at would be double. `recordVisit` guards itself
 * the same way for the same reason.
 */
export function CountVisit() {
  const { pathname } = useLocation()
  const counted = useRef<string | null>(null)

  useEffect(() => {
    if (counted.current === pathname) return
    counted.current = pathname
    void recordView(pathname)
    void recordVisit(pathname)
  }, [pathname])

  return null
}
