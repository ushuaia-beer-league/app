import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { MatchRow } from '../data/season-source'
import type { Result } from './adminQueries'
import { MatchSheetRoute } from './MatchSheetRoute'
import type { MatchSheetData, MatchSheetSaveReport } from './matchSheetDraft'

const row: MatchRow = {
  id: 'a-uuid',
  competition_key: 'beer',
  stage: 'regular',
  match_date: '2026-05-23',
  start_time: '21:30:00',
  venue: 'bahia',
  home_goals: null,
  away_goals: null,
  resolution: null,
  notes: null,
  home_team: { slug: 'rock-choppers' },
  away_team: { slug: 'sucucho' },
}

const sheet: MatchSheetData = {
  matchId: 'a-uuid',
  row,
  home: { id: 'team-rock', slug: 'rock-choppers', shortName: 'Rock Choppers' },
  away: { id: 'team-sucucho', slug: 'sucucho', shortName: 'Sucucho' },
  players: [],
  roster: [],
  appearances: [],
  goals: [],
  goalieLines: [],
}

const noReport: MatchSheetSaveReport = { saved: [], failed: [] }

type Loader = (matchId: string) => Promise<Result<MatchSheetData>>

const show = (load: Loader) =>
  render(
    <MemoryRouter initialEntries={['/admin/partidos/a-uuid']}>
      <Routes>
        <Route
          element={
            <MatchSheetRoute
              load={load}
              save={() => Promise.resolve(noReport)}
            />
          }
          path="/admin/partidos/:matchId"
        />
      </Routes>
    </MemoryRouter>,
  )

describe('MatchSheetRoute', () => {
  it('waits out loud while it reads the sheet', () => {
    show(() => new Promise(() => undefined))

    expect(screen.getByText('Cargando la planilla…')).toBeVisible()
  })

  it('asks for the match in the address, and then shows its sheet', async () => {
    const load = vi.fn<Loader>().mockResolvedValue({ ok: true, data: sheet })
    show(load)

    expect(
      await screen.findByRole('heading', { name: 'Rock Choppers vs Sucucho' }),
    ).toBeVisible()
    expect(load).toHaveBeenCalledWith('a-uuid')
  })

  it('says why it could not open the sheet, and offers the way back', async () => {
    show(() =>
      Promise.resolve({
        ok: false,
        because: 'Esta versión del sitio se publicó sin la conexión a la base.',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos abrir la planilla: Esta versión del sitio se publicó sin la conexión a la base.',
    )
    expect(
      screen.getByRole('link', { name: 'Volver a los partidos' }),
    ).toHaveAttribute('href', '/admin')
  })
})
