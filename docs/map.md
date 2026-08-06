# The whole thing, on one page

What this project is made of, where each thing lives, where every number on screen
comes from, and what can be seen about how it is used. Written so somebody can
understand the system without reading the code, and so whoever does read the code
knows which file to open.

Companions: `knowledge-base.md` holds the league's own rules and data,
`plan.md` the delivery plan and what is still outstanding, `ADMIN.md` the manual
for the people who operate the panel, `preview.md` how to look at a change before
it is live.

---

## 1. The two addresses

|            | Address                                      | What it is                                                                                        |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Production | `https://ushuaia-beer-league.github.io/app/` | The league's site. GitHub Pages, built from `main`.                                               |
| Test       | `https://ushuaia-beer-league.vercel.app`     | The same site built from the `test` branch. Vercel, free plan, owned by the league's own account. |

Production is a static build: no server of ours runs anywhere. That single fact
explains most of the decisions below, including why there are no logs and why
geography cannot be measured today.

---

## 2. The public site

One page, with the navigation jumping between sections. Everything is rendered at
once, which is the thing about to change: `/ligas` and `/equipos` are becoming
real addresses so a link can open on a table instead of at the top.

| Section              | What it shows                                                                       | Where it comes from                                           |
| -------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Hero                 | The league's name and crest                                                         | `src/assets/crest/`                                           |
| Historia             | The league's own account of itself                                                  | Hardcoded text, and the first candidate for the panel to edit |
| Ligas & Estadísticas | Fixture, posiciones, goleadores, arqueros, playoffs, per competition or all at once | Computed at read time from match records                      |
| Equipos              | Every team, its crest and its roster                                                | Teams and rosters, crests from `src/assets/logos/`            |
| Fotos                | The season's gallery                                                                | `photos`, uploaded from the panel                             |
| Sponsors             | Who pays for the ice                                                                | `sponsors`, uploaded from the panel                           |
| Contacto             | How to reach the league                                                             | Hardcoded text                                                |

### The five tables, and who computes them

Nothing is added up in a component. Every number comes from a pure module under
`src/utils/`, each with its own tests:

| Table      | Module                    | The rule that matters                                                                                                                              |
| ---------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixture    | `fixture.ts`              | Groups by date and time. Two matches run at once in Bahía and Poli, so a slot holds more than one. Splits into what is coming and what was played. |
| Posiciones | `standings.ts`            | A win is 2, a shootout loss 1, a draw 1. Tiebreak: points, then wins outside a shootout, then goal difference. No mini-table.                      |
| Goleadores | `published-statistics.ts` | A transcription of what the league published, not a derivation: the 2026 sources carry season totals and no per-goal record.                       |
| Arqueros   | `goalkeeping.ts`          | `(shots faced − goals against) / shots faced`, computed on read. Never stored. A keeper who faced nothing has no percentage, not a perfect one.    |
| Playoffs   | `playoffs.ts`             | The bracket fills itself from results. Who qualifies needs a format the league has not confirmed.                                                  |

Two more: `match-completeness.ts` says what each match sheet is still missing, and
`scoring.ts`, `source-notation.ts`, `team-lookup.ts`, `confirmed-names.ts` are the
importer's reading rules.

---

## 3. The panel

At `/app/admin/`, behind Google sign-in. Roles are enforced by the database, not
by hiding buttons: if the panel and the database ever disagree, the database wins.

| Address                  | Screen                                                  | Who may write           |
| ------------------------ | ------------------------------------------------------- | ----------------------- |
| `/admin`                 | Matches, each saying what it still needs                | sporting, general       |
| `/admin/partidos/:id`    | The match sheet: result, who played, goals, goalkeepers | sporting, general       |
| `/admin/equipos`         | Teams and rosters                                       | sporting, general       |
| `/admin/fixture`         | Dates, times, cabeceras, teams                          | sporting, general       |
| `/admin/sponsors`        | Sponsors and their logos                                | communications, general |
| `/admin/fotos`           | The gallery                                             | communications, general |
| `/admin/temporadas`      | Seasons and competitions                                | general                 |
| `/admin/administradores` | Who administers, and with which role                    | general                 |
| `/admin/visitas`         | How much the site is used                               | all three               |

The three roles: **general administrator** (everything), **sporting management**
(the sport, not the content), **communications** (the content, not the results).
`ushuaiabl@gmail.com` is the founding owner in code, so the league cannot be locked
out of an empty administrator table.

---

## 4. Where the data lives

Fifteen tables. Row level security is per table, so a new one is private until a
policy says otherwise.

| Group              | Tables                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Structure          | `seasons`, `competitions`                                                                     |
| Sport              | `teams`, `players`, `team_players`, `matches`, `match_players`, `match_goals`, `goalie_lines` |
| Transcribed totals | `published_player_stats`, `published_goalie_stats`                                            |
| Content            | `sponsors`, `photos`                                                                          |
| Operation          | `admins`, `page_views`                                                                        |

**Nothing that can be added up is stored.** Standings, scoring, goalkeeping and
playoff progression are computed from match records every time they are read. The
two `published_*` tables are the exception and they are honest about it: they are a
transcription of a sheet, dated, kept because 2026 has no per-goal record to derive
from.

**What is never stored, by decision:** a national ID, a date of birth, a telephone
number, an address, or payment status. The registration sheets contain them; the
organisation's own document rules them out.

### The two sources, one shape

The site reads Supabase when it can and the versioned snapshot in `src/data/` when
it cannot, and a component cannot tell which it got. That is not a fallback bolted
on: the free tier pauses a project after about a week of inactivity and this league
plays every two to four weeks, so a sleeping database is a normal Tuesday.

The importer runs `docs/sources/` → `scripts/parsed/` → `src/data/seed-2026.ts` →
`supabase/seed/season-2026.sql`. `docs/sources/` is the only copy of the league's
original material and nothing ever writes to it.

---

## 5. What can be seen about how it is used

The site is static, so there are no server logs anywhere. Everything below is a
deliberate choice about what to count.

### Today

`/admin/visitas` counts **which screen was opened, and on what day**. Nothing else:
no address, no browser, no referrer, no session, no identifier. The day is the
league's own day, Ushuaia time. Written only by `record_view`, a function that adds
one to a counter and can do nothing else; visitors have no access to the table
itself.

The numbers are indicative rather than audited: anybody can call that function in a
loop, a browser that blocks the request is never counted, and the panel counts
itself.

### What cannot be measured from here, and why

| Wanted                                | Status                                                                                                                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone or computer                     | Possible without identifying anybody.                                                                                                                                                                                        |
| Direct entry, or which site sent them | Possible: the referrer's host, not the full address.                                                                                                                                                                         |
| Every sign-in to the panel            | Possible: an administrator is authenticated already, so it is their own action being recorded.                                                                                                                               |
| Country and city                      | **Not possible as things stand.** It needs the visitor's address, and no server of ours ever sees one. The only routes are a third party the browser asks, or moving the site behind something that resolves it at the edge. |
| Whether a person came back            | **Possible only by giving each browser an identifier** and keeping it. That is the line where the site stops holding nothing about anybody, and where the sentence it prints on screen would have to change.                 |

The last two are decisions about what the league promises its players, not
technical details, which is why they are written here rather than quietly
implemented.

---

## 6. What checks the work

| Check                                   | What it catches                                                                                      | Runs                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `npm run lint`                          | Style and dead code                                                                                  | Every PR and deploy                      |
| `npm run typecheck`                     | Types, including a column the database does not have                                                 | Every PR and deploy                      |
| `npm test -- --run`                     | 748 cases over the rules, the screens and the seed                                                   | Every PR and deploy                      |
| `npm run build`                         | The stricter compile the app config applies                                                          | Every PR and deploy                      |
| `npm run smoke:queries`                 | A select the library accepts and the service refuses. It cost a published site with no fixture once. | Every deploy, when the variables are set |
| `supabase/tests/row-level-security.sql` | Who may read and write what, asserted against the real database                                      | By hand                                  |
| `supabase/tests/query-columns.sql`      | Every column and embed the code asks for                                                             | By hand                                  |
| `keepalive.yml`                         | Wakes the database weekly so the free tier does not pause it                                         | Mondays                                  |

The two SQL files are not in CI because they need a database connection this
repository must not carry. That is a real gap rather than a decision to be proud
of.

---

## 7. What is still missing

Not code, mostly. `plan.md` keeps the list current: the playoff format, the four
women's team names, the remaining data questions, and a backup for anything entered
through the panel, which today exists in one place only.
