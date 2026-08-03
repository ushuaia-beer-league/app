-- Sponsors and photographs: the content the organisation loads by itself.
--
-- Point 16 of docs/plan.md. This is the only part of the site whose content
-- changes without a match being played, and the whole point is that changing it
-- is never a deploy and never a file in the repository: somebody signs in, drags
-- a logo in, writes a name, and it is live.
--
-- It is also the first time the **communications** role means anything. Until
-- now `private.can_manage_sport()` and `private.can_manage_league()` covered the
-- sporting and the structural tables, and communications could write nothing at
-- all, which matched the role table of the functional document (news, photos and
-- sponsors) only because none of its tables existed. These two get their own
-- helper.
--
-- The images themselves live in Supabase Storage, not here: this schema keeps
-- the object path and the caption. The bucket has to be created once by hand,
-- named `media`, public read, because the API token this migration was applied
-- with can read storage and not configure it.

-- ---------------------------------------------------------------------------
-- Who may write
-- ---------------------------------------------------------------------------

-- News, photos and sponsors: the general administrator and communications. The
-- sporting management is deliberately absent, exactly as communications is
-- absent from every sporting write.
create or replace function private.can_manage_content()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.admin_role() in ('general_administrator', 'communications');
$$;

comment on function private.can_manage_content() is
  'The communications role, plus the general administrator. Mirrors can_manage_sport(): each role writes what the functional document gives it and nothing else.';

revoke all on function private.can_manage_content() from public;
grant execute on function private.can_manage_content() to authenticated;

-- ---------------------------------------------------------------------------
-- sponsors
-- ---------------------------------------------------------------------------

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete restrict,
  name text not null,
  url text,
  -- The object path inside the storage bucket, never a full URL: a bucket can be
  -- renamed or fronted by a CDN without rewriting every row.
  logo_path text,
  display_order smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsors_name_present check (length(btrim(name)) > 0),
  constraint sponsors_url_shape check (url is null or url like 'http%'),
  constraint sponsors_logo_path_present check (logo_path is null or length(btrim(logo_path)) > 0)
);

comment on table public.sponsors is
  'The sponsors of a season, in the order they are shown. Loaded and reordered from the panel by the general administrator or communications.';
comment on column public.sponsors.logo_path is
  'Nullable on purpose: a sponsor whose logo has not arrived is published as a name, not hidden. Publishing the gap is the rule everywhere in this schema.';
comment on column public.sponsors.display_order is
  'Deliberately not unique. Reordering two rows through a unique constraint needs a third, temporary value, and a panel that has to invent one to swap two logos is a panel that will corrupt the order. Ties break by name.';
comment on column public.sponsors.active is
  'A sponsor that has not renewed is deactivated, never deleted, so last season still shows who backed it.';

create index sponsors_season_idx on public.sponsors (season_id, display_order);

create trigger sponsors_set_updated_at
  before update on public.sponsors
  for each row execute function private.set_updated_at();

alter table public.sponsors enable row level security;

-- ---------------------------------------------------------------------------
-- photos
-- ---------------------------------------------------------------------------

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete restrict,
  -- Nullable: a photograph of the rink or of an asado belongs to the season and
  -- to no competition, and forcing one would be the table asserting something
  -- nobody said.
  competition_key text references public.competitions (key) on update cascade,
  storage_path text not null,
  caption text,
  taken_on date,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photos_storage_path_present check (length(btrim(storage_path)) > 0),
  constraint photos_storage_path_unique unique (storage_path),
  constraint photos_taken_on_range check (
    taken_on is null or taken_on between date '2023-01-01' and date '2100-01-01'
  )
);

comment on table public.photos is
  'The gallery of a season. One row per image in the storage bucket, with the caption the organisation wrote. An empty gallery is rendered as empty, not as placeholders.';
comment on column public.photos.storage_path is
  'The object path inside the bucket, unique so uploading the same file twice cannot produce two rows pointing at one image.';
comment on column public.photos.caption is
  'Nullable. A photograph with no caption is still a photograph; an invented caption is not a fact.';

create index photos_season_idx on public.photos (season_id, display_order);
create index photos_competition_idx on public.photos (competition_key)
  where competition_key is not null;

create trigger photos_set_updated_at
  before update on public.photos
  for each row execute function private.set_updated_at();

alter table public.photos enable row level security;

-- ---------------------------------------------------------------------------
-- Privileges and policies
-- ---------------------------------------------------------------------------

revoke all on table public.sponsors, public.photos from anon, authenticated;

grant select on table public.sponsors, public.photos to anon, authenticated;
grant insert, update, delete on table public.sponsors, public.photos to authenticated;

create policy sponsors_select_public on public.sponsors
  for select to anon, authenticated
  using (true);

create policy sponsors_insert_content_admin on public.sponsors
  for insert to authenticated
  with check ((select private.can_manage_content()));

create policy sponsors_update_content_admin on public.sponsors
  for update to authenticated
  using ((select private.can_manage_content()))
  with check ((select private.can_manage_content()));

create policy sponsors_delete_content_admin on public.sponsors
  for delete to authenticated
  using ((select private.can_manage_content()));

create policy photos_select_public on public.photos
  for select to anon, authenticated
  using (true);

create policy photos_insert_content_admin on public.photos
  for insert to authenticated
  with check ((select private.can_manage_content()));

create policy photos_update_content_admin on public.photos
  for update to authenticated
  using ((select private.can_manage_content()))
  with check ((select private.can_manage_content()));

create policy photos_delete_content_admin on public.photos
  for delete to authenticated
  using ((select private.can_manage_content()));
