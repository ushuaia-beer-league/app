-- Run with psql -X -v ON_ERROR_STOP=1 after applying the migrations.
begin;

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'skater-one@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'skater-two@example.test'),
  ('10000000-0000-4000-8000-000000000003', 'player-links-sport@example.test'),
  ('10000000-0000-4000-8000-000000000004', 'player-links-comms@example.test')
on conflict (id) do nothing;
insert into public.players (id, full_name) values
  ('20000000-0000-4000-8000-000000000001', 'Pérez, Ana'),
  ('20000000-0000-4000-8000-000000000002', 'Pérez, Ana');

set local role anon;
do $$
begin
  perform count(*) from public.player_accounts;
  raise exception 'Anonymous access to accounts should be denied';
exception when insufficient_privilege then null;
end $$;
do $$
begin
  perform public.request_player_link('20000000-0000-4000-8000-000000000001');
  raise exception 'Anonymous requests should be denied';
exception when insufficient_privilege then null;
end $$;

reset role;
insert into public.admins (email, role) values
  ('player-links-comms@example.test', 'communications'),
  ('player-links-sport@example.test', 'sporting_management');
set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","email":"skater-one@example.test"}';

do $$
begin
  insert into public.player_accounts (user_id, username, full_name)
    values ('10000000-0000-4000-8000-000000000002', 'wrong-owner', 'Wrong Owner');
  raise exception 'Registration must be limited to the authenticated owner';
exception when insufficient_privilege then null;
end $$;

insert into public.player_accounts (user_id, username, full_name)
values ('10000000-0000-4000-8000-000000000001', 'skater-one', 'Ana Pérez');
select public.request_player_link('20000000-0000-4000-8000-000000000001');

do $$
begin
  assert (select count(*) from public.player_link_requests) = 1;
  assert (select player_id from public.player_accounts) is null;
  assert public.request_player_link('20000000-0000-4000-8000-000000000001') =
    (select id from public.player_link_requests where status = 'pending'), 'Retry returns the same request';
  begin
    perform public.review_player_link('link', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001');
    raise exception 'Players cannot call the staff decision endpoint';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.player_accounts set player_id = '20000000-0000-4000-8000-000000000001';
    raise exception 'Players must never link themselves';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.request_player_link('20000000-0000-4000-8000-000000000002');
    raise exception 'A second request should fail while one is pending';
  exception when unique_violation then null;
  end;
end $$;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","email":"skater-two@example.test"}';
insert into public.player_accounts (username, full_name) values ('skater-two', 'Ana Pérez');
do $$
begin
  assert (select count(*) from public.player_accounts) = 1;
  assert (select count(*) from public.player_link_requests) = 0;
end $$;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000004","email":"player-links-comms@example.test"}';
do $$
begin
  assert (select count(*) from public.player_accounts) = 0;
  perform public.review_player_link('link', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002');
  raise exception 'Communications must never link players';
exception when insufficient_privilege then null;
end $$;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000003","email":"player-links-sport@example.test"}';
select public.review_player_link('reject', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  (select id from public.player_link_requests
   where user_id = '10000000-0000-4000-8000-000000000001' and status = 'pending'));

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","email":"skater-one@example.test"}';
select public.request_player_link('20000000-0000-4000-8000-000000000001');

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000003","email":"player-links-sport@example.test"}';
select public.review_player_link('approve', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  (select id from public.player_link_requests
   where user_id = '10000000-0000-4000-8000-000000000001' and status = 'pending'));

do $$
begin
  begin
    perform public.review_player_link('link', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001');
    raise exception 'A ficha can only belong to one account';
  exception when unique_violation then null;
  end;
  assert (select player_id from public.player_accounts where user_id = '10000000-0000-4000-8000-000000000002') is null;
end $$;

select public.review_player_link('link', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002');
select public.review_player_link('unlink', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002');

do $$
begin
  assert (select count(*) from public.player_link_events where actor_id = '10000000-0000-4000-8000-000000000003') = 4;
  assert (select count(*) from public.player_accounts where player_id in ('20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002')) = 1;
  assert (select count(*) from public.player_link_requests where player_id in ('20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002') and status = 'pending') = 0;
end $$;

rollback;
