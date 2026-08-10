import type {
  PublishedGoalkeepingRow,
  PublishedScoringRow,
} from './published-statistics'
import {
  fixtureShareCard,
  goalkeepingShareCard,
  scoringShareCard,
  teamShareCard,
  type ShareWording,
} from './share-card'

const WORDING: ShareWording = {
  andMore: 'y {n} más en ubl.com.ar',
  site: 'ubl.com.ar',
  printedNote: '* Nombre como lo imprime la planilla, sin confirmar.',
  substituteNote: 'Sup: suplente, jugó sin integrar el plantel.',
  substituteMark: 'Sup',
  noTeam: 'Sin equipo',
}

function scorer(
  fields: Partial<PublishedScoringRow> & Pick<PublishedScoringRow, 'name'>,
): PublishedScoringRow {
  return {
    playerId: null,
    nameIsPrinted: false,
    team: 'Sucucho',
    isSubstitute: false,
    goals: 3,
    assists: 2,
    points: 5,
    ...fields,
  }
}

function goalkeeper(
  fields: Partial<PublishedGoalkeepingRow> &
    Pick<PublishedGoalkeepingRow, 'name'>,
): PublishedGoalkeepingRow {
  return {
    playerId: null,
    nameIsPrinted: false,
    team: 'Blanco',
    isSubstitute: false,
    gamesPlayed: 4,
    shotsFaced: 40,
    goalsAgainst: 8,
    savePercentage: 0.8,
    ...fields,
  }
}

describe('scoringShareCard', () => {
  it('cuts to the limit and says how many were left out', () => {
    const rows = Array.from({ length: 14 }, (_, i) =>
      scorer({ name: `Jugadora ${i + 1}` }),
    )
    const card = scoringShareCard(rows, {
      title: 'Goleadoras',
      subtitle: "Women's Beer League · 2026",
      wording: WORDING,
    })

    expect(card.lines).toHaveLength(10)
    expect(card.lines[0]?.left).toBe('1. Jugadora 1')
    expect(card.footer).toBe('y 4 más en ubl.com.ar')
  })

  it('names only the site when nothing was cut', () => {
    const card = scoringShareCard([scorer({ name: 'Ana' })], {
      title: 'Goleadoras',
      subtitle: 'WUBL · 2026',
      wording: WORDING,
    })

    expect(card.footer).toBe('ubl.com.ar')
    expect(card.notes).toEqual([])
  })

  it('keeps the marks the tables wear, and explains them', () => {
    // An unconfirmed printed name and a substitute both stay visible on the
    // image: a screenshot of the site would show them, and the drawn card may
    // not be quieter about the gaps than the page it replaces.
    const card = scoringShareCard(
      [
        scorer({ name: 'Beltrami Ramir', nameIsPrinted: true }),
        scorer({ name: 'Suplente Real', isSubstitute: true, team: null }),
      ],
      { title: 'Goleadores', subtitle: 'Beer League · 2026', wording: WORDING },
    )

    expect(card.lines[0]?.left).toBe('1. Beltrami Ramir*')
    expect(card.lines[1]?.sub).toBe('Sin equipo · Sup')
    expect(card.notes).toEqual([WORDING.printedNote, WORDING.substituteNote])
  })

  it('writes points first and the goal-assist split after', () => {
    const card = scoringShareCard(
      [scorer({ name: 'Ana', points: 11, goals: 7, assists: 4 })],
      { title: 'Goleadoras', subtitle: 'WUBL · 2026', wording: WORDING },
    )

    expect(card.lines[0]?.right).toBe('11 · 7G 4A')
  })
})

describe('goalkeepingShareCard', () => {
  it('leads with the save percentage', () => {
    const card = goalkeepingShareCard(
      [goalkeeper({ name: 'Cavalleri', savePercentage: 0.875 })],
      { title: 'Arqueras', subtitle: 'WUBL · 2026', wording: WORDING },
    )

    expect(card.lines[0]?.right).toBe('88% · 40-8')
  })

  it('shows the dash, never a perfect score, for nothing faced', () => {
    const card = goalkeepingShareCard(
      [
        goalkeeper({
          name: 'Sin Tiros',
          shotsFaced: 0,
          goalsAgainst: 0,
          savePercentage: null,
        }),
      ],
      { title: 'Arqueros', subtitle: 'Beer League · 2026', wording: WORDING },
    )

    expect(card.lines[0]?.right).toBe('— · 0-0')
  })
})

describe('teamShareCard', () => {
  it('prints the number the sheet prints, and no number where it prints none', () => {
    const card = teamShareCard(
      [
        { name: 'Coria Omar', jerseyNumber: null },
        { name: 'Otra Persona', jerseyNumber: 28 },
      ],
      {
        title: 'Blanco',
        subtitle: 'Beer League · 2026',
        crest: '/assets/blanco.webp',
        wording: WORDING,
      },
    )

    expect(card.crest).toBe('/assets/blanco.webp')
    expect(card.lines[0]?.left).toBe('Coria Omar')
    expect(card.lines[1]?.left).toBe('28  Otra Persona')
  })

  it('caps a long roster and says so', () => {
    const roster = Array.from({ length: 22 }, (_, i) => ({
      name: `Jugador ${i + 1}`,
      jerseyNumber: i + 1,
    }))
    const card = teamShareCard(roster, {
      title: 'Sucucho',
      subtitle: 'Beer League · 2026',
      crest: null,
      wording: WORDING,
    })

    expect(card.lines).toHaveLength(18)
    expect(card.footer).toBe('y 4 más en ubl.com.ar')
  })
})

describe('fixtureShareCard', () => {
  it('keeps the lines the caller built and the footer honest', () => {
    const lines = Array.from({ length: 3 }, (_, i) => ({
      left: `Partido ${i + 1}`,
      sub: '21:30 · Bahía',
    }))
    const card = fixtureShareCard(lines, {
      title: 'Fecha 5',
      subtitle: 'Beer League · 2026',
      wording: WORDING,
    })

    expect(card.lines).toHaveLength(3)
    expect(card.footer).toBe('ubl.com.ar')
  })
})
