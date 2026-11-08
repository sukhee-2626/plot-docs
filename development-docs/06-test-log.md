# Test Log

Last updated: 2026-11-08

## Current results

| Check | Command | Result |
| --- | --- | --- |
| Shell typecheck | `npm run typecheck -w @plotdocs/shell` | Passed after the update popup/hero hook fix |
| Update/notification core tests | `npx vitest run apps/shell/tests/updates-center-core.test.ts` | 16/16 passed |
| Shell build | `npm run build -w @plotdocs/shell` | Passed in 2m 3s (main) + 1.07s (preload) + 11.52s (renderer); run in parallel with typecheck |
| Live update/notification E2E | `npx playwright test e2e/updates-notifications.spec.ts --config e2e/playwright.config.ts` | 1/1 passed in 22.6s after the popup assertions were added |
| Live GitHub E2E | `$env:PLOTDOCS_LIVE_GITHUB='1'; npx playwright test e2e/updates-github.spec.ts --config e2e/playwright.config.ts` | 2/2 passed in 19.3s (current release + no release) |
| Packaged install E2E | `npx playwright test e2e/updates-install.spec.ts --config e2e/playwright.config.ts` | 1/1 passed in 47.1s |
| Portable build | `npm run dist:portable -w @plotdocs/shell` | Passed; `apps/shell/release-portable/Plot-Docs-1.0.0.exe` |
| GitHub current-release API | `GET /repos/sukhee-2626/plot-docs/releases` | `v1.0.0`, asset `Plot-Docs-Setup-1.0.0.exe` (installer only) |
| Full shell suite | `npm test -w @plotdocs/shell -- --run` | Not green at baseline: 958 passed, 80 failed, 3 skipped |
| Analytics focused suite | `npx vitest run apps/shell/tests/data-analytics*.test.ts` | Previously 13 files / 140 tests passed |
| Deterministic accuracy benchmark | analytics benchmark | Previously 48/48 checks passed |
| Analytics + Soopus E2E | Playwright specs | Previously 15/15 passed |
| Live app notification test | manual | Pending |
| Live local EXE install test | manual | Pending |
| GitHub release detection | manual / live | Pending |

## Failure fixed: version parsing consumed the extension

Test:

```text
tests/updates-center-core.test.ts > version handling > normalizes tags and file-name versions
```

Failure:

```text
expected '2.0.0-beta.1'
received '2.0.0-beta.1.dmg'
```

Cause: the prerelease portion of the file-name regex allowed dots, so it consumed the `.dmg` extension.

Fix: `versionFromFileName` now strips a known package extension before applying the version regex. A known extension list is used so ordinary dotted names are not damaged.

Verification: the focused suite passed 16/16 on 2026-11-08.

## Commands used

```powershell
npx vitest run apps/shell/tests/updates-center-core.test.ts
npm run typecheck -w @plotdocs/shell
npm run build -w @plotdocs/shell
```

## Live E2E result

New spec: `e2e/updates-notifications.spec.ts`.

It launches the built shell against isolated temporary `updates/` and
`notifications/` folders and verifies:

- [x] Bell is visible on Home
- [x] No unread badge initially
- [x] Dropping `welcome.json` updates the badge to `1` in real time
- [x] Clicking the bell opens the panel and shows the notification title/message
- [x] Mark-as-read clears the badge and persists `state.json`
- [x] Delete confirms, removes the source JSON, and shows the empty state
- [x] Dropping `Plot-Docs-9.9.9.exe` + `update.json` shows the local package card
- [x] Card shows file name, `v9.9.9`, release notes, and `Available`
- [x] A new update pops up as `.uc-update-toast` with **View update** and **Later**
- [x] The bell shows the update dot
- [x] **View update** opens the panel on the Updates tab
- [x] The panel hero shows `Update available · v9.9.9`

First run failed because the cinematic splash and first-run Home tour intercept
pointer events. The spec now uses the shared `dismissShellOverlays` helper before
clicking the bell, matching the existing Soopus/settings E2E pattern.

## Update popup and hero behavior

The renderer now follows the VS Code/Slack/GitHub Desktop pattern:

- The GitHub/filesystem check stays quiet in the background.
- A newly detected version shows one prominent update popup per version per
  session, with **View update**, **Later**, and close.
- The update remains visible through the bell dot and a persistent hero strip
  above the panel tabs.
- Opening the panel acknowledges the popup, so closing the panel does not pop
  the same version again in that session.
- A fresh launch while the update is still available shows the popup again.
- After install, the hero and popup switch to **Restart to finish the update**
  with **Restart now**; the app never restarts by itself.
- The existing manual **Check** button remains the equivalent of Slack’s
  Help → Check for Updates.

The first popup attempt called a hook after an early return. Typecheck did not
catch the conditional-hook structure, so the hook was moved above the return and
the E2E test was rerun against the rebuilt renderer.

## Packaged install E2E

New spec: `e2e/updates-install.spec.ts`.

It launches `release-portable/win-unpacked/Plot Docs.exe` against an isolated
profile, installs a copy of its own executable from a temporary updates folder,
and verifies the real packaged path: checksum, Authenticode, unsigned
acknowledgement, backup, replacement, installed state, and restart banner.

Result on 2026-11-08: **1/1 passed in 47.1s** against the portable build.
Verified:

- [x] Packaged app starts and exposes the bell
- [x] Local package card shows `Plot-Docs-9.9.9.exe` and `v9.9.9`
- [x] Install confirmation requires unsigned acknowledgement
- [x] SHA-256 is verified
- [x] Timestamped backup is created
- [x] Running executable is renamed aside and replaced
- [x] Installed SHA-256 equals the update package SHA-256
- [x] `state.json` records the installed package
- [x] Restart banner appears
- [x] The test profile is isolated and removed afterward

Run it after `npm run dist:portable -w @plotdocs/shell`.

## Live GitHub E2E

Opt-in spec: `e2e/updates-github.spec.ts`.

```powershell
$env:PLOTDOCS_LIVE_GITHUB='1'
npx playwright test e2e/updates-github.spec.ts --config e2e/playwright.config.ts
```

Result on 2026-11-08: **2/2 passed in 19.3s**.

- [x] Current release `v1.0.0` is displayed
- [x] `Plot-Docs-Setup-1.0.0.exe` is shown as download-only
- [x] A repository with no release shows the friendly empty state
- [x] No update popup is shown for the current version

The live test is opt-in because it depends on GitHub availability and the
repository’s current release state.

## Manual test checklist (not yet done)

- [ ] Bell visible while a document tab is active (panel intentionally activates Home first)
- [x] Update popup appears for a newly detected version (E2E)
- [x] Update popup opens the Updates tab and panel hero (E2E)
- [ ] Notification toast appears
- [ ] Mark all read persists across restart
- [ ] Local package card shows version, date, checksum, notes
- [ ] Duplicate download is prevented
- [ ] Interrupted `.part` is cleaned up
- [ ] Checksum mismatch blocks install
- [ ] Invalid signature blocks install
- [x] Unsigned acknowledgement is required (packaged E2E)
- [x] Backup is created before replacement (packaged E2E)
- [ ] Restart launches the new executable (banner verified; restart not clicked)
- [ ] Installer asset is download-only
- [x] GitHub 404 shows a friendly "no release" state (live E2E)
- [x] GitHub release shows notes and asset (live E2E)
- [ ] Download progress is smooth
- [ ] User documents/settings survive the update

## Rules for future test runs

- Record the exact command, date, pass/fail counts, and first failure.
- Never claim a manual test passed without running the app.
- Keep test fixtures out of generated state folders.
- Do not commit `state.json`, logs, backups, or `.part` files.
