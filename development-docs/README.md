# Plot Docs Development Documents

This folder is the handoff package for the current work. It is written so any model or developer can resume without reading the whole chat.

Last updated: 2026-11-08

## Read in this order

0. [00-total-history.md](00-total-history.md) — compact total history of the project so far
1. [01-project-history.md](01-project-history.md) — what the user asked for, in order
2. [02-current-status.md](02-current-status.md) — what is implemented, what is not
3. [03-updates-notifications.md](03-updates-notifications.md) — update/notification architecture
4. [04-version-control.md](04-version-control.md) — Git/GitHub release workflow
5. [05-analytics-roadmap.md](05-analytics-roadmap.md) — Zoho-inspired local-first analytics plan
6. [06-test-log.md](06-test-log.md) — tests run, failures, fixes
7. [07-release-checklist.md](07-release-checklist.md) — release gate
8. [08-resume-prompt.md](08-resume-prompt.md) — copy-paste prompt for any model
9. [09-all-user-inputs.md](09-all-user-inputs.md) — numbered input history from message 1

## Canonical documents

These are the detailed versions used by the project:

- `../history.txt` — complete history/spec/handoff file
- `../docs/updates-and-notifications.md` — detailed update/notification manual
- `../docs/version-control-workflow.md` — detailed Git/GitHub workflow
- `../docs/analytics-parity-roadmap.md` — detailed analytics roadmap
- `../updates/README.md` — `/updates` folder format
- `../notifications/README.md` — `/notifications` folder format

## Current priority

1. Finish and verify the update + notification system.
2. Then enhance analytics for huge data and Zoho-like capability parity.

## Hard rules

- Do not use subagents/agents.
- Do not delete uncommitted analytics work.
- Do not fabricate analytics results.
- Never auto-run downloaded installers.
- Do not disable Smart App Control in app code.
- Keep Plot Docs local-first.
