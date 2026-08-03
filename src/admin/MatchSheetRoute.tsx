import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { loadMatchSheet, saveMatchSheet, type Result } from './adminQueries'
import { MatchSheetScreen } from './MatchSheetScreen'
import type {
  MatchSheetData,
  MatchSheetSaveReport,
  MatchSheetWrites,
} from './matchSheetDraft'

interface MatchSheetRouteProps {
  /**
   * The database, injected. The real pair is the default; a test hands over
   * fakes, which is the only way this screen can be exercised at all: the panel
   * talks to Supabase through the publishable key and there is no local
   * database to talk to.
   */
  load?: (matchId: string) => Promise<Result<MatchSheetData>>
  save?: (writes: MatchSheetWrites) => Promise<MatchSheetSaveReport>
}

/**
 * `/admin/partidos/:matchId`: reads one sheet, then hands it to the form.
 *
 * Loading and failing live here so the form itself never has to hold a null
 * sheet. A failure says why in Spanish and offers the way back, because the most
 * likely reasons are a paused free-tier project and a link to a match somebody
 * has since deleted, neither of which is the operator's fault.
 */
export function MatchSheetRoute({
  load = loadMatchSheet,
  save = saveMatchSheet,
}: MatchSheetRouteProps = {}) {
  const { matchId = '' } = useParams()
  /**
   * The answer, and which match it was an answer about. Kept together so
   * following a link to another sheet waits for its own read instead of showing
   * the previous match's values for a frame.
   */
  const [loaded, setLoaded] = useState<{
    matchId: string
    result: Result<MatchSheetData>
  } | null>(null)

  useEffect(() => {
    let current = true

    void load(matchId).then((result) => {
      if (current) setLoaded({ matchId, result })
    })

    return () => {
      current = false
    }
  }, [load, matchId])

  const answer = loaded?.matchId === matchId ? loaded.result : null

  if (answer === null) {
    return (
      <p className="admin__waiting" aria-live="polite">
        Cargando la planilla…
      </p>
    )
  }

  if (!answer.ok) {
    return (
      <>
        <p className="admin__error" role="alert">
          No pudimos abrir la planilla: {answer.because}
        </p>
        <p>
          <Link to="/admin">Volver a los partidos</Link>
        </p>
      </>
    )
  }

  // Keyed by the match, so opening another sheet starts from its own values
  // instead of inheriting the last one's unsaved draft.
  return (
    <MatchSheetScreen
      key={answer.data.matchId}
      save={save}
      sheet={answer.data}
    />
  )
}
