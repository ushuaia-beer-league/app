-- The href check was unenforceable as written: POSIX bounds a repetition count at
-- 255, so `.{3,300}` made the regex itself invalid and EVERY insert failed with a
-- regex error, good and bad alike. Caught by the rolled-back assertions before any
-- operator hit it. The length moves to char_length, where 300 is just a number,
-- and the regex keeps only the part it is for: the scheme.
alter table public.contact_channels
  drop constraint contact_channels_href_shape;

alter table public.contact_channels
  add constraint contact_channels_href_shape
  check (
    href ~* '^(https?://|mailto:)'
    and char_length(href) between 10 and 300
  );
