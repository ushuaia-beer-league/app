-- Ushuaia Beer League — row level security.
--
-- Phase 1, step 5 of docs/plan.md. Row level security was switched on for every
-- table in 20260803120000_initial_schema.sql, which left them all denying
-- everything; this file says who may do what.
--
-- The shape of it:
--
--   * Sporting data (seasons, competitions, teams, players, team_players,
--     matches, match_players, match_goals, goalie_lines) is readable by anyone,
--     signed in or not. That is what the public site shows.
--   * admins is never publicly readable. It holds personal email addresses. A
--     signed-in person may read their own row; an administrator may read the
--     table.
--   * Every write is restricted to an email present in admins, checked in the
--     policy. Hiding a button in the panel is not enforcement.
--   * ushuaiabl@gmail.com is hardcoded as founding owner, so an empty admins
--     table still admits the first administrator and the league can never lock
--     itself out. That is the lesson carried over from the CFM project.
--
-- Policies are written per table and per command, never as a catch-all, so a
-- table added later is private until its own policies are written. Every policy
-- names the roles it applies to with TO, so it is never evaluated for a role it
-- cannot concern, and every call to a helper is wrapped in a scalar subselect
-- so Postgres evaluates it once per statement instead of once per row.
--
-- Privileges are revoked before they are granted. Supabase grants generously by
-- default; anon must not even hold the INSERT privilege on a sporting table, so
-- that a future mistake in a policy cannot become a public write.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- The e-mail on the current access token, folded to lower case, or null for an
-- anonymous request. Sign-in is Google, so this is the administrator's Gmail
-- address.
create or replace function private.current_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(nullif(auth.jwt() ->> 'email', ''));
$$;

-- The caller's role, or null if they are not an administrator. Security
-- definer, so reading admins from inside a policy neither needs a policy on
-- admins nor recurses into one. The founding owner is answered from the
-- hardcoded constant without touching the table, which is what makes the first
-- insert into an empty admins possible.
create or replace function private.admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.current_email() = 'ushuaiabl@gmail.com' then 'general_administrator'
    else (
      select a.role
      from public.admins a
      where a.email = private.current_email()
        and a.active
    )
  end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.admin_role() is not null;
$$;

-- Teams, fixture, results and statistics: the general administrator and the
-- sporting management (knowledge base 7.4). Communications is excluded from
-- every sporting write, exactly as the functional document says.
create or replace function private.can_manage_sport()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.admin_role() in ('general_administrator', 'sporting_management');
$$;

-- Seasons, competitions and the administrator list itself. The role table gives
-- sporting management teams, fixture, results and statistics, and nothing
-- structural, so creating a season or a competition stays with the general
-- administrator.
create or replace function private.can_manage_league()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.admin_role() = 'general_administrator';
$$;

comment on function private.can_manage_league() is
  'General administrator only. The news, gallery and sponsor tables of a later phase get their own helper for the communications role; nothing here grants it any write, because none of its tables exist yet.';

revoke all on function private.current_email() from public;
revoke all on function private.admin_role() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.can_manage_sport() from public;
revoke all on function private.can_manage_league() from public;

-- Only the signed-in role needs them: the public read policies are plain TRUE
-- and never call a helper, so anon is granted neither usage on this schema nor
-- execute on anything in it.
grant execute on function private.current_email() to authenticated;
grant execute on function private.admin_role() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.can_manage_sport() to authenticated;
grant execute on function private.can_manage_league() to authenticated;

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------

revoke all on table
  public.seasons,
  public.competitions,
  public.teams,
  public.players,
  public.team_players,
  public.matches,
  public.match_players,
  public.match_goals,
  public.goalie_lines,
  public.admins
from anon, authenticated;

grant select on table
  public.seasons,
  public.competitions,
  public.teams,
  public.players,
  public.team_players,
  public.matches,
  public.match_players,
  public.match_goals,
  public.goalie_lines
to anon, authenticated;

grant insert, update, delete on table
  public.seasons,
  public.competitions,
  public.teams,
  public.players,
  public.team_players,
  public.matches,
  public.match_players,
  public.match_goals,
  public.goalie_lines
to authenticated;

-- admins is not in the public read grant above, and anon is granted nothing on
-- it at all.
grant select, insert, update, delete on table public.admins to authenticated;

-- public.rls_auto_enable(), behind the ensure_rls event trigger, came with the
-- project rather than from this repository. It enables row level security on any
-- new table in public, which is a useful belt and braces for the rule that a new
-- table stays private until a policy grants access, so it is left in place.
-- What is withdrawn is its execute privilege: created functions are executable by
-- PUBLIC by default, which puts a security definer function on the REST surface
-- as /rpc/rls_auto_enable. Postgres refuses to run an event trigger function
-- called directly, so nothing could be achieved through it, and the event
-- trigger itself does not consult this privilege.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- seasons — read by anyone, written by the general administrator
-- ---------------------------------------------------------------------------

create policy seasons_select_public on public.seasons
  for select to anon, authenticated
  using (true);

create policy seasons_insert_league_admin on public.seasons
  for insert to authenticated
  with check ((select private.can_manage_league()));

create policy seasons_update_league_admin on public.seasons
  for update to authenticated
  using ((select private.can_manage_league()))
  with check ((select private.can_manage_league()));

create policy seasons_delete_league_admin on public.seasons
  for delete to authenticated
  using ((select private.can_manage_league()));

-- ---------------------------------------------------------------------------
-- competitions — read by anyone, written by the general administrator
-- ---------------------------------------------------------------------------

create policy competitions_select_public on public.competitions
  for select to anon, authenticated
  using (true);

create policy competitions_insert_league_admin on public.competitions
  for insert to authenticated
  with check ((select private.can_manage_league()));

create policy competitions_update_league_admin on public.competitions
  for update to authenticated
  using ((select private.can_manage_league()))
  with check ((select private.can_manage_league()));

create policy competitions_delete_league_admin on public.competitions
  for delete to authenticated
  using ((select private.can_manage_league()));

-- ---------------------------------------------------------------------------
-- teams — read by anyone, written by sporting management
-- ---------------------------------------------------------------------------

create policy teams_select_public on public.teams
  for select to anon, authenticated
  using (true);

create policy teams_insert_sport_admin on public.teams
  for insert to authenticated
  with check ((select private.can_manage_sport()));

create policy teams_update_sport_admin on public.teams
  for update to authenticated
  using ((select private.can_manage_sport()))
  with check ((select private.can_manage_sport()));

create policy teams_delete_sport_admin on public.teams
  for delete to authenticated
  using ((select private.can_manage_sport()));

-- ---------------------------------------------------------------------------
-- players — read by anyone, written by sporting management
--
-- Public read is safe because this table carries nothing but a name, a gender,
-- a level and a position; the rosters it feeds are published on the site.
-- ---------------------------------------------------------------------------

create policy players_select_public on public.players
  for select to anon, authenticated
  using (true);

create policy players_insert_sport_admin on public.players
  for insert to authenticated
  with check ((select private.can_manage_sport()));

create policy players_update_sport_admin on public.players
  for update to authenticated
  using ((select private.can_manage_sport()))
  with check ((select private.can_manage_sport()));

create policy players_delete_sport_admin on public.players
  for delete to authenticated
  using ((select private.can_manage_sport()));

-- ---------------------------------------------------------------------------
-- team_players — read by anyone, written by sporting management
-- ---------------------------------------------------------------------------

create policy team_players_select_public on public.team_players
  for select to anon, authenticated
  using (true);

create policy team_players_insert_sport_admin on public.team_players
  for insert to authenticated
  with check ((select private.can_manage_sport()));

create policy team_players_update_sport_admin on public.team_players
  for update to authenticated
  using ((select private.can_manage_sport()))
  with check ((select private.can_manage_sport()));

create policy team_players_delete_sport_admin on public.team_players
  for delete to authenticated
  using ((select private.can_manage_sport()));

-- ---------------------------------------------------------------------------
-- matches — read by anyone, written by sporting management
-- ---------------------------------------------------------------------------

create policy matches_select_public on public.matches
  for select to anon, authenticated
  using (true);

create policy matches_insert_sport_admin on public.matches
  for insert to authenticated
  with check ((select private.can_manage_sport()));

create policy matches_update_sport_admin on public.matches
  for update to authenticated
  using ((select private.can_manage_sport()))
  with check ((select private.can_manage_sport()));

create policy matches_delete_sport_admin on public.matches
  for delete to authenticated
  using ((select private.can_manage_sport()));

-- ---------------------------------------------------------------------------
-- match_players — read by anyone, written by sporting management
-- ---------------------------------------------------------------------------

create policy match_players_select_public on public.match_players
  for select to anon, authenticated
  using (true);

create policy match_players_insert_sport_admin on public.match_players
  for insert to authenticated
  with check ((select private.can_manage_sport()));

create policy match_players_update_sport_admin on public.match_players
  for update to authenticated
  using ((select private.can_manage_sport()))
  with check ((select private.can_manage_sport()));

create policy match_players_delete_sport_admin on public.match_players
  for delete to authenticated
  using ((select private.can_manage_sport()));

-- ---------------------------------------------------------------------------
-- match_goals — read by anyone, written by sporting management
-- ---------------------------------------------------------------------------

create policy match_goals_select_public on public.match_goals
  for select to anon, authenticated
  using (true);

create policy match_goals_insert_sport_admin on public.match_goals
  for insert to authenticated
  with check ((select private.can_manage_sport()));

create policy match_goals_update_sport_admin on public.match_goals
  for update to authenticated
  using ((select private.can_manage_sport()))
  with check ((select private.can_manage_sport()));

create policy match_goals_delete_sport_admin on public.match_goals
  for delete to authenticated
  using ((select private.can_manage_sport()));

-- ---------------------------------------------------------------------------
-- goalie_lines — read by anyone, written by sporting management
-- ---------------------------------------------------------------------------

create policy goalie_lines_select_public on public.goalie_lines
  for select to anon, authenticated
  using (true);

create policy goalie_lines_insert_sport_admin on public.goalie_lines
  for insert to authenticated
  with check ((select private.can_manage_sport()));

create policy goalie_lines_update_sport_admin on public.goalie_lines
  for update to authenticated
  using ((select private.can_manage_sport()))
  with check ((select private.can_manage_sport()));

create policy goalie_lines_delete_sport_admin on public.goalie_lines
  for delete to authenticated
  using ((select private.can_manage_sport()));

-- ---------------------------------------------------------------------------
-- admins — never public
--
-- No policy names anon, and anon holds no privilege on the table either, so an
-- anonymous request cannot learn a single address. A signed-in person sees
-- their own row, which is how the panel decides what to show; any
-- administrator sees the whole list; only the general administrator, or the
-- founding owner, changes it.
-- ---------------------------------------------------------------------------

create policy admins_select_self_or_admin on public.admins
  for select to authenticated
  using (
    email = (select private.current_email())
    or (select private.is_admin())
  );

create policy admins_insert_league_admin on public.admins
  for insert to authenticated
  with check ((select private.can_manage_league()));

create policy admins_update_league_admin on public.admins
  for update to authenticated
  using ((select private.can_manage_league()))
  with check ((select private.can_manage_league()));

create policy admins_delete_league_admin on public.admins
  for delete to authenticated
  using ((select private.can_manage_league()));
