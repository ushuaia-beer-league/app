import { useEffect, useState } from 'react'
import { loadSeason, type SeasonData } from '../data/season-source'

export interface SeasonState {
  /** Null only while the first load is in flight. */
  data: SeasonData | null
  loading: boolean
}

/**
 * The season, loaded once.
 *
 * There is no error state on purpose. `loadSeason` cannot fail: when Supabase is
 * paused, unreachable or not configured it answers with the versioned seed and
 * says why in `data.fellBackBecause`. A component therefore never has to render
 * an apology, only the season it was given.
 */
export function useSeason(): SeasonState {
  const [state, setState] = useState<SeasonState>({ data: null, loading: true })

  useEffect(() => {
    let current = true

    void loadSeason().then((data) => {
      if (current) setState({ data, loading: false })
    })

    return () => {
      current = false
    }
  }, [])

  return state
}
