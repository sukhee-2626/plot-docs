# Plot Docs — Total History So Far

Last updated: 2026-11-08
Repository: `https://github.com/sukhee-2626/plot-docs.git`
Branch: `main`
Last pushed commit: `4f3c9067 feat(analytics): add local BI workspace, AI analyst, and release hardening`

This is the compact total-history view. The full handoff record is `../history.txt`; the
detailed subsystem documents are linked from `README.md`.

## 1. Product foundation

Plot Docs by Plot XYZ.Ai is a local-first, AI-native office suite built with Electron,
React, and TypeScript. It hosts:

- Docs
- Sheets
- Slides
- PDF
- Markdown
- HTML
- A local AI Data Analytics workspace

The suite is a monorepo. The shell app is `apps/shell`; editor modules live under
`apps/docs`, `apps/sheets`, `apps/slides`, `apps/pdf`, `apps/markdown`, and `apps/html`.
Shared packages live under `packages/`.

## 2. Analytics workspace

The user asked for a local-first analytics workspace that uses real data and never
fabricates results.

Implemented and previously verified:

- CSV, JSON, XLSX, and SQLite import
- Read-only SQL editor with an authorizer
- Datasets, saved views, and workflows
- Charts and dashboards
- Pivot, funnel, and cohort analysis
- Cross-dataset joins and append/union as derived datasets
- Immutable source datasets
- AI analyst with visible SQL, dataset, filters, period, method, and uncertainty
- Privacy redaction at the tool boundary
- Crash diagnostics and ErrorBoundary
- CSV export and open-in-SQL actions
- Deterministic accuracy benchmark: 48/48 checks passed
- Focused analytics suite: 13 files / 140 tests passed
- Analytics + Soopus E2E: 15/15 passed
- Portable Windows artifact built and smoke-tested
- Commit `4f3c9067` pushed to GitHub

Known analytics issues:

- Live Codex analytics sometimes returns prose instead of the required JSON plan, so
  the assistant falls back to `auto_analyze`.
- Soopus settings reopen flake remains in `e2e/settings-soopus-integration.spec.ts`.
- Huge-data testing (100k / 1M / 10M rows) has not started.
- Node 24 `node:sqlite` `DatabaseSync` is synchronous and can block the main process.
- Full shell test suite baseline was not green: 958 passed, 80 failed, 3 skipped.

## 3. Updates and notifications

The user asked for a GitHub-based version-control/update system and a real-time
notification center, with no unnecessary polling.

Requirements captured:

- Detect GitHub releases and compare with the installed version
- Show version, release notes, download, and install actions
- Watch `/updates` for new or replaced `.exe`/packages
- Show version, modification date, status, logs, backups, and history
- Prevent duplicate downloads and clean up interrupted downloads
- Watch `/notifications` in real time
- Show title, message, date, type, read/unread
- Bell, unread badge, panel, mark-read, mark-all-read, delete
- Filesystem watchers plus GitHub API, no continuous polling
- Verify checksums/signatures
- Never auto-execute untrusted files
- Require confirmation
- Preserve user data/settings
- Handle network failures and interrupted downloads

Implemented:

- Shared IPC contract and types
- Pure core scanner/parser/version/watcher/hash/replace logic
- Main-process service with GitHub API, download, checksum, signature, backup,
  install, restart, notification state, and IPC
- Preload bridge
- Renderer hook, bell panel, notification toast, update popup, update hero, styles
- TabBar bell, unread badge, update dot
- AppFrame panel state, update popup, restart wiring, and Home activation
- `updates/` and `notifications/` folders with READMEs and examples
- `state.json`, logs, backups, and partial files gitignored
- Canonical docs and this handoff package

Security decisions:

- Renderer sends only opaque package ids/folder kinds; main resolves paths and URLs
- Only portable `.exe` can replace the running executable
- Installers are download-only and never auto-run
- Invalid signatures are blocked
- Unsigned/unknown files require an extra acknowledgement
- Backup is created before replacement
- Restart is user-triggered
- GitHub tokens stay in the main process
- Smart App Control is not disabled by app code
- GitHub checks run on launch, manual request, and throttled focus only

Verified on 2026-11-08:

- Focused core tests: 16/16 passed
- Shell typecheck: passed after the update popup/hero hook fix
- Shell/renderer build: passed after the update popup/hero hook fix
- Live E2E: real notification file detected in real time, badge updated, panel opened,
  mark-read persisted, delete removed the source file, local package card showed
  `Plot-Docs-9.9.9.exe` with `v9.9.9`, notes, and `Available`; update popup, update
  dot, **View update**, Updates tab, and panel hero all asserted
- Live GitHub E2E: 2/2 passed (current release and no-release state)
- Packaged install E2E: 1/1 passed (checksum, unsigned acknowledgement, backup,
  replacement, installed state, restart banner)
- Portable build: passed

Update visibility request (2026-11-08):

> updates alone visible clrar ui in notifiaction updates houlf popup ,each time when update there check other apppds how its updates ystem work do it

The app now follows the VS Code/Slack/GitHub Desktop pattern: quiet check,
visible popup once per version per session, bell dot, persistent panel hero,
**View update**, **Later**, and user-triggered **Restart now**.

Not yet verified:

- Clicking **Restart now** into the replaced executable
- A newer portable GitHub release (current repo only has v1.0.0 installer)
- Real download progress/integrity
- Duplicate download behavior in the UI
- Full shell test suite
- Popup/hero on the packaged portable build
- Published newer GitHub release

## 4. Zoho Analytics reference

After the update/notification work, the user wants the capabilities shown on the Zoho
Analytics product page to exist in Plot Docs as local-first equivalents:

- Connectors and live databases
- Data preparation and pipelines
- 50+ visualizations
- Diagnostic, predictive, anomaly, and what-if analysis
- Sharing, permissions, row-level security, data stories
- APIs, SDK, embedding, MCP
- Semantic model/ontology
- AI agents across the workflow
- Python code studio and AutoML
- Mobile apps
- Security/governance/audit

Plot Docs will not copy Zoho literally and will not become cloud-only. The phased plan
is in `05-analytics-roadmap.md` and `../docs/analytics-parity-roadmap.md`.

## 5. Current priority order

1. Finish and verify the update/notification system.
2. Fix Codex structured analytics output.
3. Test analytics with huge data and record real measurements.
4. Start the Zoho-inspired analytics phases.

## 6. Canonical files

- `../history.txt` — complete handoff and resume record
- `02-current-status.md` — current state and exact next actions
- `03-updates-notifications.md` — architecture
- `04-version-control.md` — Git/GitHub release workflow
- `05-analytics-roadmap.md` — local-first parity plan
- `06-test-log.md` — commands, results, failures, fixes
- `07-release-checklist.md` — release gate
- `08-resume-prompt.md` — copy-paste prompt for any model
- `../docs/updates-and-notifications.md` — detailed manual
- `../docs/version-control-workflow.md` — detailed Git/GitHub guide
- `../docs/analytics-parity-roadmap.md` — detailed analytics plan

## 7. Hard rules for the next session

- Stay inside Plot Docs.
- Do not use subagents/agents.
- Do not delete uncommitted analytics work.
- Never fabricate analytics results.
- Never auto-run downloaded installers.
- Verify checksums; block invalid signatures; require confirmation.
- Preserve user documents and settings.
- Do not disable Smart App Control.
- Keep Plot Docs local-first.
- No continuous GitHub polling.
