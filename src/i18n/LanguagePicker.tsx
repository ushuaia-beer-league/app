import { LANGUAGES, LANGUAGE_FLAGS, LANGUAGE_NAMES } from './language'
import { useLanguage } from './useLanguage'
import './LanguagePicker.css'

/**
 * One button per language, not a dropdown.
 *
 * Three still fit, and a row of buttons doubles as the indicator of which one is on,
 * which a closed select cannot do. Somewhere past four this becomes a menu; that is a
 * decision for the day a fifth language arrives, not a thing to build first.
 *
 * A group of buttons and not links: this changes how the page reads, not where the
 * visitor is, so it must not put an entry in their history that a back button then
 * appears to undo.
 *
 * The flag is decoration and the name is the label. On Windows the flag does not draw
 * at all and shows two letters instead, so a design where the flag carried the meaning
 * would be unusable for a whole platform.
 */
export function LanguagePicker() {
  const { language, choose, t } = useLanguage()

  return (
    <div
      className="language-picker"
      role="group"
      aria-label={t('Cambiar idioma')}
    >
      {LANGUAGES.map((option) => {
        const chosen = option === language

        return (
          <button
            className={`language-picker__option${
              chosen ? ' language-picker__option--chosen' : ''
            }`}
            key={option}
            type="button"
            /* The state, not a style: a reader who cannot see which one is
             * highlighted is told which one is pressed. */
            aria-pressed={chosen}
            /* The name of the language in its own words, so somebody who cannot read
             * the current language can still find theirs. */
            lang={option}
            onClick={() => choose(option)}
          >
            <span className="language-picker__flag" aria-hidden="true">
              {LANGUAGE_FLAGS[option]}
            </span>
            <span className="language-picker__name">
              {LANGUAGE_NAMES[option]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
