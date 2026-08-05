-- How many people look at this, and at what. Nothing about who they are.
--
-- The site is static on Pages, so there are no server logs to read: without a
-- counter the league has no idea whether anybody opens it. This is that counter,
-- and it is deliberately the smallest one that answers the question.
--
-- What is stored is a path, a day and a number. There is no address, no browser,
-- no referrer, no session and no identifier of any kind, so there is nothing here
-- that could become personal data later. That is not caution for its own sake:
-- this project already refuses to store a phone number or a date of birth, and an
-- analytics table is the usual way that promise quietly stops being true.
--
-- The day is the league's own day, Ushuaia time. A visit at ten at night belongs
-- to that night, not to tomorrow in UTC.
--
-- Nobody writes to this table. Anonymous visitors cannot: they have no policy at
-- all, and the only way in is `record_view`, which is `security definer`, adds one
-- to a counter, and can do nothing else. That is also its weakness and it is worth
-- writing down: anybody may call it in a loop, so these numbers are indicative
-- rather than audited, and they are not the place to look if precision matters.

create table public.page_views (
  path text not null,
  day date not null default (now() at time zone 'America/Argentina/Ushuaia')::date,
  views bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (path, day),
  constraint page_views_path_shape check (path ~ '^[a-z0-9/-]{1,60}$'),
  constraint page_views_positive check (views >= 0)
);

comment on table public.page_views is
  'One counter per path per day. Holds nothing about the visitor, by design. Written only by public.record_view.';

alter table public.page_views enable row level security;

-- Reading traffic is an administrator's business, not a visitor's. Any of the
-- three roles may look: knowing whether the site is used is not a sporting
-- decision and not a content decision.
create policy page_views_read_admin on public.page_views
  for select to authenticated
  using ((select public.my_admin_role()) is not null);

create or replace function public.record_view(page text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A path that does not look like one of ours is dropped rather than stored, so
  -- the table cannot be filled with junk keys. Silence on purpose: a visitor has
  -- nothing to do with the answer and the site must not break over a counter.
  if page is null or page !~ '^[a-z0-9/-]{1,60}$' then
    return;
  end if;

  insert into public.page_views (path, day, views)
  values (
    page,
    (now() at time zone 'America/Argentina/Ushuaia')::date,
    1
  )
  on conflict (path, day) do update
    set views = public.page_views.views + 1,
        updated_at = now();
end $$;

comment on function public.record_view(text) is
  'Adds one to the counter for a path on today''s league date. The only way anything is written to page_views, and it can do nothing else.';

revoke all on function public.record_view(text) from public;
grant execute on function public.record_view(text) to anon, authenticated;
