# Current Status

Last updated: 2026-11-08

## Repository

- Branch: `main`
- Last pushed commit: `4f3c9067 feat(analytics): add local BI workspace, AI analyst, and release hardening`
- Working tree: uncommitted updates/notifications work plus earlier uncommitted analytics changes
- Origin: `https://github.com/sukhee-2626/plot-docs.git`

## Done

### Analytics (earlier work, uncommitted)

- Cross-dataset joins and append/union
- Pivot, funnel, cohort
- Privacy hardening
- Crash diagnostics and ErrorBoundary
- Dashboard/assistant improvements
- Local E2E fixtures
- Assistant routing rules
- Codex live smoke test passed earlier
- Focused analytics suite passed earlier: 13 files / 140 tests
- Deterministic accuracy benchmark passed earlier: 48/48

### Updates + notifications (current work)

Backend:

- `apps/shell/src/shared/updates-center-api.ts` — IPC contract and types
- `apps/shell/src/main/updates-center-core.ts` — pure scanner, parsers, version compare, watcher, hashing, executable replacement, GitHub release parsing
- `apps/shell/src/main/updates-center.ts` — main service, GitHub API, download, checksum, signature, backup, install, restart, notification state, IPC
- `apps/shell/tests/updates-center-core.test.ts` — 16 focused tests

Integration:

- `apps/shell/src/main/index.ts` — create/start service, register IPC, throttled focus check, dispose on quit
- `apps/shell/src/preload/index.ts` — exposes `window.plotdocsUpdates`
- `apps/shell/src/renderer/src/updates-center-client.ts` — renderer state hook
- `apps/shell/src/renderer/src/NotificationsCenter.tsx` — bell panel, update popup, update hero, notification toast
- `apps/shell/src/renderer/src/updates-center.css` — panel, popup, hero, progress styles
- `apps/shell/src/renderer/src/AppFrame.tsx` — bell/panel state, update popup, Home activation, restart wiring
- `apps/shell/src/renderer/src/TabBar.tsx` — bell, unread badge, update dot
- `apps/shell/src/renderer/src/main.tsx` — CSS import

Folders/docs:

- `updates/README.md`
- `updates/update.example.json`
- `notifications/README.md`
- `notifications/example.example.json`
- `docs/updates-and-notifications.md`
- `docs/version-control-workflow.md`
- `docs/analytics-parity-roadmap.md`
- `history.txt`
- `development-docs/` (this folder)

Security:

- Renderer sends only opaque ids/folder kinds
- Main resolves all paths
- SHA-256 verification when published
- Authenticode best-effort
- Invalid signatures blocked
- Unsigned acknowledgement
- Backup before replacement
- No auto-run installers
- No automatic restart
- No continuous GitHub polling

## Verified

- TypeScript check passed after the main/preload integration and before the final renderer additions.
- TypeScript check passed again after the update popup/hero hook fix.
- Focused core test run: 16/16 passed on 2026-11-08.
- The earlier filename-version failure (`2.0.0-beta.1.dmg`) was fixed by stripping known package extensions before parsing.
- Renderer/shell build passed on 2026-11-08 after the popup/hero work.
- Live update/notification E2E passed 1/1 in 22.6s: real notification file, badge, panel, mark-read persistence, delete, local package detection, update popup, update dot, **View update**, Updates tab, and panel hero.
- Live GitHub E2E passed 2/2 in 19.3s: current release `v1.0.0`, installer marked download-only, and friendly no-release state.
- Portable build passed: `apps/shell/release-portable/Plot-Docs-1.0.0.exe` plus `release-portable/win-unpacked/Plot Docs.exe`.
- Packaged install E2E passed 1/1 in 47.1s: checksum, unsigned acknowledgement, backup, executable replacement, installed state, and restart banner.
- GitHub API check confirms the live repo has only `v1.0.0` with `Plot-Docs-Setup-1.0.0.exe` (installer, download-only), so no newer portable update is offered yet.
- Update UX now matches the common desktop pattern: quiet check, visible popup once per version per session, bell dot, persistent panel hero, **Later**, **View update**, and user-triggered **Restart now**.
- `history.txt`, `development-docs/`, and the canonical docs were created.

## Not yet verified

- Actual restart into the replaced executable (the banner is verified, the click is not)
- Newer-release UI against a published portable GitHub asset (no newer release exists yet)
- Real GitHub download progress/integrity (no newer portable release exists yet)
- Popup/hero appearance on the packaged portable build (verified in the built shell E2E, not yet in the portable wrapper)
- Full shell test suite
- GitHub release publication (requires `gh` auth or a token)

## Known issues

- Full shell suite baseline was not green: 958 passed, 80 failed, 3 skipped.
- Live Codex analytics sometimes returns prose instead of the required JSON; falls back to `auto_analyze`.
- Soopus settings reopen flake in `e2e/settings-soopus-integration.spec.ts`.
- `gh` not installed; `GITHUB_TOKEN`/`GH_TOKEN` unset.
- Smart App Control can block unsigned downloaded executables.
- Portable wrapper first extraction can take 95–110 seconds.
- `win-ocr.exe`/`vision-ocr` was unavailable during portable packaging.
- Node 24 `node:sqlite` `DatabaseSync` is synchronous; long queries can block the main process.

## Next exact actions

1. Commit and push the update/notification/popup work.
2. Launch the packaged portable build and confirm the update popup and hero appear on a scratch profile.
3. Re-run the focused analytics suite and fix Codex structured output.
4. Start huge-data analytics benchmarks (100k / 1M / 10M rows).
5. Implement the first Zoho-inspired local-first analytics phase.
6. Publish `v1.0.1` with a portable `.exe` when auth is available, then test download/progress/checksum.
7. Update this file and `history.txt` after each milestone.
