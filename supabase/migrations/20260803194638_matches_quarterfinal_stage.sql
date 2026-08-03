-- The bracket has a round the stage vocabulary was missing.
--
-- Reading the 8 August 2026 rows closely: at 21:30 the third seed plays the
-- winner of the 6th-versus-7th play-in and the fourth seed plays the fifth, and
-- at 23:30 the winners of those two meet the first and the second seed, which
-- the sheet itself labels "Semifinal 1" and "Semifinal 2". Six teams, so the
-- 21:30 pair are quarterfinals, not semifinals.
--
-- Calling them semifinals would have put four teams in a two-team round and
-- broken any bracket drawn from the data. The women's 22:30 pair really are
-- semifinals: four teams, two matches.
--
-- MatchStage in src/data/types.ts carries the same literal, in the same commit.

alter table public.matches drop constraint matches_stage_allowed;

alter table public.matches add constraint matches_stage_allowed check (
  stage in (
    'regular',
    'playin',
    'quarterfinal',
    'semifinal',
    'final',
    'third-place',
    'fifth-place',
    'all-star'
  )
);

comment on column public.matches.stage is
  'Where the match sits in the season. Only regular feeds the standings: the play-in of 4 July 2026 decides a playoff berth and the league does not count it as a seventh regular game.';
