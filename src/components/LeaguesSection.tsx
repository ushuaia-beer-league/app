import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { SeasonData } from '../data/season-source'
import type { CompetitionKey } from '../data/types'
import { resolveBracket } from '../utils/playoffs'
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
import { anchorFor } from '../utils/site-routes'
import { fill } from '../i18n/language'
import { useT } from '../i18n/useLanguage'
import { canonicalSlug } from '../data/teams-2026'
import { crestFor } from './team-logos'

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
  /** The tab the address names, when the site is mounted behind a router. */
  tab?: TabKey
  /** Called when somebody picks a tab, so the address can follow. */
  onTabChange?: (tab: TabKey) => void
  /** The competition the address names, when it names one. */
  choice?: CompetitionChoice
  /** Called when somebody picks a competition, so the address can follow. */
  onChoiceChange?: (choice: CompetitionChoice) => void
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
  tab: tabFromUrl,
  onTabChange,
  choice: choiceFromUrl,
  onChoiceChange,
}: LeaguesSectionProps) {
  const t = useT()
  const [ownChoice, setOwnChoice] = useState<CompetitionChoice>('all')
  // The address owns the competition when there is one to own it, exactly like
  // the tab: a shared /ligas/goleadores/women has to open on the women's table.
  const choice = choiceFromUrl ?? ownChoice
  const setChoice = (next: CompetitionChoice) => {
    setOwnChoice(next)
    onChoiceChange?.(next)
  }
  const [ownTab, setOwnTab] = useState<TabKey>('fixture')

  // The address owns the tab when there is an address to own it, so a shared link
  // opens on the table it names and the back button walks the tables. Falls back to
  // its own state, which is what happens in a test that mounts this on its own.
  const tab = tabFromUrl ?? ownTab
  const setTab = (next: TabKey) => {
    setOwnTab(next)
    onTabChange?.(next)
  }
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

  const teamCrest = useMemo(() => {
    // Through crestFor, so the fixture prefers the crest uploaded from the
    // panel exactly like the team cards do: the same team must wear the same
    // badge on every page of the site. Keyed and queried through
    // canonicalSlug, because the panel can rename a slug while matches or the
    // seed still speak the old spelling — that is how the rosters vanished on
    // 2026-08-07, and a slug-keyed lookup that skips the bridge repeats it.
    const teams = new Map(
      season.teams.map((team) => [canonicalSlug(team.slug), team]),
    )
    return (teamId: string) => {
      const team = teams.get(canonicalSlug(teamId))
      return team === undefined ? crestFor({ slug: teamId }) : crestFor(team)
    }
  }, [season.teams])

  /**
   * What the playoff resolver knows about matches the sheet left teamless: the
   * seeds waiting in the semifinals, a played quarterfinal's winner. Computed
   * for both competitions once and handed to the fixture, so "Semifinal 1
   * (verde)" shows the team the standings already name — and never more than
   * that: an undecided side stays undecided here too.
   */
  const resolvedSides = useMemo(() => {
    const map = new Map<string, { home: string | null; away: string | null }>()
    for (const key of ['beer', 'wubl'] as const) {
      for (const round of resolveBracket(season.matches, {
        competition: key,
      })) {
        for (const entry of round.matches) {
          map.set(entry.match.id, {
            home: entry.home.teamId,
            away: entry.away.teamId,
          })
        }
      }
    }
    return map
  }, [season.matches])

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
      id={anchorFor('ligas')}
      eyebrow={fill(t('Temporada {year}'), { year: season.season })}
      title={t('Ligas & Estadísticas')}
    >
      <CompetitionTabs value={choice} onChange={setChoice} />

      {season.source === 'seed' && (
        <p className="leagues__snapshot">
          {t('Estás viendo la última copia guardada de la temporada.')}
        </p>
      )}

      <div
        className="leagues__tabs"
        role="tablist"
        aria-label={t('Tablas de la competencia')}
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
            resolvedSides={resolvedSides}
            rounds={rounds}
            teamName={teamName}
            teamCrest={teamCrest}
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
