#!/bin/bash
# Prints repository state plus the domain rules most easily got wrong.
set -u

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "no branch")
upstream=$(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || echo "no upstream")

cat <<EOF
UBL — branch: $branch, upstream: $upstream

Domain rules that differ from ordinary hockey (see CLAUDE.md):
  - A win is 2 points, a shootout loss is 1. Tiebreak: points, PGR, goal difference.
  - Draws exist in the women's competition. Never model a tie as impossible.
  - Two matches run at once in two venues (Bahia, Poli). No one-match-per-slot assumption.
  - No penalty minutes: discipline is a penalty shot or leaving the game.
  - Never store an aggregate. Standings and statistics are derived at read time.
  - Never store a national ID, birth date, phone, address or payment status.
  - docs/sources/ is read only. Never write to it.
EOF

exit 0
