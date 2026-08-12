-- A slot can hold a triangular.
--
-- `matches_slot_unique (season_id, match_date, start_time, venue)` modelled the
-- fact that two matches run at once in the two cabeceras, and it was right about
-- that. It was wrong about the rest: on 2026-08-15 the fifth place is a
-- triangular, three fifteen-minute games between three teams, in one venue, in
-- the slot the league calls 20:30. The operator could load the first and the
-- database refused the second, so he parked two of them on the 16th and asked
-- whether we could move them.
--
-- This is the third constraint this schema has had to loosen for the same
-- reason: it was written from what the sources implied rather than from what the
-- league does. A constraint that refuses a real fixture stops the league from
-- recording a night that is going to happen.
--
-- The guard that is worth keeping is narrower: the same pairing twice in the
-- same slot is a duplicate, whatever the venue. Rows with no teams are outside
-- it, since a unique index does not collide nulls, and that is wanted: several
-- reserved hours with nobody assigned are legal and the 2026 sheet has one.

alter table public.matches drop constraint if exists matches_slot_unique;

create unique index matches_slot_pairing_unique
  on public.matches (
    season_id,
    match_date,
    start_time,
    venue,
    home_team_id,
    away_team_id
  );

comment on index public.matches_slot_pairing_unique is
  'The same pairing twice in one slot is a duplicate; three different pairings in one slot are a triangular, which the league plays. Replaced matches_slot_unique on 2026-08-12, which allowed only one match per (date, time, venue).';
