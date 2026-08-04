# UBL delivery plan: from zero to production

Status: **approved**. Written 3 August 2026, and the state below is where it got
to on the same day.

Done: every phase, 0 to 5. The public site is live and shows the whole 2026
season; the schema, the row level security and the season are applied to
Supabase; the playoff bracket fills itself from the results. The back office has
its sign-in, the matches list, the match sheet, and the forms for seasons, teams,
rosters, fixture, sponsors, photographs and administrators. The
row-level-security checks are a re-runnable file, `supabase/tests/row-level-security.sql`,
asserted against the real database but not in CI, because that needs a database
connection this repository must not carry. Beside it,
`supabase/tests/query-columns.sql` asserts that every column and every embed the
code asks for is present, which is the one class of failure the unit tests cannot
catch: they mock the client, so a renamed column passes every check in the
repository and breaks the panel in the browser.

On 4 August 2026 the versioned seed and the database agreed on all forty fixture
rows: date, time, cabecera, competition, stage, both teams, score and resolution.
That is worth knowing because the site serves whichever of the two it can reach,
and it is deliberately not a check in CI: the moment the league records a result
in the panel the database moves ahead of the snapshot, so divergence becomes the
normal state rather than a fault.

Three things block the rest, and none of them is code:

1. **Google sign-in is half configured.** The OAuth client exists: project
   `beer-league-504419` under `ushuaiabl@gmail.com`, consent screen published in
   production with only the three basic scopes, client `UBL back office` with the
   redirect `https://wqgmdjmdobgcrioxlhkl.supabase.co/auth/v1/callback` verified
   against the saved client. What is missing is the Supabase half, which needs
   somebody signed in to the dashboard: paste the client id and secret into
   Authentication > Providers > Google, and set the site URL and the two redirect
   URLs under URL Configuration. The client secret was created in a session that
   recorded it, so generate a fresh one from that client rather than reusing it.
2. **`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are not set** as repository
   variables, so every build ships without a database connection: the public site
   serves the versioned seed and the panel says there is nothing to sign in to.
   Setting them needs the account that owns the repository, because a collaborator
   on a personal repository has no admin role to delegate. Committing
   `.env.production` is the route that needs only push, and it works: until
   3 August 2026 the deploy passed both values as environment variables even when
   the repository variables were empty, and Vite lets the environment win over an
   env file, so a committed file was silently ignored.
3. **The league's own material** — a transparent crest, a photograph of the rink,
   sponsor logos, gallery photographs — and the answers to the open questions in
   `knowledge-base.md` section 9.

## Target

`https://ushuaia-beer-league.github.io/app/` serving the public site (the design
already drafted in the reference HTML), a back office behind Google sign-in, and
the full 2026 season loaded. Free of charge throughout: GitHub Pages plus the
Supabase free tier, both owned by `ushuaiabl@gmail.com`.

Companion to `knowledge-base.md`, which holds the domain detail, the data and the
open questions.

---

## Phase 0 — Infrastructure (half a day)

1. **Repository**: initialise git in `/Users/braianmellor/Work/BeerLeague`, point
   it at `ushuaia-beer-league/app`, scaffold Vite + React + TypeScript, ESLint,
   Vitest, a GitHub Actions pipeline (lint, typecheck, test, build) and a Pages
   deploy on push to `main`. Base path `/app/` plus a 404 fallback so SPA routes
   resolve.
2. **Supabase**: new project on the `ushuaiabl@gmail.com` account, region
   `sa-east-1` (São Paulo). CLI linked to the repo so migrations are versioned.
3. **Google OAuth**: create an OAuth client in Google Cloud (same account) and
   paste it into Supabase Auth so sign-in works with Gmail. The only piece of
   paperwork in the whole plan.

Step 1 is done: the scaffold, ESLint, Vitest, the pull-request pipeline and the
Pages deploy are in the repository, and the site builds under `/app/` with a
`404.html` fallback. Steps 2 and 3 wait on the account.

**Needed from Braian**: access to `ushuaiabl@gmail.com` when the Supabase
project and the OAuth client are created, and that account as an owner of the
GitHub organisation rather than a guest.

## Phase 1 — Schema and business logic (1 day)

4. **SQL migrations**: `seasons`, `competitions` (beer, wubl, room for milkshake
   and all-stars), `teams` (short name, sponsored full name, colour, logo),
   `players` (name, gender, level, position), `team_players` (roster per season,
   with jersey number), `matches` (date, time, **venue Bahía/Poli**, status,
   resolution: regulation / shootout / **draw**, franchise-substitute flag),
   `match_players`, `match_goals` (scorer plus assist), `goalie_lines` (shots
   faced, goals against), `admins` (email and role).
5. **Row level security**: public read on sporting data, writes restricted to
   the emails in `admins`, with the functional document's three roles (general,
   sporting management, communications). A founding owner
   (`ushuaiabl@gmail.com`) hardcoded so the league can never be locked out,
   which is the lesson carried over from CFM.
6. **Pure logic with tests** (deliberately not copied from CFM, the rules
   differ): standings with a win worth 2, a shootout loss worth 1, a draw worth 1
   in the women's competition, tiebreaking by PGR then goal difference; scoring
   leaders (goals plus assists); goalkeepers with save percentage computed as
   `(shots - goals) / shots`, checked against the nine real rows in the
   spreadsheet.

Step 6 is done. `src/utils` derives the three tables from match records, and the
tests reproduce what the league published on 4 July 2026: all eleven standings
rows in order, Rock Choppers above Blanco on PGR with the worse goal difference,
the women's draw, and all eleven goalkeeper percentages. One published cell does
not reconcile and is documented rather than smoothed over: Blanco is listed with
one regulation loss where the results give two, which its own PJ of 6 confirms.

## Phase 2 — 2026 fixture loaded (1 day)

7. **Import script** reading `docs/sources/`: seven Beer League teams plus four
   women's teams, roughly eighty players with jersey numbers, the five rounds
   played with their results (including the women's 4-4 and the shootout wins),
   the playoff rounds of 8 and 15 August with participants still undetermined,
   and the emergency date of 22 August.
8. Imported scoring and goalkeeping totals are reconciled against the tables the
   league already publishes. If a total does not add up the import says so
   instead of loading something plausible.
9. The imported data is also written back as a **versioned seed in the repo**, so
   if Supabase is unreachable or paused the site shows the last known snapshot
   instead of an empty page.

**Partially blocked**: the round-1 match with no teams and the misaligned columns
in round 5. Whatever reconciles gets imported; those two stay flagged as visible
gaps until the organisation answers.

## Phase 3 — Public site (2 to 3 days)

10. Port the reference design into components: hero, history, Leagues &
    Statistics (tabs for fixture, standings, scoring leaders, goalkeepers),
    playoff bracket, photos, sponsors, contact. Beer League and WUBL selector.
11. Extract design tokens from the reference HTML (colours, Bebas Neue and
    Barlow typography, card treatments) into CSS custom properties rather than
    copying its 294 KB of CSS. Same look, maintainable code.
12. Mobile first, which the functional document states outright.

## Phase 4 — Back office (2 to 3 days)

13. `/admin/` behind Google sign-in. Roles enforced by row level security, not by
    hiding buttons.
14. Organised by match, the same shape as the CFM panel already proven with real
    operators: a list of matches each stating what it still needs; opening one
    gives the result, who played, goals and assists, and the goalkeeper line.
15. Create and edit seasons, competitions, teams, rosters and the fixture (with
    venue).
16. **Sponsors and photos are loaded from the panel, never from the code.** This
    is the one part of the site whose content changes without a match being
    played, and the organisation has to be able to do it alone: upload a sponsor
    logo, write the name and the link, reorder them, retire one that has not
    renewed; upload photos to a season's gallery, caption them, delete one,
    choose which appear first. Nothing here is a deploy, and nothing here is a
    file in this repository.

    What it needs, none of which exists yet:

    - Tables `sponsors` and `photos`, per season, with their display order, and
      row level security in the same shape as the sporting tables: public read,
      writes restricted to administrators.
    - A Supabase Storage bucket for the images (1 GB free), public read, writes
      restricted the same way, with the panel resizing before upload so a phone
      photograph does not spend the whole quota.
    - The **communications** role finally getting something to write. Today
      `private.can_manage_sport()` and `private.can_manage_league()` cover the
      sporting and structural tables and communications can write nothing at
      all, which matches the functional document's role table (news, photos and
      sponsors) only because none of its tables have been built. These two
      tables get their own helper, and it is the first time that role means
      anything.
    - The gaps stay visible here too: a sponsor with no logo yet is published as
      a name, not hidden, and the gallery says it is empty rather than rendering
      six dashed placeholders for ever.

17. Administrator management inside the panel: add a Gmail address, pick a role,
    done.

## Phase 5 — Closing out (1 day)

18. Playoffs: the bracket fills itself from results (semifinals on 8 August into
    the finals on 15 August), champion recorded per competition.
19. Row-level-security tests against the real database, the full validation run
    (lint, typecheck, tests, build), and a two-page `ADMIN.md` so the
    organisation can operate without help, including how to load a sponsor and a
    photo. The sponsors and the photographs themselves are loaded by the
    organisation through the panel, which is also how that part of `ADMIN.md`
    gets tested.

## Out of scope for this version

Stages 6 to 8 of the organisation's document: player profiles with personal
accounts, the substitute pool with requests, registration and payments, and the
stadium project. The schema leaves room for them (a player is already a global
multi-season entity) but they are not built now.

---

## Risks and self-challenges

- **Can GitHub Pages host a site with a backend?** Yes, because the backend is
  Supabase called from the browser. But the Supabase free tier **pauses a project
  after roughly seven days of inactivity**, and this league plays every two to
  four weeks. Two mitigations: a weekly GitHub Actions cron that pings the
  database, and the versioned seed as a fallback. Without them the plan has a
  real hole.
- **Is Google sign-in enough?** For three to five administrators, yes. If one of
  them has no Gmail address, Supabase offers magic links with no extra work.
  There are no end users to authenticate in this version.
- **Does porting the HTML mean the site is already done?** No: it is the visual
  specification, not reusable code (in-memory data, password checked in the
  browser). The plan budgets porting it, not plugging it in. This is the easiest
  item in the plan to underestimate.
- **What if the source fixture holds more errors than the ones found?** Four are
  already known (the phantom row, the shifted columns, the duplicated number 28,
  Cavalleri versus Cavaliere). That is why the import reconciles against the
  published tables instead of trusting the sheet.
- **Final URL**: with the repository named `app` the site lives under `/app/`.
  Whenever the organisation wants, the custom domain is attached with a CNAME
  and no code changes.
- **Should the database linter's performance advice be applied?** Not as it
  stands, and this is a decision rather than an oversight. It reports six foreign
  keys on `(team_id, competition_key)` pairs with no covering composite index, and
  twenty-four indexes it calls unused. The second group is an artefact of a
  database nobody has queried yet: unused means unused so far, and dropping the
  index the fixture screen is about to need would be the wrong reading. The first
  group is real and does not matter at this size, where a season is on the order
  of a hundred matches and Postgres scans the table faster than it walks an index.
  Both are worth revisiting if a table ever reaches a scale where a plan changes;
  adding indexes now would only slow every write the panel makes. The security
  advisor is a different matter and is expected to stay empty.

## Estimate and release order

**Seven to nine days of effective work.** The public site with imported data
ships first, since that is what can be shown to the group immediately; the back
office follows.
