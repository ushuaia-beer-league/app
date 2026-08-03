#!/bin/bash
# Warns, without blocking, when a write targets read-only league material or a
# lockfile. Referenced by CLAUDE.md, section "Data integrity".
set -u

if ! command -v jq >/dev/null 2>&1; then
  marker="${TMPDIR:-/tmp}/.claude-ubl-jq-warned-$PPID"
  if [ ! -f "$marker" ]; then
    echo "WARNING: jq not found, .claude/hooks/* run fail-open (no guards). Install with 'brew install jq'." >&2
    : > "$marker" 2>/dev/null
  fi
  exit 0
fi

path=$(jq -r '.tool_input.file_path // empty')
[ -z "$path" ] && exit 0

if printf '%s' "$path" | grep -q 'docs/sources/'; then
  echo "NOTE: docs/sources/ is the original league material and is read only. Imports parse it; corrections belong in the database or in docs/knowledge-base.md." >&2
  exit 1
fi

if printf '%s' "$path" | grep -Eq '(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$'; then
  echo "NOTE: editing a lockfile by hand breaks dependency resolution. Run the package manager instead." >&2
  exit 1
fi

exit 0
