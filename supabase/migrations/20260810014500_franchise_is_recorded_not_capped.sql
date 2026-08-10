-- The franchise flag records what happened; it no longer refuses it.
--
-- This column has now been limited three ways in a week, and each limit came
-- from reading the rulebook rather than from the league. "En el caso de que
-- soliciten un jugador franquicia, solo puede jugar uno por partido" became a
-- unique index on (match_id), then on (match_id, team_id) when the league said
-- a match may hold two. On 2026-08-10 the league said what the rule is actually
-- for: this edition had teams with two franchise players and teams with one,
-- and what they want to avoid is a lopsided match, "uno con 3 y otro con 1".
--
-- So there is no cap. A constraint that refuses a real match sheet is worse
-- than no constraint: the operator would be unable to record a night that
-- happened, and the panel exists to record nights that happened. The panel now
-- counts them per side and says when the sides are uneven, which is the fact
-- the league cares about, and it refuses nothing.
--
-- The partial index also served as the lookup for "who was the franchise player
-- of this match", so a non-unique one replaces it.

drop index if exists public.match_players_one_franchise_per_side_idx;

create index match_players_franchise_idx
  on public.match_players (match_id, team_id) where is_franchise;

comment on column public.match_players.is_franchise is
  'This appearance was a franchise substitute. Deliberately uncapped: the league confirmed on 2026-08-10 that a team may field more than one and that the concern is balance between the sides, not a per-match limit, so the panel counts and warns rather than refusing. Open question 10 still asks what the status means.';
