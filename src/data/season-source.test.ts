import { loadSeason, matchFromRow, type MatchRow } from './season-source'
import { supabaseConfig } from './supabase-client'
import { SEED_2026 } from './seed-2026'

const row = (overrides: Partial<MatchRow> = {}): MatchRow => ({
  id: 'a-uuid',
  competition_key: 'beer',
  stage: 'regular',
  match_date: '2026-05-23',
  start_time: '21:30:00',
  venue: 'bahia',
  home_goals: 9,
  away_goals: 6,
  resolution: 'regulation',
  notes: null,
  home_team: { slug: 'rock-choppers' },
  away_team: { slug: 'sucucho' },
  ...overrides,
})

describe('supabaseConfig', () => {
  it('needs both halves', () => {
    expect(
      supabaseConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' }),
    ).toBeNull()
    expect(
      supabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: 'a-key' }),
    ).toBeNull()
    expect(supabaseConfig({})).toBeNull()
  })

  it('reads a configured pair, trimmed', () => {
    expect(
      supabaseConfig({
        VITE_SUPABASE_URL: '  https://x.supabase.co ',
        VITE_SUPABASE_PUBLISHABLE_KEY: ' a-key  ',
      }),
    ).toEqual({ url: 'https://x.supabase.co', key: 'a-key' })
  })

  it('treats an empty string as absent, which is what an unset build variable becomes', () => {
    expect(
      supabaseConfig({
        VITE_SUPABASE_URL: '',
        VITE_SUPABASE_PUBLISHABLE_KEY: '',
      }),
    ).toBeNull()
  })
})

describe('matchFromRow', () => {
  it('lets a slug out and never a uuid', () => {
    expect(matchFromRow(row())).toMatchObject({
      homeTeamId: 'rock-choppers',
      awayTeamId: 'sucucho',
    })
  })

  it('drops the seconds Postgres adds to a time', () => {
    expect(matchFromRow(row()).time).toBe('21:30')
  })

  it('keeps a match with no teams recorded', () => {
    expect(
      matchFromRow(row({ home_team: null, away_team: null })),
    ).toMatchObject({
      homeTeamId: null,
      awayTeamId: null,
    })
  })

  it('reads a shootout and a draw as themselves', () => {
    expect(
      matchFromRow(
        row({ home_goals: 5, away_goals: 4, resolution: 'shootout' }),
      ).score,
    ).toEqual({ home: 5, away: 4, resolution: 'shootout' })
    expect(
      matchFromRow(row({ home_goals: 4, away_goals: 4, resolution: 'draw' }))
        .score,
    ).toEqual({ home: 4, away: 4, resolution: 'draw' })
  })

  it('has no score when the match has not been played', () => {
    expect(
      matchFromRow(row({ home_goals: null, away_goals: null })).score,
    ).toBeNull()
  })

  it('has no score when the goals are known and how it ended is not', () => {
    // The sheet does this: goals in both columns, "Resultado" and "Ganador"
    // empty. A table cannot count a result nobody recorded.
    expect(matchFromRow(row({ resolution: null })).score).toBeNull()
  })

  it('keeps an unassigned cabecera unassigned', () => {
    expect(matchFromRow(row({ venue: null })).venue).toBeNull()
  })

  it('carries the note that explains a gap', () => {
    expect(
      matchFromRow(row({ notes: 'Home side printed as "3er Lugar".' })).notes,
    ).toBe('Home side printed as "3er Lugar".')
  })
})

describe('loadSeason', () => {
  it('returns the versioned seed when Supabase is not configured', async () => {
    const data = await loadSeason({ config: null })

    expect(data.source).toBe('seed')
    expect(data.fellBackBecause).toBeNull()
    expect(data.season).toBe(SEED_2026.season)
    expect(data.matches).toHaveLength(SEED_2026.matches.length)
  })

  it('never throws, so a component never has to render an apology', async () => {
    await expect(loadSeason({ config: null })).resolves.toBeTruthy()
  })
})
