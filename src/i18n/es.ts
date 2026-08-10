/**
 * Every string the site can say, listed once, in the language it was written in.
 *
 * **The Spanish text is the key, and it is also the Spanish translation.** There is no
 * Spanish catalogue mapping keys to values, because it would map every string to
 * itself: a list of keys is the same information without the second copy, and without
 * the chance of the two copies drifting apart. It also matters for the long prose in
 * Historia, where a paragraph written twice is a paragraph that can disagree with
 * itself.
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

export const STRINGS = [
  // Navigation and the shell.
  'Inicio',
  'Historia',
  'Equipos',
  'Fotos',
  'Sponsors',
  'Contacto',
  'Ligas & Estadísticas',
  'Menú',
  'Cerrar menú',
  'Navegación principal',
  'Ligas',
  'Saltar al contenido',
  'Cambiar idioma',

  // Competitions and the selector.
  'Todas',
  'Competencia',

  // The tabs.
  'Fixture',
  'Posiciones',
  'Goleadores',
  'Arqueros',
  'Playoffs',

  // The fixture.
  'Próximos partidos',
  'Cargando la temporada…',

  // Teams.
  'Plantel',
  'Escudos de jugadores',
  'Escudos que la liga hizo para cada jugador',
  'El plantel de este equipo no está publicado en las planillas de la liga.',
  // Historia, the league's own account of itself.
  'Sobre nosotros',
  'Historia de la UBL',
  'Escudo de la Ushuaia Beer League',
  'Cómo nació la UBL',
  'Toda gran historia arranca más o menos igual: cuatro amigos, muchas ganas de jugar y una pregunta simple:',
  '"¿Y si armamos algo para competir... pero pasándola bien?"',
  'Así nació la Ushuaia Beer League. Un grupo de apasionados por el deporte que buscaba un espacio donde lo importante no fuera solo ganar, sino también divertirse, reencontrarse, mover el cuerpo, quemar algunas calorías y compartir buenos momentos dentro y fuera de la cancha.',
  '¿Qué significa Beer League?',
  'El concepto viene de la cultura del hockey sobre hielo. En muchas partes del mundo, las Beer Leagues son ligas recreativas pensadas para quienes aman competir, pero ya no viven el deporte desde la exigencia profesional: jugadores fuera del circuito competitivo, madres y padres con agenda completa, ex deportistas, gente que vuelve después de años, amateurs con hambre de juego y sí... también algún que otro gordito cervecero 😎🍺',
  'Es competencia con otra energía: menos presión, más comunidad.',
  'El comienzo',
  'En 2023, esa idea tomó forma en Ushuaia. Lo que arrancó como una prueba entre amigos empezó a crecer fecha tras fecha, temporada tras temporada. Más jugadores. Más equipos. Más historias. Más ganas de participar.',
  'Siempre con algo que valoramos muchísimo: la buena predisposición de quienes se suman, colaboran y hacen que cada edición salga adelante.',
  'El primer gran apoyo',
  'Si hablamos de comienzos, hay que nombrar a quienes confiaron desde el día uno. Nuestro primer sponsor fue',
  ', acompañando el proyecto desde sus primeros pasos y entendiendo perfecto el espíritu de esta locura organizada. Porque si había Beer League... tenía que haber buena birra cerca.',
  'Lo que somos hoy',
  'La UBL es mucho más que un torneo. Es una comunidad. Es deporte con identidad fueguina. Es competencia sana. Es gente que se encuentra para jugar, reírse y compartir.',
  'Y lo mejor de todo es que esto recién empieza.',
  'Fin del mundo. Comienzo de todo... tercer tiempo.',
  'Los diez mandamientos',
  'El reglamento de la liga, citado tal como lo escribió. No se traduce.',
  // Section headings.
  'Galería',
  'Fotos & Momentos',
  'Gracias a ellos es posible',
  'Escribinos',
  'Temporada {year}',
  'Tablas de la competencia',
  // Tables, fixture, playoffs and the empty states.
  'Tabla de posiciones',
  'Tabla de goleadores',
  'Tabla de arqueros',
  'Jugador',
  'Equipo',
  'Arquero',
  'Sin equipo',
  'Deslizá la tabla para ver todas las columnas.',
  'Todavía no hay partidos jugados en esta competencia.',
  'Todavía no hay goleadores publicados en esta competencia.',
  'Todavía no hay arqueros publicados en esta competencia.',
  'Sin registrar',
  'Sin resultado',
  'Todavía no hay fechas cargadas para esta competencia.',
  'Ver la fecha ya jugada',
  'Ver las {n} fechas ya jugadas',
  'Repechaje',
  'Cuartos de final',
  // The fixture names one match; the bracket above names a whole round.
  'Cuartos',
  'Semifinal',
  'Juego de estrellas',
  'Semifinales',
  'Final',
  'Tercer puesto',
  'Quinto puesto',
  'Penales',
  'Empate',
  'Por definir',
  'por posición',
  'Todavía no hay llaves publicadas para esta competencia.',
  '1 jugador en el plantel',
  '{n} jugadores en el plantel',
  'Todavía no hay equipos cargados en esta competencia.',
  'Cada equipo toma jugadoras de varios equipos de la Beer League, así que tampoco se pueden deducir de los planteles de arriba.',
  'Todavía no hay sponsors publicados.',
  'Todavía no hay canales de contacto publicados.',
  'Estás viendo la última copia guardada de la temporada.',
  'Ninguna planilla de la liga publica los planteles de la {competition}.',
  // The gallery's lightbox.
  'Ampliar la foto',
  'Foto anterior',
  'Foto siguiente',
  'Cerrar',

  // Sharing a table, a team or a round as an image.
  'Compartir',
  'Compartir {que} como imagen',
  'Goleadoras',
  'Arqueras',
  'y {n} más en ubl.com.ar',
  'No se pudo armar la imagen para compartir.',

  // The hero.
  'Hockey sobre Hielo',
  'Hockey',
  'Birra',
  'Fin del Mundo · Desde 2023',
  'Historia UBL',
] as const

/** Every string the site can say. */
export type StringKey = (typeof STRINGS)[number]

/**
 * What a language other than Spanish has to provide: all of it. Spanish needs no
 * catalogue at all, because the key is the Spanish.
 */
export type Catalogue = Readonly<Record<StringKey, string>>
