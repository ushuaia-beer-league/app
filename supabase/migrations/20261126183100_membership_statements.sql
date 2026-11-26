-- Private opening statements transcribed from the league's registration exports.
create table public.membership_statements (
  id uuid primary key default gen_random_uuid(),
  season_year smallint not null references public.seasons(year),
  competition_key text not null references public.competitions(key),
  source_row integer not null check (source_row > 1),
  source_name text not null check (length(btrim(source_name)) > 0),
  payments_cents integer[] not null check (
    cardinality(payments_cents) <= 3 and
    array_position(payments_cents, null) is null and
    0 < all(payments_cents)
  ),
  balance_cents integer check (balance_cents >= 0),
  player_id uuid references public.players(id),
  visible_to uuid references auth.users(id) on delete set null,
  unique (season_year, competition_key, source_row),
  unique (season_year, competition_key, player_id),
  check (visible_to is null or player_id is not null)
);

create index membership_statements_player_idx on public.membership_statements (player_id);
create index membership_statements_viewer_idx on public.membership_statements (visible_to)
  where visible_to is not null;

alter table public.membership_statements enable row level security;
revoke all on public.membership_statements from public, anon, authenticated;
grant select on public.membership_statements to authenticated;

create policy membership_statements_read on public.membership_statements for select to authenticated
using (
  (select private.can_manage_league())
  or (
    visible_to = (select auth.uid())
    and player_id = (select a.player_id from public.player_accounts a where a.user_id = (select auth.uid()))
  )
);

create function private.assign_membership_statement(p_statement_id uuid, p_player_id uuid, p_visible_to uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not coalesce(private.can_manage_league(), false) then
    raise exception 'League administration is required' using errcode = '42501';
  end if;
  if p_visible_to is not null then
    perform 1 from public.player_accounts a
    where a.user_id = p_visible_to and a.player_id = p_player_id for share;
    if not found then
      raise exception 'The player account link has changed' using errcode = '22023';
    end if;
  end if;

  update public.membership_statements
  set player_id = p_player_id, visible_to = p_visible_to
  where id = p_statement_id;
  if not found then
    raise exception 'Membership statement not found' using errcode = '22023';
  end if;
end;
$$;

create function public.assign_membership_statement(
  p_statement_id uuid, p_player_id uuid default null, p_visible_to uuid default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.assign_membership_statement(p_statement_id, p_player_id, p_visible_to);
$$;

revoke execute on function private.assign_membership_statement(uuid, uuid, uuid),
  public.assign_membership_statement(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function private.assign_membership_statement(uuid, uuid, uuid),
  public.assign_membership_statement(uuid, uuid, uuid) to authenticated;

-- Remove financial access even if the same account is later relinked by staff.
create function private.clear_membership_access_on_relink()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.membership_statements set visible_to = null where visible_to = old.user_id;
  return new;
end;
$$;
revoke execute on function private.clear_membership_access_on_relink() from public, anon, authenticated;
create trigger player_account_membership_access
after update of player_id on public.player_accounts for each row
when (old.player_id is distinct from new.player_id)
execute function private.clear_membership_access_on_relink();
