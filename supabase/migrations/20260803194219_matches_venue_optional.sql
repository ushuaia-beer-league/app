-- The cabecera of a match is not always known when the match is scheduled.
--
-- The 2026 sheet proves it: the semifinals of 8 August, the finals of 15 August
-- and the five all-star slots of 18 July all carry a date and a time and leave
-- the "Cabecera" column empty. Requiring a venue would have left the importer
-- two bad options, inventing a rink or dropping the fixture rows the site most
-- needs to show, so the column becomes optional.
--
-- What does not change: the vocabulary check still refuses anything other than
-- bahia and poli, and matches_slot_unique still keys a slot by
-- (season, date, time, venue). Under that unique constraint two rows with no
-- venue never collide, because Postgres treats nulls as distinct, which is
-- exactly right here: the two 21:30 semifinals are genuinely two matches whose
-- rinks nobody has assigned yet.

alter table public.matches alter column venue drop not null;

alter table public.matches drop constraint matches_venue_allowed;

alter table public.matches add constraint matches_venue_allowed check (
  venue is null or venue in ('bahia', 'poli')
);

comment on column public.matches.venue is
  'The cabecera, Bahia or Poli. Two matches run at the same time, one in each. Null means the rink has not been assigned yet, not that the match has no venue.';
