import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { SeasonData } from '../data/season-source'
import type { CompetitionKey } from '../data/types'
import { fixtureRounds } from '../utils/fixture'
import {
  publishedGoalkeepingTable,
  publishedScoringTable,
} from '../utils/published-statistics'
import { standings } from '../utils/standings'
import { competitionLabel, COMPETITION_LABELS } from './competitions'
import type { CompetitionChoice } from './competitions'
import { CompetitionTabs } from './CompetitionTabs'
import { todayIso } from './dates'
import { FixtureList } from './FixtureList'
import { GoalkeepingTable } from './GoalkeepingTable'
import { ScoringTable } from './ScoringTable'
import { PlayoffBracket } from './PlayoffBracket'
import { Section } from './Section'
import { StandingsTable } from './StandingsTable'
import './LeaguesSection.css'

/**
 * The four tables the league keeps, in the order a visitor asks for them: what
 * is being played, then where everyone stands, then who is scoring, then who is
 * stopping it.
 *
 * The reference calls the first one "Fechas" and the fourth "Porteros". "Fixture"
 * and "Arqueros" are what the league says out loud in Tierra del Fuego.
 */
const TABS = [
  { key: 'fixture', label: 'Fixture' },
  { key: 'standings', label: 'Posiciones' },
  { key: 'scoring', label: 'Goleadores' },
  { key: 'goalkeeping', label: 'Arqueros' },
  // "Playoffs & Llaves" is the reference site's own heading for this.
  { key: 'playoffs', label: 'Playoffs' },
] as const

type TabKey = (typeof TABS)[number]['key']

const TAB_ID = 'ligas-tab-'
const PANEL_ID = 'ligas-panel-'

type LeaguesSectionProps = {
  /** The season, from Supabase or from the versioned seed. */
  season: SeasonData
  /**
   * Today, as `YYYY-MM-DD`, which decides where the fixture is cut in two.
   *
   * A parameter with a default rather than a reading of the clock inside, so a
   * test can sit on a chosen day. Without it these cases would pass today and
   * fail in a fortnight, when the playoffs stop being in the future.
   */
  today?: string
}

/**
 * Ligas & Estadísticas: the competition selector and the four tables.
 *
 * Everything on screen is derived here by calling the modules that own the
 * league's rules, and nowhere else: `standings()` for the table, `fixtureRounds()`
 * for the calendar, `publishedScoringTable()` and `publishedGoalkeepingTable()`
 * for the two transcriptions. This file chooses a competition and a tab; it does
 * not add up a single point.
 *
 * The competition is a group of pressed buttons and the four tables are a real
 * tablist, with arrow keys, Home and End, and one stop in the tab order for the
 * whole set, which is what the pattern asks for.
 */
export function LeaguesSection({
  season,
  today = todayIso(),
}: LeaguesSectionProps) {
  const [choice, setChoice] = useState<CompetitionChoice>('beer')
  const [tab, setTab] = useState<TabKey>('fixture')
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([])

  /**
   * Which competitions the tables show. One, or both when the selector says all.
   *
   * The tables are never merged, however the selector is set: a point, a goal and
   * a save percentage belong to the competition they were earned in, and one table
   * mixing two of them would print a number nobody scored. So "all" stacks them,
   * each under its own name. The fixture is the exception and merges, because the
   * league really does play both on the same night.
   */
  const shown = useMemo<CompetitionKey[]>(
    () =>
      choice === 'all'
        ? COMPETITION_LABELS.map((competition) => competition.key)
        : [choice],
    [choice],
  )

  const teamName = useMemo(() => {
    // Every team of the season, not only the chosen competition's: a merged
    // fixture names teams from both. Slugs are unique across competitions, so the
    // two teams called "Birra del Fuego" stay apart.
    const names = new Map(
      season.teams.map((team) => [team.slug, team.shortName]),
    )

    // A team id nothing answers for is a gap between two sources, so the id is
    // shown as it is. Inventing a name would hide the gap.
    return (teamId: string) => names.get(teamId) ?? teamId
  }, [season.teams])

  const rounds = useMemo(
    () => fixtureRounds(season.matches, { competition: choice }),
    [season.matches, choice],
  )

  /** One competition's four tables, computed by the modules that own the rules. */
  const blocks = useMemo(
    () =>
      shown.map((competition) => ({
        key: competition,
        label: competitionLabel(competition),
        table: standings(season.matches, {
          competition,
          // Every team of the competition appears, even one that has not played.
          teamIds: season.teams
            .filter((team) => team.competition === competition)
            .map((team) => team.slug),
        }),
        scorers: publishedScoringTable(season.publishedPlayerStats, {
          competition,
        }),
        goalkeepers: publishedGoalkeepingTable(season.publishedGoalieStats, {
          competition,
        }),
      })),
    [
      shown,
      season.matches,
      season.teams,
      season.publishedPlayerStats,
      season.publishedGoalieStats,
    ],
  )

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = TABS.length - 1
    const target =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null

    const next = target === null ? undefined : TABS[target]
    if (target === null || next === undefined) return

    event.preventDefault()
    setTab(next.key)
    tabButtons.current[target]?.focus()
  }

  return (
    <Section
      id="ligas"
      eyebrow={`Temporada ${season.season}`}
      title="Ligas & Estadísticas"
    >
      <CompetitionTabs value={choice} onChange={setChoice} />

      {season.source === 'seed' && (
        <p className="leagues__snapshot">
          Estás viendo la última copia guardada de la temporada.
        </p>
      )}

      <div
        className="leagues__tabs"
        role="tablist"
        aria-label="Tablas de la competencia"
      >
        {TABS.map((item, index) => {
          const chosen = item.key === tab

          return (
            <button
              className="leagues__tab"
              key={item.key}
              id={`${TAB_ID}${item.key}`}
              type="button"
              role="tab"
              aria-selected={chosen}
              aria-controls={`${PANEL_ID}${item.key}`}
              tabIndex={chosen ? 0 : -1}
              ref={(button) => {
                tabButtons.current[index] = button
              }}
              onClick={() => setTab(item.key)}
              onKeyDown={(event) => moveTab(event, index)}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div
        className="leagues__panel"
        id={`${PANEL_ID}${tab}`}
        role="tabpanel"
        aria-labelledby={`${TAB_ID}${tab}`}
        tabIndex={0}
      >
        {tab === 'fixture' && (
          <FixtureList
            rounds={rounds}
            teamName={teamName}
            today={today}
            // Only when both are on screen at once: with one competition chosen,
            // saying which one on every single row is noise.
            showCompetition={choice === 'all'}
          />
        )}

        {tab !== 'fixture' &&
          blocks.map((block) => (
            <section
              className="leagues__block"
              key={block.key}
              aria-labelledby={
                shown.length > 1 ? `ligas-block-${block.key}` : undefined
              }
            >
              {/* The name appears only when there is something to tell apart. */}
              {shown.length > 1 && (
                <h3
                  className="leagues__block-title"
                  id={`ligas-block-${block.key}`}
                >
                  {block.label}
                </h3>
              )}

              {tab === 'standings' && (
                <StandingsTable
                  rows={block.table}
                  teamName={teamName}
                  // The women's sheet counts draws where the Beer League sheet
                  // counts shootout losses. Two columns, so the table is told which.
                  onePointColumn={block.key === 'wubl' ? 'empate' : 'ppso'}
                />
              )}

              {tab === 'scoring' && (
                <ScoringTable
                  rows={block.scorers}
                  publishedOn={season.publishedOn}
                />
              )}

              {tab === 'goalkeeping' && (
                <GoalkeepingTable
                  rows={block.goalkeepers}
                  publishedOn={season.publishedOn}
                />
              )}

              {tab === 'playoffs' && (
                <PlayoffBracket
                  matches={season.matches}
                  competition={block.key}
                  teamName={teamName}
                />
              )}
            </section>
          ))}
      </div>
    </Section>
  )
}
