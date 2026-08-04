-- The media bucket stops answering "what is in you".
--
-- A public bucket serves its objects over
-- `/storage/v1/object/public/media/...` without consulting row level security,
-- which is what "public" means, and that route is the only way this site reads an
-- image: `mediaUrl()` builds that address for an `<img>`, and nothing in the code
-- calls `list()` or `download()`. So a visitor with no session keeps seeing every
-- sponsor logo and every photograph exactly as before this migration.
--
-- What the open select policy added on top of that was the ability to enumerate
-- the bucket. Anybody could ask for the whole file list: a photograph the league
-- removed from the gallery whose object outlived its row, an upload that never
-- got a row at all, the shape of what is being prepared. None of it is reachable
-- from the site and none of it was meant to be published.
--
-- Select stays for the role that may write, because storage refuses to delete an
-- object to somebody who cannot read it first, and the panel deletes.

drop policy media_read_public on storage.objects;

create policy media_read_content_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (select private.can_manage_content()));
