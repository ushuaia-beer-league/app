import type { Match } from '../data/types'
import type { FixtureRound } from '../utils/fixture'
import { roundShareLines } from './fixture-lines'

function match(fields: Partial<Match> & Pick<Match, 'id'>): Match {
  return {
    competition: 'beer',
    stage: 'regular',
    date: '2026-05-23',
    time: '21:30',
    venue: 'bahia',
    homeTeamId: null,
    awayTeamId: null,
    score: null,
    notes: null,
    ...fields,
  }
}

const NAMES: Record<string, string> = {
  sucucho: 'Sucucho',
  blanco: 'Blanco',
  'rock-choppers': 'Rock Choppers',
}
const teamName = (teamId: string) => NAMES[teamId] ?? teamId

describe('roundShareLines', () => {
  const round: FixtureRound = {
    date: '2026-05-23',
    slots: [
      {
        time: '21:30',
        matches: [
          match({
            id: 'played',
            homeTeamId: 'sucucho',
            awayTeamId: 'blanco',
            score: { home: 5, away: 4, resolution: 'shootout' },
          }),
          match({
            id: 'pending',
            venue: 'poli',
            homeTeamId: 'rock-choppers',
            awayTeamId: 'sucucho',
          }),
        ],
      },
    ],
  }

  it('says the score of what was played and the time of what was not', () => {
    const lines = roundShareLines(round, {
      teamName,
      unregistered: 'Sin registrar',
      showCompetition: false,
    })

    expect(lines[0]?.left).toBe('Sucucho — Blanco')
    expect(lines[0]?.right).toBe('5-4')
    // The shootout is named beside the venue: a 5-4 in penales presented as a
    // plain 5-4 misstates how the two points were split.
    expect(lines[0]?.sub).toBe('21:30 · Bahía · Penales')
    expect(lines[1]?.right).toBe('21:30')
    expect(lines[1]?.sub).toBe('21:30 · Poli')
  })

  it('names the side the resolver derived, where the sheet printed a placeholder', () => {
    const bracket: FixtureRound = {
      date: '2026-08-15',
      slots: [
        {
          time: '21:30',
          matches: [
            match({
              id: 'semi-1',
              stage: 'semifinal',
              date: '2026-08-15',
              venue: null,
              notes:
                'Home side printed as "1ro (verde)". Away side printed as "Ganador 4to 5to".',
            }),
          ],
        },
      ],
    }

    const lines = roundShareLines(bracket, {
      resolvedSides: new Map([['semi-1', { home: 'sucucho', away: null }]]),
      teamName,
      unregistered: 'Sin registrar',
      showCompetition: false,
    })

    // The derived side is a real team; the unresolved one stays exactly as
    // the sheet printed it. Deriving is the resolver's job, never this list's.
    expect(lines[0]?.left).toBe('Sucucho — Ganador 4to 5to')
    // The stage rides in the shared card too: a picture of the final should
    // say which match it is.
    expect(lines[0]?.sub).toBe('21:30 · Cabecera a definir · Semifinal')
  })

  it('keeps the gap visible when the sheet named nobody', () => {
    const blank: FixtureRound = {
      date: '2026-05-23',
      slots: [{ time: '21:30', matches: [match({ id: 'blank' })] }],
    }

    const lines = roundShareLines(blank, {
      teamName,
      unregistered: 'Sin registrar',
      showCompetition: true,
    })

    expect(lines[0]?.left).toBe('Sin registrar — Sin registrar')
    expect(lines[0]?.sub).toBe('21:30 · Bahía · Beer League')
  })
})
