---
name: standings-rules
description: Use when touching standings, scoring leaders, goalkeeping percentages or playoff seeding for the UBL. Triggers on "standings", "tabla de posiciones", "points", "tiebreaker", "PGR", "save percentage", "goleadores", "playoff seeding", or any edit under src/utils that computes a table.
---

# UBL standings and statistics

This league's scoring is not the one most hockey code assumes. Getting it wrong
produces a table that looks plausible and is wrong, which nobody notices until a
team complains.

## When to use

Adding or changing any calculation that turns match records into a table, a rank
or a percentage.

## When NOT to use

Presentation work (sorting a column in the UI, formatting a number). Those live
in components and must call the pure functions rather than reimplementing them.

## The rules

Scoring:

| Outcome | Points |
|---|---|
| Win in regulation | 2 |
| Win in a shootout | 2 |
| Loss in a shootout | 1 |
| Draw | 1 |
| Loss in regulation | 0 |

A regulation win and a shootout win pay the same but are stored apart, because
**PGR** (wins outside a shootout) is the first tiebreaker.

Ordering: points, then PGR, then goal difference. There is **no** mini-table
among tied teams. Do not port that rule from the CFM project.

Draws exist. One is on record (Mujeres Birra del Fuego 4-4 Mujeres Tipo Nine,
28 June 2026). Never write a branch that treats a tie as impossible or as bad
data.

Player points are goals plus assists, with no distinction between first and
second assist in what the league publishes.

Save percentage is `(shots faced - goals against) / shots faced`. Shots faced
come from the match sheet; the percentage is computed on read and never stored.
A goalkeeper who faced nothing has a null percentage, not a perfect one.

## Steps

1. Read the current rules in `docs/knowledge-base.md`, section 4. If the code and
   that section disagree, the section wins until the organisation says otherwise.
2. Put the calculation in a pure module under `src/utils/`, taking records and
   returning rows. No React, no database client, no dates from `Date.now()`.
3. Keep a single function that turns one match outcome into points. Every table,
   including any per-competition or per-round breakdown, must call it.
4. Derive, never persist. If a total can be computed from match records, it is
   computed at read time.
5. Write the tests before wiring the UI.

## Required test cases

A standings change is not done until these are covered:

- regulation win and regulation loss;
- shootout win worth the same as a regulation win;
- shootout loss worth 1;
- a draw worth 1 to each side;
- two teams level on points separated by PGR;
- two teams level on points and PGR separated by goal difference;
- a 0-0 match counted as played, since zero is a real score;
- matches with no result excluded from the table;
- playoff matches excluded from the regular-season table;
- the two competitions kept apart, so a Beer League match never reaches a WUBL
  table;
- save percentage null when no shots were faced.

## Verify against real data

The 4 July 2026 standings in `docs/knowledge-base.md`, section 6.4, are what the
league published. Feed the imported season into the calculation and compare. All
seven Beer League rows and all four WUBL rows must match, including Rock Choppers
above Blanco on PGR despite the worse goal difference.

The nine goalkeeper rows in section 6.7 reconcile exactly with
`(shots - goals) / shots`. Use them as fixtures.
