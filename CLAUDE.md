# Ushuaia Beer League — Repository Guide

## Purpose

Public website and back office for the Ushuaia Beer League, a recreational
ice-hockey league in Ushuaia, Tierra del Fuego. React + Vite + TypeScript single
page application deployed to Cloudflare Pages, with Supabase for data, auth and
storage.

Target URL: https://ubl.com.ar (Cloudflare Pages; live at
https://ushuaia-beer-league.pages.dev until NIC.ar delegates the domain).

## Hosting, and how a change reaches the world

- **Production is Cloudflare Pages**, deployed with
  `CF_PAGES=1 npx vite build && npx wrangler@3 pages deploy dist
--project-name=ushuaia-beer-league --branch=main`, using
  `CLOUDFLARE_API_TOKEN` read from `~/.ubl-cf-token` (never echo it) and account
  `9b8308fc3ebe0e1792495ec68371975a`. There is no git-connected build yet; a
  deploy is an explicit act.
- **Workflow: no pull requests.** Validate, commit to `main`, push, deploy.
  The owner asked for this in so many words on 2026-08-06.
- **GitHub Pages is frozen, on purpose.** `github.io/app/` serves its last build,
  whose `canonical` names `ubl.com.ar`, so old links keep working and hand their
  weight to the real address. The deploy workflow was removed on 2026-08-07;
  `ci.yml` still validates every push. Do not resurrect the deploy.
- **Vercel is the preview** (`ushuaia-beer-league.vercel.app`, `noindex`), to be
  deleted once the Cloudflare setup is confirmed stable.
- **DNS for the domain is deliberately NOT proxied** (grey cloud). The orange
  proxy in front of Pages mixed cached HTML from one deploy with assets of
  another and produced intermittent blank pages. Do not re-enable it. HTML ships
  `max-age=0, must-revalidate`; hashed assets are immutable. After each deploy,
  CI runs `npm run smoke:pages` against the live domain, with a retry because a
  seconds-long propagation window is normal.
- **Per-host mechanics live in `vite.config.ts`**: the base path, the deep-link
  fallback (`404.html` for GitHub, `_redirects` for Cloudflare — never both on
  one host), the security headers (`_headers`, Cloudflare only) and the preview's
  own card. Each host detects itself; no build flag has to be remembered.

## Languages

The public site speaks Spanish (default, always — the browser's language is
deliberately not consulted), English and Brazilian Portuguese. Two hard rules:

- **The key of every string is its Spanish text** (`src/i18n/es.ts` is a list of
  keys; Spanish needs no catalogue). Other languages are typed against it, so an
  incomplete catalogue fails `npm run typecheck`. Adding a language is one file.
- **The ten commandments are never translated**, in any language. They are
  literals in `HistorySection`, not catalogue keys, and a test enforces it.

## Analytics

Two systems, deliberately both. The league's own counters (`page_views`,
`visit_facts`) hold no identifier of any kind and are written only through two
locked-down functions. Google Analytics (`VITE_GA4_ID` in `.env.production`) was
added at the league's request on 2026-08-06: it does identify, so the panel and
`docs/ADMIN.md` say so — never let those texts drift back to the old promise.
GA4 is disabled on `.vercel.app` and localhost so previews never pollute the
real numbers, and it reports each route change itself (`send_page_view: false`).

The league's own explanation of the system lives in **`src/admin/manual.ts`**,
in Spanish, with no code in it: what is calculated, what is transcribed, why a
gap is shown instead of filled, and which rules of this league differ from
hockey's. That file is the only copy. The panel renders it at `/admin/manual`
for every role, each screen links to the section that explains it, and
`npm run build:manual` writes `docs/COMO-FUNCIONA.md` from it for the people who
read it on GitHub. `manual.test.ts` fails when the committed file stops
matching, so never edit that file by hand. Keep the manual true when behaviour
changes: it is linked from the screens, so a wrong sentence is read at the exact
moment somebody trusts it.

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

All four validations must pass before committing. `ci.yml` runs them again on
every push; publishing is the explicit wrangler deploy described above.

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

- **Team slugs are identity and the panel can still rename them.** On 2026-08-07
  an operator renamed the four women's slugs to sponsor names and every join
  keyed by slug (rosters, crests) silently broke. `RENAMED_SLUGS` /
  `canonicalSlug()` in `src/data/teams-2026.ts` is the bridge; route any new
  slug-keyed lookup through it, and keep `rosters.test.ts`'s rename suite
  passing. The durable fix — freezing a slug once referenced — is pending panel
  work.

- **The seed only answers when the database cannot.** On 2026-08-07 an operator
  updated a roster and the public site kept showing the old one: the season
  source still handed `SEED_2026.players`/`rosters` behind a phase-3 comment
  ("no view needs them") that had stopped being true. When a saved change does
  not appear, grep for `SEED_2026` outside the fallback path before debugging
  the save. Every new panel-editable table must be read by `loadSeason` the
  day the panel learns to write it.

- **Never encode a limit the sources only imply.** The franchise flag was capped
  three ways in one week (one per match, then one per side, then no cap at all)
  and every cap came from reading the rulebook rather than asking the league,
  which finally said teams had two and one and that the concern is balance, not
  a count. A constraint that refuses a real match sheet stops the league from
  recording a night that happened. Record the fact, report its shape, and refuse
  nothing until the owners state the rule.

- **A panel rule about a constraint moves with the constraint.** Shipping the UI
  half alone hands the operator a database error they cannot act on; shipping
  the migration alone leaves the panel refusing what the base now allows. Apply
  the migration first, after checking no existing row violates it, then merge
  the code, or hold both and split the urgent half into its own pull request.

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
