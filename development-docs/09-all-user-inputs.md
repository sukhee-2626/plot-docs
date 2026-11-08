# All User Inputs, In Order From 1

This is the complete input record available in the project handoff. The raw chat
transcript is not stored in the repository, so early requests are recorded as
faithful summaries; exact wording is preserved where it is known.

## 1. Build a local-first AI Data Analytics workspace

The user asked for a real analytics workspace inside Plot Docs:

- Import CSV, JSON, XLSX, SQLite
- SQL editor
- Saved views, charts, dashboards
- Pivot, funnel, cohort
- AI analyst using real data
- Never fabricate results
- Show SQL, dataset, filters, period, method, uncertainty

## 2. Add cross-dataset joins and append/union

- Join datasets
- Append/union datasets
- Create derived datasets
- Keep source datasets immutable
- Add UI, IPC, assistant tools, docs, tests

## 3. Harden privacy

- Redact identifiers
- Strip signed URL query strings
- Mask database secrets
- Restrict imports to user-supplied absolute paths
- Enforce privacy at the tool boundary

## 4. Add pivot, funnel, and cohort analysis

- Validated SQL
- CSV export
- UI and tests

## 5. Add crash diagnostics

- Renderer ErrorBoundary
- Renderer error reporting
- Main-process diagnostics log with rotation

## 6. Build and publish a portable Windows artifact

- Build a portable `.exe`
- Record SHA-256
- Publish to GitHub
- Do not disable Smart App Control in app code

## 7. Add the GitHub update system and real-time notifications

Exact user phrases:

> based on github, no bugs

> notification system also

Requirements:

- Detect GitHub releases and compare with the installed version
- Show version, release notes, download, install
- Watch `/updates` for new/replaced `.exe`/packages
- Show version, modification date, status, logs, backups, history
- Prevent duplicate downloads
- Watch `/notifications` in real time
- Show title, message, date, type, read/unread
- Bell, unread badge, panel, mark-read, delete
- Filesystem watchers plus GitHub API
- No unnecessary continuous polling
- Verify checksums/signatures
- Never auto-execute untrusted files
- Require confirmation
- Preserve user data/settings
- Handle network failures and interrupted downloads

## 8. Set the priority order

Exact user phrase:

> main is version control update system then data analytics feature full enhance test with huge data, learn from error correct

Meaning:

1. Finish the update/version-control system.
2. Fully enhance analytics.
3. Test with huge data.
4. Learn from errors and correct them.

## 9. Add Zoho Analytics-like capabilities

The user pasted the Zoho Analytics product page and said all those features
should exist in Plot Docs after the update/notification work.

Interpretation:

- Use Zoho as a feature reference, not a literal clone.
- Keep Plot Docs local-first.
- Add connectors, live databases, pipelines, transforms, visualizations,
  forecasting, anomalies, semantic model, sharing, permissions, row-level
  security, stories, APIs, SDK, embedding, MCP, AI agents, Python, AutoML,
  mobile, audit/governance over time.

## 10. Create a resumable history file

The user asked for a history/spec/to-do file so any model or session can resume
at any time.

Delivered:

- `history.txt`
- `docs/updates-and-notifications.md`
- `docs/version-control-workflow.md`
- `docs/analytics-parity-roadmap.md`

## 11. Create a development-docs folder

Exact user phrase:

> crate a folder in that write till noe devlopment docoments till now

Delivered:

- `development-docs/README.md`
- `development-docs/00-total-history.md`
- `development-docs/01-project-history.md`
- `development-docs/02-current-status.md`
- `development-docs/03-updates-notifications.md`
- `development-docs/04-version-control.md`
- `development-docs/05-analytics-roadmap.md`
- `development-docs/06-test-log.md`
- `development-docs/07-release-checklist.md`
- `development-docs/08-resume-prompt.md`
- `development-docs/09-all-user-inputs.md` (this file)

## 12. Stay only with Plot Docs

Exact user phrase:

> only go with plot docs

Meaning: keep all work inside the Plot Docs repository and product. Do not work
on upstream or unrelated apps.

## 13. Total history and development docs, then continue

Exact user phrase:

> total plot docs histeoy and development docs , then all above continue

Meaning: consolidate the total history and development documents, then continue
the update/notification and analytics work described above.

## 14. Record all inputs from the first message

Exact user phrase:

> from first all input from 1

Meaning: include the complete numbered input history from message 1 onward. This
file is that record.

## 15. Make updates clearly visible and pop up like other desktop apps

Exact user phrase:

> updates alone visible clrar ui in notifiaction updates houlf popup ,each time when update there check other apppds how its updates ystem work do it

Interpretation:

- The update must be obvious in the notification/updates popup, not buried.
- Each time an update is available, show a popup.
- Study how mainstream desktop apps handle updates and follow those patterns.
- Keep the update visible through the bell badge and panel, while still letting
  the user defer or review release notes.

Delivered:

- A prominent update popup with version, release-note summary, **View update**,
  **Later**, and close.
- One popup per version per session; a fresh launch shows it again while the
  update is still available.
- Opening the panel acknowledges the popup, so closing the panel does not
  re-pop the same version.
- A persistent update hero above the panel tabs, visible even on Notifications.
- Bell opens Updates directly when an update is waiting.
- After install, the hero/popup become **Restart to finish the update** with
  **Restart now**; no forced restart.
- VS Code/Slack/GitHub Desktop/Chrome-style behavior documented in
  `docs/updates-and-notifications.md`.
- E2E coverage for the popup, update dot, **View update**, Updates tab, and hero.

## Current continuation point

- Update/notification core tests: 16/16 pass
- Shell typecheck: pass after popup/hero hook fix
- Shell/renderer build: pass after popup/hero hook fix
- Live notification/local-package E2E: 1/1 pass in 22.6s, including update popup and hero
- Live GitHub E2E: 2/2 pass in 19.3s (current release and no-release state)
- Packaged install E2E: 1/1 pass in 47.1s
- Portable build: passed
- Next: commit/push, verify popup/hero on the packaged portable build, then
  analytics structured-output fix, huge-data benchmarks, Zoho-inspired phases
