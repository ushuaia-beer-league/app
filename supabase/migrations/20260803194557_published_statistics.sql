-- Ushuaia Beer League — the statistics tables the league itself published.
--
-- Phase 2, step 8 of docs/plan.md, and the one place in this schema where a
-- season total is written down. Read the next three paragraphs before touching
-- anything here, because at first sight this file looks like the thing CLAUDE.md
-- forbids.
--
-- CLAUDE.md forbids persisting an *aggregate*: "Standings, scoring leaders,
-- goalkeeping and playoff progression are derived from match records at read
-- time. Never persist an aggregate." These two tables do not hold that. They
-- hold a transcription of a document the league published — the Jugadores and
-- Arqueros sheets of the league spreadsheet, exported to
-- docs/sources/spreadsheet-export/ — which is a primary fact in exactly the same
-- sense as public.matches.home_goals: the score of a match is what the sheet
-- says, not a count of match_goals rows. Nothing in these tables is computed
-- from anything else in this database, and nothing in this database is computed
-- from these tables. Standings, scoring leaders and goalkeeping keep coming from
-- matches, match_goals and goalie_lines through src/utils, untouched.
--
-- Why the transcription is needed at all: the sources carry no per-match goal or
-- goalkeeper record. docs/sources/ has the fixture with its scores
-- (fixture-2026-calendar.csv), the rosters (teams.html), and season *totals* per
-- player and per goalkeeper (player-stats.html, goalie-stats.html,
-- wubl-player-stats.html, wubl-goalie-stats.html). There is no sheet naming who
-- scored which goal, so match_goals and goalie_lines cannot be populated for
-- 2026 and the derived scoring and goalkeeping tables would be empty. Without
-- this file the site would publish blank statistics pages while the league has
-- had the numbers up for a month.
--
-- How the site treats them: as "published totals as of <published_on>",
-- attributed to their source file, never mixed into a derived table and never
-- silently summed with one. As the back office enters real match sheets, the
-- derived tables take over and these rows stay behind as what the league said on
-- that date. A row here that disagrees with what match_goals eventually adds up
-- to is a finding about the sheet, to be reported, not an error to be corrected
-- away — the same treatment docs/plan.md step 8 already prescribes for the
-- import, and the same treatment src/utils/fixtures/season-2026.ts already gives
-- to the one standings cell that does not reconcile.
--
-- Two more things govern every column below.
--
--  * The printed text is kept verbatim, and the resolution to a player or a team
--    is a separate, nullable, foreign-keyed column. The exports truncate names
--    ("Beltrami Ramir" for Beltrami Ramiro, "Zayas Marce" for Zayas Marcelo,
--    "Amaolo Lanata Euge" for Amaolo Lanata Eugenia), lower-case some of them
--    ("bernales joaqu"), reverse others ("Martin lopez mieres"), and put a
--    substitute marker where a team should be ("Sup (Zambirreras)",
--    "Suplente ( Sucucho)", "Beerizar Rompehielos T9 (sup)") or nothing at all.
--    A row the importer cannot match with confidence is stored with its printed
--    text and a null reference. Never invent a match.
--  * The table and its policies ship in one file, per the supabase-schema skill,
--    so the tables are never reachable before the policies exist. The helper
--    functions and the private schema they live in were created in
--    20260803190531_row_level_security.sql and are only used here.

-- ---------------------------------------------------------------------------
-- published_player_stats — the Jugadores sheet, one row per printed line
-- ---------------------------------------------------------------------------

create table public.published_player_stats (
  -- A surrogate key, as in match_goals: the natural key is the printed name,
  -- and a printed name is a truncation that two different people could share.
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete restrict,
  competition_key text not null references public.competitions (key) on update cascade,
  published_on date not null,
  source_file text not null,
  printed_player_name text not null,
  printed_team text,
  player_id uuid references public.players (id) on delete restrict,
  team_id uuid,
  assists smallint not null,
  goals smallint not null,
  points smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The composite target, as in team_players and matches: a WUBL line can only
  -- resolve to a WUBL team. Under the default MATCH SIMPLE semantics a null
  -- team_id leaves the whole reference unchecked, which is what an unresolved
  -- row needs.
  constraint published_player_stats_team_fkey foreign key (team_id, competition_key)
    references public.teams (id, competition_key) on update cascade,
  -- One line per printed name per snapshot. This is what makes re-running the
  -- importer over the same export idempotent instead of doubling every row,
  -- which is the likeliest way to corrupt this table. It holds for the four
  -- 2026 exports: no printed name repeats inside any of them. If a future sheet
  -- ever prints one twice — two people truncated to the same string — the import
  -- must fail loudly here rather than drop a line, and the fix is to widen the
  -- key, not to merge the rows.
  constraint published_player_stats_snapshot_unique
    unique (season_id, competition_key, published_on, printed_player_name),
  -- The exports end in blank spreadsheet rows. They are not players and they are
  -- not gaps either; the importer skips them and this refuses them.
  constraint published_player_stats_printed_name_present
    check (length(btrim(printed_player_name)) > 0),
  -- An empty Equipo cell is stored as null, never as an empty string, so
  -- "the sheet named no team" has exactly one representation.
  constraint published_player_stats_printed_team_present
    check (printed_team is null or length(btrim(printed_team)) > 0),
  constraint published_player_stats_source_file_present
    check (length(btrim(source_file)) > 0),
  -- The league was founded in 2023 (knowledge base 1); the bounds are only a
  -- typo guard, so a snapshot cannot be filed under year 26 or 20260.
  constraint published_player_stats_published_on_range
    check (published_on between date '2023-01-01' and date '2100-01-01'),
  -- Deliberately not "points = goals + assists". See the comment on points.
  constraint published_player_stats_totals_non_negative
    check (assists >= 0 and goals >= 0 and points >= 0)
);

comment on table public.published_player_stats is
  'The league''s own scoring table, transcribed line by line as it is printed (knowledge base 6.6 and 6.8). Not an aggregate of our match records and never compared against one silently: the sources carry no per-goal record for 2026, so match_goals is empty and this is the only scoring fact that exists. Versioned by published_on, so the same player has one row per snapshot and the history of what was published survives.';
comment on column public.published_player_stats.published_on is
  'The date the league published this snapshot. Part of the key, not metadata: a later sheet does not replace an earlier one, it is another row, and the site shows the totals "as of" this date.';
comment on column public.published_player_stats.source_file is
  'The file under docs/sources/ this line was read from, for example spreadsheet-export/player-stats.html. Free text rather than a checked vocabulary because the next snapshot may arrive as a different export, a PDF or a photograph.';
comment on column public.published_player_stats.printed_player_name is
  'The name exactly as the sheet prints it, truncation, casing and punctuation included ("Beltrami Ramir", "Amaolo Lanata, Euge", "bernales joaqu"). Never cleaned up: this string is the evidence, and player_id is the interpretation.';
comment on column public.published_player_stats.printed_team is
  'The Equipo cell exactly as printed, which is not always a team: it carries substitute markers ("Sup (Zambirreras)", "Suplente ( Sucucho)", "Blancaspuma y las 7 pintas (sup)") and is empty for the four lines the sheet gives no team at all (Durrieu Felix, Tibaudin Ana J, Corales Jonathan, Dana Gonzales). Null means the cell was empty. There is no is_substitute column: the marker lives inside this string, and turning it into a boolean is a reading the site does for display, not a fact the sheet states.';
comment on column public.published_player_stats.player_id is
  'The player this line was matched to, or null when it could not be matched with confidence. The truncated names and the Cavalleri / Cavaliere pair (open question 8) guarantee some nulls, and a null published beside the printed name is the correct outcome, not a defect.';
comment on column public.published_player_stats.team_id is
  'The team the printed Equipo cell was matched to, or null. Resolved from printed_team alone: inferring a team from the season roster instead would be this table asserting something its source does not say.';
comment on column public.published_player_stats.assists is
  'Asistencias as printed. The export leaves the cell blank rather than writing 0, and the printed Puntos column proves a blank is a zero: it reads 0 exactly on the lines where both Asistencias and Goles are blank. So a blank is stored as 0, which is a reading of the sheet and not an invention; the same applies to goals.';
comment on column public.published_player_stats.points is
  'Puntos as printed. The sheet computes it as goals plus assists and every 2026 line agrees, but the printed value is what is stored, because this table transcribes rather than recomputes. The site may show this column or the sum of the other two; if they ever disagree that is a finding about the sheet to report, not a bug to fix, and no constraint here forces them to agree.';

-- season_id needs no index of its own: it is the leftmost column of
-- published_player_stats_snapshot_unique, whose index also serves the
-- (season, competition, publication date) read prefix.
--
-- This one covers the competition_key foreign key, which cascades on update,
-- and the read the site actually makes: the latest snapshot of one competition.
create index published_player_stats_read_idx
  on public.published_player_stats (competition_key, season_id, published_on desc);

-- Partial, as in match_goals, because a join to a player or a team only ever
-- concerns the rows that resolved, and unresolved rows are expected.
create index published_player_stats_player_id_idx
  on public.published_player_stats (player_id) where player_id is not null;
create index published_player_stats_team_id_idx
  on public.published_player_stats (team_id) where team_id is not null;

create trigger published_player_stats_set_updated_at
  before update on public.published_player_stats
  for each row execute function private.set_updated_at();

alter table public.published_player_stats enable row level security;

-- ---------------------------------------------------------------------------
-- published_goalie_stats — the Arqueros sheet, one row per printed line
--
-- The same shape and the same rules as above, with the goalkeeper's three
-- numbers instead of the skater's three. There is deliberately no save
-- percentage column: see the table comment.
-- ---------------------------------------------------------------------------

create table public.published_goalie_stats (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete restrict,
  competition_key text not null references public.competitions (key) on update cascade,
  published_on date not null,
  source_file text not null,
  printed_player_name text not null,
  printed_team text,
  player_id uuid references public.players (id) on delete restrict,
  team_id uuid,
  games_played smallint not null,
  shots_faced smallint not null,
  goals_against smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_goalie_stats_team_fkey foreign key (team_id, competition_key)
    references public.teams (id, competition_key) on update cascade,
  constraint published_goalie_stats_snapshot_unique
    unique (season_id, competition_key, published_on, printed_player_name),
  constraint published_goalie_stats_printed_name_present
    check (length(btrim(printed_player_name)) > 0),
  constraint published_goalie_stats_printed_team_present
    check (printed_team is null or length(btrim(printed_team)) > 0),
  constraint published_goalie_stats_source_file_present
    check (length(btrim(source_file)) > 0),
  constraint published_goalie_stats_published_on_range
    check (published_on between date '2023-01-01' and date '2100-01-01'),
  constraint published_goalie_stats_totals_non_negative
    check (games_played >= 0 and shots_faced >= 0 and goals_against >= 0),
  -- Every goal conceded was a shot faced, so the reverse is always a
  -- transcription error. All eleven published 2026 rows satisfy it (knowledge
  -- base 6.7 and 6.9), which is what makes this safe to enforce on a
  -- transcription: it rejects typing mistakes, not the league's own numbers.
  constraint published_goalie_stats_goals_within_shots
    check (goals_against <= shots_faced)
);

comment on table public.published_goalie_stats is
  'The league''s own goalkeeper table, transcribed line by line as it is printed (knowledge base 6.7 and 6.9). No save percentage column, for the same reason goalie_lines has none: the sheet prints it rounded to a whole percent, all eleven printed values reconcile with shots faced and goals against under (shots - goals) / shots, so the column would carry no fact these two do not already carry and could only become a second version of the truth. The site computes it, as knowledge base 6.7 instructs.';
comment on column public.published_goalie_stats.published_on is
  'The date the league published this snapshot. Part of the key: a later sheet is another row, not a replacement.';
comment on column public.published_goalie_stats.printed_player_name is
  'The name exactly as printed, truncation included ("Zayas Marce" for Zayas Marcelo, "Amaolo Lanata Euge" for Amaolo Lanata Eugenia). "Cavaliere Milag" here against "Cavalleri Milagros" on the player sheet is precisely the discrepancy open question 8 exists to settle, and keeping both strings verbatim is what keeps the question answerable.';
comment on column public.published_goalie_stats.printed_team is
  'The Equipo cell exactly as printed, substitute markers and all ("Suplente ( Beerizar)", "Beerizar Rompehielos T9 (sup)"). Null when the cell was empty.';
comment on column public.published_goalie_stats.player_id is
  'The goalkeeper this line was matched to, or null when it could not be matched with confidence.';
comment on column public.published_goalie_stats.team_id is
  'The team the printed Equipo cell was matched to, or null. Resolved from printed_team alone.';
comment on column public.published_goalie_stats.games_played is
  'PJ as printed. Not a count of goalie_lines rows and never reconciled against one silently: for 2026 there are no goalie_lines at all, and when there are, a disagreement is a finding to report.';
comment on column public.published_goalie_stats.shots_faced is
  'Tiros recibidos as printed. shots_faced = 0 is legal, and the save percentage the site computes from it is then undefined rather than zero.';

create index published_goalie_stats_read_idx
  on public.published_goalie_stats (competition_key, season_id, published_on desc);

create index published_goalie_stats_player_id_idx
  on public.published_goalie_stats (player_id) where player_id is not null;
create index published_goalie_stats_team_id_idx
  on public.published_goalie_stats (team_id) where team_id is not null;

create trigger published_goalie_stats_set_updated_at
  before update on public.published_goalie_stats
  for each row execute function private.set_updated_at();

alter table public.published_goalie_stats enable row level security;

-- ---------------------------------------------------------------------------
-- Table privileges
--
-- Revoked before granted, as in 20260803190531_row_level_security.sql: anon must
-- not even hold the INSERT privilege, so a future mistake in a policy cannot
-- become a public write.
-- ---------------------------------------------------------------------------

revoke all on table
  public.published_player_stats,
  public.published_goalie_stats
from anon, authenticated;

grant select on table
  public.published_player_stats,
  public.published_goalie_stats
to anon, authenticated;

grant insert, update, delete on table
  public.published_player_stats,
  public.published_goalie_stats
to authenticated;

-- ---------------------------------------------------------------------------
-- published_player_stats — read by anyone, written by sporting management
--
-- Statistics are sporting data, so the roles are the ones knowledge base 7.4
-- gives the fixture and the results: the general administrator and sporting
-- management write, communications does not. Public read is safe because a line
-- holds nothing but a name, a team and three numbers, all of them already on the
-- league's public sheet.
-- ---------------------------------------------------------------------------

create policy published_player_stats_select_public on public.published_player_stats
  for select to anon, authenticated
  using (true);

create policy published_player_stats_insert_sport_admin on public.published_player_stats
  for insert to authenticated
  with check ((select private.can_manage_sport()));

create policy published_player_stats_update_sport_admin on public.published_player_stats
  for update to authenticated
  using ((select private.can_manage_sport()))
  with check ((select private.can_manage_sport()));

create policy published_player_stats_delete_sport_admin on public.published_player_stats
  for delete to authenticated
  using ((select private.can_manage_sport()));

-- ---------------------------------------------------------------------------
-- published_goalie_stats — read by anyone, written by sporting management
-- ---------------------------------------------------------------------------

create policy published_goalie_stats_select_public on public.published_goalie_stats
  for select to anon, authenticated
  using (true);

create policy published_goalie_stats_insert_sport_admin on public.published_goalie_stats
  for insert to authenticated
  with check ((select private.can_manage_sport()));

create policy published_goalie_stats_update_sport_admin on public.published_goalie_stats
  for update to authenticated
  using ((select private.can_manage_sport()))
  with check ((select private.can_manage_sport()));

create policy published_goalie_stats_delete_sport_admin on public.published_goalie_stats
  for delete to authenticated
  using ((select private.can_manage_sport()));
