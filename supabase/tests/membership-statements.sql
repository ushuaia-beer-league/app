-- Run after seed and migrations. No fixtures persist.
begin;
insert into auth.users (id, email) values
 ('50000000-0000-4000-8000-000000000001', 'membership-player@example.test'),
 ('50000000-0000-4000-8000-000000000002', 'membership-sport@example.test'),
 ('50000000-0000-4000-8000-000000000003', 'membership-admin@example.test');
insert into public.admins (email, role) values
 ('membership-admin@example.test', 'general_administrator'),
 ('membership-sport@example.test', 'sporting_management');
insert into public.players (id, full_name) values
 ('60000000-0000-4000-8000-000000000001', 'Membership Test Player'),
 ('60000000-0000-4000-8000-000000000002', 'Membership Other Player');
insert into public.player_accounts (user_id, username, full_name, player_id)
values ('50000000-0000-4000-8000-000000000001', 'membership-player', 'Membership Test Player', '60000000-0000-4000-8000-000000000001');
insert into public.membership_statements (id, season_year, competition_key, source_row, source_name, payments_cents, balance_cents)
values ('70000000-0000-4000-8000-000000000001', 2026, 'beer', 999999, 'Membership Test Player', array[5000000], null),
 ('70000000-0000-4000-8000-000000000002', 2026, 'beer', 999998, 'Membership Other Player', array[]::integer[], 0);

set local role anon;
do $$
begin
  perform count(*) from public.membership_statements;
  raise exception 'Anonymous readers should not see memberships';
exception when insufficient_privilege then null;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000002","email":"membership-sport@example.test"}';
do $$
begin
  assert (select count(*) from public.membership_statements) = 0;
  perform public.assign_membership_statement('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001');
  raise exception 'The sporting role must not assign financial records';
exception when insufficient_privilege then null;
end $$;

set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000003","email":"membership-admin@example.test"}';
select public.assign_membership_statement('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001');
do $$
begin
  assert (select count(*) from public.membership_statements where source_row >= 999998) = 2;
  begin
    perform public.assign_membership_statement('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001');
    raise exception 'A season and competition must have one statement per player';
  exception when unique_violation then null;
  end;
  begin
    perform public.assign_membership_statement('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001');
    raise exception 'Access to an unrelated player account must be rejected';
  exception when invalid_parameter_value then null;
  end;
end $$;

set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000001","email":"membership-player@example.test"}';
do $$ begin assert (select count(*) from public.membership_statements) = 0; end $$;

set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000003","email":"membership-admin@example.test"}';
select public.assign_membership_statement('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001');

set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000001","email":"membership-player@example.test"}';
do $$ begin
  assert (select count(*) from public.membership_statements) = 1;
  assert (select balance_cents is null from public.membership_statements);
end $$;

set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000002","email":"membership-sport@example.test"}';
select public.review_player_link('unlink', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001');
select public.review_player_link('link', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001');

set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000001","email":"membership-player@example.test"}';
do $$ begin assert (select count(*) from public.membership_statements) = 0; end $$;
rollback;
