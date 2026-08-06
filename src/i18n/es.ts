/**
 * The site's own words, in the language it was written in.
 *
 * This file is the source of truth for two things at once: what the site says, and
 * what the key of every translatable string is. **The key is the Spanish text.**
 *
 * That choice is the whole design, so it is worth defending. The usual approach is
 * to invent a key per string (`fixture.upcoming.title`) and keep the Spanish
 * somewhere else. It means naming two hundred things, it makes every component
 * unreadable until you go and look up what `fixture.upcoming.title` says, and a
 * renamed key silently falls back. Here `t('Próximos partidos')` reads as what it
 * renders, a typo is a compile error because the key must exist in this object, and
 * `en.ts` is typed against it so a missing translation is also a compile error.
 *
 * Which is what makes the languages the league asked for next cheap: Italian, French
 * and Portuguese each become one file, and `tsc` lists every string it is missing.
 *
 * Two rules about what does **not** belong here:
 *
 * - **The league's rulebook is never translated.** `CLAUDE.md` has said so since the
 *   first commit: a verbatim quote of the ten commandments stays in the words the
 *   league wrote, in every language. Those strings live where they are quoted and do
 *   not pass through `t`. In English the page says it is quoting the original.
 * - **The back office is not here either.** It is read by three administrators who
 *   speak Spanish, and `docs/ADMIN.md` is Spanish for the same reason. Translating a
 *   panel nobody reads in English would be a lot of work for no reader; if that
 *   changes, the machinery is the same and the strings get added.
 */

export const es = {
  // Navigation and the shell.
  Inicio: 'Inicio',
  Historia: 'Historia',
  Equipos: 'Equipos',
  Fotos: 'Fotos',
  Sponsors: 'Sponsors',
  Contacto: 'Contacto',
  'Ligas & Estadísticas': 'Ligas & Estadísticas',
  Menú: 'Menú',
  'Cerrar menú': 'Cerrar menú',
  'Navegación principal': 'Navegación principal',
  Ligas: 'Ligas',
  'Saltar al contenido': 'Saltar al contenido',
  'Cambiar idioma': 'Cambiar idioma',

  // Competitions and the selector.
  Todas: 'Todas',
  Competencia: 'Competencia',

  // The tabs.
  Fixture: 'Fixture',
  Posiciones: 'Posiciones',
  Goleadores: 'Goleadores',
  Arqueros: 'Arqueros',
  Playoffs: 'Playoffs',

  // The fixture.
  'Próximos partidos': 'Próximos partidos',
  'Cargando la temporada…': 'Cargando la temporada…',

  // Teams.
  Plantel: 'Plantel',
  'Escudos de jugadores': 'Escudos de jugadores',
  'Escudos que la liga hizo para cada jugador':
    'Escudos que la liga hizo para cada jugador',
  'El plantel de este equipo no está publicado en las planillas de la liga.':
    'El plantel de este equipo no está publicado en las planillas de la liga.',
} as const

/**
 * Every string the site can say, as a type. `en.ts` and any language added later is
 * checked against this, so an untranslated string cannot ship unnoticed.
 */
export type StringKey = keyof typeof es
export type Catalogue = Readonly<Record<StringKey, string>>
