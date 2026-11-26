import type { Catalogue } from './es'

/**
 * O site em português, para quem vem do Brasil.
 *
 * Brazilian Portuguese and not European, which is why the tag is `pt-BR`. It is not
 * a formality: `time` and `equipa`, `elenco` and `plantel`, `você` and `tu` all
 * split along that line, and Ushuaia's Portuguese-speaking visitors are
 * overwhelmingly Brazilian.
 *
 * Typed as `Catalogue`, so it cannot be incomplete: a string added to `es.ts` and
 * missing here fails `npm run typecheck`.
 *
 * The vocabulary is the one Brazilian sport actually uses, which is not always the
 * literal translation:
 *
 * - **Artilharia** for `Goleadores`. The literal `Goleadores` exists in Portuguese
 *   and no Brazilian table is titled that; the scoring table is the artilharia.
 * - **Classificação** for `Posiciones`, which is what a standings table is called.
 * - **Calendário** for `Fixture`. English and Spanish both say fixture and Brazilian
 *   Portuguese does not.
 * - **Elenco** for `Plantel`, and **time** for `equipo`.
 *
 * As in English, the ten commandments are absent: they are the league's rulebook and
 * are quoted in Spanish in every language.
 */
export const ptBR: Catalogue = {
  // Player account.
  'Cuenta corriente': 'Extrato da conta',
  'La liga todavía no habilitó estados de cuenta para tu usuario.':
    'A liga ainda não disponibilizou extratos para seu usuário.',
  'Pagos registrados': 'Pagamentos registrados',
  'Saldo pendiente': 'Saldo em aberto',
  'Sin confirmar': 'A confirmar',
  'Mi cuenta': 'Minha conta',
  'Cerrar sesión': 'Sair',
  'No pudimos iniciar sesión.': 'Não foi possível entrar.',
  'No pudimos cerrar la sesión.': 'Não foi possível sair.',
  'Verificando tu sesión…': 'Verificando sua sessão…',
  'El acceso a las cuentas no está disponible.':
    'O acesso às contas está indisponível.',
  'Entrá para vincular tu ficha y ver tu historial en la liga.':
    'Entre para vincular sua ficha e ver seu histórico na liga.',
  'Ingresar con Google': 'Entrar com Google',
  'No pudimos cargar la información.':
    'Não foi possível carregar as informações.',
  Reintentar: 'Tentar novamente',
  'Cargando tu cuenta…': 'Carregando sua conta…',
  'Solicitud pendiente': 'Solicitação pendente',
  'La liga está revisando tu solicitud para {name}.':
    'A liga está analisando sua solicitação para {name}.',
  'La liga está revisando tu solicitud.':
    'A liga está analisando sua solicitação.',
  'Actualizar estado': 'Atualizar status',
  'Tu última solicitud fue rechazada. Podés buscar otra ficha.':
    'Sua última solicitação foi recusada. Você pode buscar outra ficha.',
  'Tu cuenta está lista. La liga también puede vincular tu ficha desde administración.':
    'Sua conta está pronta. A administração da liga também pode vincular sua ficha.',
  'Buscar mi ficha': 'Buscar minha ficha',
  'Revisá el nombre completo y el nombre de usuario.':
    'Confira seu nome completo e nome de usuário.',
  'Ese nombre de usuario ya está en uso.':
    'Esse nome de usuário já está em uso.',
  'No pudimos crear tu cuenta.': 'Não foi possível criar sua conta.',
  'Creá tu cuenta': 'Crie sua conta',
  'Nombre completo': 'Nome completo',
  'Nombre de usuario': 'Nome de usuário',
  'Usá entre 3 y 30 letras sin tildes, números, guiones o guiones bajos.':
    'Use de 3 a 30 letras sem acento, números, hífens ou sublinhados.',
  'Crear cuenta': 'Criar conta',
  'Esta ficha ya no está disponible.': 'Esta ficha não está mais disponível.',
  'No pudimos enviar la solicitud.': 'Não foi possível enviar a solicitação.',
  'Buscá tu ficha': 'Encontre sua ficha',
  'Buscando fichas…': 'Procurando fichas…',
  'Ficha elegida: {name}': 'Ficha selecionada: {name}',
  'Esta ficha es mía': 'Esta ficha é minha',
  'Elegir otra ficha': 'Escolher outra ficha',
  'Seguir sin vincular': 'Continuar sem vincular',
  'Nombre en la ficha': 'Nome na ficha',
  'No encontramos fichas con ese nombre.':
    'Não encontramos fichas com esse nome.',
  'Escribí un nombre más completo para ver menos resultados.':
    'Digite um nome mais completo para reduzir os resultados.',
  'Cargando tu historial…': 'Carregando seu histórico…',
  Temporada: 'Temporada',
  'Todavía no hay temporadas y competencias para consultar.':
    'Ainda não há temporadas e competições para consultar.',
  Estadísticas: 'Estatísticas',
  'Los totales pueden incluir partidos sin planilla individual disponible.':
    'Os totais podem incluir jogos sem súmula individual disponível.',
  'No hay equipos registrados para esta selección.':
    'Não há equipes registradas para esta seleção.',
  'Plantel anterior': 'Elenco anterior',
  'Tu plantel no tiene próximos partidos publicados.':
    'Seu elenco não tem próximos jogos publicados.',
  'Partidos jugados': 'Jogos disputados',
  'No hay participaciones registradas en las planillas de esta selección.':
    'Não há participações registradas nas súmulas desta seleção.',
  'Tu equipo: {name}': 'Sua equipe: {name}',
  Suplente: 'Reserva',
  Franquicia: 'Jogador franquia',
  Goles: 'Gols',
  Asistencias: 'Assistências',
  'Tiros recibidos': 'Chutes recebidos',
  'Goles recibidos': 'Gols sofridos',
  'Por confirmar': 'A confirmar',
  'Todavía no hay estadísticas individuales para esta selección.':
    'Ainda não há estatísticas individuais para esta seleção.',
  Puntos: 'Pontos',
  'Partidos como arquero': 'Jogos como goleiro',
  'Porcentaje de atajadas': 'Percentual de defesas',
  // Navigation and the shell.
  Inicio: 'Início',
  Historia: 'Nossa história',
  Ligas: 'Ligas',
  'Ligas & Estadísticas': 'Ligas & Estatísticas',
  Equipos: 'Times',
  Fotos: 'Fotos',
  Sponsors: 'Patrocinadores',
  Contacto: 'Contato',
  Menú: 'Menu',
  'Cerrar menú': 'Fechar menu',
  'Navegación principal': 'Navegação principal',
  'Saltar al contenido': 'Pular para o conteúdo',
  'Cambiar idioma': 'Mudar idioma',

  // Competitions and the selector.
  Todas: 'Todas',
  Competencia: 'Competição',

  // The tabs.
  Fixture: 'Calendário',
  Posiciones: 'Classificação',
  Goleadores: 'Artilharia',
  Arqueros: 'Goleiros',
  Playoffs: 'Playoffs',

  // The fixture.
  'Próximos partidos': 'Próximos jogos',
  'Cargando la temporada…': 'Carregando a temporada…',

  // Teams.
  Plantel: 'Elenco',
  'Escudos de jugadores': 'Escudos dos jogadores',
  'Escudos que la liga hizo para cada jugador':
    'Escudos que a liga fez para cada jogador',
  'El plantel de este equipo no está publicado en las planillas de la liga.':
    'O elenco deste time não está publicado nas planilhas da liga.',

  // Historia, the league's own account of itself.
  'Sobre nosotros': 'Sobre nós',
  'Historia de la UBL': 'A história da UBL',
  'Escudo de la Ushuaia Beer League': 'Escudo da Ushuaia Beer League',
  'Cómo nació la UBL': 'Como nasceu a UBL',
  'Toda gran historia arranca más o menos igual: cuatro amigos, muchas ganas de jugar y una pregunta simple:':
    'Toda grande história começa mais ou menos igual: quatro amigos, muita vontade de jogar e uma pergunta simples:',
  '"¿Y si armamos algo para competir... pero pasándola bien?"':
    '“E se a gente montar algo para competir... mas se divertindo?”',
  'Así nació la Ushuaia Beer League. Un grupo de apasionados por el deporte que buscaba un espacio donde lo importante no fuera solo ganar, sino también divertirse, reencontrarse, mover el cuerpo, quemar algunas calorías y compartir buenos momentos dentro y fuera de la cancha.':
    'Foi assim que nasceu a Ushuaia Beer League. Um grupo de apaixonados pelo esporte que procurava um espaço onde o importante não fosse só ganhar, mas também se divertir, reencontrar os amigos, mexer o corpo, queimar algumas calorias e dividir bons momentos dentro e fora do gelo.',
  '¿Qué significa Beer League?': 'O que é uma Beer League?',
  'El concepto viene de la cultura del hockey sobre hielo. En muchas partes del mundo, las Beer Leagues son ligas recreativas pensadas para quienes aman competir, pero ya no viven el deporte desde la exigencia profesional: jugadores fuera del circuito competitivo, madres y padres con agenda completa, ex deportistas, gente que vuelve después de años, amateurs con hambre de juego y sí... también algún que otro gordito cervecero 😎🍺':
    'O conceito vem da cultura do hóquei no gelo. Em muitos lugares do mundo, as beer leagues são ligas recreativas pensadas para quem ama competir, mas já não vive o esporte na intensidade profissional: jogadores fora do circuito competitivo, mães e pais com a agenda lotada, ex-atletas, gente que volta depois de anos, amadores com fome de jogo e sim... também uma barriguinha de cerveja ou outra 😎🍺',
  'Es competencia con otra energía: menos presión, más comunidad.':
    'É competição com outra energia: menos pressão, mais comunidade.',
  'El comienzo': 'O começo',
  'En 2023, esa idea tomó forma en Ushuaia. Lo que arrancó como una prueba entre amigos empezó a crecer fecha tras fecha, temporada tras temporada. Más jugadores. Más equipos. Más historias. Más ganas de participar.':
    'Em 2023 essa ideia tomou forma em Ushuaia. O que começou como um teste entre amigos foi crescendo rodada após rodada, temporada após temporada. Mais jogadores. Mais times. Mais histórias. Mais gente querendo entrar.',
  'Siempre con algo que valoramos muchísimo: la buena predisposición de quienes se suman, colaboran y hacen que cada edición salga adelante.':
    'Sempre com algo que valorizamos muito: a boa vontade de quem entra, colabora e faz cada edição acontecer.',
  'El primer gran apoyo': 'O primeiro grande apoio',
  'Si hablamos de comienzos, hay que nombrar a quienes confiaron desde el día uno. Nuestro primer sponsor fue':
    'Falando em começos, é preciso citar quem confiou desde o primeiro dia. Nosso primeiro patrocinador foi a',
  ', acompañando el proyecto desde sus primeros pasos y entendiendo perfecto el espíritu de esta locura organizada. Porque si había Beer League... tenía que haber buena birra cerca.':
    ', que acompanhou o projeto desde os primeiros passos e entendeu perfeitamente o espírito dessa loucura organizada. Porque se ia ter Beer League... tinha que ter cerveja boa por perto.',
  'Lo que somos hoy': 'O que somos hoje',
  'La UBL es mucho más que un torneo. Es una comunidad. Es deporte con identidad fueguina. Es competencia sana. Es gente que se encuentra para jugar, reírse y compartir.':
    'A UBL é muito mais que um campeonato. É uma comunidade. É esporte com a cara da Terra do Fogo. É competição saudável. É gente que se encontra para jogar, rir e dividir bons momentos.',
  'Y lo mejor de todo es que esto recién empieza.':
    'E o melhor de tudo é que isso está só começando.',
  // "Tercer tiempo" is the drinks after the match, and Brazilian Portuguese has the
  // same custom with the same name: o terceiro tempo. The joke survives untouched,
  // which it did not in English.
  'Fin del mundo. Comienzo de todo... tercer tiempo.':
    'Fim do mundo. Começo de tudo... terceiro tempo.',
  'Los diez mandamientos': 'Os dez mandamentos',
  'El reglamento de la liga, citado tal como lo escribió. No se traduce.':
    'O regulamento da liga, citado em espanhol exatamente como foi escrito. Não se traduz.',
  // Section headings.
  Galería: 'Galeria',
  'Fotos & Momentos': 'Fotos & Momentos',
  'Gracias a ellos es posible': 'Graças a eles é possível',
  Escribinos: 'Fale com a gente',
  'Temporada {year}': 'Temporada {year}',
  'Tablas de la competencia': 'Tabelas da competição',
  // Tables, fixture, playoffs and the empty states.
  'Tabla de posiciones': 'Tabela de classificação',
  'Tabla de goleadores': 'Tabela de artilharia',
  'Tabla de arqueros': 'Tabela de goleiros',
  Jugador: 'Jogador',
  Equipo: 'Time',
  Arquero: 'Goleiro',
  'Sin equipo': 'Sem time',
  'Deslizá la tabla para ver todas las columnas.':
    'Arraste a tabela para ver todas as colunas.',
  'Todavía no hay partidos jugados en esta competencia.':
    'Ainda não há jogos disputados nesta competição.',
  'Todavía no hay goleadores publicados en esta competencia.':
    'Ainda não há artilharia publicada nesta competição.',
  'Todavía no hay arqueros publicados en esta competencia.':
    'Ainda não há goleiros publicados nesta competição.',
  'Sin registrar': 'Sem registro',
  'Sin resultado': 'Sem resultado',
  'Todavía no hay fechas cargadas para esta competencia.':
    'Ainda não há rodadas cadastradas nesta competição.',
  'Ver la fecha ya jugada': 'Ver a rodada já disputada',
  'Ver las {n} fechas ya jugadas': 'Ver as {n} rodadas já disputadas',
  Repechaje: 'Repescagem',
  'Cuartos de final': 'Quartas de final',
  Semifinales: 'Semifinais',
  Final: 'Final',
  'Tercer puesto': 'Terceiro lugar',
  'Quinto puesto': 'Quinto lugar',
  Penales: 'Pênaltis',
  Empate: 'Empate',
  'Por definir': 'A definir',
  'por posición': 'por classificação',
  'Todavía no hay llaves publicadas para esta competencia.':
    'Ainda não há chaveamento publicado nesta competição.',
  '1 jugador en el plantel': '1 jogador no elenco',
  '{n} jugadores en el plantel': '{n} jogadores no elenco',
  'Todavía no hay equipos cargados en esta competencia.':
    'Ainda não há times cadastrados nesta competição.',
  'Cada equipo toma jugadoras de varios equipos de la Beer League, así que tampoco se pueden deducir de los planteles de arriba.':
    'Cada time reúne jogadoras de vários times da Beer League, então também não dá para deduzir pelos elencos acima.',
  'Todavía no hay sponsors publicados.':
    'Ainda não há patrocinadores publicados.',
  'Todavía no hay canales de contacto publicados.':
    'Ainda não há canais de contato publicados.',
  'Estás viendo la última copia guardada de la temporada.':
    'Você está vendo a última cópia salva da temporada.',
  'Ninguna planilla de la liga publica los planteles de la {competition}.':
    'Nenhuma planilha da liga publica os elencos da {competition}.',
  // The gallery's lightbox.
  'Ampliar la foto': 'Ampliar a foto',
  'Foto anterior': 'Foto anterior',
  'Foto siguiente': 'Próxima foto',
  Cerrar: 'Fechar',

  Cuartos: 'Quartas',
  Semifinal: 'Semifinal',
  'Juego de estrellas': 'Jogo das estrelas',
  // Sharing a table, a team or a round as an image.
  Compartir: 'Compartilhar',
  'Compartir {que} como imagen': 'Compartilhar {que} como imagem',
  Goleadoras: 'Artilheiras',
  Arqueras: 'Goleiras',
  'y {n} más en ubl.com.ar': 'e mais {n} em ubl.com.ar',
  'No se pudo armar la imagen para compartir.':
    'Não foi possível montar a imagem para compartilhar.',

  'Hay una versión nueva del sitio.': 'Há uma versão nova do site.',
  Actualizar: 'Atualizar',
  // The hero.
  'Hockey sobre Hielo': 'Hóquei no Gelo',
  Hockey: 'Hóquei',
  Birra: 'Breja',
  'Fin del Mundo · Desde 2023': 'Fim do Mundo · Desde 2023',
  'Historia UBL': 'História da UBL',
}
