/**
 * The league's own manual, as data, in Spanish.
 *
 * **This is the only copy.** The panel renders it at `/admin/manual`, every
 * screen links to the section that explains it, and
 * `scripts/build-manual.ts` writes `docs/COMO-FUNCIONA.md` from exactly this
 * so the file people share on GitHub cannot drift from the one operators read
 * while they work. `manual.test.ts` fails when the committed file stops
 * matching, which is the only thing that keeps two copies honest.
 *
 * Spanish, like `docs/ADMIN.md`, and for the same reason: the people who read
 * it run the league. It is written for somebody who knows hockey and not code,
 * so there is no stack in here, no table names and no file paths.
 *
 * Every claim was checked against the code rather than remembered. When
 * behaviour changes, this changes with it: a manual that lies is worse than no
 * manual, and the sections are linked from the screens, so a wrong sentence is
 * read at exactly the moment somebody trusts it.
 */

/** A run of text, bold where the writer marked it with `**`. */
export interface InlinePart {
  text: string
  strong: boolean
}

/**
 * Splits `**` pairs into parts, which is the one inline mark the manual uses.
 *
 * Deliberately not a markdown parser: the panel would need a dependency to
 * render one and the generated file would need it to survive a round trip.
 * One mark, split on the delimiter, and an odd number of delimiters leaves the
 * text as it was typed rather than eating half a paragraph.
 */
export function inlineParts(text: string): InlinePart[] {
  const pieces = text.split('**')
  if (pieces.length % 2 === 0) return [{ text, strong: false }]

  return pieces
    .map((piece, index) => ({ text: piece, strong: index % 2 === 1 }))
    .filter((part) => part.text !== '')
}

export type ManualBlock =
  | { kind: 'text'; text: string }
  /** Set apart, for the one or two sentences a reader has to leave with. */
  | { kind: 'note'; text: string }
  | { kind: 'list'; items: readonly string[] }
  | {
      kind: 'table'
      headings: readonly string[]
      rows: readonly (readonly string[])[]
    }
  | { kind: 'subtitle'; text: string }

export interface ManualSection {
  /**
   * The address of this section, used by `/admin/manual#<id>` and by the help
   * link on the screen it explains. Renaming one is renaming a link.
   */
  id: string
  title: string
  blocks: readonly ManualBlock[]
}

export const MANUAL_TITLE = 'Cómo funciona el sistema de la Ushuaia Beer League'

export const MANUAL_INTRO: readonly ManualBlock[] = [
  {
    kind: 'text',
    text: 'Esto explica **qué hace el sistema, de dónde saca cada número y por qué a veces dice que no sabe**. No hay nada de programación acá: si sabés de hockey, alcanza.',
  },
  {
    kind: 'text',
    text: 'Cada pantalla del panel tiene un link «¿Cómo funciona?» que trae directo a la sección que le corresponde. Si algo no se entiende, está mal escrito: avisá y lo arreglamos.',
  },
]

export const MANUAL: readonly ManualSection[] = [
  {
    id: 'la-idea',
    title: 'La idea de fondo, en una frase',
    blocks: [
      {
        kind: 'text',
        text: 'El sistema **no guarda tablas: guarda partidos**. Las posiciones, los goleadores, los arqueros y el cuadro de playoffs se calculan cada vez que alguien abre la página, a partir de los partidos cargados.',
      },
      {
        kind: 'note',
        text: 'Si cargás un resultado, **todas** las tablas cambian solas. Nadie actualiza la tabla de posiciones a mano, y no puede pasar que el resultado diga una cosa y la tabla diga otra.',
      },
      {
        kind: 'note',
        text: 'Y al revés: si un partido no está cargado, **nada** lo puede adivinar. La final no sabe quién la juega hasta que la semifinal tenga resultado.',
      },
    ],
  },
  {
    id: 'puntos',
    title: 'Cómo se cuentan los puntos',
    blocks: [
      {
        kind: 'text',
        text: 'Estas son las reglas de **esta** liga, que no son las del hockey federado. El sistema usa exactamente estas:',
      },
      {
        kind: 'table',
        headings: ['Cómo terminó', 'Puntos'],
        rows: [
          ['Ganó en tiempo', '2'],
          ['Ganó por penales', '2'],
          ['Perdió por penales', '1'],
          ['Empató', '1'],
          ['Perdió en tiempo', '0'],
        ],
      },
      {
        kind: 'text',
        text: 'Ganar en tiempo y ganar por penales pagan lo mismo, **pero se guardan aparte**, porque el primer desempate es **PGR**: los partidos ganados fuera de penales.',
      },
      {
        kind: 'text',
        text: 'El orden de la tabla es: puntos, después PGR, después diferencia de gol. No hay tabla auxiliar entre los equipos empatados. Por eso Rock Choppers puede estar arriba de Blanco con los mismos puntos y peor diferencia de gol: tiene más PGR.',
      },
      {
        kind: 'text',
        text: '**Los empates existen.** Hay uno en la historia de la liga (Mujeres Birra del Fuego 4 a 4 Mujeres Tipo Nine, 28 de junio de 2026), así que el sistema nunca trata un empate como un error de carga.',
      },
    ],
  },
  {
    id: 'de-donde-sale',
    title: 'Qué se muestra y de dónde sale',
    blocks: [
      {
        kind: 'table',
        headings: ['En el sitio', 'De dónde sale'],
        rows: [
          ['Fixture', 'Los partidos cargados, con fecha, hora y cabecera'],
          ['Posiciones', 'Se calcula de los resultados'],
          [
            'Goleadores y arqueras/os',
            'Los totales que publicó la liga, no calculados',
          ],
          ['Playoffs', 'Se deduce de las posiciones y de los resultados'],
          ['Equipos y planteles', 'Lo que se carga en el panel'],
          ['Fotos, sponsors, contacto', 'Lo que se carga en el panel'],
        ],
      },
      { kind: 'subtitle', text: 'Lo de goleadores y arqueros' },
      {
        kind: 'text',
        text: 'Las planillas de la liga traen **totales por jugador de toda la temporada**, no gol por gol. Como no hay registro de cada gol, esa tabla no se puede calcular: se transcribe tal como la liga la publicó, y lo dice arriba con la fecha.',
      },
      {
        kind: 'text',
        text: 'Y abajo de esa tabla, **cuando hay planillas cargadas en el sitio**, aparece una segunda: «Lo cargado en el sitio», calculada de los goles y los tiros que se cargaron partido por partido. Dice de cuántas planillas sale, así se entiende que no es la temporada entera.',
      },
      {
        kind: 'note',
        text: 'Son dos cosas distintas y por eso están las dos. La publicada es la temporada regular como la cerró la liga; la calculada es lo que se cargó desde el panel. Sumarlas daría un número que no es ninguno de los dos, y reemplazar una por la otra haría parecer que se perdió el año.',
      },
      {
        kind: 'text',
        text: 'El **porcentaje de atajadas** es (tiros recibidos menos goles recibidos) dividido tiros recibidos. Se calcula al mostrarlo y nunca se guarda. Un arquero que no recibió tiros no tiene 100%: no tiene porcentaje, y se muestra un guion.',
      },
    ],
  },
  {
    id: 'huecos',
    title: 'Por qué a veces dice «Por determinar» o «Sin registrar»',
    blocks: [
      {
        kind: 'note',
        text: 'Un dato que la liga no tiene **no se inventa**. Se muestra el hueco.',
      },
      { kind: 'text', text: 'Lo que significa cada uno:' },
      {
        kind: 'list',
        items: [
          '**Sin resultado**: el partido no se jugó, o se jugó y nadie cargó el marcador. No es 0 a 0. Un 0 a 0 es un resultado de verdad.',
          '**Por determinar** o **Sin registrar** en una final: la semifinal todavía no tiene resultado cargado, así que el sistema no sabe quién ganó. Cargá la semi y la final se completa sola.',
          '**Un asterisco** al lado de un nombre: ese nombre es el que imprime la planilla, que a veces lo corta («Beltrami Ramir»), y nadie lo confirmó todavía.',
          '**Sup**: esa línea es de un suplente, alguien que jugó ese partido sin ser del plantel.',
          '**Una fecha con hora y cabecera y sin equipos**: la planilla original está así. Se publica como está en vez de borrarla.',
        ],
      },
      {
        kind: 'text',
        text: 'Si algo de esto molesta, la solución nunca es tapar el hueco: es cargar el dato que falta.',
      },
    ],
  },
  {
    id: 'reglas-propias',
    title: 'Las reglas propias de esta liga que el sistema ya conoce',
    blocks: [
      {
        kind: 'list',
        items: [
          '**Dos partidos a la misma hora**, en Bahía y en Poli. Ningún cálculo asume un partido por horario.',
          '**No hay minutos de penalización.** La disciplina es tiro penal o irse del partido, así que no existe acumulación de sanciones.',
          '**Los planteles son mixtos**: las mujeres juegan en la Beer League. La Women’s Beer League es un torneo aparte, y sus cuatro equipos toman jugadoras de varios equipos de la Beer League. Por eso una misma persona puede estar en las dos competencias, con equipos distintos y hasta número distinto, y eso no es un error.',
          '**Un suplente no es jugador del plantel.** Se carga en la planilla del partido y queda marcado como suplente, sin entrar a ningún plantel.',
          '**Jugador franquicia**: se marca en la planilla y no tiene tope. Esta edición hubo equipos con dos y equipos con uno. Lo que importa es que no quede desparejo, así que la planilla dice cuántos tiene cada lado y avisa cuando quedan distintos. No rechaza nada.',
          '**En playoffs** solo se puede pedir suplentes si el equipo tiene cinco jugadores o menos.',
        ],
      },
    ],
  },
  {
    id: 'planilla',
    title: 'Cargar una planilla de partido',
    blocks: [
      {
        kind: 'text',
        text: 'La planilla tiene cuatro partes y ninguna depende de las otras: podés cargar el resultado hoy y los goles mañana. Arriba te dice qué le falta.',
      },
      {
        kind: 'list',
        items: [
          '**Resultado**: los dos goles o ninguno. Después el panel te ofrece cómo terminó, y solo lo que el marcador permite: si quedó igualado, solo empate.',
          '**Quiénes jugaron**: el botón «Cargar el plantel» mete al equipo entero de una, y después saqués a los que no jugaron, que son siempre menos. Si el suplente no está en la liga, hay un campo para crearlo ahí mismo, y no entra a ningún plantel.',
          '**Goles**: si la planilla no dice quién lo hizo, cargá el gol igual y dejá el goleador sin registrar. El hueco publicado es mejor que un nombre inventado.',
          '**Arqueros**: tiros recibidos y goles recibidos. El porcentaje lo calcula el sistema. Si el equipo jugó con arquero prestado, el selector ofrece al resto de la liga y queda marcado como suplente.',
        ],
      },
      {
        kind: 'text',
        text: 'Si el partido todavía no tiene los dos equipos, no hay planilla que cargar: los equipos se definen en el fixture, y la pantalla te da el link para ir a esa fila.',
      },
    ],
  },
  {
    id: 'playoffs',
    title: 'Cómo se define el cuadro de playoffs',
    blocks: [
      {
        kind: 'text',
        text: 'El sistema conoce los dos cuadros de 2026 y deduce los cruces solo, a partir de las posiciones y de los resultados que ya están cargados.',
      },
      {
        kind: 'text',
        text: '**Masculino** (siete equipos, seis al playoff): el 6º juega con el 7º en el play-in y el ganador entra. Después el 3º juega con el ganador del play-in y el 4º con el 5º. El 1º y el 2º esperan en semifinales. Los dos perdedores de cuartos definen el 5º puesto; el perdedor del play-in queda 7º.',
      },
      {
        kind: 'text',
        text: '**Femenino** (cuatro equipos): derecho a semifinales, 1º con 4º y 2º con 3º, después tercer puesto y final.',
      },
      {
        kind: 'note',
        text: 'Lo único que el sistema **no** puede deducir: qué ganador de cuartos va a qué semifinal en el masculino. La liga nunca publicó ese cruce, así que esas dos filas hay que completarlas a mano en el fixture. Todo lo demás sale del resultado anterior.',
      },
    ],
  },
  {
    id: 'equipos',
    title: 'Equipos y planteles',
    blocks: [
      {
        kind: 'text',
        text: 'Cada equipo tiene su propia pantalla: entrás desde la lista y ahí están su nombre, su escudo y su plantel de la temporada.',
      },
      {
        kind: 'list',
        items: [
          '**Los equipos no se borran, se dan de baja.** Las temporadas que ya se jugaron los siguen nombrando, y el sistema no deja borrar algo que otra fila necesita.',
          '**La competencia se elige al crear el equipo y después no se cambia.** El fixture y los planteles apuntan al par equipo más competencia; mover un equipo dejaría huérfana cada fila que lo nombra.',
          '**El nombre de una persona se corrige en el plantel.** Las planillas cortan los nombres, y ahí se arregla para todo el sitio.',
          '**El número puede repetirse dentro de un equipo y puede faltar.** Las dos cosas pasan en las planillas reales de la liga, así que el sistema avisa y no las rechaza.',
          '**Una persona no puede estar dos veces en la misma competencia.** En la otra sí, con otro equipo y otro número.',
          '**El escudo se sube como archivo** y se publica al guardar el equipo.',
        ],
      },
    ],
  },
  {
    id: 'fixture',
    title: 'El fixture',
    blocks: [
      {
        kind: 'text',
        text: 'Acá se crean y se editan los partidos: fecha, hora, cabecera, los dos equipos y la instancia (fecha regular, play-in, cuartos, semifinal, tercer puesto, quinto puesto, final).',
      },
      {
        kind: 'list',
        items: [
          '**Solo la fecha regular suma puntos** en la tabla de posiciones.',
          '**Un partido puede quedar sin equipos y sin cabecera**, y se publica igual: es un horario reservado, y así están varias filas de la planilla original.',
          '**El resultado no se carga acá**, se carga en la planilla del partido.',
        ],
      },
    ],
  },
  {
    id: 'compartir',
    title: 'Compartir una tabla, un equipo o una foto',
    blocks: [
      {
        kind: 'text',
        text: 'Cada tabla, cada equipo, cada fecha del fixture y cada foto tienen un botón **Compartir**. Desde el teléfono abre el menú de compartir con una imagen ya armada con los colores de la liga; desde la computadora la descarga.',
      },
      {
        kind: 'text',
        text: 'Es una imagen y no un link por dos razones prácticas: WhatsApp se queda con la miniatura de un link durante días aunque el sitio cambie, e Instagram no tiene dónde poner un link. La imagen se dibuja en el momento, así que siempre está al día.',
      },
      {
        kind: 'text',
        text: 'Además cada página tiene su propia miniatura cuando pegás el link, y esas miniaturas **nunca dicen un resultado**: si dijeran quién va ganando, quedarían mintiendo hasta la próxima actualización.',
      },
    ],
  },
  {
    id: 'cuando-falla',
    title: 'Qué pasa si algo falla',
    blocks: [
      {
        kind: 'list',
        items: [
          '**La base se duerme** cuando nadie la usa por unos días, porque el plan es gratuito. El sitio sigue funcionando con la última copia guardada de la temporada y lo dice en pantalla. No se cae.',
          '**El panel sí necesita la base**, porque escribe. Si no responde, avisa por qué y lo que cargaste queda en pantalla para reintentar sin volver a tipear.',
          '**Los permisos son de la base, no de la pantalla.** Si tu rol no puede editar algo, el sistema no te esconde el botón: te dice que la base no lo permite y quién sí puede. Esconder un botón no es seguridad.',
        ],
      },
    ],
  },
  {
    id: 'roles',
    title: 'Quién puede hacer qué',
    blocks: [
      {
        kind: 'table',
        headings: ['Rol', 'Puede'],
        rows: [
          ['Administración general', 'Todo'],
          [
            'Gestión deportiva',
            'Equipos, planteles, fixture y planillas de partido',
          ],
          ['Comunicación', 'Textos, fotos, sponsors y canales de contacto'],
        ],
      },
      {
        kind: 'text',
        text: 'Este manual lo ve cualquiera que entre al panel, sin importar el rol.',
      },
    ],
  },
  {
    id: 'privacidad',
    title: 'Qué datos no se guardan, a propósito',
    blocks: [
      {
        kind: 'text',
        text: 'Nunca se guardan, ni se muestran, ni se registran en ninguna parte:',
      },
      {
        kind: 'list',
        items: [
          'número de documento',
          'fecha de nacimiento',
          'teléfono',
          'domicilio',
          'si alguien pagó o no',
        ],
      },
      {
        kind: 'text',
        text: 'De las personas se guarda **el nombre y nada más**. Las planillas de inscripción tienen todo lo anterior; el sistema no lo toma. Es una decisión del documento funcional de la liga y está puesta también en la base, no solo en la pantalla.',
      },
      {
        kind: 'text',
        text: 'Sobre las visitas: el contador propio de la liga no guarda ningún identificador de nadie. Además está Google Analytics, que la liga pidió sumar, y **ese sí identifica**. El panel lo dice con esas palabras para que nadie prometa lo contrario.',
      },
    ],
  },
  {
    id: 'preguntas',
    title: 'Preguntas que ya nos hicieron',
    blocks: [
      { kind: 'subtitle', text: '¿Por qué la final no muestra los equipos?' },
      {
        kind: 'text',
        text: 'Porque la semifinal no tiene resultado cargado. Cargalo y aparece sola.',
      },
      { kind: 'subtitle', text: 'Cargué algo y no lo veo en el sitio' },
      {
        kind: 'text',
        text: 'Refrescá con recarga completa. Si sigue igual, avisá: pasó una vez que el sitio leía una copia vieja en lugar de la base, y se arregló.',
      },
      { kind: 'subtitle', text: '¿Puedo borrar un equipo o un jugador?' },
      {
        kind: 'text',
        text: 'No, se dan de baja. Las temporadas jugadas los siguen nombrando.',
      },
      {
        kind: 'subtitle',
        text: 'Los goleadores no coinciden con lo que tengo',
      },
      {
        kind: 'text',
        text: 'Esa tabla es la que publicó la liga, transcripta, con su fecha arriba. Si el número está mal, está mal en la planilla original: se corrige ahí y se importa de nuevo.',
      },
      { kind: 'subtitle', text: '¿Anda si se cae internet en la pista?' },
      {
        kind: 'text',
        text: 'El sitio sí, con la última copia. El panel necesita conexión para guardar.',
      },
    ],
  },
]

/** The section a screen's «¿Cómo funciona?» link points at. */
export function manualLink(sectionId: string): string {
  return `/admin/manual#${sectionId}`
}
