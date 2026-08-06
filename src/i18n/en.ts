import type { Catalogue } from './es'

/**
 * The site in English, for the visitor who is not from here.
 *
 * Typed as `Catalogue`, which is generated from the Spanish file, so this cannot be
 * incomplete: a string added to `es.ts` and not to this file fails `npm run
 * typecheck`. That is the property that makes the next three languages the league
 * asked for a mechanical job rather than a hunt.
 *
 * Two words are deliberately not translated. **Fixture** is what the league says in
 * Spanish and what hockey says in English, so it stays. **Beer League** is the name
 * of the thing.
 *
 * "Cabecera" has no English equivalent worth inventing: it is the league's word for
 * the two rinks that run at the same time, so where the word is needed the English
 * says "venue" and the page still names Bahía and Poli, which is what a reader
 * actually needs.
 */
export const en: Catalogue = {
  // Navigation and the shell.
  Inicio: 'Home',
  Historia: 'Our story',
  Equipos: 'Teams',
  Fotos: 'Photos',
  Sponsors: 'Sponsors',
  Contacto: 'Contact',
  'Ligas & Estadísticas': 'Leagues & Stats',
  Menú: 'Menu',
  'Cerrar menú': 'Close menu',
  'Navegación principal': 'Main navigation',
  Ligas: 'Leagues',
  'Saltar al contenido': 'Skip to content',
  'Cambiar idioma': 'Change language',

  // Competitions and the selector.
  Todas: 'All',
  Competencia: 'Competition',

  // The tabs.
  Fixture: 'Fixture',
  Posiciones: 'Standings',
  Goleadores: 'Scoring',
  Arqueros: 'Goalies',
  Playoffs: 'Playoffs',

  // The fixture.
  'Próximos partidos': 'Upcoming games',
  'Cargando la temporada…': 'Loading the season…',

  // Teams.
  Plantel: 'Roster',
  'Escudos de jugadores': 'Player badges',
  'Escudos que la liga hizo para cada jugador':
    'Badges the league made for each player',
  'El plantel de este equipo no está publicado en las planillas de la liga.':
    'This team’s roster is not published in the league’s own sheets.',
}
