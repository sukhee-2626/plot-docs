# Resume Prompt

Copy this into a new session with any model.

---

You are continuing work on Plot Docs, a local-first AI-native office suite in `C:\Users\HP\ss-office`.

Read these first, in order:

1. `history.txt`
2. `development-docs/README.md`
3. `development-docs/02-current-status.md`
4. `development-docs/06-test-log.md`
5. `docs/updates-and-notifications.md`
6. `docs/version-control-workflow.md`
7. `docs/analytics-parity-roadmap.md`

## Current priority

Finish and verify the GitHub-based update system and the real-time notification center. Only after that, enhance the analytics workspace for huge data and Zoho-inspired local-first parity.

## Current state

- Branch `main`, last pushed commit `4f3c9067`.
- Update/notification backend, preload, renderer panel, bell, badge, update popup, panel hero, and docs are written but uncommitted.
- Focused core tests pass 16/16.
- Shell typecheck and build pass after the popup/hero hook fix.
- Live notification/local-package E2E passes 1/1 (22.6s), including the update popup and hero.
- Live GitHub E2E passes 2/2 (19.3s): current release and no-release state.
- Packaged install E2E passes 1/1 (47.1s); portable build passed.
- No newer portable release exists yet, so live download/progress/integrity remains untested.

## Immediate next actions

1. Commit and push the update/notification/popup work.
2. Launch the packaged portable build and confirm the update popup and hero on a scratch profile.
3. Publish `v1.0.1` with a portable `.exe` when GitHub auth is available; test download/progress/checksum.
4. Then fix Codex structured analytics output and run huge-data benchmarks.
5. Then start the Zoho-inspired analytics phases in `docs/analytics-parity-roadmap.md`.

## Hard rules

- Do not use subagents/agents.
- Do not delete uncommitted analytics work.
- Never fabricate analytics results. Show SQL, dataset, filters, period, method, uncertainty.
- Keep source datasets immutable; use derived datasets.
- Never auto-run downloaded installers.
- Verify checksums; block invalid signatures; require confirmation.
- Preserve user documents and settings.
- Do not disable Smart App Control in app code.
- Keep Plot Docs local-first.
- No continuous GitHub polling; use launch, manual, and throttled focus checks plus filesystem watchers.
- Renderer sends only opaque package ids/folder kinds; main resolves paths and URLs.

## Useful commands

```powershell
cd C:\Users\HP\ss-office
git status --short
npm run typecheck -w @plotdocs/shell
npm run build -w @plotdocs/shell
npx vitest run apps/shell/tests/updates-center-core.test.ts
npm test -w @plotdocs/shell -- --run
npm run dist:portable -w @plotdocs/shell
```

## Reporting

After each milestone, update:

- `history.txt`
- `development-docs/02-current-status.md`
- `development-docs/06-test-log.md`

Record exact commands, errors, and fixes. Do not mark a manual test as passed unless the app was actually run.

---
