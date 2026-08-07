-- The league's public contact channels, editable from the panel.
--
-- The functional document asks for an email address and the social accounts, and
-- until today nothing recorded them: the section shipped empty because inventing
-- an address is the one thing this project never does. The operators asked twice
-- to be able to enter them (mail and Instagram, 7 August 2026), so they become
-- rows, owned by the same pair of roles that owns every other piece of content.
create table public.contact_channels (
  id uuid primary key default gen_random_uuid(),
  -- What the visitor reads: "Instagram", "Correo".
  label text not null,
  -- Where it goes. mailto: is a real scheme here, so the check names the three
  -- shapes a channel can legitimately take and nothing else: a javascript: value
  -- in an href is stored XSS, and the database is the layer that never forgets.
  href text not null,
  glyph text,
  display_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint contact_channels_label_sane check (char_length(label) between 1 and 60),
  constraint contact_channels_href_shape
    check (href ~* '^(https?://|mailto:).{3,300}$'),
  constraint contact_channels_glyph_sane check (glyph is null or char_length(glyph) <= 8)
);

comment on table public.contact_channels is
  'The league''s public contact channels, shown on /contacto. Written by content administrators (communications and general); the href check refuses anything that is not web or mailto.';

alter table public.contact_channels enable row level security;

-- Visitors read them: that is what a contact section is for.
create policy contact_channels_select_public on public.contact_channels
  for select using (true);

create policy contact_channels_insert_content_admin on public.contact_channels
  for insert to authenticated
  with check ((select private.can_manage_content()));

create policy contact_channels_update_content_admin on public.contact_channels
  for update to authenticated
  using ((select private.can_manage_content()))
  with check ((select private.can_manage_content()));

create policy contact_channels_delete_content_admin on public.contact_channels
  for delete to authenticated
  using ((select private.can_manage_content()));
