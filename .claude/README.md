# Agent kit

Project-level configuration for Claude Code. `CLAUDE.md` at the repository root
is the source of truth for rules and architecture; this directory only adds
guardrails and repeatable procedures.

```
.claude/
├── README.md          this index
├── settings.json      registers the hooks below
├── hooks/             deterministic guards, no AI judgment
└── skills/            step-by-step procedures for recurring flows
```

There is no `agents/` directory on purpose: this project does not delegate to
subagents.

## Hooks

| Hook                            | Event                  | What it does                                                                                                                                                                                            |
| ------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-bash-block-destructive.sh` | PreToolUse, Bash       | Blocks deletion of `docs/sources`, `docs`, `supabase/migrations`, `.github`, `.claude`; blocks `--no-verify`, force push to `main`, `git reset --hard`, `git clean -fd`, and branch deletion of `main`. |
| `pre-write-warn-protected.sh`   | PreToolUse, Edit/Write | Warns when a write targets `docs/sources/` (original league material, read only) or a lockfile.                                                                                                         |
| `session-start.sh`              | SessionStart           | Prints branch and upstream, plus the domain rules most easily got wrong.                                                                                                                                |

All hooks fail open: if `jq` is missing they warn once and allow the call.

## Skills

| Skill                | Use it when                                                 |
| -------------------- | ----------------------------------------------------------- |
| `standings-rules`    | Touching standings, scoring leaders or goalkeeping maths.   |
| `import-source-data` | Importing or re-importing league data from `docs/sources/`. |
| `supabase-schema`    | Adding or changing a table, a policy or a migration.        |

## Optional per-developer settings

`.claude/settings.local.json` is gitignored. Use it for personal overrides, for
example enabling extra hooks, without changing the shared configuration.
