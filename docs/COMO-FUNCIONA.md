# Cómo funciona el sistema de la Ushuaia Beer League

Esto es para cualquiera de la liga que quiera entender **qué hace el sistema, de
dónde saca cada número y por qué a veces dice "no sé"**. No hay una línea de
programación acá. Si sabés de hockey, alcanza.

Está en castellano por la misma razón que `ADMIN.md`: lo van a leer las personas
de la liga. Si algo no se entiende, está mal escrito: avisá y lo arreglamos.

- **El sitio**: https://ubl.com.ar
- **El panel de carga**: https://ubl.com.ar/admin/ (entra con Google, y solo
  quien esté autorizado)

---

## 1. La idea de fondo, en una frase

**El sistema no guarda tablas: guarda partidos.** Todo lo demás (las posiciones,
los goleadores, los arqueros, el cuadro de playoffs) se calcula cada vez que
alguien abre la página, a partir de los partidos cargados.

Eso tiene una consecuencia que conviene tener clara:

> Si cargás un resultado, **todas** las tablas cambian solas. Nadie tiene que
> actualizar la tabla de posiciones a mano, y nunca puede pasar que el resultado
> diga una cosa y la tabla diga otra.

Y tiene la consecuencia inversa, que es la que más preguntas genera:

> Si un partido no está cargado, **nada** lo puede adivinar. La final no sabe
> quién la juega hasta que la semifinal tenga resultado.

---

## 2. Cómo se cuentan los puntos

Estas son las reglas de **esta** liga, que no son las del hockey federado. El
sistema usa exactamente estas:

| Cómo terminó       | Puntos |
| ------------------ | ------ |
| Ganó en tiempo     | 2      |
| Ganó por penales   | 2      |
| Perdió por penales | 1      |
| Empató             | 1      |
| Perdió en tiempo   | 0      |

Ganar en tiempo y ganar por penales pagan lo mismo, **pero se guardan aparte**,
porque el primer desempate es **PGR**: los partidos ganados fuera de penales.

**Orden de la tabla**: puntos, después PGR, después diferencia de gol. No hay
tabla auxiliar entre los equipos empatados: si dos siguen iguales después de la
diferencia de gol, quedan como están.

Por eso en la tabla Rock Choppers puede estar arriba de Blanco con la misma
cantidad de puntos y peor diferencia de gol: tiene más PGR.

**Los empates existen.** Hay uno en la historia de la liga (Mujeres Birra del
Fuego 4 a 4 Mujeres Tipo Nine, 28 de junio de 2026), así que el sistema nunca
trata un empate como un error de carga.

---

## 3. Qué se muestra y de dónde sale cada cosa

| En el sitio               | De dónde sale                                                  |
| ------------------------- | -------------------------------------------------------------- |
| Fixture                   | Los partidos cargados, con su fecha, hora y cabecera           |
| Posiciones                | Se calcula de los resultados                                   |
| Goleadores y arqueras/os  | **Los totales que publicó la liga**, no calculados (ver abajo) |
| Playoffs                  | Se deduce de las posiciones y de los resultados del cuadro     |
| Equipos y planteles       | Lo que se carga en el panel                                    |
| Fotos, sponsors, contacto | Lo que se carga en el panel                                    |

### Lo de goleadores y arqueros merece una aclaración

Las planillas de la liga traen **totales por jugador de toda la temporada**, no
gol por gol. Como no hay un registro de cada gol individual, el sistema **no
puede** calcular esa tabla: la transcribe tal como la liga la publicó, y lo dice
arriba de la tabla con la fecha ("Totales publicados por la liga el …").

Cuando se empiecen a cargar los goles partido por partido desde el panel, esa
tabla va a poder calcularse igual que las posiciones. Hoy conviven las dos cosas
y el sitio avisa cuál está mirando.

**Porcentaje de atajadas**: `(tiros recibidos − goles recibidos) / tiros
recibidos`. Se calcula al mostrarlo, nunca se guarda. Un arquero que no recibió
tiros no tiene 100%: no tiene porcentaje, y se muestra un guion.

---

## 4. Por qué a veces dice "Por determinar" o "Sin registrar"

Esto es a propósito y es la decisión más importante del sistema:

> **Un dato que la liga no tiene, no se inventa. Se muestra el hueco.**

Ejemplos reales que están en el sitio hoy:

- **"Sin resultado"**: el partido no se jugó, o se jugó y nadie cargó el
  marcador. No es 0 a 0. Un 0 a 0 es un resultado de verdad.
- **"Por determinar" / "Sin registrar"** en una final: la semifinal todavía no
  tiene resultado cargado, así que el sistema no sabe quién ganó. Cargá la semi
  y la final se completa sola.
- **Un asterisco al lado de un nombre** en goleadores o arqueros: ese nombre es
  el que imprime la planilla, que a veces lo corta ("Beltrami Ramir"), y nadie
  lo confirmó todavía.
- **"Sup"**: esa línea es de un suplente, alguien que jugó ese partido sin ser
  del plantel.
- **Una fecha de la primera jornada con hora y cabecera y sin equipos**: la
  planilla original está así. Se publica como está en vez de borrarla.

Si algo de esto molesta, la solución nunca es tapar el hueco: es cargar el dato
que falta.

---

## 5. Las reglas raras de esta liga que el sistema ya conoce

- **Dos partidos a la misma hora**, en dos cabeceras: Bahía y Poli. El fixture
  muestra los dos en el mismo horario. Ningún cálculo asume un partido por hora.
- **No hay minutos de penalización.** La disciplina de esta liga es tiro penal o
  irse del partido, así que no existe ninguna acumulación de sanciones.
- **Los planteles son mixtos**: las mujeres juegan en la Beer League. Y la
  Women's Beer League es un torneo aparte, cuyos cuatro equipos toman jugadoras
  de varios equipos de la Beer League. Por eso **una misma persona puede estar en
  dos competencias, con equipos distintos y hasta con número distinto**, y eso
  no es un error de carga.
- **Un suplente no es jugador del plantel.** Se carga en la planilla del partido
  y queda marcado como suplente; no entra a ningún plantel.
- **Jugador franquicia**: se marca en la planilla y **no tiene tope**. Esta
  edición hubo equipos con dos y equipos con uno; lo que interesa es que no
  quede desparejo, así que la planilla te dice cuántos tiene cada lado y avisa
  cuando quedan distintos. No rechaza nada.
- **En playoffs** solo se puede pedir suplentes si el equipo tiene cinco
  jugadores o menos.

---

## 6. Cómo se define el cuadro de playoffs

El sistema conoce los dos cuadros de 2026 y deduce los cruces solo:

**Masculino** (siete equipos, seis al playoff): el 6º juega con el 7º en el
play-in y el ganador entra. Después el 3º juega con el ganador del play-in y el
4º con el 5º. El 1º y el 2º esperan en semifinales. Los dos perdedores de
cuartos definen el 5º puesto; el perdedor del play-in queda 7º.

**Femenino** (cuatro equipos): derecho a semifinales, 1º con 4º y 2º con 3º,
después tercer puesto y final.

Lo que el sistema **no** deduce: qué ganador de cuartos va a qué semifinal en el
masculino. La liga nunca publicó ese cruce, así que cuando se carguen las semis
hay que decir qué equipos las jugaron (en Fixture, campos Local y Visitante).
Todo lo demás sale solo del resultado anterior.

---

## 7. Qué se puede compartir, y cómo se ve

Cada tabla, cada equipo, cada fecha del fixture y cada foto tienen un botón
**Compartir**. Desde el teléfono abre el menú de compartir del sistema
(WhatsApp, Instagram) con **una imagen ya armada** con los colores de la liga;
desde la computadora te la descarga.

Se hizo así por dos razones prácticas: WhatsApp se queda con la miniatura de un
link durante días aunque el sitio cambie, e Instagram no tiene dónde poner un
link. Una imagen siempre está al día porque se dibuja en el momento con lo que
hay en pantalla.

Además, cada página del sitio tiene su propia miniatura cuando pegás el link, y
esas miniaturas **nunca dicen un resultado**: si dijeran quién va ganando,
quedarían mintiendo hasta la próxima actualización.

---

## 8. Qué pasa si algo se cae

- **La base de datos del sistema se duerme** cuando nadie la usa por unos días
  (es el plan gratuito). Cuando eso pasa, el sitio **sigue funcionando** con la
  última copia guardada de la temporada, y lo dice: "Estás viendo la última
  copia guardada de la temporada". No se cae y no muestra errores.
- **El panel sí necesita la base**, porque escribe. Si no responde, avisa por
  qué y lo que cargaste sigue en pantalla para reintentar sin volver a tipear.
- **Los permisos son de la base, no de la pantalla.** Si tu rol no puede editar
  algo, el sistema no te esconde el botón: te dice que la base no lo permite y
  quién sí puede. Esconder un botón no es seguridad.

---

## 9. Quién puede hacer qué

Hay tres roles, y se asignan en el panel:

| Rol                    | Puede                                              |
| ---------------------- | -------------------------------------------------- |
| Administración general | Todo                                               |
| Gestión deportiva      | Equipos, planteles, fixture y planillas de partido |
| Comunicación           | Textos, fotos, sponsors y canales de contacto      |

---

## 10. Qué datos NO guarda el sistema, a propósito

Nunca se guardan, ni se muestran, ni se registran en ninguna parte:

- número de documento
- fecha de nacimiento
- teléfono
- domicilio
- si alguien pagó o no

De las personas se guarda **el nombre y nada más**. Las planillas de inscripción
tienen todo lo anterior; el sistema no lo toma. Es una decisión del documento
funcional de la liga y está puesta también en la base, no solo en la pantalla.

**Sobre las visitas**: el sitio tiene dos contadores. El propio de la liga no
guarda ningún identificador de nadie. Además está Google Analytics, que la liga
pidió sumar, y **ese sí identifica**: el panel y el manual lo dicen con esas
palabras para que nadie prometa lo contrario.

---

## 11. Lo que hoy falta (y depende de la liga, no del sistema)

- **Los resultados del 8 de agosto**: cuartos y semifinales de las dos
  competencias. Sin eso, las finales del 15 no pueden mostrar los equipos.
- **Los colores** de algunos equipos masculinos.
- **El escudo nuevo de Zambirreras** (se sube desde el panel).
- **Preguntas abiertas del reglamento**: qué significa exactamente ser jugador
  franquicia, el costo de suplentes después de junio, y si el partido por el 5º
  puesto se juega todos los años. Están anotadas y el sistema no inventa una
  respuesta mientras tanto.

---

## 12. Preguntas que ya nos hicieron

**¿Por qué la final no muestra los equipos?**
Porque la semifinal no tiene resultado cargado. Cargalo y aparece sola.

**Cargué algo en el panel y no lo veo en el sitio.**
Refrescá con recarga completa. Si sigue igual, avisá: pasó una vez que el sitio
estaba leyendo una copia vieja en lugar de la base, y se arregló.

**¿Puedo borrar un equipo o un jugador?**
No, se dan de baja. Las temporadas que ya se jugaron los siguen nombrando y la
base no deja borrar algo que otra fila necesita.

**Los goleadores no coinciden con lo que yo tengo.**
Esa tabla es la que publicó la liga, transcripta, con su fecha arriba. Si el
número está mal, está mal en la planilla original: se corrige ahí y se importa
de nuevo.

**¿El sitio anda si se cae internet en la pista?**
El sitio sí, con la última copia. El panel necesita conexión para guardar.
