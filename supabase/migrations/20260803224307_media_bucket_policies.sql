-- The media bucket: who may upload, and how big a file may be.
--
-- The bucket itself was created by hand in the dashboard, public, because the
-- token these migrations are applied with can read storage and not configure it.
-- What it arrived without is everything that matters: no size limit, no type
-- restriction, and no policy on storage.objects, which means only the service
-- role can write. The panel signs in as a normal user, so without the policies
-- below the sponsors and the gallery would be unfillable.
--
-- Public read is how a public bucket already behaves over the CDN; the select
-- policy states it for the API path too, so the two agree.
--
-- Writes are the communications role and the general administrator, the same
-- `private.can_manage_content()` that governs the sponsors and photos tables.
-- Sporting management is absent from both, exactly as the functional document's
-- role table says.

-- Five megabytes and images only. The panel resizes before uploading, but a limit
-- the client can skip is not a limit: one phone photograph is several megabytes
-- and the whole free tier is a gigabyte.
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'media';

create policy media_read_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

create policy media_insert_content_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select private.can_manage_content()));

create policy media_update_content_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select private.can_manage_content()))
  with check (bucket_id = 'media' and (select private.can_manage_content()));

create policy media_delete_content_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select private.can_manage_content()));
