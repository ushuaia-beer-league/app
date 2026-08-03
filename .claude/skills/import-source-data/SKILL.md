---
name: import-source-data
description: Use when importing or re-importing UBL league data from docs/sources into Supabase or into the versioned seed. Triggers on "import the fixture", "importar planilla", "load the season", "reimport", "seed data", "cargar los datos", or any work on scripts that parse docs/sources.
---

# Importing league data

The league keeps its data in a spreadsheet filled in by hand. It contains known
errors. The import's job is to load what reconciles and to make the rest visible,
never to guess.

## When to use

Loading the season for the first time, re-importing after the organisation
corrects the sheet, or regenerating the versioned seed from what is published.

## When NOT to use

Entering a single match result. That is the back office's job, by hand, from the
paper sheet.

## Sources and which one wins

| File                                                                              | Holds                               | Trust                                   |
| --------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------- |
| `fixture-2026-calendar.csv`                                                       | fixture, scores, venue, round dates | highest, use for results                |
| `spreadsheet-export/teams.html`                                                   | rosters with jersey numbers         | high                                    |
| `spreadsheet-export/standings.html`                                               | published standings                 | reconciliation target only              |
| `spreadsheet-export/player-stats.html`, `goalie-stats.html`, and the `wubl-` pair | published totals                    | reconciliation target only              |
| `spreadsheet-export/results.html`                                                 | matchups without goals              | do not use, the export lost the numbers |

Never import a published total as a stored value. Totals are recomputed from
match records; the published ones exist to check the import.

## Steps

1. Read `docs/knowledge-base.md` section 6 first. It already lists what the
   sources say and which rows are broken.
2. Parse into an intermediate JSON file under `scripts/`, one object per entity.
   Keep the parse and the write in separate steps so the parse can be reviewed
   without touching the database.
3. Normalise carefully:
   - `5 p` or `8p` in a score column means that side won in a shootout. Record the
     resolution, not the letter.
   - Times appear as both `21:30` and `2130`.
   - Team names carry trailing spaces and appear in both short and sponsored
     form. Map through the table in section 6.1.
   - `Mujeres <team>` in the fixture is a WUBL team, and its four teams have
     their own names in the statistics sheets. That mapping is still unconfirmed.
   - A row with `Libre` is a bye, not a match.
4. Reconcile before writing. Recompute standings, scoring and goalkeeping from
   the parsed records and diff against the published tables. Report every
   mismatch and stop; do not write a partial season silently.
5. Load what reconciles. Leave a known-bad row out and name it in the report.
6. Regenerate the versioned seed in `src/data/` from what is now published, so
   the site still renders when Supabase is paused or unreachable.
7. Never write to `docs/sources/`. It is the only copy of the original material.

## Known bad rows, do not silently fix

- Round 1 has a row with a time and a venue but no teams and no score.
- Round 5 leaves the result and winner columns empty on four matches and carries
  a winner that does not belong to the row on two others. The goal columns are
  the reliable ones.
- Jersey 28 appears twice in the Hantachoppers roster.
- The same goalkeeper is spelled Cavalleri on one sheet and Cavaliere on another.

Each of these is an open question in `docs/knowledge-base.md` section 9. Import
around them and keep them listed until the organisation answers.

## Cost discipline

Read each collection once. Do not loop a full read to poll for changes: the
Supabase free tier is what the whole project runs on.
