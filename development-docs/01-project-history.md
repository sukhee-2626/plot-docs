# Project History and User Requests

Full record: `../history.txt`

## 1. Local AI Data Analytics workspace

The user asked for a local-first analytics workspace inside Plot Docs:

- Import CSV, JSON, XLSX, SQLite
- SQL editor
- Saved views, charts, dashboards
- Pivot, funnel, cohort
- AI analyst that uses real data
- Visible SQL, dataset, filters, period, method, uncertainty
- Never fabricate results

## 2. Joins and append/union

- Cross-dataset joins
- Append/union
- Derived datasets
- Source datasets remain immutable
- UI, IPC, preload, assistant tools, docs, tests

## 3. Privacy hardening

- Redact identifiers
- Strip signed URL query strings
- Mask database secrets
- Restrict imports to user-supplied absolute paths
- Privacy enforced at the tool boundary

## 4. Crash diagnostics

- React ErrorBoundary
- Renderer error reporting
- Main-process diagnostics log with rotation

## 5. Release hardening

- Portable Windows artifact built
- SHA-256 recorded
- GitHub commit pushed
- Smart App Control can block unsigned downloaded executables
- Do not disable SAC in app code

## 6. GitHub updates + notifications

User request:

> based on github, no bugs
> notification system also

Requirements:

- Detect GitHub releases and compare with installed version
- Show version, release notes, download/install
- Watch `/updates` for new/replaced `.exe`/packages
- Identify version and modification date
- Statuses: Available, Downloading, Installed, Failed
- Prevent duplicate downloads
- Logs, backups, history
- Watch `/notifications` in real time
- Title, message, date, type, read/unread
- Bell, unread badge, panel, mark-read, delete
- Filesystem watchers + GitHub API
- No unnecessary continuous polling
- Checksums/signatures
- Never auto-execute untrusted files
- Confirmation
- Preserve user data/settings
- Handle network failures and interrupted downloads

## 7. Priority update

The user said:

> main is version control update system then data analytics feature full enhance test with huge data, learn from error correct

So the update system is first, then analytics scale/parity.

## 8. Zoho Analytics reference

The user pasted the Zoho Analytics product page and said all those features should exist in Plot Docs after the above is complete.

Key reference areas:

- Connectors and live databases
- Data preparation and pipelines
- 50+ visualizations
- Diagnostic, predictive, anomaly, what-if analysis
- Sharing, permissions, row-level security, data stories
- APIs, SDK, embedding, MCP
- Semantic model/ontology
- AI agents across the workflow
- Python code studio, AutoML
- Mobile apps
- Security/governance/audit

Plot Docs will implement a local-first equivalent in phases, not copy Zoho literally.

## 9. Handoff request

The user asked for a history file and development documents so they can resume with any model at any time.

This folder and `../history.txt` are that handoff.

## 10. Update visibility and popup

Exact user phrase:

> updates alone visible clrar ui in notifiaction updates houlf popup ,each time when update there check other apppds how its updates ystem work do it

Delivered:

- One prominent update popup per version per session
- Version, release-note summary, **View update**, **Later**, and close
- Bell update dot
- Persistent update hero above the panel tabs
- Bell opens Updates directly when an update is waiting
- **Restart now** only after install; no forced restart
- VS Code/Slack/GitHub Desktop/Chrome-style behavior documented
- E2E coverage for the popup and hero
