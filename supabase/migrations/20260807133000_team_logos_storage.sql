-- Sporting management may upload team crests.
--
-- The media bucket was writable by content administrators only, which was right
-- for photographs and sponsor logos. Team crests belong to the team row, and the
-- team row is sporting management's, so a sport administrator could edit the team
-- and still not upload its badge: the operators hit exactly that wall. The grant
-- is scoped to the `teams/` prefix, nothing wider.
create policy media_insert_sport_teams on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and name like 'teams/%'
    and (select private.can_manage_sport())
  );

create policy media_update_sport_teams on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and name like 'teams/%'
    and (select private.can_manage_sport())
  )
  with check (
    bucket_id = 'media'
    and name like 'teams/%'
    and (select private.can_manage_sport())
  );
