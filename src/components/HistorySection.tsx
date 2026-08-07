import {
  overrideFor,
  paragraphsOf,
  type ContentKey,
  type ContentOverrides,
} from '../data/site-content'
import { useLanguage } from '../i18n/useLanguage'
import { Crest } from './Crest'
import { Section } from './Section'
import './HistorySection.css'

/**
 * The league's own account of itself.
 *
 * Every Spanish paragraph here is the organisation's own, transcribed from
 * `#historia` in `docs/sources/reference-site.html` without a word changed. The
 * reference separates its paragraphs with `<br><br>`; they are real paragraphs here,
 * which is the only liberty taken. The English is a translation of that, made for a
 * visitor who is not from here, and it keeps the jokes rather than flattening them:
 * "algún que otro gordito cervecero" is the tone of the whole page and a literal
 * rendering would lose it.
 *
 * **The ten commandments are not translated, in any language.** They are the
 * league's rulebook, quoted from section 2 of `docs/knowledge-base.md`, and
 * `CLAUDE.md` has forbidden translating or rewording them since the first commit.
 * They are literals below rather than keys, so they cannot accidentally acquire a
 * translation later, and the page says what they are so an English reader is not
 * left wondering why one list is in Spanish.
 */
type HistorySectionProps = {
  /** Panel-edited prose, when any exists. Absent = the built-in text below. */
  overrides?: ContentOverrides
}

export function HistorySection({ overrides }: HistorySectionProps = {}) {
  const { t, language } = useLanguage()

  /** The override for a block, or null meaning render the built-in JSX. */
  const edited = (key: ContentKey) => overrideFor(overrides, key, language)

  /** One edited block, rendered as plain paragraphs. */
  const editedBlock = (
    key: ContentKey,
    glyph: string,
    builtInTitle: string,
  ) => {
    const block = edited(key)
    if (block === null) return null
    return (
      <article className="history__block">
        <h3 className="history__block-title">
          <span aria-hidden="true">{glyph}</span> {block.title ?? builtInTitle}
        </h3>
        {paragraphsOf(block.body).map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </article>
    )
  }

  return (
    <Section
      id="historia"
      eyebrow={t('Sobre nosotros')}
      title={t('Historia de la UBL')}
      tone="alt"
      headerHidden
    >
      <div className="history">
        <div className="history__crest">
          {/* The visible heading rides pinned with the crest, one unit with its
           * own spacing, and leaves upward only when the section's prose runs
           * out, which is sticky's native ending. Hidden from readers because
           * the Section's own (visually hidden) h2 already names the landmark. */}
          <div className="history__pinned-heading" aria-hidden="true">
            <p className="section__eyebrow">{t('Sobre nosotros')}</p>
            <p className="history__pinned-title">{t('Historia de la UBL')}</p>
            <div className="section__rule" />
          </div>
          <Crest size="lg" label={t('Escudo de la Ushuaia Beer League')} />
        </div>

        <div className="history__blocks">
          {editedBlock('historia-nacimiento', '🍺', t('Cómo nació la UBL')) ?? (
            <article className="history__block">
              <h3 className="history__block-title">
                <span aria-hidden="true">🍺</span> {t('Cómo nació la UBL')}
              </h3>
              <p>
                {t(
                  'Toda gran historia arranca más o menos igual: cuatro amigos, muchas ganas de jugar y una pregunta simple:',
                )}{' '}
                <em>
                  {t(
                    '"¿Y si armamos algo para competir... pero pasándola bien?"',
                  )}
                </em>
              </p>
              <p>
                {t(
                  'Así nació la Ushuaia Beer League. Un grupo de apasionados por el deporte que buscaba un espacio donde lo importante no fuera solo ganar, sino también divertirse, reencontrarse, mover el cuerpo, quemar algunas calorías y compartir buenos momentos dentro y fuera de la cancha.',
                )}
              </p>
            </article>
          )}

          {editedBlock(
            'historia-beer-league',
            '❄️',
            t('¿Qué significa Beer League?'),
          ) ?? (
            <article className="history__block">
              <h3 className="history__block-title">
                <span aria-hidden="true">❄️</span>{' '}
                {t('¿Qué significa Beer League?')}
              </h3>
              <p>
                {t(
                  'El concepto viene de la cultura del hockey sobre hielo. En muchas partes del mundo, las Beer Leagues son ligas recreativas pensadas para quienes aman competir, pero ya no viven el deporte desde la exigencia profesional: jugadores fuera del circuito competitivo, madres y padres con agenda completa, ex deportistas, gente que vuelve después de años, amateurs con hambre de juego y sí... también algún que otro gordito cervecero 😎🍺',
                )}
              </p>
              <p>
                <em>
                  {t(
                    'Es competencia con otra energía: menos presión, más comunidad.',
                  )}
                </em>
              </p>
            </article>
          )}

          {editedBlock('historia-comienzo', '🏒', t('El comienzo')) ?? (
            <article className="history__block">
              <h3 className="history__block-title">
                <span aria-hidden="true">🏒</span> {t('El comienzo')}
              </h3>
              <p>
                {t(
                  'En 2023, esa idea tomó forma en Ushuaia. Lo que arrancó como una prueba entre amigos empezó a crecer fecha tras fecha, temporada tras temporada. Más jugadores. Más equipos. Más historias. Más ganas de participar.',
                )}
              </p>
              <p>
                {t(
                  'Siempre con algo que valoramos muchísimo: la buena predisposición de quienes se suman, colaboran y hacen que cada edición salga adelante.',
                )}
              </p>
            </article>
          )}

          {editedBlock('historia-apoyo', '🍺', t('El primer gran apoyo')) ?? (
            <article className="history__block">
              <h3 className="history__block-title">
                <span aria-hidden="true">🍺</span> {t('El primer gran apoyo')}
              </h3>
              <p>
                {t(
                  'Si hablamos de comienzos, hay que nombrar a quienes confiaron desde el día uno. Nuestro primer sponsor fue',
                )}{' '}
                <em>Birra del Fuego</em>
                {t(
                  ', acompañando el proyecto desde sus primeros pasos y entendiendo perfecto el espíritu de esta locura organizada. Porque si había Beer League... tenía que haber buena birra cerca.',
                )}
              </p>
            </article>
          )}

          {editedBlock('historia-hoy', '🔥', t('Lo que somos hoy')) ?? (
            <article className="history__block">
              <h3 className="history__block-title">
                <span aria-hidden="true">🔥</span> {t('Lo que somos hoy')}
              </h3>
              <p>
                {t(
                  'La UBL es mucho más que un torneo. Es una comunidad. Es deporte con identidad fueguina. Es competencia sana. Es gente que se encuentra para jugar, reírse y compartir.',
                )}
              </p>
              <p>
                <em>{t('Y lo mejor de todo es que esto recién empieza.')}</em>
              </p>
              <p className="history__closing">
                <strong>
                  {t('Fin del mundo. Comienzo de todo... tercer tiempo.')}{' '}
                  <span aria-hidden="true">🍻🏒</span>
                </strong>
              </p>
            </article>
          )}

          <article className="history__block">
            <h3 className="history__block-title">
              <span aria-hidden="true">📜</span> {t('Los diez mandamientos')}
            </h3>
            {/* The one note that exists only to explain a language, and it earns its
             * place: an English reader meeting ten lines of Spanish deserves to be
             * told it is deliberate rather than broken. */}
            <p className="history__commandments-note">
              {t(
                'El reglamento de la liga, citado tal como lo escribió. No se traduce.',
              )}
            </p>
            {/* Literals, never keys. See the note at the top of this file. */}
            <ol className="history__commandments" lang="es">
              <li>Beberé en nombre del hockey.</li>
              <li>No golpearé.</li>
              <li>No lastimaré, no me lastimaré.</li>
              <li>Cederé la baranda que no tiene baranda.</li>
              <li>Cederé la baranda que sí tiene baranda.</li>
              <li>Respetaré al referí aunque parezca ebrio.</li>
              <li>Defenderé con el palo en el hielo.</li>
              <li>Regalaré un penal cada vez que cometa una falta.</li>
              <li>
                Me retiraré si cometo una falta mayor o rompo algún mandamiento.
              </li>
              <li>
                Abandonaré la Ushuaia Beer League si insisto en romper los
                mandamientos.
              </li>
            </ol>
          </article>

          <p className="history__hashtags">
            #UBL #UshuaiaBeerLeague #BeerLeague #HockeyYComunidad #FinDelMundo
            #ShortShiftsLongStories
          </p>
        </div>
      </div>
    </Section>
  )
}
