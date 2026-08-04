-- Row level security, asserted rather than described.
--
-- Step 19 of docs/plan.md asks for row-level-security tests against the real
-- database. This is them: one transaction that impersonates every role the league
-- has, tries what each one should and should not be able to do, and rolls the lot
-- back. Nothing here leaves a row behind.
--
-- Two ways to run it, both against the real project:
--
--   psql "$DATABASE_URL" -f supabase/tests/row-level-security.sql
--   or paste it into the SQL editor in the Supabase dashboard
--
-- There is deliberately no npm script: this needs a database connection that the
-- repository does not carry and must not carry. It is not in CI for the same
-- reason, and that is a real gap rather than a decision to be proud of.
--
-- It runs against the real project on purpose. The policies are the enforcement,
-- and enforcement that has only ever been read is not enforcement: a mistake in a
-- USING clause looks exactly like a correct one until somebody tries it.
--
-- Every check is an ASSERT, so the first failure aborts with a message naming
-- what was expected. A silent pass is the whole file printing nothing but the
-- final notice.

begin;

-- ---------------------------------------------------------------------------
-- Fixtures, all inside the transaction
-- ---------------------------------------------------------------------------

-- A season to hang rows off. The real 2026 one is already loaded, and reusing it
-- keeps the checks honest: they run against the data the site actually serves.
create temporary table probe as
select
  (select id from public.seasons where year = 2026) as season_id,
  (select id from public.teams where slug = 'rock-choppers') as team_id,
  (select id from public.matches where home_goals is not null and home_goals <> 9 limit 1) as match_id;

-- The fixtures are read while impersonating roles that do not own this table.
grant select on probe to anon, authenticated;

do $$
declare
  ok boolean;
begin
  select season_id is not null and team_id is not null and match_id is not null
    into ok from probe;
  assert ok, 'The 2026 season, its teams and its matches have to be loaded before this file means anything';
end $$;

-- The three roles, plus somebody with none. Written as the founding owner, which
-- is the only identity that can bootstrap the list.
set local role authenticated;
set local request.jwt.claims = '{"email":"ushuaiabl@gmail.com","role":"authenticated"}';

insert into public.admins (email, role) values
  ('sport@example.com', 'sporting_management'),
  ('comms@example.com', 'communications'),
  ('general@example.com', 'general_administrator');

-- ---------------------------------------------------------------------------
-- What the database says each identity is
-- ---------------------------------------------------------------------------

do $$
begin
  assert (select public.my_admin_role()) = 'general_administrator',
    'The founding owner has no row in admins and must still be the general administrator';
end $$;

set local request.jwt.claims = '{"email":"sport@example.com","role":"authenticated"}';
do $$
begin
  assert (select public.my_admin_role()) = 'sporting_management',
    'A row in admins decides the role';
end $$;

set local request.jwt.claims = '{"email":"nadie@example.com","role":"authenticated"}';
do $$
begin
  assert (select public.my_admin_role()) is null,
    'Somebody the league does not know has no role at all';
end $$;

-- ---------------------------------------------------------------------------
-- anon: reads the sport, never the people, never writes
-- ---------------------------------------------------------------------------

reset role;
set local role anon;

do $$
begin
  assert (select count(*) from public.competitions) = 2,
    'anon reads the competitions the public site shows';
  assert (select count(*) from public.matches) > 0, 'anon reads the fixture';
  assert (select count(*) from public.teams) > 0, 'anon reads the teams';
  assert (select count(*) from public.published_player_stats) > 0,
    'anon reads the published statistics';
end $$;

do $$
begin
  perform count(*) from public.admins;
  assert false, 'anon must not be able to read admins: it holds personal email addresses';
exception
  when insufficient_privilege then null;
end $$;

do $$
begin
  insert into public.teams (competition_key, slug, short_name)
  values ('beer', 'anon-should-not-write', 'Nope');
  assert false, 'anon must not be able to write a team';
exception
  when insufficient_privilege or check_violation then null;
end $$;

-- ---------------------------------------------------------------------------
-- Signed in and unknown: reads everything public, writes nothing
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"email":"nadie@example.com","role":"authenticated"}';

do $$
begin
  insert into public.matches (season_id, competition_key, match_date, start_time)
  select season_id, 'beer', date '2026-09-05', time '21:30' from probe;
  assert false, 'A signed-in visitor who is not an administrator must not write a match';
exception
  when insufficient_privilege then null;
end $$;

do $$
begin
  assert (select count(*) from public.admins) = 0,
    'A signed-in visitor sees their own row in admins and nobody else''s';
end $$;

-- ---------------------------------------------------------------------------
-- Sporting management: the sport, and nothing else
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"email":"sport@example.com","role":"authenticated"}';

do $$
declare
  written uuid;
begin
  insert into public.matches (season_id, competition_key, match_date, start_time, venue)
  select season_id, 'beer', date '2026-09-05', time '21:30', 'bahia' from probe
  returning id into written;
  assert written is not null, 'Sporting management writes the fixture';

  update public.matches set home_goals = 3, away_goals = 2, resolution = 'regulation'
  where id = written;
  assert (select home_goals from public.matches where id = written) = 3,
    'Sporting management writes a result';
end $$;

do $$
begin
  insert into public.sponsors (season_id, name) select season_id, 'No' from probe;
  assert false, 'Sporting management must not write a sponsor: that is the communications role';
exception
  when insufficient_privilege then null;
end $$;

do $$
begin
  insert into public.admins (email, role) values ('otro@example.com', 'communications');
  assert false, 'Only the general administrator changes the administrator list';
exception
  when insufficient_privilege then null;
end $$;

do $$
begin
  insert into public.seasons (year) values (2027);
  assert false, 'A season is structural: sporting management must not create one';
exception
  when insufficient_privilege then null;
end $$;

-- ---------------------------------------------------------------------------
-- Communications: the content, and nothing else
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"email":"comms@example.com","role":"authenticated"}';

do $$
begin
  insert into public.sponsors (season_id, name) select season_id, 'Green Seven' from probe;
  assert (select count(*) from public.sponsors) = 1, 'Communications writes a sponsor';

  insert into public.photos (season_id, storage_path)
  select season_id, 'media/2026/probe.jpg' from probe;
  assert (select count(*) from public.photos) = 1, 'Communications writes a photograph';
end $$;

do $$
begin
  update public.matches set home_goals = 9 where id = (select match_id from probe);
  -- An UPDATE whose USING clause fails is filtered, not refused: it reports
  -- success having changed nothing. That is why the panel counts returned rows,
  -- and why this asserts the value rather than expecting an exception.
  assert (select home_goals from public.matches where id = (select match_id from probe)) <> 9,
    'Communications must not be able to change a result';
end $$;

do $$
begin
  insert into public.teams (competition_key, slug, short_name)
  values ('beer', 'comms-should-not-write', 'Nope');
  assert false, 'Communications must not write a team';
exception
  when insufficient_privilege then null;
end $$;

-- ---------------------------------------------------------------------------
-- The general administrator: everything
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"email":"general@example.com","role":"authenticated"}';

do $$
begin
  insert into public.seasons (year, status) values (2027, 'upcoming');
  assert (select count(*) from public.seasons where year = 2027) = 1,
    'The general administrator creates a season';

  insert into public.admins (email, role) values ('otro@example.com', 'communications');
  assert (select count(*) from public.admins where email = 'otro@example.com') = 1,
    'The general administrator adds an administrator';

  insert into public.sponsors (season_id, name) select season_id, 'Otro' from probe;
  assert (select count(*) from public.sponsors) = 2,
    'The general administrator writes content as well as sport';
end $$;

-- ---------------------------------------------------------------------------
-- The media bucket
-- ---------------------------------------------------------------------------

reset role;

do $$
declare
  policies integer;
begin
  select count(*) into policies
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage' and c.relname = 'objects' and p.polname like 'media_%';

  assert policies = 4,
    format('The media bucket needs its four policies, found %s', policies);

  assert (select file_size_limit from storage.buckets where id = 'media') = 5242880,
    'The media bucket has to cap a file at 5 MB';
  assert (select array_length(allowed_mime_types, 1) from storage.buckets where id = 'media') = 4,
    'The media bucket takes images and nothing else';
end $$;

-- ---------------------------------------------------------------------------
-- Every table is covered
-- ---------------------------------------------------------------------------

do $$
declare
  uncovered text;
begin
  select string_agg(c.relname, ', ') into uncovered
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and (
      not c.relrowsecurity
      or (select count(*) from pg_policy p where p.polrelid = c.oid) = 0
    );

  assert uncovered is null,
    format('Every table needs row level security and at least one policy; these have neither: %s', uncovered);
end $$;

do $$
begin
  raise notice 'Row level security: every check passed. Rolling back.';
end $$;

rollback;
