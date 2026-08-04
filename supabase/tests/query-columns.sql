-- Every column and every relationship the code asks the database for.
--
-- The unit tests mock the Supabase client, which is the right thing for testing
-- what the panel does with an answer and useless for testing that the question is
-- valid. A renamed column or a dropped foreign key passes `npm test`, passes
-- `tsc`, passes the build, and fails in the browser the first time an operator
-- opens the screen. This file is the check that closes that gap.
--
-- Run it the same way as `row-level-security.sql`, against the real project:
--
--   psql "$DATABASE_URL" -f supabase/tests/query-columns.sql
--   or paste it into the SQL editor in the Supabase dashboard
--
-- It reads nothing but the catalogue, writes nothing, and needs no transaction.
--
-- The two lists below are the select lists in `src/data/season-source.ts` and
-- `src/admin/adminQueries.ts`. They are copied by hand, so a query added without
-- coming back here is simply not covered: this file catches the schema drifting
-- away from the code, not the code growing past the file. When a screen starts
-- selecting something new, add it.
--
-- The embeds are checked as relationships rather than as columns, because that is
-- what PostgREST resolves them through. `matches` reaches `teams` twice, which is
-- why the code has to name the column (`home_team:home_team_id`) instead of the
-- table: with two candidate foreign keys an unqualified embed is ambiguous and
-- PostgREST refuses it.

do $$
declare
  missing text;
begin
  select string_agg(format('%s.%s', tbl, col), ', ' order by tbl, col) into missing
  from (values
    ('admins','active'),('admins','display_name'),('admins','email'),('admins','role'),
    ('competitions','active'),('competitions','description'),('competitions','key'),('competitions','name'),
    ('matches','away_goals'),('matches','away_team_id'),('matches','competition_key'),('matches','home_goals'),
    ('matches','home_team_id'),('matches','id'),('matches','match_date'),('matches','notes'),
    ('matches','resolution'),('matches','season_id'),('matches','stage'),('matches','start_time'),('matches','venue'),
    ('photos','caption'),('photos','display_order'),('photos','id'),('photos','season_id'),
    ('photos','storage_path'),('photos','taken_on'),
    ('players','active'),('players','full_name'),('players','id'),
    ('published_goalie_stats','competition_key'),('published_goalie_stats','games_played'),
    ('published_goalie_stats','goals_against'),('published_goalie_stats','printed_player_name'),
    ('published_goalie_stats','printed_team'),('published_goalie_stats','shots_faced'),
    ('published_goalie_stats','source_file'),
    ('published_player_stats','assists'),('published_player_stats','competition_key'),
    ('published_player_stats','goals'),('published_player_stats','points'),
    ('published_player_stats','printed_player_name'),('published_player_stats','printed_team'),
    ('published_player_stats','source_file'),
    ('seasons','ends_on'),('seasons','id'),('seasons','starts_on'),('seasons','status'),('seasons','year'),
    ('sponsors','active'),('sponsors','display_order'),('sponsors','id'),('sponsors','logo_path'),
    ('sponsors','name'),('sponsors','season_id'),('sponsors','url'),
    ('team_players','active'),('team_players','competition_key'),('team_players','id'),
    ('team_players','jersey_number'),('team_players','player_id'),('team_players','season_id'),
    ('team_players','team_id'),
    ('teams','active'),('teams','colour'),('teams','competition_key'),('teams','full_name'),
    ('teams','id'),('teams','logo_url'),('teams','nickname'),('teams','short_name'),('teams','slug')
  ) as wanted(tbl, col)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = wanted.tbl
      and c.column_name = wanted.col
  );

  assert missing is null,
    format('The code selects columns this database does not have: %s', missing);
end $$;

do $$
declare
  missing text;
begin
  select string_agg(conname, ', ' order by conname) into missing
  from (values
    -- The two the fixture embeds by column name, and the reason it has to.
    ('matches_home_team_fkey'),
    ('matches_away_team_fkey'),
    -- The reverse embeds the matches list counts through, to say what a match
    -- still needs without reading every child row.
    ('match_players_match_id_fkey'),
    ('match_goals_match_id_fkey'),
    ('goalie_lines_match_id_fkey'),
    -- The published statistics, which name a player when the import could match
    -- one and keep the printed name when it could not.
    ('published_player_stats_player_id_fkey'),
    ('published_goalie_stats_player_id_fkey')
  ) as needed(conname)
  where not exists (
    select 1 from pg_constraint c where c.conname = needed.conname and c.contype = 'f'
  );

  assert missing is null,
    format('The code embeds through foreign keys this database does not have: %s', missing);
end $$;

do $$
declare
  candidates integer;
begin
  select count(*) into candidates
  from pg_constraint
  where contype = 'f'
    and conrelid = 'public.matches'::regclass
    and confrelid = 'public.teams'::regclass;

  assert candidates = 2,
    format('The fixture embeds teams by column because matches reaches teams twice; found %s foreign keys, so the embed syntax needs revisiting', candidates);
end $$;

do $$
begin
  raise notice 'Every column and relationship the code asks for is present.';
end $$;
