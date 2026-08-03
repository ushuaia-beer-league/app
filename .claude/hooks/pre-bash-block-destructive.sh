#!/bin/bash
# Blocks commands that would destroy irreplaceable league material or rewrite
# shared history. Referenced by CLAUDE.md, sections "Data integrity" and "Git".
# Exit 0 allows, exit 2 blocks and surfaces stderr to Claude.
set -u

if ! command -v jq >/dev/null 2>&1; then
  marker="${TMPDIR:-/tmp}/.claude-ubl-jq-warned-$PPID"
  if [ ! -f "$marker" ]; then
    echo "WARNING: jq not found, .claude/hooks/* run fail-open (no guards). Install with 'brew install jq'." >&2
    : > "$marker" 2>/dev/null
  fi
  exit 0
fi

cmd=$(jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

block() {
  echo "BLOCKED by .claude/hooks/pre-bash-block-destructive.sh" >&2
  echo "Reason: $1" >&2
  echo "Recovery: $2" >&2
  exit 2
}

# Irreplaceable or expensive-to-rebuild paths.
if printf '%s' "$cmd" | grep -Eq 'rm[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*.*(docs/sources|docs\b|supabase/migrations|\.github|\.claude|src)\b'; then
  if printf '%s' "$cmd" | grep -Eq 'rm[[:space:]]+-[a-zA-Z]*[rRf]'; then
    block "recursive delete targeting protected path (docs/sources holds the only copy of the league material)" \
          "delete the specific file by name, or move it aside with mv"
  fi
fi

# Commit hooks and signing must not be skipped.
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+commit.*--no-verify'; then
  block "git commit --no-verify is forbidden by CLAUDE.md" \
          "fix what the hook reports, then commit normally"
fi

# Never rewrite the shared branch.
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push.*(--force([[:space:]]|=|$)|--force-with-lease|[[:space:]]-f([[:space:]]|$))' \
  && printf '%s' "$cmd" | grep -Eq '(origin[[:space:]]+)?(main|HEAD:main)([[:space:]]|$)'; then
  block "force push to main" \
          "push to a feature branch and open a pull request"
fi

if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+reset[[:space:]]+--hard'; then
  block "git reset --hard discards uncommitted work" \
          "use 'git stash' to set changes aside, or 'git restore <path>' for one file"
fi

# git clean -d deletes untracked files. A dry run is harmless, so only the
# real deletion is blocked: -n and --dry-run print without touching anything.
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+clean[[:space:]]+' \
  && printf '%s' "$cmd" | grep -Eq 'clean[[:space:]]+(-[a-zA-Z]*d|--force)' \
  && ! printf '%s' "$cmd" | grep -Eq 'clean[[:space:]]+(-[a-zA-Z]*n|--dry-run)'; then
  block "git clean deletes untracked files, which here includes unversioned league exports" \
          "list what would go with 'git clean -nd' first, then delete specific files"
fi

if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+branch[[:space:]]+-D[[:space:]]+(main|master)'; then
  block "deleting the main branch" \
          "switch branches instead: git switch <other-branch>"
fi

exit 0
