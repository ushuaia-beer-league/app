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
 * **"Tercer tiempo" is not the third period.** It is the drinks after the match,
 * the custom English rugby calls the "third half", and in a beer league that is the
 * whole joke of the closing line. Translating it as "third period" is the obvious
 * reading and the wrong one: it turns a punchline into a fact about the clock.
 *
 * "Cabecera" has no English equivalent worth inventing: it is the league's word for
 * the two rinks that run at the same time, so where the word is needed the English
 * says "venue" and the page still names Bahía and Poli, which is what a reader
 * actually needs.
 */
export const en: Catalogue = {
  // Player account.
  'Cuenta corriente': 'Account statement',
  'La liga todavía no habilitó estados de cuenta para tu usuario.':
    'The league has not enabled account statements for your username yet.',
  'Pagos registrados': 'Recorded payments',
  'Saldo pendiente': 'Outstanding balance',
  'Sin confirmar': 'Unconfirmed',
  'Mi cuenta': 'My account',
  'Cerrar sesión': 'Sign out',
  'No pudimos iniciar sesión.': "We couldn't sign you in.",
  'No pudimos cerrar la sesión.': "We couldn't sign you out.",
  'Verificando tu sesión…': 'Checking your session…',
  'El acceso a las cuentas no está disponible.':
    'Account access is unavailable.',
  'Entrá para vincular tu ficha y ver tu historial en la liga.':
    'Sign in to link your player record and see your league history.',
  'Ingresar con Google': 'Sign in with Google',
  'No pudimos cargar la información.': "We couldn't load the information.",
  Reintentar: 'Try again',
  'Cargando tu cuenta…': 'Loading your account…',
  'Solicitud pendiente': 'Request pending',
  'La liga está revisando tu solicitud para {name}.':
    'The league is reviewing your request for {name}.',
  'La liga está revisando tu solicitud.':
    'The league is reviewing your request.',
  'Actualizar estado': 'Refresh status',
  'Tu última solicitud fue rechazada. Podés buscar otra ficha.':
    'Your last request was declined. You can search for another record.',
  'Tu cuenta está lista. La liga también puede vincular tu ficha desde administración.':
    'Your account is ready. League staff can also link your player record.',
  'Buscar mi ficha': 'Find my player record',
  'Revisá el nombre completo y el nombre de usuario.':
    'Check your full name and username.',
  'Ese nombre de usuario ya está en uso.': 'That username is already taken.',
  'No pudimos crear tu cuenta.': "We couldn't create your account.",
  'Creá tu cuenta': 'Set up your account',
  'Nombre completo': 'Full name',
  'Nombre de usuario': 'Username',
  'Usá entre 3 y 30 letras sin tildes, números, guiones o guiones bajos.':
    'Use 3 to 30 unaccented letters, digits, hyphens or underscores.',
  'Crear cuenta': 'Create account',
  'Esta ficha ya no está disponible.':
    'This player record is no longer available.',
  'No pudimos enviar la solicitud.': "We couldn't submit your request.",
  'Buscá tu ficha': 'Find your player record',
  'Buscando fichas…': 'Looking for player records…',
  'Ficha elegida: {name}': 'Selected record: {name}',
  'Esta ficha es mía': 'This is my player record',
  'Elegir otra ficha': 'Choose another record',
  'Seguir sin vincular': 'Continue without linking',
  'Nombre en la ficha': 'Name on the player record',
  'No encontramos fichas con ese nombre.':
    'We found no player records with that name.',
  'Escribí un nombre más completo para ver menos resultados.':
    'Enter more of the name to narrow your results.',
  'Cargando tu historial…': 'Loading your history…',
  Temporada: 'Season',
  'Todavía no hay temporadas y competencias para consultar.':
    'There are no seasons and competitions to browse yet.',
  Estadísticas: 'Statistics',
  'Los totales pueden incluir partidos sin planilla individual disponible.':
    'Totals may include games with no individual game sheet available.',
  'No hay equipos registrados para esta selección.':
    'There are no teams recorded for this selection.',
  'Plantel anterior': 'Former roster',
  'Tu plantel no tiene próximos partidos publicados.':
    'Your roster has no upcoming games listed.',
  'Partidos jugados': 'Games played',
  'No hay participaciones registradas en las planillas de esta selección.':
    'There are no appearances recorded on the game sheets for this selection.',
  'Tu equipo: {name}': 'Your team: {name}',
  Suplente: 'Substitute',
  Franquicia: 'Franchise player',
  Goles: 'Goals',
  Asistencias: 'Assists',
  'Tiros recibidos': 'Shots faced',
  'Goles recibidos': 'Goals against',
  'Por confirmar': 'To be confirmed',
  'Todavía no hay estadísticas individuales para esta selección.':
    'There are no individual statistics for this selection yet.',
  Puntos: 'Points',
  'Partidos como arquero': 'Games in goal',
  'Porcentaje de atajadas': 'Save percentage',
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
  // Historia, the league's own account of itself. The tone is half the page, so
  // the jokes are translated as jokes rather than flattened.
  'Sobre nosotros': 'About us',
  'Historia de la UBL': 'The UBL story',
  'Escudo de la Ushuaia Beer League': 'Ushuaia Beer League crest',
  'Cómo nació la UBL': 'How the UBL started',
  'Toda gran historia arranca más o menos igual: cuatro amigos, muchas ganas de jugar y una pregunta simple:':
    'Every great story starts more or less the same way: four friends, a lot of appetite for playing, and one simple question:',
  '"¿Y si armamos algo para competir... pero pasándola bien?"':
    '“What if we set up something competitive... but actually fun?”',
  'Así nació la Ushuaia Beer League. Un grupo de apasionados por el deporte que buscaba un espacio donde lo importante no fuera solo ganar, sino también divertirse, reencontrarse, mover el cuerpo, quemar algunas calorías y compartir buenos momentos dentro y fuera de la cancha.':
    'That is how the Ushuaia Beer League began. A group of people who love the sport and wanted somewhere that was not only about winning, but about having a laugh, seeing each other again, moving, burning off a few calories and sharing good moments on the ice and off it.',
  '¿Qué significa Beer League?': 'What is a Beer League?',
  'El concepto viene de la cultura del hockey sobre hielo. En muchas partes del mundo, las Beer Leagues son ligas recreativas pensadas para quienes aman competir, pero ya no viven el deporte desde la exigencia profesional: jugadores fuera del circuito competitivo, madres y padres con agenda completa, ex deportistas, gente que vuelve después de años, amateurs con hambre de juego y sí... también algún que otro gordito cervecero 😎🍺':
    'The idea comes from ice hockey culture. All over the world, beer leagues are recreational leagues for people who still love to compete but no longer live the sport at professional intensity: players outside the competitive circuit, parents with no spare hours, former athletes, people coming back after years away, amateurs hungry for a game and yes... a few beer bellies too 😎🍺',
  'Es competencia con otra energía: menos presión, más comunidad.':
    'It is competition with a different energy: less pressure, more community.',
  'El comienzo': 'The beginning',
  'En 2023, esa idea tomó forma en Ushuaia. Lo que arrancó como una prueba entre amigos empezó a crecer fecha tras fecha, temporada tras temporada. Más jugadores. Más equipos. Más historias. Más ganas de participar.':
    'In 2023 the idea took shape in Ushuaia. What started as an experiment among friends grew round after round, season after season. More players. More teams. More stories. More people wanting in.',
  'Siempre con algo que valoramos muchísimo: la buena predisposición de quienes se suman, colaboran y hacen que cada edición salga adelante.':
    'Always with something we value enormously: the willingness of everyone who joins in, lends a hand and gets each season off the ground.',
  'El primer gran apoyo': 'The first big backing',
  'Si hablamos de comienzos, hay que nombrar a quienes confiaron desde el día uno. Nuestro primer sponsor fue':
    'Talking about beginnings means naming the people who believed from day one. Our first sponsor was',
  ', acompañando el proyecto desde sus primeros pasos y entendiendo perfecto el espíritu de esta locura organizada. Porque si había Beer League... tenía que haber buena birra cerca.':
    ', backing the project from its first steps and understanding exactly the spirit of this organised madness. Because if there was going to be a Beer League... there had to be good beer nearby.',
  'Lo que somos hoy': 'What we are today',
  'La UBL es mucho más que un torneo. Es una comunidad. Es deporte con identidad fueguina. Es competencia sana. Es gente que se encuentra para jugar, reírse y compartir.':
    'The UBL is much more than a tournament. It is a community. It is sport with Tierra del Fuego in it. It is healthy competition. It is people meeting up to play, laugh and share.',
  'Y lo mejor de todo es que esto recién empieza.':
    'And the best part is that this is only getting started.',
  'Fin del mundo. Comienzo de todo... tercer tiempo.':
    'End of the world. Beginning of everything... third half.',
  'Los diez mandamientos': 'The ten commandments',
  'El reglamento de la liga, citado tal como lo escribió. No se traduce.':
    'The league’s own rulebook, quoted in Spanish exactly as written. It is never translated.',
  // Section headings.
  Galería: 'Gallery',
  'Fotos & Momentos': 'Photos & Moments',
  'Gracias a ellos es posible': 'They make it possible',
  Escribinos: 'Get in touch',
  'Temporada {year}': '{year} season',
  'Tablas de la competencia': 'Competition tables',
  // Tables, fixture, playoffs and the empty states.
  'Tabla de posiciones': 'Standings table',
  'Tabla de goleadores': 'Scoring table',
  'Tabla de arqueros': 'Goalies table',
  Jugador: 'Player',
  Equipo: 'Team',
  Arquero: 'Goalie',
  'Sin equipo': 'No team',
  'Deslizá la tabla para ver todas las columnas.':
    'Swipe the table to see every column.',
  'Todavía no hay partidos jugados en esta competencia.':
    'No games have been played in this competition yet.',
  'Todavía no hay goleadores publicados en esta competencia.':
    'No scoring has been published for this competition yet.',
  'Todavía no hay arqueros publicados en esta competencia.':
    'No goalie records have been published for this competition yet.',
  'Sin registrar': 'Not recorded',
  'Sin resultado': 'No result yet',
  'Todavía no hay fechas cargadas para esta competencia.':
    'No rounds have been entered for this competition yet.',
  'Ver la fecha ya jugada': 'See the round already played',
  'Ver las {n} fechas ya jugadas': 'See the {n} rounds already played',
  Repechaje: 'Play-in',
  'Cuartos de final': 'Quarterfinals',
  Semifinales: 'Semifinals',
  Final: 'Final',
  'Tercer puesto': 'Third place',
  'Quinto puesto': 'Fifth place',
  Penales: 'Shootout',
  Empate: 'Draw',
  'Por definir': 'To be decided',
  'por posición': 'by standing',
  'Todavía no hay llaves publicadas para esta competencia.':
    'No bracket has been published for this competition yet.',
  '1 jugador en el plantel': '1 player on the roster',
  '{n} jugadores en el plantel': '{n} players on the roster',
  'Todavía no hay equipos cargados en esta competencia.':
    'No teams have been entered for this competition yet.',
  'Cada equipo toma jugadoras de varios equipos de la Beer League, así que tampoco se pueden deducir de los planteles de arriba.':
    'Each team draws players from several Beer League teams, so they cannot be worked out from the rosters above either.',
  'Todavía no hay sponsors publicados.': 'No sponsors have been published yet.',
  'Todavía no hay canales de contacto publicados.':
    'No contact details have been published yet.',
  'Estás viendo la última copia guardada de la temporada.':
    'You are seeing the last saved copy of the season.',
  'Ninguna planilla de la liga publica los planteles de la {competition}.':
    'No league sheet publishes the rosters for the {competition}.',
  // The gallery's lightbox.
  'Ampliar la foto': 'Enlarge the photo',
  'Foto anterior': 'Previous photo',
  'Foto siguiente': 'Next photo',
  Cerrar: 'Close',

  Cuartos: 'Quarterfinal',
  Semifinal: 'Semifinal',
  'Juego de estrellas': 'All-star game',
  // Sharing a table, a team or a round as an image.
  Compartir: 'Share',
  'Compartir {que} como imagen': 'Share {que} as an image',
  Goleadoras: 'Scoring',
  Arqueras: 'Goalies',
  'y {n} más en ubl.com.ar': 'and {n} more at ubl.com.ar',
  'No se pudo armar la imagen para compartir.':
    'The image could not be put together for sharing.',

  'Hay una versión nueva del sitio.': 'There is a new version of the site.',
  Actualizar: 'Update',
  // The hero.
  'Hockey sobre Hielo': 'Ice Hockey',
  Hockey: 'Hockey',
  Birra: 'Beer',
  'Fin del Mundo · Desde 2023': 'End of the World · Since 2023',
  'Historia UBL': 'The UBL story',
}
