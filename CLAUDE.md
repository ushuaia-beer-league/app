# Ushuaia Beer League — Repository Guide

## Purpose

Public website and back office for the Ushuaia Beer League, a recreational
ice-hockey league in Ushuaia, Tierra del Fuego. React + Vite + TypeScript single
page application deployed to GitHub Pages, with Supabase for data, auth and
storage.

Target URL: https://ushuaia-beer-league.github.io/app/

Read `docs/knowledge-base.md` before changing anything that touches the domain.
It holds the rulebook, the 2026 data, the organisation's functional document and
the open questions. `docs/plan.md` holds the delivery plan and its current phase.

## Status

Every phase of `docs/plan.md` is implemented: the public site, the back office
with its match sheet and its forms for seasons, teams, rosters, fixture,
sponsors, photographs and administrators, the playoff bracket, the row-level
security checks and `ADMIN.md`. The schema and the 2026 season are applied to
Supabase and mirrored in the versioned seed, so every command below exists and
all four validations pass.

What is left is not code. `docs/plan.md` keeps that list current: the Google
OAuth client, the two repository variables that give a build its database
connection, the league's own images, and the open questions in
`knowledge-base.md` section 9.

## Language

Everything in this repository is written in **English**: code, comments, file
names, documentation and commit messages. Three exceptions: user-facing UI
strings, which are Spanish because the league is Argentine; verbatim quotes of
the league's rulebook, which must never be translated; and `docs/ADMIN.md`, which
is Spanish because the people who operate the panel read Spanish, and a manual
its reader cannot read is not a manual.

The importer's `matches.notes` are English, like the rest of the data, and are
deliberately **not** rendered on the public site: what a visitor needs from a gap
is shown in Spanish beside it.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

All four validations must pass before committing. Pushing `main` triggers the
Pages deploy, which runs them again and refuses to publish otherwise.

## Architecture

Business rules live in pure modules under `src/utils`, never inside React
components. Tournament data is never hardcoded in UI files.

Planned layout:

- `src/data/` — domain types and the versioned seed snapshot.
- `src/utils/` — standings, statistics, goalkeeping, playoffs, each with tests.
- `src/components/` — presentation only.
- `src/admin/` — the back office, served at `/admin/`.
- `supabase/migrations/` — the schema and row level security, versioned.
- `scripts/` — import from `docs/sources/` and seed regeneration.
- `docs/sources/` — original league material. **Read only. Never edit.**

## Domain rules that differ from ordinary hockey

These are the rules this league actually uses. Getting them wrong silently
corrupts every table on the site.

- A win is worth **2 points**, not 3. A shootout loss is worth **1**. A
  regulation loss is **0**.
- A shootout win pays the same as a regulation win, but the two are stored apart
  because **PGR** (wins outside a shootout) is the first tiebreaker.
- Tiebreaking order: points, then PGR, then goal difference. There is **no**
  mini-table among tied teams.
- **Draws exist**, at least in the women's competition, and one is on record.
  Never model a tie as impossible.
- Two matches run **simultaneously in two venues**, called cabeceras: Bahía and
  Poli. Never assume one match per time slot.
- Discipline is a penalty shot or leaving the game, per the league's ten
  commandments. There are **no penalty minutes** and no accumulation-based
  suspensions.
- Save percentage is computed as `(shots faced - goals against) / shots faced`.
  Shots faced are recorded on the sheet; the percentage is never stored.
- Rosters are mixed: women play in the Beer League. The Women's Beer League is a
  separate competition whose four teams draw players from several Beer League
  teams, so a person can appear in two competitions with different teams.
- Substitutes are not roster players. A **franchise player** may only appear once
  per match, and in the playoffs a team may only request a substitute when it has
  five players or fewer.

## Data integrity

- Standings, scoring leaders, goalkeeping and playoff progression are **derived**
  from match records at read time. Never persist an aggregate.
- Preserve incomplete facts visibly. If the source sheet does not say who scored,
  the record is published with the gap showing, never with an invented name.
- The site must render from the versioned seed when Supabase is unreachable. The
  free tier pauses after inactivity, so an empty database is a normal state, not
  an error.
- `docs/sources/` is the irreplaceable original material. Imports read from it;
  nothing writes to it.

## Privacy

Never store, log or display a national ID number, a date of birth, a phone
number, a home address or payment status. The functional document rules them out
and the registration sheets contain them.

Never put a password, an API secret or a service-role key in the client. The
reference HTML checks a password in the browser; that is the anti-pattern this
project exists to replace. Only the Supabase project URL and the anon key belong
in the code, because both are public by design and security rests on row level
security.

## Supabase

- Project owned by `ushuaiabl@gmail.com`, region `sa-east-1`.
- Sign-in is Google. Administrators are rows in `admins`, keyed by lower-case
  email, carrying a role: general administrator, sporting management, or
  communications.
- `ushuaiabl@gmail.com` stays hardcoded as founding owner so the league cannot be
  locked out and the first administrator can be added to an empty table.
- Row level security is per table, not a catch-all: a new table is private until
  a policy grants access. Public read on sporting data only.
- Migrations are versioned under `supabase/migrations/` and applied through the
  CLI. A permission change is not done until the policy changes; hiding a button
  in the panel is not enforcement.
- A migration is not finished until `src/data/database.types.ts` is regenerated
  from it. That file is what makes `npm run typecheck` reject a column the
  database does not have, and a stale one vouches for a schema that has moved.
  `supabase/tests/query-columns.sql` is the check that does not depend on anybody
  remembering, because it reads the live catalogue; run it after a schema change.

## Git

- Branches: `<type>/<description>`, using feat, fix, chore, docs, refactor, test.
- Commits: `<type>: <summary>`, single line, imperative, English. Never add a
  co-author trailer or any tooling attribution.
- Commits are GPG signed. Never use `--no-verify`.
- Never force push to `main`.
- Use SSH for every git operation. Never embed a token in a remote URL.
