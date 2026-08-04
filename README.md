# Ushuaia Beer League

The website and back office of the Ushuaia Beer League, a recreational ice-hockey
league in Ushuaia, Tierra del Fuego, at the southern end of Argentina.

**https://ushuaia-beer-league.github.io/app/**

The public site shows the fixture, the standings, the scoring and goalkeeping
tables, the playoff bracket, the teams and their rosters. The back office, at
`/admin/`, is where the league records a match from the paper sheet and keeps the
teams, the seasons, the sponsors and the photographs up to date. Nothing on the
site is edited by editing this repository.

It runs on free infrastructure and is meant to keep running on it: a static build
on GitHub Pages, and Supabase for the data, the sign-in and the images.

## Running it

```bash
npm install
npm run dev
```

The four checks that have to pass before anything is committed, and that the
deploy runs again before publishing:

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

With no Supabase configuration the site still works: it renders the versioned
snapshot of the 2026 season in `src/data/`. That is deliberate rather than a
fallback bolted on, because the free tier pauses a project after a stretch of
inactivity, so an unreachable database is a normal Tuesday and not an outage.
`.env.production.example` explains the two public values a live build needs.

## How it is laid out

| Path                   |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| `src/data/`            | domain types and the versioned seed snapshot                      |
| `src/utils/`           | standings, statistics, goalkeeping, playoffs, each with its tests |
| `src/components/`      | the public site, presentation only                                |
| `src/admin/`           | the back office                                                   |
| `supabase/migrations/` | the schema and the row level security, versioned                  |
| `scripts/`             | the importer that reads `docs/sources/` and regenerates the seed  |
| `docs/sources/`        | the league's original material. Read only                         |

Every calculation lives in a pure module under `src/utils/` and is tested there.
No component computes a table, and no aggregate is ever stored: the standings,
the scoring leaders and the save percentages are derived from match records each
time they are read.

## The rules this league actually uses

They are not the ones hockey code usually assumes, and getting them wrong
produces tables that look plausible and are wrong:

- a win is worth **2** points, a shootout loss **1**, a regulation loss none;
- a shootout win pays the same as a regulation one, but the two are counted apart
  because wins outside a shootout are the first tiebreaker, ahead of goal
  difference;
- draws happen, and one is on record;
- two matches are played at the same time in two venues, Bahía and Poli;
- there are no penalty minutes: discipline is a penalty shot or leaving the game.

`docs/knowledge-base.md` holds the rulebook, the 2026 data and the questions the
organisation has not answered yet. `docs/plan.md` holds the delivery plan.
`docs/ADMIN.md` is the operating manual, written in Spanish because the people
who run the panel read Spanish.

## Incomplete on purpose

The league's spreadsheet has gaps: a fixture row with a time and a venue but no
teams, rounds where nobody wrote down who scored. Those gaps are published as
gaps, named on screen, never filled in with a plausible guess. A site that
invents a scorer is worse than a site that admits it does not know.

The same goes for what the site never records. No national ID, no date of birth,
no telephone number, no address, no payment status: the registration sheets
contain them, and the league's own functional document rules them out.
