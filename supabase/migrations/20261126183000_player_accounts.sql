-- A league player keeps the same sporting identity across accounts and seasons.
create table public.player_accounts (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_][a-z0-9_-]{2,29}$'),
  full_name text not null check (char_length(full_name) between 2 and 100 and full_name = btrim(full_name)),
  player_id uuid unique references public.players(id),
  created_at timestamptz not null default now()
);

create table public.player_link_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.player_accounts(user_id) on delete cascade,
  player_id uuid not null references public.players(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((status = 'pending') = (resolved_at is null))
);

create unique index player_link_requests_one_pending_per_account
  on public.player_link_requests (user_id) where status = 'pending';
create index player_link_requests_user_id_idx on public.player_link_requests (user_id, created_at desc);
create index player_link_requests_player_id_idx on public.player_link_requests (player_id);

-- Keep decisions after an account is removed. These identifiers establish who
-- made each decision without copying names or emails into the audit trail.
create table public.player_link_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  user_id uuid not null,
  player_id uuid not null,
  request_id uuid,
  action text not null check (action in ('approve', 'reject', 'link', 'unlink')),
  created_at timestamptz not null default now()
);

alter table public.player_accounts enable row level security;
alter table public.player_link_requests enable row level security;
alter table public.player_link_events enable row level security;

revoke all on public.player_accounts, public.player_link_requests, public.player_link_events
  from public, anon, authenticated;
grant select on public.player_accounts, public.player_link_requests, public.player_link_events to authenticated;
grant insert (user_id, username, full_name) on public.player_accounts to authenticated;

create policy player_accounts_select_owner_or_sport_admin on public.player_accounts
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.can_manage_sport()));

create policy player_accounts_insert_owner on public.player_accounts
  for insert to authenticated
  with check (user_id = (select auth.uid()) and player_id is null);

create policy player_link_requests_select_owner_or_sport_admin on public.player_link_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.can_manage_sport()));

create policy player_link_events_select_sport_admin on public.player_link_events
  for select to authenticated
  using ((select private.can_manage_sport()));

create function private.request_player_link(p_player_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.player_accounts%rowtype;
  request_id uuid;
begin
  select * into account from public.player_accounts where user_id = auth.uid() for update;
  if not found or account.player_id is not null then
    raise exception 'An unlinked player account is required' using errcode = '42501';
  end if;

  select id into request_id from public.player_link_requests
  where user_id = account.user_id and player_id = p_player_id and status = 'pending';
  if found then
    return request_id;
  end if;

  if not exists (select 1 from public.players where id = p_player_id and active) or
     exists (select 1 from public.player_accounts where player_id = p_player_id) then
    raise exception 'This player is unavailable' using errcode = '22023';
  end if;

  insert into public.player_link_requests (user_id, player_id) values (account.user_id, p_player_id)
    returning id into request_id;
  return request_id;
end;
$$;

create function private.review_player_link(p_action text, p_user_id uuid, p_player_id uuid, p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer_id uuid := auth.uid();
  account public.player_accounts%rowtype;
  pending public.player_link_requests%rowtype;
begin
  if reviewer_id is null or not coalesce(private.can_manage_sport(), false) then
    raise exception 'Sporting administration is required' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('approve', 'reject', 'link', 'unlink') or p_player_id is null then
    raise exception 'Invalid player link decision' using errcode = '22023';
  end if;

  select * into account from public.player_accounts where user_id = p_user_id for update;
  if not found then
    raise exception 'Player account not found' using errcode = '22023';
  end if;

  select * into pending from public.player_link_requests
  where user_id = p_user_id and status = 'pending';

  if p_action in ('approve', 'reject') and
     (pending.id is null or pending.id is distinct from p_request_id or pending.player_id is distinct from p_player_id) then
    raise exception 'The request is no longer pending' using errcode = '22023';
  end if;

  if p_action in ('approve', 'link') then
    if account.player_id is not null then
      raise exception 'This account already has a player' using errcode = '22023';
    end if;
    if not exists (select 1 from public.players where id = p_player_id) then
      raise exception 'Player not found' using errcode = '22023';
    end if;
    update public.player_accounts set player_id = p_player_id where user_id = p_user_id;
  elsif p_action = 'unlink' then
    if account.player_id is distinct from p_player_id then
      raise exception 'The player link has changed' using errcode = '22023';
    end if;
    update public.player_accounts set player_id = null where user_id = p_user_id;
  end if;

  if p_action <> 'unlink' and pending.id is not null then
    update public.player_link_requests
    set status = case when p_action <> 'reject' and pending.player_id = p_player_id then 'approved' else 'rejected' end,
        resolved_at = now()
    where id = pending.id;
  end if;

  insert into public.player_link_events (actor_id, user_id, player_id, request_id, action)
  values (reviewer_id, p_user_id, p_player_id, pending.id, p_action);
end;
$$;

create function public.request_player_link(p_player_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.request_player_link(p_player_id);
$$;

create function public.review_player_link(p_action text, p_user_id uuid, p_player_id uuid, p_request_id uuid default null)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.review_player_link(p_action, p_user_id, p_player_id, p_request_id);
$$;

revoke execute on function private.request_player_link(uuid), private.review_player_link(text, uuid, uuid, uuid),
  public.request_player_link(uuid), public.review_player_link(text, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.request_player_link(uuid), private.review_player_link(text, uuid, uuid, uuid),
  public.request_player_link(uuid), public.review_player_link(text, uuid, uuid, uuid)
  to authenticated;
