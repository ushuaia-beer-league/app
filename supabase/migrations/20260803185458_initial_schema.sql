-- Ushuaia Beer League — initial schema.
--
-- Phase 1, step 4 of docs/plan.md. Row level security is enabled here, at
-- creation time, so no table is ever reachable before its policies exist; the
-- policies, the privilege grants and the helper functions land in
-- 20260803190531_row_level_security.sql.
--
-- Three rules govern every line of this file.
--
-- 1. No aggregate is ever stored. Points, standings, games played, goal
--    totals, scoring leaders and save percentage are computed from these rows
--    at read time (docs/knowledge-base.md 7.5), so no column here can drift
--    from the results behind it. Grep this file for "points" or "percentage"
--    and you will find them only in comments.
-- 2. No personal datum beyond a name is ever stored. There is no national ID,
--    date of birth, phone number, home address or payment status column
--    anywhere, and none may be added: see the privacy section of CLAUDE.md and
--    knowledge base 7.7.
-- 3. Every controlled vocabulary matches src/data/types.ts exactly:
--    competitions 'beer' and 'wubl'; venues 'bahia' and 'poli'; stages
--    'regular', 'playin', 'semifinal', 'final', 'third-place', 'fifth-place'
--    and 'all-star'; resolutions 'regulation', 'shootout' and 'draw'. A change
--    to one of these lists is a change to that file in the same commit.
--
-- Identifiers are uuid rather than bigint identity, against the usual
-- preference for identity keys, because the domain types in src/data/types.ts
-- declare `id: string` and the versioned seed in the repository has to carry
-- the same identifiers the database does. These tables hold hundreds of rows,
-- not millions, so v4 index fragmentation is irrelevant here.

create schema if not exists private;
revoke all on schema private from public;

comment on schema private is
  'Internal helpers. Never exposed through the API: PostgREST only serves the schemas configured for the project, and public is the only one there.';

-- Keeps updated_at honest without trusting the client to send it. The function
-- touches nothing but the row being written, so it needs no elevated rights.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- seasons
-- ---------------------------------------------------------------------------

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  year smallint not null,
  starts_on date,
  ends_on date,
  status text not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_year_unique unique (year),
  -- The league was founded in 2023 (knowledge base 1); the upper bound is only
  -- a typo guard.
  constraint seasons_year_range check (year between 2023 and 2100),
  constraint seasons_status_allowed check (status in ('upcoming', 'active', 'finished')),
  -- A season can be created before its dates are fixed, so both are nullable,
  -- but they can never be inverted.
  constraint seasons_dates_ordered check (
    starts_on is null or ends_on is null or ends_on >= starts_on
  )
);

comment on table public.seasons is
  'One league year. Multi-season history is a requirement, not a later feature (knowledge base 7.3).';

-- "The current season is selected automatically" (knowledge base 7.3) only has
-- an answer if at most one season is active at a time.
create unique index seasons_one_active_idx on public.seasons (status) where status = 'active';

create trigger seasons_set_updated_at
  before update on public.seasons
  for each row execute function private.set_updated_at();

alter table public.seasons enable row level security;

-- ---------------------------------------------------------------------------
-- competitions
-- ---------------------------------------------------------------------------

create table public.competitions (
  key text primary key,
  name text not null,
  description text,
  -- "Applicable rulebook" from knowledge base 7.7, free text for now.
  rulebook text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- CompetitionKey in src/data/types.ts. MilkShake and the All-Stars are part
  -- of the league's vision (knowledge base 5) and neither this list nor the
  -- TypeScript union carries them yet; adding one is a single alter here plus
  -- the same literal there, in one commit. The 18 July all-star game is a match
  -- stage inside an existing competition, not a competition of its own.
  constraint competitions_key_allowed check (key in ('beer', 'wubl'))
);

comment on table public.competitions is
  'The competitions the league runs. A vocabulary table, not sporting data: the keys are the same literals as CompetitionKey in src/data/types.ts.';

create trigger competitions_set_updated_at
  before update on public.competitions
  for each row execute function private.set_updated_at();

-- The two competitions that exist. Inserted here rather than by the importer
-- because every other table's foreign keys depend on them and because these
-- keys are already fixed in the TypeScript union. Written before row level
-- security is switched on, so it does not rely on the owner's exemption.
insert into public.competitions (key, name, description)
values
  ('beer', 'Beer League', 'Competencia principal, planteles mixtos.'),
  ('wubl', 'Women''s Beer League', 'Competencia femenina, cuatro equipos.')
on conflict (key) do nothing;

alter table public.competitions enable row level security;

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  competition_key text not null references public.competitions (key) on update cascade,
  slug text not null,
  short_name text not null,
  full_name text,
  nickname text,
  sponsor text,
  colour text,
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_slug_unique unique (slug),
  constraint teams_short_name_unique unique (competition_key, short_name),
  -- Redundant as a key, but it is the target the rosters and the fixture point
  -- at, so a Beer League team can never be entered in a WUBL row.
  constraint teams_id_competition_unique unique (id, competition_key)
);

comment on table public.teams is
  'A team belongs to exactly one competition: the seven Beer League teams and the four WUBL teams are different sets, even where they share a name (knowledge base 6.1 and 6.3). The per-season roster lives in team_players.';
comment on column public.teams.short_name is
  'The name the fixture uses, for example "Birra del Fuego".';
comment on column public.teams.full_name is
  'The sponsored name the roster sheet uses, for example "Green Seven Birra del fuego". Nullable: the short-name to full-name mapping is inferred and unconfirmed (open questions 1 and 2), and a guess is worse than a gap.';
comment on column public.teams.nickname is
  'The short label the playoff sheet uses (verde, azul, hanta, vitox, suc, t9, z hockey), kept because it is how the bracket rows identify a team.';
comment on column public.teams.colour is
  'Free text on purpose: the sources give colours as words ("verde"), not as hex, and forcing a format here would mean inventing one.';

create index teams_competition_key_idx on public.teams (competition_key);

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function private.set_updated_at();

alter table public.teams enable row level security;

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------

create table public.players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  first_name text,
  last_name text,
  gender text,
  level text,
  position text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_full_name_present check (length(btrim(full_name)) > 0),
  constraint players_gender_allowed check (gender is null or gender in ('female', 'male', 'other'))
);

comment on table public.players is
  'A person, global across seasons and competitions. Deliberately holds no national ID, date of birth, phone number, home address or payment status: the privacy section of CLAUDE.md and knowledge base 7.7 rule them out, and 7.9 lists exposing them as something the organisation explicitly does not want. Players are deactivated, never deleted, so the goals and lines that reference them survive.';
comment on column public.players.full_name is
  'The name exactly as the league sheet writes it, surname first, nicknames included. No unique constraint: two people may share a name, and the Cavalleri / Cavaliere pair is an unresolved duplicate (open question 8).';
comment on column public.players.first_name is
  'Nullable. The sheets write one string, surname first and sometimes with a nickname in the middle, so splitting is not always possible and is never guessed.';
comment on column public.players.level is
  'Free text: knowledge base 7.7 requires a level, the spreadsheet has none, and the vocabulary is open question 9. A check constraint here would invent it.';
comment on column public.players.position is
  'Free text, for the same reason as level (open question 9). Which player kept goal in a given match is recorded in goalie_lines, not inferred from here.';

-- Import and the panel look a player up by name before creating one.
create index players_full_name_lower_idx on public.players (lower(full_name));

create trigger players_set_updated_at
  before update on public.players
  for each row execute function private.set_updated_at();

alter table public.players enable row level security;

-- ---------------------------------------------------------------------------
-- team_players — the roster, per season and per competition
-- ---------------------------------------------------------------------------

create table public.team_players (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete restrict,
  competition_key text not null references public.competitions (key) on update cascade,
  team_id uuid not null,
  player_id uuid not null references public.players (id) on delete restrict,
  jersey_number smallint,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The composite target keeps the roster's competition equal to the team's,
  -- so a WUBL roster row can never point at a Beer League team.
  constraint team_players_team_fkey foreign key (team_id, competition_key)
    references public.teams (id, competition_key) on update cascade,
  constraint team_players_roster_unique unique (season_id, team_id, player_id),
  -- One team per person per competition per season. Two rows for the same
  -- person in the same season are legal across competitions: the four WUBL
  -- teams draw their players from several Beer League teams (knowledge base
  -- 6.3), so a woman is on a Beer League roster and on a WUBL roster at once,
  -- with different teams and possibly different numbers.
  constraint team_players_one_team_per_competition_unique unique (season_id, competition_key, player_id),
  constraint team_players_jersey_range check (jersey_number is null or jersey_number between 0 and 99)
);

comment on table public.team_players is
  'Season membership. A player is a global entity and a jersey number belongs to a roster entry, not to a person, so both live here. Substitutes have no row here at all: they are not roster players (knowledge base 3), and their appearances are recorded in match_players.';
comment on column public.team_players.jersey_number is
  'Nullable, because the 2026 sheet lists Coria Omar with no number. Deliberately not unique per team either: number 28 appears twice in the Hantachoppers roster (knowledge base 6.2, open question 7), and a unique constraint would force the importer to invent a number instead of publishing the gap.';

create index team_players_roster_idx on public.team_players (season_id, competition_key, team_id);
create index team_players_player_id_idx on public.team_players (player_id);
create index team_players_team_id_idx on public.team_players (team_id);

create trigger team_players_set_updated_at
  before update on public.team_players
  for each row execute function private.set_updated_at();

alter table public.team_players enable row level security;

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete restrict,
  competition_key text not null references public.competitions (key) on update cascade,
  stage text not null default 'regular',
  match_date date not null,
  start_time time not null,
  venue text not null,
  home_team_id uuid,
  away_team_id uuid,
  home_goals smallint,
  away_goals smallint,
  resolution text,
  status text not null default 'scheduled',
  franchise_substitute boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite targets, as in team_players: a match in the WUBL can only name
  -- WUBL teams. Under the default MATCH SIMPLE semantics a null team id makes
  -- the whole reference pass unchecked, which is exactly what the fixture row
  -- with a time and a venue and no teams needs.
  constraint matches_home_team_fkey foreign key (home_team_id, competition_key)
    references public.teams (id, competition_key) on update cascade,
  constraint matches_away_team_fkey foreign key (away_team_id, competition_key)
    references public.teams (id, competition_key) on update cascade,
  -- MatchStage in src/data/types.ts. Only 'regular' feeds the standings; the
  -- 4 July play-in decides a playoff berth and is not a seventh regular game.
  constraint matches_stage_allowed check (
    stage in ('regular', 'playin', 'semifinal', 'final', 'third-place', 'fifth-place', 'all-star')
  ),
  -- The two cabeceras, Venue in src/data/types.ts.
  constraint matches_venue_allowed check (venue in ('bahia', 'poli')),
  -- MatchResolution in src/data/types.ts. Nullable even when the goals are
  -- known: on 4 July 2026 the sheet carries the goals and leaves "Resultado"
  -- and "Ganador" empty (knowledge base 6.5), and that gap is published as a
  -- gap rather than resolved by guessing.
  constraint matches_resolution_allowed check (
    resolution is null or resolution in ('regulation', 'shootout', 'draw')
  ),
  -- Knowledge base 7.5 lists the four states a match sheet can be in.
  constraint matches_status_allowed check (
    status in ('scheduled', 'played', 'suspended', 'cancelled')
  ),
  constraint matches_goals_non_negative check (
    (home_goals is null or home_goals >= 0) and (away_goals is null or away_goals >= 0)
  ),
  -- The sheet gives both goal columns or neither. An unplayed or unreported
  -- match keeps both null; half a score is always a data error.
  constraint matches_score_complete check ((home_goals is null) = (away_goals is null)),
  -- Draws are legal in this league (knowledge base 4: Mujeres Birra del Fuego
  -- 4-4 Mujeres Tipo Nine, 28 June 2026). Nothing in this table forbids equal
  -- goals; this constraint only forbids the reverse mistake, calling a match a
  -- draw when the two goal columns differ. A tie can never be made
  -- unrepresentable here.
  constraint matches_draw_is_level check (
    resolution is distinct from 'draw' or home_goals is null or home_goals = away_goals
  ),
  -- The mirror image, and the one the site actually depends on: a match called
  -- a regulation or a shootout result cannot have ended level. outcomeFor in
  -- src/utils/standings.ts throws on such a row rather than inventing a winner,
  -- so a table would break on read; it is rejected on write instead. A level
  -- score with no resolution yet stays legal, which is what round 5 of 2026
  -- needs.
  constraint matches_decided_is_not_level check (
    resolution is null
    or resolution = 'draw'
    or home_goals is null
    or home_goals <> away_goals
  ),
  constraint matches_teams_distinct check (
    home_team_id is null or away_team_id is null or home_team_id <> away_team_id
  ),
  -- Two matches run at the same time in the two cabeceras, so the slot key is
  -- (date, time, venue). A unique on (date, time) alone would refuse half of
  -- every round in the fixture; it is the single easiest way to corrupt this
  -- schema.
  constraint matches_slot_unique unique (season_id, match_date, start_time, venue)
);

comment on table public.matches is
  'One fixture row, whether or not it has been played. Everything the standings need is here or in the child tables; nothing that the standings produce is.';
comment on column public.matches.home_team_id is
  'Nullable, and so is away_team_id: round 1 of 2026 holds a row with a time (21:30) and a venue (Bahia) and no teams at all (knowledge base 6.5, open question 3). The row is stored and published with the gap showing.';
comment on column public.matches.home_goals is
  'The score as the match sheet records it, which is a primary fact and not a count of match_goals rows: the sheets often give a score whose scorers are unknown. Both goal columns are null while a match is unplayed or unreported. No points column exists anywhere: 2 for a win, 1 for a shootout loss, PGR and goal difference are all derived at read time (CLAUDE.md, knowledge base 4).';
comment on column public.matches.franchise_substitute is
  'The sheet-level flag from step 4 of docs/plan.md: a franchise substitute was authorised for this match. The authoritative per-appearance record is match_players.is_franchise; this column is the fixture-level fact, recorded before or without the sheet detail, and the two are not cross-checked because what a franchise player is remains open question 10.';
comment on column public.matches.notes is
  'Free text for the gaps the sources leave, so an unresolved fact stays visible instead of being smoothed over. Example: the misaligned "Resultado" and "Ganador" columns of round 5 (open question 4).';

create index matches_fixture_idx on public.matches (competition_key, season_id, match_date, start_time);
create index matches_home_team_id_idx on public.matches (home_team_id);
create index matches_away_team_id_idx on public.matches (away_team_id);
create index matches_season_id_idx on public.matches (season_id);

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function private.set_updated_at();

alter table public.matches enable row level security;

-- ---------------------------------------------------------------------------
-- match_players — who took part
-- ---------------------------------------------------------------------------

create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  team_id uuid not null references public.teams (id) on delete restrict,
  is_substitute boolean not null default false,
  is_franchise boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One appearance per person per match, which is also what makes "a franchise
  -- player may only appear once per match" (CLAUDE.md) impossible to breach:
  -- nobody can be listed twice, for either side.
  constraint match_players_pkey primary key (match_id, player_id)
);

comment on table public.match_players is
  'The players a match sheet lists. No penalty minutes column and no sanction column: discipline in this league is a penalty shot or leaving the game (commandments 8 and 9), never accumulated minutes, and what exactly gets written down is open question 6. Nothing here is a total: games played per player is counted from these rows at read time.';
comment on column public.match_players.is_substitute is
  'Substitutes are not roster players (knowledge base 3), so a true here names someone who may have no team_players row for the season. The published 2026 statistics already carry such lines.';
comment on column public.match_players.is_franchise is
  'This appearance was a franchise substitute. At most one per match, enforced by match_players_one_franchise_per_match_idx.';
comment on column public.match_players.team_id is
  'The side the player turned out for. That it is one of the match''s own two teams cannot be expressed as a check constraint, because a check may not read another table; the importer and the panel are responsible for it, and the same applies to match_goals.team_id and goalie_lines.team_id.';

-- "En el caso de que soliciten un jugador franquicia, solo puede jugar uno por
-- partido" (knowledge base 3), read literally: one franchise appearance in the
-- whole match. If the organisation means one per side instead (open question
-- 10), this index becomes (match_id, team_id).
create unique index match_players_one_franchise_per_match_idx
  on public.match_players (match_id) where is_franchise;

create index match_players_player_id_idx on public.match_players (player_id);
create index match_players_team_id_idx on public.match_players (team_id);

create trigger match_players_set_updated_at
  before update on public.match_players
  for each row execute function private.set_updated_at();

alter table public.match_players enable row level security;

-- ---------------------------------------------------------------------------
-- match_goals — one row per goal, with its assist
-- ---------------------------------------------------------------------------

create table public.match_goals (
  -- A surrogate key because there is no natural one: the same scorer and the
  -- same assist can repeat inside one match, and two goals with nobody named
  -- are two goals.
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete restrict,
  scorer_id uuid references public.players (id) on delete restrict,
  assist_id uuid references public.players (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_goals_scorer_is_not_assist check (
    scorer_id is null or assist_id is null or scorer_id <> assist_id
  )
);

comment on table public.match_goals is
  'GoalRecord in src/data/types.ts. Scoring leaders (goals, assists, and points as goals plus assists) are counted from these rows at read time and never stored. There is no minute, period or ordering column because the league sheet records none.';
comment on column public.match_goals.scorer_id is
  'Nullable, independently of assist_id: some sheets record the goal without the scorer, and publishing the gap is better than inventing a name (CLAUDE.md, data integrity).';

create index match_goals_match_id_idx on public.match_goals (match_id);
create index match_goals_team_id_idx on public.match_goals (team_id);
-- Partial, because the scoring-leader read path only cares about goals that
-- name someone and both columns are frequently null.
create index match_goals_scorer_id_idx on public.match_goals (scorer_id) where scorer_id is not null;
create index match_goals_assist_id_idx on public.match_goals (assist_id) where assist_id is not null;

create trigger match_goals_set_updated_at
  before update on public.match_goals
  for each row execute function private.set_updated_at();

alter table public.match_goals enable row level security;

-- ---------------------------------------------------------------------------
-- goalie_lines — a goalkeeper's appearance in one match
-- ---------------------------------------------------------------------------

create table public.goalie_lines (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  team_id uuid not null references public.teams (id) on delete restrict,
  shots_faced smallint not null,
  goals_against smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goalie_lines_pkey primary key (match_id, player_id),
  constraint goalie_lines_shots_non_negative check (shots_faced >= 0),
  constraint goalie_lines_goals_non_negative check (goals_against >= 0),
  -- Every goal conceded was a shot faced, so the reverse is always a data
  -- error. All nine published 2026 goalkeeper rows satisfy it (knowledge base
  -- 6.7 and 6.9).
  constraint goalie_lines_goals_within_shots check (goals_against <= shots_faced)
);

comment on table public.goalie_lines is
  'GoalieLine in src/data/types.ts: shots faced and goals against, as written on the sheet. There is deliberately no save percentage column. It is (shots_faced - goals_against) / shots_faced, computed at read time; all nine published 2026 percentages reconcile with these two numbers, so storing it could only create a second version of the truth. shots_faced = 0 is allowed, and the percentage is then undefined rather than zero.';

create index goalie_lines_player_id_idx on public.goalie_lines (player_id);
create index goalie_lines_team_id_idx on public.goalie_lines (team_id);

create trigger goalie_lines_set_updated_at
  before update on public.goalie_lines
  for each row execute function private.set_updated_at();

alter table public.goalie_lines enable row level security;

-- ---------------------------------------------------------------------------
-- admins — who may write
-- ---------------------------------------------------------------------------

create table public.admins (
  email text primary key,
  role text not null,
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The policies compare against the sign-in email folded to lower case, so a
  -- mixed-case row would silently grant nothing.
  constraint admins_email_lowercase check (email = lower(email)),
  constraint admins_email_shape check (position('@' in email) > 1),
  -- The three roles of knowledge base 7.4: full access; teams, fixture,
  -- results and statistics; news, photos and sponsors.
  constraint admins_role_allowed check (
    role in ('general_administrator', 'sporting_management', 'communications')
  )
);

comment on table public.admins is
  'One row per administrator, keyed by the lower-case Gmail address they sign in with. Never publicly readable: it holds personal email addresses. The founding owner address is deliberately absent and hardcoded in the policy helpers instead, so an empty table still admits the first administrator and the league can never be locked out.';
comment on column public.admins.active is
  'Access is withdrawn by clearing this flag rather than by deleting the row, so the history of who could write survives.';

create trigger admins_set_updated_at
  before update on public.admins
  for each row execute function private.set_updated_at();

alter table public.admins enable row level security;
