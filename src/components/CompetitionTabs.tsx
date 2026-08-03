import type { CompetitionKey } from '../data/types'
import './CompetitionTabs.css'

/**
 * The two competitions that have a fixture, named as the league names them.
 *
 * "Beer League" and "Women's Beer League" are the organisation's own words, from
 * the competitions row of `docs/sources/ubl-functional-doc.md`. They are proper
 * names and stay in English for the same reason the ten commandments stay in
 * Spanish. The reference site shortens the second one to "Women's BL" to save
 * room in a desktop row; nothing here needs that saving.
 *
 * MilkShake and All-Stars are on the reference's switcher and have no fixture,
 * no roster and no table. They are left out until the league runs them, because
 * a pill that leads to an empty table is worse than no pill.
 */
const COMPETITIONS: readonly {
  key: CompetitionKey
  label: string
  glyph: string
}[] = [
  { key: 'beer', label: 'Beer League', glyph: '🏒' },
  { key: 'wubl', label: "Women's Beer League", glyph: '⚡' },
]

type CompetitionTabsProps = {
  /** The competition currently on screen. */
  value: CompetitionKey
  onChange: (competition: CompetitionKey) => void
}

/**
 * The competition selector: two pills, one of them pressed.
 *
 * Deliberately not a second `role="tablist"`. The four tables below already are
 * one, and nesting a tablist inside a tabpanel makes a screen reader announce
 * two sets of tabs for one choice. Toggle buttons carrying `aria-pressed` say
 * the same thing in one word and need no arrow-key handling of their own.
 */
export function CompetitionTabs({ value, onChange }: CompetitionTabsProps) {
  return (
    <div className="competition-tabs" role="group" aria-label="Competencia">
      {COMPETITIONS.map((competition) => {
        const chosen = competition.key === value

        return (
          <button
            className={`competition-tabs__pill competition-tabs__pill--${competition.key}`}
            key={competition.key}
            type="button"
            aria-pressed={chosen}
            onClick={() => onChange(competition.key)}
          >
            <span aria-hidden="true">{competition.glyph}</span>
            {competition.label}
          </button>
        )
      })}
    </div>
  )
}
