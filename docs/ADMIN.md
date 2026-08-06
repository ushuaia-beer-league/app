# Cómo se administra la Ushuaia Beer League

Este archivo es la excepción al idioma del repositorio: todo lo demás está en
inglés, y esto está en castellano porque lo van a leer las personas que
administran la liga. Un manual que su lector no puede leer no es un manual.

Dos páginas. Si algo de acá no alcanza, está mal escrito: avisá y lo arreglamos.

---

## Las dos direcciones

- **El sitio público**: https://ushuaia-beer-league.github.io/app/
- **El panel**: https://ushuaia-beer-league.github.io/app/admin/

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
| Comunicación           | Fotos y sponsors                            |

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

`/app/admin/visitas` dice si alguien está usando el sitio, que es lo único que
GitHub Pages no cuenta por su cuenta. Se guarda qué pantalla se abrió y en qué
día, nada más: ninguna dirección, ningún navegador, nada atribuible a una
persona. Por eso el sitio no le pide permiso a nadie ni muestra ningún cartel de
cookies.

Los números son indicativos, no auditados: el contador es una función que
cualquiera puede llamar, a quien tenga el navegador bloqueando pedidos no se lo
cuenta, y el panel se cuenta a sí mismo. Sirven para saber si la liga entra, no
para medir con precisión.

Las pueden ver los tres roles. Un visitante no, y no es que el panel se lo
esconda: la base se lo niega.

## A quién pedirle qué

- **Una cuenta nueva para administrar**: a quien tenga administración general.
- **Que la base despierte**: se despierta sola al entrar al panel, puede tardar
  unos segundos la primera vez.
- **Cambiar algo que el panel no deja cambiar**: probablemente sea a propósito.
  Preguntá antes de buscarle la vuelta.
