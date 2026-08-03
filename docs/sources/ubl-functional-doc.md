# **Web Ushuaia Beer League**

## **Documento funcional inicial – Versión 0.1**

### **1\. Objetivo**

Desarrollar una plataforma web para centralizar la información deportiva e institucional de la Ushuaia Beer League.

La primera versión deberá permitir:

* Mostrar información actualizada de la liga.  
* Consultar equipos, fixture, resultados, posiciones y estadísticas.  
* Publicar noticias, fotografías y sponsors.  
* Administrar toda esa información desde un panel seguro.  
* Conservar los datos de cada temporada.

El HTML actual se utilizará como referencia visual. Sin embargo, el sistema deberá reconstruirse con una base de datos y un panel de administración funcional.

---

## **2\. Primera versión: lo esencial**

La prioridad inicial será contar con un portal público y un sistema confiable para administrar la información deportiva.

### **A. Portal público**

| Sección | Contenido |
| ----- | ----- |
| Inicio | Presentación general, noticias destacadas (no es prioridad) y próximos partidos |
| Historia | Origen, evolución e identidad de la UBL |
| Competencias | Beer League, Women’s Beer League, (MilkShake y All-Stars para mas adelante) |
| Equipos | Nombre, color, logo, sponsor y plantel |
| Fixture | Fechas, horarios y enfrentamientos |
| Resultados | Marcadores de los partidos disputados |
| Posiciones | Tabla calculada según los resultados |
| Estadísticas | Goles, asistencias, puntos y estadísticas de arqueros |
| Playoffs | Cruces, resultados y campeón |
| Noticias | Novedades deportivas e institucionales ( en un futuro) |
| Galería | Fotografías organizadas por temporada o evento |
| Sponsors | Logos, categorías y enlaces |
| Contacto | Correo electrónico y redes sociales |

La web deberá funcionar correctamente tanto en celulares como en computadoras.

### **B. Selección de temporada (año que viene )**

El usuario deberá poder elegir una temporada y consultar:

* Equipos participantes.  
* Planteles.  
* Fixture.  
* Resultados.  
* Posiciones.  
* Estadísticas.  
* Playoffs.  
* Campeón.

La temporada vigente aparecerá seleccionada automáticamente.

---

## **3\. Panel de administración**

Solo podrán ingresar usuarios autorizados.

### **Funciones necesarias**

* Crear y editar temporadas.  
* Crear competencias.  
* Registrar jugadores y arqueros.  
* Crear equipos.  
* Asignar jugadores a los equipos.  
* Crear o modificar el fixture.  
* Cargar resultados.  
* Cargar estadísticas de cada partido.  
* Corregir información cargada.  
* Publicar noticias.  
* Subir fotografías.  
* Administrar sponsors.  
* Configurar los playoffs.  
* Registrar al campeón de cada competencia.  
* Administrar el pool de suplentes activos.  
* Registrar su posición, nivel y competencias habilitadas.  
* Actualizar su disponibilidad para cada fecha.  
* Recibir, aprobar o rechazar solicitudes de los equipos.  
* Registrar qué suplente participó en cada partido y equipo.

### **Roles iniciales**

| Rol | Permisos |
| ----- | ----- |
| Administrador general | Acceso completo |
| Gestión deportiva | Equipos, fixture, resultados y estadísticas |
| Comunicación | Noticias, fotografías y sponsors |

Cada administrador deberá tener su propia cuenta. No se utilizará una contraseña general compartida.

---

## **4\. Funcionamiento de la información deportiva**

El sistema deberá seguir este flujo:

1. Se crea una temporada.  
2. Se habilitan las competencias correspondientes.  
3. Se registran los equipos y jugadores.  
4. Se genera o carga el fixture.  
5. Se registra la planilla de cada partido.  
6. El sistema actualiza automáticamente resultados, posiciones y estadísticas.  
7. Al finalizar la temporada, la información queda disponible como historial.

Las posiciones y estadísticas acumuladas no deberán cargarse manualmente. Se calcularán a partir de las planillas de los partidos.

### **Datos mínimos de cada partido**

* Competencia.  
* Temporada.  
* Fecha y horario.  
* Equipos participantes.  
* Resultado.  
* Jugadores que participaron.  
* Goles.  
* Asistencias.  
* Sanciones, si corresponde.  
* Estadísticas de los arqueros.  
* Estado del partido: programado, disputado, suspendido o cancelado.

La definición exacta de las estadísticas dependerá de la planilla oficial que utilice la organización.

#### **Gestión del pool de suplentes**

Los equipos podrán consultar el pool de suplentes disponibles para cada jornada y solicitar una incorporación temporal.

El sistema deberá permitir:

* Consultar suplentes disponibles por fecha.  
* Filtrar por posición, nivel y competencia.  
* Enviar una solicitud indicando el partido y el jugador que se necesita reemplazar.  
* Evitar que un mismo suplente sea confirmado simultáneamente para más de un partido incompatible.  
* Aprobar o rechazar la solicitud por parte de la organización.  
* Notificar el estado de la solicitud al equipo.  
* Incorporar al suplente confirmado en la planilla del partido.  
* Conservar un historial de sus participaciones.

---

## **5\. Datos principales del sistema**

| Elemento | Información mínima |
| ----- | ----- |
| Jugador | Nombre, apellido, género, nivel y posición |
| Equipo | Nombre, color, logo, sponsor y temporada |
| Competencia | Nombre, descripción y reglamento aplicable |
| Temporada | Año, fechas de inicio y cierre, estado |
| Partido | Fecha, equipos, resultado y estadísticas |
| Noticia | Título, contenido, fecha e imágenes |
| Fotografía | Archivo, evento, temporada y descripción |
| Sponsor | Nombre, logo, enlace y categoría |

| Suplente activo | Jugador, posición, nivel, competencia habilitada y disponibilidad |
| :---- | :---- |

| Solicitud de suplente | Equipo solicitante, partido, posición requerida, motivo, fecha de solicitud y estado |
| :---- | :---- |

| Asignación de suplente | Solicitud aprobada, suplente confirmado, equipo, partido y participación efectiva |
| :---- | :---- |

En esta primera etapa no es necesario publicar información personal como DNI, teléfono, domicilio o situación de pago.

---

## **6\. Lo que quedará para etapas posteriores**

Estas funcionalidades forman parte de la visión de la plataforma, pero no deberían condicionar el lanzamiento inicial.

### **Perfil del jugador**

* Cuenta personal.  
* Fotografía y perfil deportivo.  
* Equipo actual.  
* Próximos partidos.  
* Estadísticas personales.  
* Historial de temporadas y equipos.  
* Avisos y notificaciones.

### **Inscripciones y pagos**

* Inscripción digital.  
* Validación de mayoría de edad.  
* Selección de competencia.  
* Aplicación de descuentos.  
* Cuotas y vencimientos.  
* Pagos online.  
* Registro de pagos manuales.  
* Consulta privada de deuda.  
* Descarga de comprobantes.

### **Gestión de equipos**

* Clasificación de los inscriptos por nivel, género y posición.  
* Sorteo asistido.  
* Publicación automática de planteles.  
* Gestión de reemplazos y suplentes activos.

### **Proyecto del estadio**

* Presentación del proyecto.  
* Objetivo de recaudación.  
* Contador de fondos.  
* Porcentaje de avance.  
* Hitos alcanzados.  
* Registro verificable de donaciones.  
* Información sobre el destino de los fondos.

---

## **7\. Lo que no queremos**

* Una web estática que deba modificarse directamente desde el código.  
* Información limitada a una sola temporada.  
* Cargar manualmente las posiciones o estadísticas acumuladas.  
* Registrar el mismo dato en distintas secciones.  
* Contraseñas visibles en el código o compartidas.  
* Datos personales o financieros expuestos públicamente.  
* Mostrar qué jugadores tienen deuda.  
* Fotografías incorporadas únicamente mediante enlaces externos.  
* Un contador de donaciones sin respaldo verificable.  
* Un sistema difícil de utilizar desde el celular.  
* Agregar pagos, perfiles y sorteos antes de que la gestión deportiva funcione correctamente.  
* Perder la identidad comunitaria, recreativa y fueguina de la UBL.

---

## 

## **8\. Orden de desarrollo**

| Etapa | Alcance | Resultado |
| ----- | ----- | ----- |
| 1 | Base de datos y administración | Temporadas, competencias, jugadores y equipos |
| 2 | Gestión de partidos y suplentes | Fixture, resultados, planillas, pool de suplentes y solicitudes de reemplazo |
| 3 | Portal público | Historia, equipos, próximos partidos, posiciones y estadísticas |
| 4 | Contenido institucional | Noticias, galería y sponsors |
| 5 | Historial | Consulta de temporadas anteriores |
| 6 | Perfiles | Cuentas e historial de jugadores |
| 7 | Inscripciones y pagos | Cuotas, comprobantes y deuda privada |
| 8 | Proyecto estadio | Campaña y contador verificable |

## **9\. Resultado esperado de la primera versión**

La primera versión estará completa cuando la organización pueda administrar una temporada sin modificar el código y el público pueda consultar desde el celular:

* Equipos y planteles.  
* Próximos partidos.  
* Resultados.  
* Posiciones.  
* Estadísticas.  
* Playoffs.  
* Noticias.  
* Fotografías.  
* Sponsors.  
* Temporadas anteriores.  
* Pool de suplentes disponibles.  
* Solicitud y confirmación de suplentes para cada partido

Esta delimitación es importante: la primera versión no será todavía la web app completa soñada, pero sí deberá construirse sobre una estructura que permita incorporar posteriormente cuentas personales, inscripciones, pagos y donaciones sin rehacer todo el sistema.

