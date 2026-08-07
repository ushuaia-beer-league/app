# Cómo se administra la Ushuaia Beer League

Este archivo es la excepción al idioma del repositorio: todo lo demás está en
inglés, y esto está en castellano porque lo van a leer las personas que
administran la liga. Un manual que su lector no puede leer no es un manual.

Dos páginas. Si algo de acá no alcanza, está mal escrito: avisá y lo arreglamos.

---

## Las dos direcciones

- **El sitio público**: https://ubl.com.ar
- **El panel**: https://ubl.com.ar/admin/

El sitio público no necesita nada de nadie: está siempre disponible y no tiene
contraseña. El panel pide ingresar con Google.

## Ingresar

Se entra con la cuenta de Google de cada persona. **No hay una contraseña
compartida**, y eso es a propósito: cada uno entra con lo suyo y el sistema sabe
quién cargó qué.

Si entrás con una cuenta que la liga no reconoce, el panel te lo va a decir por
su nombre y no te va a dejar pasar. En ese caso pedile a quien tenga el rol de
administración general que te agregue.

La dirección `ushuaiabl@gmail.com` está reconocida siempre, incluso si la lista
de administradores está vacía. Eso existe para que la liga nunca se quede afuera
de su propio sistema.

## Los tres roles

| Rol                    | Qué puede cargar y modificar                |
| ---------------------- | ------------------------------------------- |
| Administración general | Todo, incluida la lista de administradores  |
| Gestión deportiva      | Equipos, fixture, resultados y estadísticas |
| Comunicación           | Fotos, sponsors, textos y contacto          |

Estos permisos **no son botones escondidos**: están escritos en la base de
datos. Si alguien de comunicación intenta cargar un resultado, la base lo
rechaza, no importa desde dónde lo intente. Y al revés: gestión deportiva no
puede tocar los sponsors.

## Cargar lo que pasó en una fecha

El panel está organizado **por partido**, no por tabla. Abrís Partidos y ves la
lista completa de la temporada, y cada partido dice qué le falta:

- **Falta el resultado** — nadie cargó los goles todavía.
- **Falta quiénes jugaron** — hay resultado, falta la lista de jugadores.
- **Faltan N de los M goles** — hay resultado y hay algunos goles cargados, pero
  no todos.
- **Faltan los arqueros** — falta la línea de arquero: tiros recibidos y goles
  recibidos.
- **Hay más goles cargados que los del resultado** — esto no es un faltante, es
  una contradicción: o el resultado o los goles están mal. Estos partidos
  aparecen primero.
- **Completo** — no le falta nada.

Los partidos que necesitan algo aparecen arriba. Lo que está **en gris** no lo
puede resolver quien carga: son los equipos de una fila que la planilla dejó en
blanco, o cruces de playoffs que todavía dependen de un resultado. Eso lo define
la organización, no el panel.

## Lo que el sistema no va a hacer nunca

Vale saberlo porque explica varias decisiones que de otro modo parecen
incómodas:

- **No inventa datos.** Si la planilla no dice quién marcó un gol, el gol se
  carga sin goleador y en el sitio aparece el hueco. Preferimos un hueco visible
  a un nombre inventado.
- **No guarda totales.** Los puntos, las posiciones, los goleadores y el
  porcentaje de atajadas se calculan cada vez que alguien mira la página, a
  partir de los partidos. Por eso no hay ninguna pantalla para "corregir la
  tabla": se corrige el partido y la tabla se acomoda sola.
- **No hay minutos de penalización.** El reglamento de la liga no los usa: la
  sanción es un penal o irse del partido. No hay campo para cargarlos.
- **Los empates existen.** El femenino tiene uno registrado (4-4). El sistema no
  los trata como un error.
- **Una victoria vale 2 puntos** y una derrota en penales vale 1. El PGR
  (ganados fuera de penales) es el primer criterio de desempate, después la
  diferencia de gol. No hay tabla auxiliar entre equipos empatados.

## Fotos y sponsors

Se cargan desde el panel, nunca desde el código. Subís el logo o la foto,
escribís el nombre o el epígrafe, los ordenás, y ya está publicado. No hace falta
que nadie toque el sitio.

Un sponsor sin logo se publica igual, con su nombre. Una galería vacía dice que
está vacía.

## Textos del sitio

En `/admin/textos` se pueden cambiar los cinco bloques de la Historia. Lo
pueden hacer **comunicación y administración general**, igual que fotos y
sponsors, y el permiso está en la base, no en el botón.

Cada bloque aparece **ya cargado con el texto vigente**, así se edita encima de
lo que hay en vez de tipear de cero (pedido de los operadores). Se edita **por
idioma**: castellano, inglés y portugués tienen cada uno su pestaña. Un idioma
que nadie editó sigue mostrando la traducción original, así que cambiar el
castellano nunca deja el inglés en blanco. Los párrafos se separan
con una línea en blanco. Los diez mandamientos no aparecen ahí a propósito: son
el reglamento y no se editan desde ningún panel.

## Contacto

En `/admin/contacto` se cargan los canales que muestra la página de
contacto: el correo, el Instagram, lo que la liga quiera publicar. Lo pueden
hacer **comunicación y administración general**. La dirección tiene que empezar
con `https://` o `mailto:` — la base rechaza cualquier otra cosa, no importa
desde dónde se intente. Un canal desactivado deja de mostrarse pero no se
borra.

## Escudos de equipos

En Equipos, al editar un equipo hay un botón para **subir el escudo como
archivo**. Subirlo lo deja preparado; **Guardar es lo que publica**. Lo puede
hacer gestión deportiva (y administración general), porque el escudo es parte
del equipo. Mientras un equipo no tenga escudo subido, el sitio muestra el
dibujo que mandó la liga, y ese mismo dibujo es el que aparece si la base está
dormida.

## Cuando la base está dormida

El servicio de base de datos que usamos es gratuito y **se pausa después de una
semana sin actividad**. La liga juega cada dos a cuatro semanas, así que va a
pasar.

Cuando pasa, el sitio público sigue funcionando: muestra la última copia
guardada de la temporada y lo dice con un cartel. Lo que no funciona hasta que
la base despierta es el panel. Hay una tarea automática que la despierta todos
los lunes justamente para que esto no pase el día que alguien se siente a
cargar.

## Lo que la liga todavía nos debe

Estas son preguntas abiertas, no errores del sistema. Cada una está marcada en
los datos y se resuelve contestándola:

1. **Romero José** y **Baeza Juan** figuran como goleadores y no están en ningún
   plantel: o son otras personas, o faltan cargarlos.
2. **El partido del 23 de mayo a las 21:30 en Bahía** no tiene equipos en la
   planilla. ¿Se jugó? ¿Quiénes?
3. **La fila de Blanco en la tabla publicada dice 1 derrota** y los resultados
   dan 2. Los puntos y los goles cierran, así que parece un error de tipeo en la
   planilla; el sistema usa lo que dan los resultados.
4. **El número 28 lo usan dos jugadores** en Hantachoppers, y una persona no
   tiene número. El sistema lo guarda igual y solo lo avisa, porque un número
   repetido puede ser real; lo que falta es que la liga diga si en este caso lo
   es o si es un error de carga.
5. **Los colores de las casacas nuevas del femenino.** En los playoffs se
   estrenan las camisetas con sponsors propios. Los sponsors ya están resueltos y
   lo resolvieron los escudos: la camiseta de Turbeerras dice **BROLAS** y la de
   Moby Drink dice **VÉRTICE CONSTRUCCIONES**, que es exactamente lo que estaba
   cargado, así que Frozen Queens es Drake y Zambirreras es Táun. Lo que falta es
   **el color de cada casaca nueva y la fecha en que se estrenan**. Los colores no
   se pueden sacar de los escudos, están todos dibujados sobre negro.

Ya contestado, el 6 de agosto de 2026: **qué equipo del femenino jugó qué
fixture**. Turbeerras es el que el fixture llamó Birra del Fuego, Frozen Queens el
que llamó Sucucho, Zambirreras el que llamó Zhockey y Moby Drinks el que llamó Tipo
Nine. Los dos últimos van al revés de lo que sugerían los goles, y manda la liga:
los planteles quedaron corregidos. Los nombres reales, los sponsors nuevos (Brolas,
Drake, Táun, Vertice) y el color de cada equipo también están cargados.

Ya contestado, el 4 de agosto de 2026: **las nueve personas que la planilla
escribía de dos formas**. Quedaron Velazquez, Cotignola, Tabares, Badaracco,
Cavalleri, Nardi Cristina, Muñoz Lauta, Carbone Ana y Sueldo Fito. Cinco de ellas
figuran ahora con el nombre que es suyo, y diez líneas de las tablas publicadas
dejaron de estar sueltas y quedaron pegadas a su persona.

Una aclaración por si aparece la duda: en las tablas de goleadores y arqueros
sigue figurando el nombre **como lo imprimió la planilla**, aunque esté cortado
("Beltrami Ramir"). Eso es a propósito, es la prueba de lo que decía la fuente. El
asterisco es lo que avisa que ese nombre no está confirmado.

## Visitas

`/admin/visitas` dice si alguien está usando el sitio, que es lo único que
GitHub Pages no cuenta por su cuenta. Contesta cinco cosas:

- **Qué pantalla se abrió y qué día**, que es el contador viejo.
- **Cuántos navegadores entraron por primera vez.**
- **Cuántas veces alguien que ya había entrado volvió otro día.**
- **Desde qué aparato**, teléfono o computadora.
- **Por dónde llegaron** (directo o WhatsApp, buscadores, redes, otro sitio) **y
  en qué página entraron.**

Lo que la base guarda son contadores: ninguna dirección, ningún navegador, nada
que se pueda atribuir a una persona.

Vale explicar cómo se sabe quién vuelve sin guardar nada de nadie, porque lo
normal es lo contrario. Lo habitual es darle un número a cada navegador y
guardarlo, y desde ese momento la tabla de estadísticas es una tabla de gente.
Acá el que decide es el navegador de quien entra: guarda **una sola fecha** en su
propio equipo, la compara con hoy y manda una palabra, «primera vez» o «volvió».
Esa fecha no viaja a ninguna parte. Si alguien abre el almacenamiento de su
navegador, lo que va a encontrar es una fecha, y una fecha no se puede cruzar con
nada.

**Ojo, esto cambió.** Todo lo de arriba sigue siendo cierto para estos contadores,
pero el sitio ahora **también tiene Google Analytics**, que la liga decidió sumar el
6 de agosto de 2026. Analytics sí identifica: le pone un identificador al navegador
de cada visitante y le manda los datos a Google, con país, ciudad, dispositivo y
recorrido. Eso se mira en Google Analytics, no en este panel.

Antes esta página decía que el sitio no guardaba nada atribuible a una persona y que
por eso no pedía permiso a nadie. Con Analytics adentro **eso dejó de ser cierto para
el sitio**, y queda escrito acá en vez de borrado, porque una promesa que se apaga en
silencio es peor que una que se corrige. Si algún día el sitio apunta a Europa, el
cartel de cookies pasa a ser obligatorio y esto es lo primero que hay que revisar.

**Cuidado con una lectura.** «Volvió» se cuenta una vez por día: alguien que entra
cinco días distintos suma cinco. Dice cada cuánto vuelve la gente, no cuánta
vuelve. La pantalla lo aclara al lado del número.

No hay país ni ciudad, y también es a propósito: eso necesita un servicio que lea
la dirección de cada visitante, que cuesta plata y cuesta privacidad. Se eligió
mantenerlo gratis y sin datos de nadie.

Los números son indicativos, no auditados: los contadores son funciones que
cualquiera puede llamar, a quien tenga el navegador bloqueando pedidos no se lo
cuenta, una persona con teléfono y computadora cuenta como dos, y el panel se
cuenta a sí mismo. Sirven para saber si la liga entra, no para medir con
precisión.

Las pueden ver los tres roles. Un visitante no, y no es que el panel se lo
esconda: la base se lo niega.

## A quién pedirle qué

- **Una cuenta nueva para administrar**: a quien tenga administración general.
- **Que la base despierte**: se despierta sola al entrar al panel, puede tardar
  unos segundos la primera vez.
- **Cambiar algo que el panel no deja cambiar**: probablemente sea a propósito.
  Preguntá antes de buscarle la vuelta.
