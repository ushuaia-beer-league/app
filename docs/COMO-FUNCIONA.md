# Cómo funciona el sistema de la Ushuaia Beer League

<!-- Generado por scripts/build-manual.ts desde src/admin/manual.ts.
No editar a mano: el panel muestra el mismo texto en /admin/manual,
y un test falla si este archivo deja de coincidir. -->

Esto explica **qué hace el sistema, de dónde saca cada número y por qué a veces dice que no sabe**. No hay nada de programación acá: si sabés de hockey, alcanza.

Cada pantalla del panel tiene un link «¿Cómo funciona?» que trae directo a la sección que le corresponde. Si algo no se entiende, está mal escrito: avisá y lo arreglamos.

---

## La idea de fondo, en una frase

El sistema **no guarda tablas: guarda partidos**. Las posiciones, los goleadores, los arqueros y el cuadro de playoffs se calculan cada vez que alguien abre la página, a partir de los partidos cargados.

> Si cargás un resultado, **todas** las tablas cambian solas. Nadie actualiza la tabla de posiciones a mano, y no puede pasar que el resultado diga una cosa y la tabla diga otra.

> Y al revés: si un partido no está cargado, **nada** lo puede adivinar. La final no sabe quién la juega hasta que la semifinal tenga resultado.

---

## Cómo se cuentan los puntos

Estas son las reglas de **esta** liga, que no son las del hockey federado. El sistema usa exactamente estas:

| Cómo terminó | Puntos |
| --- | --- |
| Ganó en tiempo | 2 |
| Ganó por penales | 2 |
| Perdió por penales | 1 |
| Empató | 1 |
| Perdió en tiempo | 0 |

Ganar en tiempo y ganar por penales pagan lo mismo, **pero se guardan aparte**, porque el primer desempate es **PGR**: los partidos ganados fuera de penales.

El orden de la tabla es: puntos, después PGR, después diferencia de gol. No hay tabla auxiliar entre los equipos empatados. Por eso Rock Choppers puede estar arriba de Blanco con los mismos puntos y peor diferencia de gol: tiene más PGR.

**Los empates existen.** Hay uno en la historia de la liga (Mujeres Birra del Fuego 4 a 4 Mujeres Tipo Nine, 28 de junio de 2026), así que el sistema nunca trata un empate como un error de carga.

---

## Qué se muestra y de dónde sale

| En el sitio | De dónde sale |
| --- | --- |
| Fixture | Los partidos cargados, con fecha, hora y cabecera |
| Posiciones | Se calcula de los resultados |
| Goleadores y arqueras/os | Los totales que publicó la liga, no calculados |
| Playoffs | Se deduce de las posiciones y de los resultados |
| Equipos y planteles | Lo que se carga en el panel |
| Fotos, sponsors, contacto | Lo que se carga en el panel |

### Lo de goleadores y arqueros

Las planillas de la liga traen **totales por jugador de toda la temporada**, no gol por gol. Como no hay registro de cada gol, esa tabla no se puede calcular: se transcribe tal como la liga la publicó, y lo dice arriba con la fecha.

A esos totales **se les suma cada planilla que se carga en el sitio**, y arriba de la tabla dice cuántos partidos se sumaron: «Totales publicados por la liga el 4 de julio, más 3 partidos cargados en el sitio desde entonces». Es una sola tabla.

> Solo se suman los partidos **posteriores** a la fecha de publicación. Un partido de junio ya está dentro de esos totales, así que sumarlo contaría los goles dos veces. Por eso, si cargás una planilla de la fase regular para completar el historial, no infla a nadie: entra cuando se reemplace la tabla publicada, no antes.

El **porcentaje de atajadas** es (tiros recibidos menos goles recibidos) dividido tiros recibidos. Se calcula al mostrarlo y nunca se guarda. Un arquero que no recibió tiros no tiene 100%: no tiene porcentaje, y se muestra un guion.

---

## Por qué a veces dice «Por determinar» o «Sin registrar»

> Un dato que la liga no tiene **no se inventa**. Se muestra el hueco.

Lo que significa cada uno:

- **Sin resultado**: el partido no se jugó, o se jugó y nadie cargó el marcador. No es 0 a 0. Un 0 a 0 es un resultado de verdad.
- **Por determinar** o **Sin registrar** en una final: la semifinal todavía no tiene resultado cargado, así que el sistema no sabe quién ganó. Cargá la semi y la final se completa sola.
- **Un asterisco** al lado de un nombre: ese nombre es el que imprime la planilla, que a veces lo corta («Beltrami Ramir»), y nadie lo confirmó todavía.
- **Sup**: esa línea es de un suplente, alguien que jugó ese partido sin ser del plantel.
- **Una fecha con hora y cabecera y sin equipos**: la planilla original está así. Se publica como está en vez de borrarla.

Si algo de esto molesta, la solución nunca es tapar el hueco: es cargar el dato que falta.

---

## Las reglas propias de esta liga que el sistema ya conoce

- **Dos partidos a la misma hora**, en Bahía y en Poli. Ningún cálculo asume un partido por horario.
- **No hay minutos de penalización.** La disciplina es tiro penal o irse del partido, así que no existe acumulación de sanciones.
- **Los planteles son mixtos**: las mujeres juegan en la Beer League. La Women’s Beer League es un torneo aparte, y sus cuatro equipos toman jugadoras de varios equipos de la Beer League. Por eso una misma persona puede estar en las dos competencias, con equipos distintos y hasta número distinto, y eso no es un error.
- **Un suplente no es jugador del plantel.** Se carga en la planilla del partido y queda marcado como suplente, sin entrar a ningún plantel.
- **Jugador franquicia**: se marca en la planilla y no tiene tope. Esta edición hubo equipos con dos y equipos con uno. Lo que importa es que no quede desparejo, así que la planilla dice cuántos tiene cada lado y avisa cuando quedan distintos. No rechaza nada.
- **En playoffs** solo se puede pedir suplentes si el equipo tiene cinco jugadores o menos.

---

## Cargar una planilla de partido

La planilla tiene cuatro partes y ninguna depende de las otras: podés cargar el resultado hoy y los goles mañana. Arriba te dice qué le falta.

- **Resultado**: los dos goles o ninguno. Después el panel te ofrece cómo terminó, y solo lo que el marcador permite: si quedó igualado, solo empate.
- **Quiénes jugaron**: el botón «Cargar el plantel» mete al equipo entero de una, y después saqués a los que no jugaron, que son siempre menos. Si el suplente no está en la liga, hay un campo para crearlo ahí mismo, y no entra a ningún plantel.
- **Goles**: si la planilla no dice quién lo hizo, cargá el gol igual y dejá el goleador sin registrar. El hueco publicado es mejor que un nombre inventado.
- **Arqueros**: tiros recibidos y goles recibidos. El porcentaje lo calcula el sistema. Si el equipo jugó con arquero prestado, el selector ofrece al resto de la liga y queda marcado como suplente.

Si el partido todavía no tiene los dos equipos, no hay planilla que cargar: los equipos se definen en el fixture, y la pantalla te da el link para ir a esa fila.

---

## Cómo se define el cuadro de playoffs

El sistema conoce los dos cuadros de 2026 y deduce los cruces solo, a partir de las posiciones y de los resultados que ya están cargados.

**Masculino** (siete equipos, seis al playoff): el 6º juega con el 7º en el play-in y el ganador entra. Después el 3º juega con el ganador del play-in y el 4º con el 5º. El 1º y el 2º esperan en semifinales. Los dos perdedores de cuartos definen el 5º puesto; el perdedor del play-in queda 7º.

**Femenino** (cuatro equipos): derecho a semifinales, 1º con 4º y 2º con 3º, después tercer puesto y final.

> Lo único que el sistema **no** puede deducir: qué ganador de cuartos va a qué semifinal en el masculino. La liga nunca publicó ese cruce, así que esas dos filas hay que completarlas a mano en el fixture. Todo lo demás sale del resultado anterior.

### Un triangular

Cuando un puesto se define entre tres equipos, como el quinto puesto de 2026 (tres partidos de 15 minutos), se cargan **tres filas** en el fixture: misma fecha, misma hora, misma cabecera y misma instancia, cada una con sus dos equipos. Varios partidos en un mismo horario y cabecera se pueden; lo único que el sistema rechaza es el mismo cruce dos veces.

> Lo que el sistema **no** hace en ese caso es decir quién salió quinto: con tres equipos hace falta un criterio de desempate (puntos, diferencia de gol, quién le ganó a quién) y la liga no lo definió. Antes que coronar a alguien con una regla inventada, no dice nada. Si nos pasan el criterio, lo calculamos.

---

## Equipos y planteles

Cada equipo tiene su propia pantalla: entrás desde la lista y ahí están su nombre, su escudo y su plantel de la temporada.

- **Los equipos no se borran, se dan de baja.** Las temporadas que ya se jugaron los siguen nombrando, y el sistema no deja borrar algo que otra fila necesita.
- **La competencia se elige al crear el equipo y después no se cambia.** El fixture y los planteles apuntan al par equipo más competencia; mover un equipo dejaría huérfana cada fila que lo nombra.
- **El nombre de una persona se corrige en el plantel.** Las planillas cortan los nombres, y ahí se arregla para todo el sitio.
- **El número puede repetirse dentro de un equipo y puede faltar.** Las dos cosas pasan en las planillas reales de la liga, así que el sistema avisa y no las rechaza.
- **Una persona no puede estar dos veces en la misma competencia.** En la otra sí, con otro equipo y otro número.
- **El escudo se sube como archivo** y se publica al guardar el equipo.

---

## El fixture

Acá se crean y se editan los partidos: fecha, hora, cabecera, los dos equipos y la instancia (fecha regular, play-in, cuartos, semifinal, tercer puesto, quinto puesto, final).

- **Solo la fecha regular suma puntos** en la tabla de posiciones.
- **Un partido puede quedar sin equipos y sin cabecera**, y se publica igual: es un horario reservado, y así están varias filas de la planilla original.
- **El resultado no se carga acá**, se carga en la planilla del partido.

---

## Compartir una tabla, un equipo o una foto

Cada tabla, cada equipo, cada fecha del fixture y cada foto tienen un botón **Compartir**. Desde el teléfono abre el menú de compartir con una imagen ya armada con los colores de la liga; desde la computadora la descarga.

Es una imagen y no un link por dos razones prácticas: WhatsApp se queda con la miniatura de un link durante días aunque el sitio cambie, e Instagram no tiene dónde poner un link. La imagen se dibuja en el momento, así que siempre está al día.

Además cada página tiene su propia miniatura cuando pegás el link, y esas miniaturas **nunca dicen un resultado**: si dijeran quién va ganando, quedarían mintiendo hasta la próxima actualización.

---

## Cuando el sitio se actualiza mientras lo tenés abierto

El sitio es una sola página: si lo dejás abierto, el navegador no vuelve a pedir nada y podés estar viendo la versión de ayer sin darte cuenta. Pasó, y varias veces: se arreglaba algo, se publicaba, y del otro lado seguía apareciendo el problema viejo.

Ahora el propio sitio se da cuenta. Cuando hay una versión nueva aparece abajo un aviso que dice **«Hay una versión nueva del sitio»** con un botón **Actualizar**. Lo tocás y listo.

> Si algo que te dijimos que arreglamos no lo ves, y no aparece ese aviso, recargá igual (en el celular: mantené apretado el botón de recargar y elegí la recarga completa). Y si después de eso sigue igual, ahí sí es un problema nuestro: mandá captura.

---

## Qué pasa si algo falla

- **La base se duerme** cuando nadie la usa por unos días, porque el plan es gratuito. El sitio sigue funcionando con la última copia guardada de la temporada y lo dice en pantalla. No se cae.
- **El panel sí necesita la base**, porque escribe. Si no responde, avisa por qué y lo que cargaste queda en pantalla para reintentar sin volver a tipear.
- **Los permisos son de la base, no de la pantalla.** Si tu rol no puede editar algo, el sistema no te esconde el botón: te dice que la base no lo permite y quién sí puede. Esconder un botón no es seguridad.

---

## Quién puede hacer qué

| Rol | Puede |
| --- | --- |
| Administración general | Todo |
| Gestión deportiva | Equipos, planteles, fixture y planillas de partido |
| Comunicación | Textos, fotos, sponsors y canales de contacto |

Este manual lo ve cualquiera que entre al panel, sin importar el rol.

---

## Qué datos no se guardan, a propósito

Nunca se guardan, ni se muestran, ni se registran en ninguna parte:

- número de documento
- fecha de nacimiento
- teléfono
- domicilio
- si alguien pagó o no

De las personas se guarda **el nombre y nada más**. Las planillas de inscripción tienen todo lo anterior; el sistema no lo toma. Es una decisión del documento funcional de la liga y está puesta también en la base, no solo en la pantalla.

Sobre las visitas: el contador propio de la liga no guarda ningún identificador de nadie. Además está Google Analytics, que la liga pidió sumar, y **ese sí identifica**. El panel lo dice con esas palabras para que nadie prometa lo contrario.

---

## Preguntas que ya nos hicieron

### ¿Por qué la final no muestra los equipos?

Porque la semifinal no tiene resultado cargado. Cargalo y aparece sola.

### Cargué algo y no lo veo en el sitio

Refrescá con recarga completa. Si sigue igual, avisá: pasó una vez que el sitio leía una copia vieja en lugar de la base, y se arregló.

### ¿Puedo borrar un equipo o un jugador?

No, se dan de baja. Las temporadas jugadas los siguen nombrando.

### Los goleadores no coinciden con lo que tengo

Esa tabla es la que publicó la liga, transcripta, con su fecha arriba. Si el número está mal, está mal en la planilla original: se corrige ahí y se importa de nuevo.

### ¿Anda si se cae internet en la pista?

El sitio sí, con la última copia. El panel necesita conexión para guardar.
