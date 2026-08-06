import { LANGUAGES, LANGUAGE_NAMES } from './language'
import { useLanguage } from './useLanguage'
import './LanguagePicker.css'

/**
 * Two buttons, not a dropdown.
 *
 * With two languages a select is more clicks and less clear, and the pair doubles as
 * the indicator of which one is on. When Italian, French and Portuguese arrive this
 * becomes a menu, and that is the moment to change it rather than now.
 *
 * A radio group and not a set of links: this changes how the page reads, not where the
 * visitor is, so it must not put an entry in their history that a back button then
 * appears to undo.
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
            {LANGUAGE_NAMES[option]}
          </button>
        )
      })}
    </div>
  )
}
