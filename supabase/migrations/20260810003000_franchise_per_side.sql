-- One franchise player per side, not one per match.
--
-- The rulebook, verbatim (knowledge base 3): "Los equipos pueden solicitar
-- suplentes. En el caso de que soliciten un jugador franquicia, solo puede
-- jugar uno por partido." The initial schema read that literally — one
-- franchise appearance in the whole match — and said in its own comment that
-- if the organisation meant one per side, this index becomes
-- (match_id, team_id). That is what happened: on 2026-08-10 the league said
-- plainly that a match can hold two, one for each team, which is also the
-- reading the sentence invites, since its subject is a team requesting one.
--
-- This is the standing answer to open question 10's limit. What a franchise
-- player *is* remains open; how many may play is now settled.

drop index if exists public.match_players_one_franchise_per_match_idx;

create unique index match_players_one_franchise_per_side_idx
  on public.match_players (match_id, team_id) where is_franchise;

comment on column public.match_players.is_franchise is
  'This appearance was a franchise substitute. At most one per side per match, enforced by match_players_one_franchise_per_side_idx: the league confirmed on 2026-08-10 that a match may hold two, one for each team.';
