# UBL delivery plan: from zero to production

Status: **approved**, Phase 0 under way. Written 3 August 2026.

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
15. Create and edit seasons, competitions, teams, rosters, the fixture (with
    venue), sponsors and the gallery (Supabase Storage, 1 GB free).
16. Administrator management inside the panel: add a Gmail address, pick a role,
    done.

## Phase 5 — Closing out (1 day)

17. Playoffs: the bracket fills itself from results (semifinals on 8 August into
    the finals on 15 August), champion recorded per competition.
18. Row-level-security tests against the real database, the full validation run
    (lint, typecheck, tests, build), the real history and sponsor content loaded,
    and a two-page `ADMIN.md` so the organisation can operate without help.

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

## Estimate and release order

**Seven to nine days of effective work.** The public site with imported data
ships first, since that is what can be shown to the group immediately; the back
office follows.
