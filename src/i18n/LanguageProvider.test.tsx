import { render, screen } from '@testing-library/react'

import { HistorySection } from '../components/HistorySection'
import { LANGUAGE_KEY } from './language'
import { LanguageProvider } from './LanguageProvider'
import { LanguagePicker } from './LanguagePicker'

/**
 * The end-to-end check the catalogue tests cannot make: that choosing a language
 * actually changes what a real component renders. A catalogue can be complete and
 * correct and still be wired to nothing.
 */
describe('the language, end to end', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders the site in Spanish when nobody has chosen', () => {
    render(
      <LanguageProvider>
        <HistorySection />
      </LanguageProvider>,
    )

    expect(screen.getByText('Historia de la UBL')).toBeInTheDocument()
    expect(screen.getByText('Cómo nació la UBL')).toBeInTheDocument()
  })

  it('renders it in English when English was chosen', () => {
    window.localStorage.setItem(LANGUAGE_KEY, 'en')

    render(
      <LanguageProvider>
        <HistorySection />
      </LanguageProvider>,
    )

    expect(screen.getByText('The UBL story')).toBeInTheDocument()
    expect(screen.getByText('How the UBL started')).toBeInTheDocument()
    expect(screen.queryByText('Historia de la UBL')).not.toBeInTheDocument()
  })

  it('never translates the ten commandments', () => {
    // The rule `CLAUDE.md` has carried since the first commit. This test is the
    // thing that stops somebody helpfully translating the rulebook one day.
    window.localStorage.setItem(LANGUAGE_KEY, 'en')

    render(
      <LanguageProvider>
        <HistorySection />
      </LanguageProvider>,
    )

    expect(screen.getByText('Beberé en nombre del hockey.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Abandonaré la Ushuaia Beer League si insisto en romper los mandamientos.',
      ),
    ).toBeInTheDocument()

    // And it says why, so ten lines of Spanish do not read as a fault.
    expect(screen.getByText(/never translated/)).toBeInTheDocument()
  })

  it('marks the untranslated list as Spanish for a screen reader', () => {
    // Without `lang`, an English voice reads "Beberé" as English, which is close to
    // unintelligible. The attribute is the whole accessibility of that decision.
    window.localStorage.setItem(LANGUAGE_KEY, 'en')

    const { container } = render(
      <LanguageProvider>
        <HistorySection />
      </LanguageProvider>,
    )

    expect(container.querySelector('ol[lang="es"]')).not.toBeNull()
  })

  it('remembers the choice in the browser and nowhere else', () => {
    render(
      <LanguageProvider>
        <LanguagePicker />
      </LanguageProvider>,
    )

    screen.getByRole('button', { name: 'English' }).click()

    expect(window.localStorage.getItem(LANGUAGE_KEY)).toBe('en')
  })
})
