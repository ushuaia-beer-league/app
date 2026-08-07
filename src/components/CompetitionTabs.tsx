import { ALL_COMPETITIONS_LABEL, COMPETITION_LABELS } from './competitions'
import type { CompetitionChoice } from './competitions'
import './CompetitionTabs.css'
import { useT } from '../i18n/useLanguage'

/**
 * MilkShake and All-Stars are on the reference's switcher and have no fixture,
 * no roster and no table. They are left out until the league runs them, because
 * a pill that leads to an empty table is worse than no pill. The names
 * themselves, and the reason they stay in English, live in `./competitions`.
 */
const COMPETITIONS = COMPETITION_LABELS

type CompetitionTabsProps = {
  /** What is on screen: one competition, or all of them. */
  value: CompetitionChoice
  onChange: (competition: CompetitionChoice) => void
}

/**
 * The competition selector: two pills and "Todas", one of them pressed.
 *
 * "Todas" comes last on purpose. It is the widest view and the least specific, so
 * somebody who wants one competition finds it first; and it is a way of looking
 * rather than a third competition, which is why it carries no glyph of its own.
 *
 * Deliberately not a second `role="tablist"`. The four tables below already are
 * one, and nesting a tablist inside a tabpanel makes a screen reader announce
 * two sets of tabs for one choice. Toggle buttons carrying `aria-pressed` say
 * the same thing in one word and need no arrow-key handling of their own.
 */
export function CompetitionTabs({ value, onChange }: CompetitionTabsProps) {
  const t = useT()
  return (
    <div
      className="competition-tabs"
      role="group"
      aria-label={t('Competencia')}
    >
      {/* Todas leads, at the league's request: the fixture opens showing the
       * whole night — both rinks, both competitions — and filtering down to one
       * league is the second gesture, not the first. */}
      <button
        className="competition-tabs__pill competition-tabs__pill--all"
        type="button"
        aria-pressed={value === 'all'}
        onClick={() => onChange('all')}
      >
        {ALL_COMPETITIONS_LABEL}
      </button>

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
