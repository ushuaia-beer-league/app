import { useEffect, useState } from 'react'

import {
  CONTENT_KEYS,
  loadContentOverrides,
  overrideFor,
  type ContentKey,
} from '../data/site-content'
import { LANGUAGES, LANGUAGE_NAMES, type Language } from '../i18n/language'
import { saveSiteContent, type Result } from './adminQueries'
import './TextsScreen.css'

/**
 * Textos: the site's own prose, editable per block and per language.
 *
 * Who may save is the database's decision, not this screen's: the policies on
 * `site_content` accept communications and general administration, the same pair
 * that manages photos and sponsors. The screen shows the refusal when it comes.
 *
 * Per language on purpose. The site speaks three, and an edit to the Spanish must
 * not blank the English: a language nobody edited keeps the translation shipped in
 * the code, and this screen says so instead of showing a copy of the built-in text
 * that would then masquerade as an edit.
 *
 * The ten commandments are not here and never will be: they are the rulebook.
 */
const BLOCK_NAMES: Readonly<Record<ContentKey, string>> = {
  'historia-nacimiento': 'Cómo nació la UBL',
  'historia-beer-league': '¿Qué significa Beer League?',
  'historia-comienzo': 'El comienzo',
  'historia-apoyo': 'El primer gran apoyo',
  'historia-hoy': 'Lo que somos hoy',
}

interface Draft {
  title: string
  body: string
}

export function TextsScreen() {
  const [language, setLanguage] = useState<Language>('es')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let current = true
    void loadContentOverrides().then((overrides) => {
      if (!current) return
      const next: Record<string, Draft> = {}
      for (const key of CONTENT_KEYS) {
        for (const lang of LANGUAGES) {
          const row = overrideFor(overrides, key, lang)
          if (row)
            next[`${key}#${lang}`] = { title: row.title ?? '', body: row.body }
        }
      }
      setDrafts(next)
      setLoaded(true)
    })
    return () => {
      current = false
    }
  }, [])

  if (!loaded) {
    return (
      <p className="admin__waiting" aria-live="polite">
        Cargando los textos…
      </p>
    )
  }

  const draftKey = (key: ContentKey) => `${key}#${language}`

  const save = async (key: ContentKey) => {
    const draft = drafts[draftKey(key)]
    if (!draft || draft.body.trim() === '') {
      setNotice(
        'El texto no puede quedar vacío. Para volver al texto original, avisá y lo despublicamos.',
      )
      return
    }
    const result: Result<null> = await saveSiteContent({
      key,
      language,
      title: draft.title.trim() === '' ? null : draft.title.trim(),
      body: draft.body,
    })
    setNotice(
      result.ok
        ? `Guardado: ${BLOCK_NAMES[key]} (${LANGUAGE_NAMES[language]}).`
        : `No se pudo guardar: ${result.because}`,
    )
  }

  return (
    <section className="texts">
      <h2 className="texts__title">Textos del sitio</h2>

      <p className="texts__note">
        Lo que se guarda acá reemplaza al texto original de la Historia,{' '}
        <strong>solo en el idioma elegido</strong>: un idioma sin editar sigue
        mostrando la traducción original. Los párrafos se separan con una línea
        en blanco. Los diez mandamientos no se editan desde ningún panel.
      </p>

      <div className="texts__languages" role="group" aria-label="Idioma">
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            type="button"
            className={`texts__language${language === lang ? ' texts__language--chosen' : ''}`}
            aria-pressed={language === lang}
            onClick={() => setLanguage(lang)}
          >
            {LANGUAGE_NAMES[lang]}
          </button>
        ))}
      </div>

      {notice !== null && (
        <p className="texts__notice" role="status">
          {notice}
        </p>
      )}

      <ul className="texts__blocks">
        {CONTENT_KEYS.map((key) => {
          const draft = drafts[draftKey(key)] ?? { title: '', body: '' }
          const edited = draft.body.trim() !== ''

          return (
            <li className="texts__block" key={key}>
              <h3 className="texts__block-name">
                {BLOCK_NAMES[key]}
                {!edited && (
                  <span className="texts__original"> · texto original</span>
                )}
              </h3>
              <label className="texts__label" htmlFor={`title-${key}`}>
                Título (vacío = el original)
              </label>
              <input
                id={`title-${key}`}
                className="texts__input"
                value={draft.title}
                onChange={(event) =>
                  setDrafts((all) => ({
                    ...all,
                    [draftKey(key)]: { ...draft, title: event.target.value },
                  }))
                }
              />
              <label className="texts__label" htmlFor={`body-${key}`}>
                Texto
              </label>
              <textarea
                id={`body-${key}`}
                className="texts__textarea"
                rows={6}
                value={draft.body}
                onChange={(event) =>
                  setDrafts((all) => ({
                    ...all,
                    [draftKey(key)]: { ...draft, body: event.target.value },
                  }))
                }
              />
              <button
                className="texts__save"
                type="button"
                onClick={() => void save(key)}
              >
                Guardar en {LANGUAGE_NAMES[language]}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
