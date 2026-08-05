# Ushuaia Beer League — Knowledge Base

Everything known about the project as of 3 August 2026. Gathers the
organisation's functional document, the rulebook, the 2026 season data and the
state of the existing material.

Original sources are copied under `docs/sources/`.

Quotes from the organisation's own rulebook and website are kept **verbatim in
Spanish**. Translating a rulebook would misrepresent it.

---

## 1. What the UBL is

A recreational ice-hockey league in Ushuaia, founded in 2023. In the
organisation's own words, taken from the reference site:

> Toda gran historia arranca más o menos igual: cuatro amigos, muchas ganas de
> jugar y una pregunta simple: "¿Y si armamos algo para competir... pero
> pasándola bien?" Así nació la Ushuaia Beer League. Un grupo de apasionados por
> el deporte que buscaba un espacio donde lo importante no fuera solo ganar, sino
> también divertirse, reencontrarse, mover el cuerpo, quemar algunas calorías y
> compartir buenos momentos dentro y fuera de la cancha.

On the meaning of "beer league":

> El concepto viene de la cultura del hockey sobre hielo. En muchas partes del
> mundo, las Beer Leagues son ligas recreativas pensadas para quienes aman
> competir, pero ya no viven el deporte desde la exigencia profesional:
> jugadores fuera del circuito competitivo, madres y padres con agenda completa,
> ex deportistas, gente que vuelve después de años, amateurs con hambre de juego.
> Es competencia con otra energía: menos presión, más comunidad.

First sponsor: **Birra del Fuego**, on board since day one.

Stated identity: community-driven, recreational and fueguino. Their closing
line: "Fin del mundo. Comienzo de todo... tercer tiempo."

Hashtags: #UBL #UshuaiaBeerLeague #BeerLeague #HockeyYComunidad #FinDelMundo
#ShortShiftsLongStories

---

## 2. The ten commandments

The league's code of conduct, verbatim:

1. Beberé en nombre del hockey.
2. No golpearé.
3. No lastimaré, no me lastimaré.
4. Cederé la baranda que no tiene baranda.
5. Cederé la baranda que sí tiene baranda.
6. Respetaré al referí aunque parezca ebrio.
7. Defenderé con el palo en el hielo.
8. Regalaré un penal cada vez que cometa una falta.
9. Me retiraré si cometo una falta mayor o rompo algún mandamiento.
10. Abandonaré la Ushuaia Beer League si insisto en romper los mandamientos.

Consequence for the system: commandment 8 says a foul is paid with a penalty
shot, and 9 says a major foul means leaving the game. There are no penalty
minutes the way a federated tournament has them, so the discipline model is
**not** the one used in the CFM project.

---

## 3. Substitute-player rules

Verbatim:

- Los equipos pueden solicitar suplentes. En el caso de que soliciten un jugador
  franquicia, solo puede jugar uno por partido.
- En play off, solo se pueden pedir suplentes si son 5 jugadores o menos.
  Jugador franquicia aplica igual que en temporada regular.
- Los suplentes deben completar el formulario hasta 48 hs antes de las fechas.
- El costo de los jugadores para participar de suplentes en junio será de 15.000
  por fecha.

Concepts the system has to model: **franchise player** (at most one per match),
the five-player threshold for requesting a substitute in the playoffs, the
48-hour request window and the per-round cost.

---

## 4. Sporting rules as the current spreadsheet applies them

Scoring, read from the league's own standings sheet:

| Code | Meaning                      | Points                  |
| ---- | ---------------------------- | ----------------------- |
| PG   | games won                    | 2                       |
| PP   | games lost                   | 0                       |
| PPSO | games lost in a shootout     | 1                       |
| PGR  | games won outside a shootout | 2, used as a tiebreaker |

Other columns: GA (goals for), GE (goals against), DIF (goal difference), PJ
(games played).

Tiebreaking order: points, then PGR, then goal difference.

Differences that matter against the CFM project:

- A win is worth **2**, not 3.
- Winning a shootout pays the same as winning in regulation (2), but PGR keeps
  them apart for tiebreaking.
- The **women's** standings sheet has an **empate** (draw) column instead of
  PPSO, and one draw is on record (Mujeres Birra del Fuego 4-4 Mujeres Tipo
  Nine, 28 June). This league **does allow draws**, at least in the women's
  competition.
- Tiebreaking is by PGR and goal difference, not by a mini-table among the
  tied teams.

Published goalkeeper statistics: games played, shots faced, goals against and
save percentage. Shots faced are recorded, not derived.

Published player statistics: assists, goals and points.

---

## 5. Competitions

- **Beer League** (main competition, mixed rosters)
- **Women's Beer League (WUBL)**
- **MilkShake** and **All-Stars**: part of the vision, not a priority. The
  all-star game is on the 2026 calendar (18 July).

The reference site already carries all three under the keys `beer`, `wbeer` and
`stars`.

---

## 6. 2026 season

### 6.1 Beer League teams

Each team has a short name (used by the fixture) and a full sponsored name (used
by the roster sheet).

| Short name                     | Full name                   | Nickname seen in the playoff sheet |
| ------------------------------ | --------------------------- | ---------------------------------- |
| Birra del Fuego                | Green Seven Birra del fuego | verde                              |
| Short Shift Soft Sticks (SSSS) | Beerros Azulvetrados        | azul                               |
| Rock Choppers                  | Hantachoppers               | hanta                              |
| Blanco                         | Blancaspuma y las 7 pintas  | vitox                              |
| Sucucho                        | Frozen Sucucho              | suc                                |
| Tipo Nine (T9)                 | Beerizar Rompehielos T9     | t9                                 |
| Zhockey                        | Castores Zhockey            | z hockey                           |

The short-name to full-name mapping was inferred by cross-checking the standings
against the playoff brackets. **To be confirmed with the organisation.**

### 6.2 Rosters with jersey numbers

Rosters are mixed: women play in the Beer League teams.

**Green Seven Birra del fuego:** 30 Bernales Joaquín, 20 Guete Nadin,
26 Aguado Bárbara, 21 Gowland Guillermina, 23 Molinolo Osvaldo,
25 Molinolo Santi, 29 Quiroga Agustín, 24 Ávila Chori Leandro,
28 Baeza Pedro/Tincho, 27 Leuenberger Colo Federico.

**Beerizar Rompehielos T9:** 36 Zayas Maitena, 63 Alarcón Gonza,
90 Seru Campos Victoria, 81 Díaz Ofelia, 25 Longart Reyner,
18 Atristain Juan, 54 Cosentino Martín, 27 López Mieres Martín,
72 Piccone Nicolás, 9 Beltrami Ramiro.

**Castores Zhockey:** 1 Amaolo Lanata Eugenia, 9 Ávila Ariadna,
7 Aquino Ailín, 2 Legal Cristian, 3 Romero Emir, 6 Vaca Marcelo,
8 Sobral Lucas, 4 Tabárez Ian, 5 Galar Ezequiel, 10 Lapertosa Facundo.

**Beerros Azulvetrados:** 1 Zunino Francisco, 11 Cicka Ariel,
15 Sigel Carol, 19 Zayas Santiago, 13 Ceravolo Agus, 16 Brito Esteban,
12 Jofré Matías, 10 Sueldo Fito, 14 Velázquez Luciano.

**Hantachoppers:** 30 Valdez Gustavo, 29 Echague Guillermo,
26 Carbone Anita, 28 Cotignola Flor, 21 Rodríguez Puma Luciano,
24 Vittori Juan, 25 Encinas Camacho Valen, 27 Carrión Francisco,
22 Ruggirello Matt, 23 Piccolini Alejo, 28 Bergeonneau Mauri.

Note: number 28 appears twice in Hantachoppers (Cotignola and Bergeonneau).
To be verified.

**Frozen Sucucho:** 1 Badaracco Nico, 21 Ureta Facundo,
23 Mosqueira Vicktoria, 24 Flecha Yesicca, 20 Ercole Maxi,
26 Zayas Matías, 28 Muñoz Lauti, 22 Magnelli Francisco,
25 Bianciotto Cata, 27 Firmapaz Martín.

**Blancaspuma y las 7 pintas:** 1 Zayas Marcelo, Coria Omar (no number),
74 Dumais Virginia, 77 Nardi Christina, 88 Guillamet Cecilia,
5 Tibaudin José, 9 Verón Nico, 11 Brallard Iván, 31 Val Francisco,
26 Zahr Turco Leandro.

### 6.3 Women's Beer League teams

The women's standings name them like the men's teams (Sucucho, Birra del Fuego,
Tipo Nine, Zhockey) but the statistics sheets use distinct names:

- **Turbeerras**
- **Zambirreras**
- **Frozen Queens**
- **Moby Drink**

The women's rosters do **not** mirror the men's: each one draws players from
several men's teams. The only mapping with evidence is Frozen Queens to Frozen
Sucucho. **The organisation needs to confirm all four.**

### 6.4 Standings as of 4 July 2026

Beer League, six games played each:

| Pos | Team                    | Pts | PG  | PP  | PPSO | PGR | GA  | GE  | DIF | PJ  |
| --- | ----------------------- | --- | --- | --- | ---- | --- | --- | --- | --- | --- |
| 1   | Birra del Fuego         | 12  | 6   | 0   | 0    | 5   | 49  | 32  | 17  | 6   |
| 2   | Short Shift Soft Sticks | 10  | 5   | 1   | 0    | 4   | 40  | 28  | 12  | 6   |
| 3   | Rock Choppers           | 6   | 3   | 3   | 0    | 3   | 44  | 48  | -4  | 6   |
| 4   | Blanco                  | 6   | 2   | 1   | 2    | 2   | 37  | 33  | 4   | 6   |
| 5   | Sucucho                 | 4   | 2   | 4   | 0    | 2   | 30  | 34  | -4  | 6   |
| 6   | Tipo Nine               | 4   | 2   | 4   | 0    | 2   | 38  | 43  | -5  | 6   |
| 7   | Zhockey                 | 2   | 1   | 5   | 0    | 1   | 31  | 51  | -20 | 6   |

The source sheet lists the rows out of order: Rock Choppers and Blanco appear
below the four-point teams. The order above follows the points, and the playoff
brackets confirm those positions.

Women's Beer League, three games played each:

| Pos | Team            | Pts | PG  | PP  | Draw | PGR | GA  | GE  | DIF | PJ  |
| --- | --------------- | --- | --- | --- | ---- | --- | --- | --- | --- | --- |
| 1   | Sucucho         | 6   | 3   | 0   | 0    | 3   | 11  | 5   | 6   | 3   |
| 2   | Birra del Fuego | 3   | 1   | 1   | 1    | 1   | 13  | 13  | 0   | 3   |
| 3   | Tipo Nine       | 3   | 1   | 1   | 1    | 1   | 10  | 11  | -1  | 3   |
| 4   | Zhockey         | 0   | 0   | 3   | 0    | 0   | 11  | 16  | -5  | 3   |

### 6.5 Fixture and results

Games run on two rinks in parallel, called **cabeceras**: **Bahía** and
**Poli**. Two matches can be under way at the same time in different venues.
This is the biggest structural difference against the CFM project, which
schedules one match per hour.

Sheet notation: `5 p` or `8p` means that side won in a shootout.

**Round 1, Saturday 23 May 2026**

| Time  | Home                         | Score   | Away            | Venue |
| ----- | ---------------------------- | ------- | --------------- | ----- |
| 21:30 | (row with no teams recorded) |         |                 | Bahía |
| 21:30 | Rock Choppers                | 9 - 6   | Sucucho         | Poli  |
| 22:30 | Short Shift Soft Sticks      | 5 p - 4 | Blanco          | Bahía |
| 22:30 | Zhockey                      | 6 - 14  | Birra del Fuego | Poli  |
| 23:30 | Rock Choppers                | 8 - 11  | Birra del Fuego | Bahía |
| 23:30 | Zhockey                      | 6 - 3   | Sucucho         | Poli  |

That first row has a time and a venue but no teams and no score. A gap to
resolve with the organisation.

**Round 2, Saturday 30 May 2026**

| Time  | Home                    | Score   | Away            | Venue |
| ----- | ----------------------- | ------- | --------------- | ----- |
| 21:30 | Sucucho                 | 10 - 3  | Tipo Nine       | Bahía |
| 21:30 | Blanco                  | 7 - 8 p | Birra del Fuego | Poli  |
| 22:30 | Short Shift Soft Sticks | 9 - 6   | Rock Choppers   | Bahía |
| 22:30 | Sucucho                 | 4 - 3   | Blanco          | Poli  |
| 23:30 | Zhockey                 | 6 - 8   | Tipo Nine       | Bahía |
| 23:30 | Short Shift Soft Sticks | 2 - 5   | Birra del Fuego | Poli  |

**Round 3, Saturday 6 June 2026** (first women's round)

| Time  | Home                    | Score  | Away                    | Venue |
| ----- | ----------------------- | ------ | ----------------------- | ----- |
| 21:30 | Mujeres Zhockey         | 3 - 5  | Mujeres Tipo Nine       | Bahía |
| 21:30 | Mujeres Birra del Fuego | 2 - 3  | Mujeres Sucucho         | Poli  |
| 22:30 | Zhockey                 | 5 - 9  | Short Shift Soft Sticks | Bahía |
| 22:30 | Rock Choppers           | 4 - 10 | Tipo Nine               | Poli  |
| 23:30 | Mujeres Zhockey         | 6 - 7  | Mujeres Birra del Fuego | Bahía |
| 23:30 | Mujeres Sucucho         | 4 - 1  | Mujeres Tipo Nine       | Poli  |

**Round 4, Sunday 28 June 2026**

| Time  | Home                    | Score  | Away                    | Venue |
| ----- | ----------------------- | ------ | ----------------------- | ----- |
| 21:30 | Zhockey                 | 7 - 9  | Rock Choppers           | Bahía |
| 21:30 | Tipo Nine               | 6 - 7  | Birra del Fuego         | Poli  |
| 22:30 | Mujeres Birra del Fuego | 4 - 4  | Mujeres Tipo Nine       | Bahía |
| 22:30 | Mujeres Sucucho         | 4 - 2  | Mujeres Zhockey         | Poli  |
| 23:30 | Sucucho                 | 4 - 9  | Short Shift Soft Sticks | Bahía |
| 23:30 | Blanco                  | 10 - 7 | Tipo Nine               | Poli  |

The women's 4-4 has no winner recorded: this is the draw that proves the
women's competition allows them.

**Round 5, Saturday 4 July 2026**

| Time  | Home                    | Score  | Away            | Venue |
| ----- | ----------------------- | ------ | --------------- | ----- |
| 21:30 | Rock Choppers           | 8 - 5  | Blanco          | Bahía |
| 21:30 | Sucucho                 | 3 - 4  | Birra del Fuego | Poli  |
| 22:30 | Short Shift Soft Sticks | 6 - 4  | Tipo Nine       | Bahía |
| 22:30 | Zhockey                 | 1 - 8  | Blanco          | Poli  |
| 23:30 | 6th place               | 10 - 7 | 7th place       | Bahía |
| 23:30 | Bye                     |        | Bye             | Poli  |

In this round the sheet carries the goals but leaves the "Resultado" and
"Ganador" columns empty on the last four matches, and the final two rows carry a
winner that does not match the teams on the row. The goal columns are the
reliable ones. **Verify before importing.**

The 6th-versus-7th match (Tipo Nine 10 - 7 Zhockey by position) is a play-in
inside the regular phase: the winner reaches the playoffs.

**All-star game, Saturday 18 July 2026:** five slots reserved at 20:30, 21:30
and 22:30, with no teams named in the sheet.

**Semifinals, Saturday 8 August 2026**

| Time  | Matchup                                                         |
| ----- | --------------------------------------------------------------- |
| 21:30 | 3rd place (Hantachoppers) vs winner of 6th/7th (Tipo Nine)      |
| 21:30 | 4th place (Blanco) vs 5th place (Sucucho)                       |
| 22:30 | 1st women's (Sucucho) vs 4th women's (Zhockey)                  |
| 22:30 | 2nd women's (Birra del Fuego) vs 3rd women's (Tipo Nine)        |
| 23:30 | Semifinal 1: Birra del Fuego (verde) vs to be determined        |
| 23:30 | Semifinal 2: Short Shift Soft Sticks (azul) vs to be determined |

The first and second seeds wait in the semifinals for the winners of the earlier
matches on the same night.

**Finals, Saturday 15 August 2026**

| Time  | Match              |
| ----- | ------------------ |
| 20:30 | Third place        |
| 20:30 | Third place, women |
| 21:30 | Final, women       |
| 21:30 | Fifth place        |
| 22:30 | Final              |
| 22:30 | Venue free         |

**Saturday 22 August 2026:** emergency date, reserved in case of cancellation.

### 6.6 Beer League scoring leaders

Points are goals plus assists. Full table as the league publishes it:

| Player                          | Team                             | A   | G   | Pts |
| ------------------------------- | -------------------------------- | --- | --- | --- |
| Beltrami Ramiro                 | Beerizar Rompehielos T9          | 6   | 23  | 29  |
| Baeza Pedro                     | Green Seven Birra del fuego      | 6   | 17  | 23  |
| Ruggirello Matt                 | Hantachoppers                    | 6   | 17  | 23  |
| Velásquez Luciano               | Beerros Azulvetrados             | 5   | 11  | 16  |
| Carrión Jaureguiberry Francisco | Hantachoppers                    | 11  | 5   | 16  |
| Zahr Leandro                    | Blancaspuma y las 7 pintas       | 3   | 11  | 14  |
| Leuenberger Federico            | Green Seven Birra del fuego      | 1   | 12  | 13  |
| Ávila Leandro                   | Green Seven Birra del fuego      | 3   | 10  | 13  |
| Sueldo Adolfo                   | Beerros Azulvetrados             | 1   | 11  | 12  |
| Seru Campos Victoria            | Beerizar Rompehielos T9          | 3   | 9   | 12  |
| Firmapaz Martín                 | Frozen Sucucho                   | 0   | 11  | 11  |
| Jofré Matías                    | Beerros Azulvetrados             | 1   | 9   | 10  |
| Val Francisco                   | Blancaspuma y las 7 pintas       | 2   | 8   | 10  |
| Piccolini Alejo                 | Hantachoppers                    | 2   | 8   | 10  |
| Lapertosa Facundo               | Castores Zhockey                 | 2   | 8   | 10  |
| Ceravolo Agustín                | Beerros Azulvetrados             | 3   | 5   | 8   |
| Muñoz Lautaro                   | Frozen Sucucho                   | 3   | 5   | 8   |
| López Mieres Martín             | Beerizar Rompehielos T9          | 0   | 6   | 6   |
| Encinas Camacho Valen           | Hantachoppers                    | 1   | 5   | 6   |
| Tabares Ian                     | Castores Zhockey                 | 1   | 5   | 6   |
| Fermín López Silva              | Blancaspuma y las 7 pintas (sub) | 2   | 4   | 6   |
| Baeza Juan                      | Castores Zhockey                 | 0   | 5   | 5   |
| Bianciotto Catalina             | Frozen Sucucho                   | 0   | 5   | 5   |
| Guillamet Chargue Cecilia       | Blancaspuma y las 7 pintas       | 0   | 5   | 5   |
| Aquino Ailín                    | Castores Zhockey                 | 0   | 5   | 5   |
| Piccone Nicolás                 | Beerizar Rompehielos T9          | 1   | 4   | 5   |
| Brallard Iván                   | Blancaspuma y las 7 pintas       | 2   | 3   | 5   |
| Romero José                     | Castores Zhockey                 | 0   | 4   | 4   |
| Gowland Guillermina             | Green Seven Birra del fuego      | 1   | 3   | 4   |
| Ávila Ariadna                   | Castores Zhockey                 | 1   | 3   | 4   |
| Aguado Bárbara                  | Green Seven Birra del fuego      | 2   | 2   | 4   |
| Carbone Ana                     | Hantachoppers                    | 2   | 2   | 4   |
| Quiroga Agustín                 | Green Seven Birra del fuego      | 2   | 2   | 4   |
| Molinolo Osvaldo                | Green Seven Birra del fuego      | 0   | 3   | 3   |
| Legal Cristian                  | Castores Zhockey                 | 0   | 3   | 3   |
| Magnelli Francisco              | Frozen Sucucho                   | 1   | 2   | 3   |
| Galar Ezequiel                  | Castores Zhockey                 | 1   | 2   | 3   |
| Atristain Juan                  | Beerizar Rompehielos T9          | 1   | 2   | 3   |
| Echague Guillermo               | Hantachoppers                    | 1   | 2   | 3   |
| Vaca Marcelo                    | Castores Zhockey                 | 1   | 2   | 3   |
| Sobral Lucas                    | Castores Zhockey                 | 2   | 1   | 3   |
| Zayas Díaz Matías               | Frozen Sucucho                   | 0   | 2   | 2   |
| Sueldo Kevin                    | Substitute (Castores)            | 0   | 2   | 2   |
| Molinolo Santi                  | Green Seven Birra del fuego      | 0   | 2   | 2   |
| Cuitiño Joaquín                 | Substitute (Sucucho)             | 0   | 2   | 2   |
| Cotignola Florencia             | Hantachoppers                    | 0   | 2   | 2   |
| Guete Nadin                     | Green Seven Birra del fuego      | 1   | 1   | 2   |
| Bergeonneau Mauri               | Hantachoppers                    | 1   | 1   | 2   |
| Cicka Ariel                     | Beerros Azulvetrados             | 1   | 1   | 2   |
| Rodríguez Luciano               | Hantachoppers                    | 1   | 1   | 2   |
| Nardi Christina                 | Blancaspuma y las 7 pintas       | 1   | 1   | 2   |
| Zayas Díaz Santiago             | Beerros Azulvetrados             | 1   | 1   | 2   |
| Romano Salinas Felipe           | Green Seven Birra del fuego      | 0   | 2   | 2   |
| Alarcón Gonza                   | Beerizar Rompehielos T9          | 0   | 2   | 2   |
| Díaz Ofelia                     | Beerizar Rompehielos T9          | 0   | 2   | 2   |
| Vittori Juan                    | Hantachoppers                    | 0   | 2   | 2   |
| Ureta Facundo                   | Frozen Sucucho                   | 0   | 1   | 1   |
| Ercole Maximiliano              | Frozen Sucucho                   | 0   | 1   | 1   |
| Dumais Virginia                 | Blancaspuma y las 7 pintas       | 0   | 1   | 1   |
| Flecha Yesica                   | Frozen Sucucho                   | 0   | 1   | 1   |
| Coria Omar                      | Blancaspuma y las 7 pintas       | 0   | 1   | 1   |
| Verón Nicolás                   | Blancaspuma y las 7 pintas       | 0   | 1   | 1   |
| Simari Birkner Cristian         | Frozen Sucucho (sub)             | 0   | 1   | 1   |
| Mosqueira Victoria              | Frozen Sucucho                   | 0   | 1   | 1   |

On zero points: Brito Esteban (Beerros), Tibaudin José (Blancaspuma),
Sigel Carol (Beerros), Longart Reyner (T9), Cosentino Martín (T9),
Schiavini Margarita (Castores), Durrieu Felix (no team),
Tibaudin Ana J (no team), Corales Jonathan (no team).

Substitutes are flagged in the team column as `(sup)` or `Suplente (team)`, not
as roster players.

### 6.7 Beer League goalkeepers

| Goalkeeper            | Team                          | GP  | Shots faced | Goals against | Save % |
| --------------------- | ----------------------------- | --- | ----------- | ------------- | ------ |
| Badaracco Nico        | Frozen Sucucho                | 5   | 173         | 25            | 86%    |
| Amaolo Lanata Gonza   | Substitute (Beerizar)         | 2   | 84          | 10            | 88%    |
| Zayas Marcelo         | Blancaspuma y las 7 pintas    | 6   | 156         | 32            | 79%    |
| Bernales Joaquín      | Green Seven Birra del fuego   | 6   | 151         | 32            | 79%    |
| López Mieres Martín   | Beerizar Rompehielos T9 (sub) | 3   | 84          | 23            | 73%    |
| Zunino Francisco      | Beerros Azulvetrados          | 6   | 121         | 35            | 71%    |
| Valdez Gustavo        | Hantachoppers                 | 6   | 185         | 57            | 69%    |
| Amaolo Lanata Eugenia | Castores Zhockey              | 6   | 134         | 52            | 61%    |
| Jofré Lautaro         | Substitute (Sucucho)          | 2   | 46          | 19            | 59%    |

The source sheet groups the six-game goalkeepers first and everyone else after;
the table above is ordered by save percentage. All nine percentages reconcile
with shots faced and goals against, so the formula is `(shots - goals) / shots`.
Compute it in the system rather than importing it, so the two can never
disagree.

### 6.8 Women's Beer League scoring leaders

| Player                    | Team                     | A   | G   | Pts |
| ------------------------- | ------------------------ | --- | --- | --- |
| Seru Campos Victoria      | Turbeerras               | 3   | 5   | 8   |
| Carbone Ana               | Substitute (Zambirreras) | 1   | 4   | 5   |
| Bianciotto Catalina       | Frozen Queens            | 1   | 4   | 5   |
| Aquino Ailín              | Turbeerras               | 0   | 4   | 4   |
| Nardi Christina           | Zambirreras              | 1   | 3   | 4   |
| Tibaudin Ana J            | Zambirreras              | 1   | 3   | 4   |
| Alvarado Daniela          | Moby Drink               | 0   | 3   | 3   |
| Dumais Virginia           | Frozen Queens            | 1   | 2   | 3   |
| Denti Silvana             | Frozen Queens            | 1   | 2   | 3   |
| Guillamet Chargue Cecilia | Frozen Queens            | 1   | 2   | 3   |
| Abrahan Maura             | Moby Drink               | 2   | 1   | 3   |
| Paz Luciana               | Moby Drink               | 0   | 3   | 3   |
| Mosqueira Victoria        | Moby Drink               | 0   | 2   | 2   |
| Sigel Carol               | Moby Drink               | 1   | 1   | 2   |
| Guerra Marina             | Zambirreras              | 0   | 2   | 2   |
| Ferreyra Marina           | Turbeerras               | 0   | 1   | 1   |
| Aguado Bárbara            | Turbeerras               | 0   | 1   | 1   |
| Ávila Ariadna             | Turbeerras               | 0   | 1   | 1   |
| Oviedo Nieto Jessica      | Moby Drink               | 0   | 1   | 1   |
| Garro María               | Turbeerras               | 0   | 1   | 1   |
| Guete Nadin               | Frozen Queens            | 0   | 1   | 1   |
| Dana Gonzales             | no team                  | 0   | 1   | 1   |
| Varaona Agustina          | Turbeerras               | 0   | 1   | 1   |
| Ferrari Verónica          | Moby Drink               | 0   | 1   | 1   |
| Alegre Flor               | Zambirreras              | 0   | 1   | 1   |

On zero points: Amaolo Lanata Eugenia, Echazú Eugenia, Barrios Bentancor
Valeria (Turbeerras); Álvarez de Oro Alejandra (Moby Drink); Cavalleri
Milagros, Espíndola Ayelén, Díaz Ofelia, Jozami Lorena, Luna Dapozo Ema
(Zambirreras); Zayas Díaz Maitena, Rodríguez Bruna, Flecha Yesica, Cotignola
María (Frozen Queens).

### 6.9 Women's Beer League goalkeepers

| Goalkeeper            | Team        | GP  | Shots faced | Goals against | Save % |
| --------------------- | ----------- | --- | ----------- | ------------- | ------ |
| Amaolo Lanata Eugenia | Turbeerras  | 2   | 39          | 8             | 79%    |
| Cavaliere Milagros    | Zambirreras | 3   | 54          | 16            | 70%    |

The surname reads "Cavalleri" on the player sheet and "Cavaliere" on the
goalkeeper sheet. The league confirmed **Cavalleri** on 4 August 2026, and that
is the spelling both tables show: `src/utils/confirmed-names.ts`. Neither line
reaches a player row, because the women's rosters are not published, so without
that answer she appeared as two different people, one scoring and one in goal.

---

## 7. The organisation's functional document (version 0.1)

Faithful summary of `docs/sources/ubl-functional-doc.md`.

### 7.1 Goal

A web platform that centralises the UBL's sporting and institutional
information. The first version must show up-to-date information, let visitors
consult teams, fixture, results, standings and statistics, publish news, photos
and sponsors, administer all of it from a secure panel, and keep every season's
data.

The current HTML is a **visual reference**. The system is rebuilt with a
database and a working administration panel.

### 7.2 Public sections

Home (overview, featured news which is not a priority, upcoming matches),
History, Competitions (Beer League, Women's Beer League, and later MilkShake and
All-Stars), Teams (name, colour, logo, sponsor and roster), Fixture, Results,
Standings, Statistics, Playoffs, News (later), Gallery, Sponsors and Contact.

It has to work on phones as well as on desktop.

### 7.3 Season selection

Marked "next year": pick a season and consult teams, rosters, fixture, results,
standings, statistics, playoffs and champion. The current season is selected
automatically.

### 7.4 Administration panel

Requested features: create and edit seasons; create competitions; register
players and goalkeepers; create teams; assign players to teams; create or edit
the fixture; enter results; enter each match's statistics; correct entered data;
publish news; upload photos; manage sponsors; configure the playoffs; record
each competition's champion; manage the active substitute pool; record each
substitute's position, level and eligible competitions; update their
availability per round; receive, approve or reject team requests; and record
which substitute played in each match and for which team.

Initial roles:

| Role                  | Permissions                            |
| --------------------- | -------------------------------------- |
| General administrator | Full access                            |
| Sporting management   | Teams, fixture, results and statistics |
| Communications        | News, photos and sponsors              |

Every administrator gets their own account. **No** shared password.

### 7.5 How sporting data flows

1. A season is created.
2. Its competitions are enabled.
3. Teams and players are registered.
4. The fixture is generated or loaded.
5. Each match's sheet is entered.
6. The system updates results, standings and statistics automatically.
7. When the season ends, the data stays available as history.

Standings and cumulative statistics are **never** entered by hand: they are
computed from the match sheets.

Minimum data per match: competition, season, date and time, teams, result,
players who took part, goals, assists, sanctions where applicable, goalkeeper
statistics, and status (scheduled, played, suspended or cancelled).

### 7.6 Substitute pool

Teams browse the available pool per round and request a temporary addition. The
system must let them list substitutes by round, filter by position, level and
competition, submit a request naming the match and the player to replace,
prevent the same substitute being confirmed for two incompatible matches, let
the organisation approve or reject, notify the team of the outcome, add the
confirmed substitute to the match sheet, and keep a history of their
appearances.

### 7.7 Core entities

| Element               | Minimum information                                                       |
| --------------------- | ------------------------------------------------------------------------- |
| Player                | First name, surname, gender, level and position                           |
| Team                  | Name, colour, logo, sponsor and season                                    |
| Competition           | Name, description and applicable rulebook                                 |
| Season                | Year, start and end dates, status                                         |
| Match                 | Date, teams, result and statistics                                        |
| News item             | Title, body, date and images                                              |
| Photo                 | File, event, season and description                                       |
| Sponsor               | Name, logo, link and category                                             |
| Active substitute     | Player, position, level, eligible competition and availability            |
| Substitute request    | Requesting team, match, position needed, reason, date and status          |
| Substitute assignment | Approved request, confirmed substitute, team, match and actual appearance |

At this stage there is no need to publish national ID, phone number, address or
payment status.

### 7.8 Later stages

- **Player profile:** personal account, photo and sporting profile, current
  team, upcoming matches, personal statistics, season and team history, notices
  and notifications.
- **Registration and payments:** digital sign-up, age verification, competition
  choice, discounts, instalments and due dates, online payments, manual payment
  records, private debt lookup, receipts.
- **Team management:** classifying sign-ups by level, gender and position,
  assisted draw, automatic roster publishing, replacement and active-substitute
  management.
- **Stadium project:** presentation, fundraising target, funds counter, progress
  percentage, milestones, verifiable donation record and information on where
  the money goes.

### 7.9 What they explicitly do not want

Verbatim from the document:

- Una web estática que deba modificarse directamente desde el código.
- Información limitada a una sola temporada.
- Cargar manualmente las posiciones o estadísticas acumuladas.
- Registrar el mismo dato en distintas secciones.
- Contraseñas visibles en el código o compartidas.
- Datos personales o financieros expuestos públicamente.
- Mostrar qué jugadores tienen deuda.
- Fotografías incorporadas únicamente mediante enlaces externos.
- Un contador de donaciones sin respaldo verificable.
- Un sistema difícil de utilizar desde el celular.
- Agregar pagos, perfiles y sorteos antes de que la gestión deportiva funcione
  correctamente.
- Perder la identidad comunitaria, recreativa y fueguina de la UBL.

### 7.10 Development order proposed by the organisation

| Stage | Scope                                                                        |
| ----- | ---------------------------------------------------------------------------- |
| 1     | Database and administration: seasons, competitions, players and teams        |
| 2     | Match and substitute management: fixture, results, sheets, pool and requests |
| 3     | Public portal: history, teams, upcoming matches, standings and statistics    |
| 4     | Institutional content: news, gallery and sponsors                            |
| 5     | History: past seasons                                                        |
| 6     | Profiles: player accounts and history                                        |
| 7     | Registration and payments                                                    |
| 8     | Stadium project                                                              |

### 7.11 Definition of done for the first version

The organisation can run a season without touching code, and the public can
consult from a phone: teams and rosters, upcoming matches, results, standings,
statistics, playoffs, news, photos, sponsors, past seasons, the available
substitute pool, and substitute requests and confirmations per match.

The first version is not yet the full web app, but its structure has to allow
personal accounts, registration, payments and donations to be added without
rebuilding the system.

---

## 8. Existing material

### 8.1 Reference site

`docs/sources/reference-site.html`, 632 KB in a single file, titled "Ushuaia
Beer League 2026".

Contents: hero, league history, Leagues & Statistics with tabs (fixture,
standings, players, goalkeepers, scoring leaders), Playoffs with a bracket,
photos, sponsors, and an embedded administration panel.

How it is built: 294 KB of CSS and 22 KB of JavaScript, both inline. An
in-memory `DB` object holding the three competitions (`beer`, `wbeer`, `stars`),
playoff rounds (`qf`, `sf`, `f`), photos and sponsors. One external dependency:
Google Fonts (Bebas Neue, Barlow Condensed, Barlow). Five images embedded as
data URIs.

It works as a visual reference and as a screen-level specification. It does
**not** work as a code base: the data lives in memory and the panel checks a
username and password in the browser, which is exactly what the functional
document lists as unacceptable.

### 8.2 League spreadsheet

Exported under `docs/sources/`:

- `fixture-2026-calendar.csv`: fixture and results, the most reliable source.
- `spreadsheet-export/`: `calendar.html`, `teams.html`, `results.html`,
  `standings.html`, `player-stats.html`, `goalie-stats.html`,
  `wubl-player-stats.html`, `wubl-goalie-stats.html`.

`results.html` lost its goals in the export (those cells were formulas), leaving
only the matchups. Use the calendar CSV for results.

---

## 9. Open questions for the organisation

1. Confirm the short-name to full-name mapping for the seven teams.
2. Confirm, rather than supply, how the four women's teams map to the names the
   fixture and the standings use. Inferred from the goals on 5 August 2026 and
   recorded in `src/data/teams-2026.ts` with the arithmetic: Turbeerras is Birra
   del Fuego, Frozen Queens is Sucucho, Zambirreras is Tipo Nine, Moby Drink is
   Zhockey. The four women's rosters were then derived from the published
   statistics on top of that mapping, so a wrong pairing puts a whole roster on
   the wrong team. Their real names are still missing too: the four teams carry
   the men's names because the fixture carried nothing else.
3. The missing round-1 match (21:30 at Bahía, no teams).
4. The empty or misaligned "Resultado" and "Ganador" columns in round 5.
5. Whether draws are valid only in the women's competition or in both.
6. What exactly is recorded for sanctions: the commandments mention a penalty
   shot and leaving the game, not minutes.
7. The duplicated number 28 in the Hantachoppers roster.
8. ~~Unify Cavalleri and Cavaliere.~~ **Answered 4 August 2026: Cavalleri.**
   Along with the eight other people the sheets spell two ways, all of them now
   recorded in `src/utils/confirmed-names.ts`: Velazquez, Cotignola, Tabares,
   Badaracco, Cavalleri, Nardi Cristina, Muñoz Lauta, Carbone Ana and Sueldo
   Fito. Ten published statistics lines reach the person they were always about
   as a result, and five people are now stored under the name that is theirs.
9. Each player's level and position: the functional document lists them as
   minimum data and the current spreadsheet does not have them.
10. What a franchise player is and how it is flagged.
11. The substitute cost per round after June.
12. The full playoff format: how many teams qualify, whether the first and
    second seeds wait in the semifinals, whether the fifth-place game is played
    every year.

---

## 10. Decisions already taken

- Single repository: `git@github.com:ushuaia-beer-league/app.git`, under the
  `ushuaia-beer-league` GitHub organisation, so access never depends on one
  person.
- One repo holding the public site, the panel, the database migrations and the
  import scripts. There is no separate backend to split out.
- Stack: React + Vite + TypeScript, the same recipe as the CFM project, for
  simplicity and because the standings and statistics logic is already written
  and tested there and ports without depending on the framework.
- No Astro: the data-entry panel is an interactive application, so it would need
  React inside it anyway.
- Database: Supabase, chosen over Firestore for the relational model (seasons,
  competitions, teams, rosters, substitutes) and because player accounts arrive
  more easily later.
- Business logic lives in pure modules with tests, outside the components.
- No passwords in the client: real authentication with per-account roles,
  enforced in the database and not merely by hiding buttons.

## 11. Key differences against the CFM project

What cannot be copied unchanged:

| Topic                | CFM                                       | UBL                                           |
| -------------------- | ----------------------------------------- | --------------------------------------------- |
| Scoring              | 3 for a win                               | 2 for a win                                   |
| Draws                | impossible                                | allowed, at least in the women's competition  |
| Tiebreaking          | mini-table among tied teams               | PGR then goal difference                      |
| Discipline           | penalty minutes, ejection on accumulation | penalty shot and leaving the game, no minutes |
| Simultaneous matches | one per hour                              | two venues in parallel                        |
| Seasons              | a single one                              | multi-season history by design                |
| Substitutes          | none                                      | pool, requests and franchise player           |
| Content              | sporting only                             | news, gallery and sponsors                    |
| Goalkeepers          | saves from the sheet footer               | shots faced and goals against                 |
