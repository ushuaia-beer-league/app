-- The site's own prose, editable from the panel, per language.
--
-- The five Historia blocks were hardcoded and the league asked for communications
-- to be able to change texts. A row here overrides the built-in text for one block
-- in one language; a language nobody edited keeps showing the translation shipped
-- in the code, so editing Spanish never blanks English.
--
-- The ten commandments are deliberately not reachable from here: they are the
-- rulebook, quoted verbatim, and no panel edits them.
create table public.site_content (
  key text not null,
  language text not null,
  title text,
  body text not null,
  updated_at timestamptz not null default now(),
  primary key (key, language),
  constraint site_content_key_shape check (key ~ '^[a-z0-9-]{3,40}$'),
  constraint site_content_language_known check (language in ('es', 'en', 'pt-BR')),
  constraint site_content_body_sane check (char_length(body) between 1 and 8000),
  constraint site_content_title_sane check (title is null or char_length(title) <= 120)
);

comment on table public.site_content is
  'Panel-edited overrides for the site''s prose, per block and language. Absent row = the built-in text. Written by content administrators (communications and general).';

alter table public.site_content enable row level security;

-- The public site reads it like any sporting data.
create policy site_content_select_public on public.site_content
  for select using (true);

-- Communications and general administrators write, the same rule as photos and
-- sponsors, enforced by the same function.
create policy site_content_insert_content_admin on public.site_content
  for insert to authenticated
  with check ((select private.can_manage_content()));

create policy site_content_update_content_admin on public.site_content
  for update to authenticated
  using ((select private.can_manage_content()))
  with check ((select private.can_manage_content()));

create policy site_content_delete_content_admin on public.site_content
  for delete to authenticated
  using ((select private.can_manage_content()));
