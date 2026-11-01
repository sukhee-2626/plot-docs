# Worklog: analytics joins, append, explore modes and release hardening

Date started: 2026-10-27  
Last updated: 2026-10-31  
Status: verified locally; changes are uncommitted and nothing has been pushed. The portable Windows artifact is built and smoke-tested.

## Objective

Make the local-first AI Data Analytics workspace a complete, accurate, easy-to-use analytics surface without regressing Plot AI, Soopus AI, document editing, settings, IPC, or navigation. The increment covers cross-dataset joins, append/union, pivot/funnel/cohort analysis, assistant tools, measured accuracy, security boundaries, and Windows error recovery.

## Completed

### Analytics backend

- Added `joinDatasets` to the shared contract, IPC, preload, store, service and assistant.
  - Inner and left joins on one validated key per side.
  - New derived dataset with `sourceType: 'join'`; both sources stay immutable.
  - 250,000-row materialized cap.
  - Right-column collisions renamed with a `right_` prefix.
  - Logical join SQL retained as evidence.
  - Warnings for renamed columns, null keys, unmatched rows, duplicate right keys, type-affinity mismatch, and empty results.
- Added `appendDatasets` / union.
  - Identical column names required.
  - `UNION ALL` keeps every row; `UNION` removes exact duplicates.
  - New derived dataset, sources untouched, 250,000-row cap.
- Added shared, validated explore builders in `apps/shell/src/shared/analytics-explore.ts`:
  - **Pivot:** one or two axes, validated sum/avg/min/max/count, quoted identifiers, exact SQL and matrix output.
  - **Funnel:** 2–8 unique ordered events, first occurrence per user, later steps at/after the previous step.
  - **Cohort:** first-activity-month cohorts, period 0 plus up to 36 monthly periods, ISO-like dates required.
- Added accuracy fixes across import, auto-profile, local plan and store:
  - Trim date values before typing.
  - Preserve leading-zero identifiers as text.
  - Exclude year/month/quarter-like columns from measures.
  - Align identifier detection between auto-profile and local plans.
  - Warn when join-key type affinity differs.
  - Locale-independent header deduplication.
  - Text identifier columns receive the `identifier` role in local plans.

### Assistant

- Added `funnel` and `cohort` tools.
- Harness is now `analytics-agent-v5`: 25 tools, nine input/output training examples.
- Assistant can inspect a public page and choose a table, import a source, prepare data, run read-only SQL, join or append datasets, rank/sort, pivot, measure funnels and cohorts, correlate, detect 1.5×IQR anomalies, forecast, chart, save dashboard cards, and run the full local pipeline.
- Privacy is enforced at the tool boundary: obvious identifiers are redacted, signed-URL query strings stripped, database secrets masked, and file imports restricted to user-supplied absolute paths.

### UI

- Added **Pivot**, **Funnel** and **Cohort** modes to Analyze alongside SQL, Python, Join and Append.
- Every explore result shows the exact SQL, row count and elapsed time, with copy SQL, export CSV and open-in-SQL actions.
- Added responsive forms, pivot matrix, funnel bars and cohort matrix styling in `analytics.css`.
- Join and append results show row/column counts, elapsed time, warnings and logical SQL, with an “Open dataset” action.

### Security and robustness

- `validateReadOnlySql` and the SQLite authorizer are the SQL boundary; writes, `ATTACH`, `PRAGMA`, `readfile`, `writefile` and `load_extension` are denied.
- Pivot columns, join keys, append columns and event labels are checked against the live schema and quoted before execution.
- URL imports allow public http/https only, block localhost/private ranges, cap redirects, timeout and restrict ports.
- File imports require a full absolute path; relative paths are rejected at the IPC boundary.
- Added a renderer `ErrorBoundary` with a local recovery screen, reload action and copyable diagnostics instead of a blank window.
- Added renderer global error/unhandled-rejection reporting.
- Added `apps/shell/src/main/crash-log.ts`:
  - Renderer exits, child-process exits, renderer errors, uncaught exceptions and unhandled rejections append to `userData/diagnostics.log`.
  - The log rotates to `.1` at 2 MB.
  - The existing renderer resource watchdog still records CPU/memory diagnostics and offers to close a hot document.

### Documentation

Updated `README.md`, `PRIVACY.md`, `docs/implementation/feature-matrix.md`, architecture/data-flow/known-limitations/test-strategy docs, and this worklog.

## Verification

Passed:

```text
npm run typecheck -w @plotdocs/shell
```

Focused analytics suite — 13 files, 140 tests:

```text
npx vitest run tests/data-analytics.test.ts tests/data-analytics-auto.test.ts \
  tests/data-analytics-assistant.test.ts tests/data-analytics-ipc.test.ts \
  tests/data-analytics-filter.test.ts tests/data-analytics-schedule.test.ts \
  tests/data-analytics-explore.test.ts tests/data-analytics-accuracy.test.ts \
  tests/data-analytics-security.test.ts tests/analytics.test.ts \
  tests/preload-analytics.test.ts tests/settings-analytics.test.ts \
  tests/crash-log.test.ts
```

Selected results:

- Assistant tests: 27 passed.
- Explore builder tests: 9 passed.
- Security tests: 6 passed (SQL injection, join-key injection, authorizer, SSRF/private links, secret redaction).
- IPC tests: 11 passed, including malformed payloads and relative-path rejection.
- Crash-log tests: 3 passed, including 2 MB rotation and process-level observer registration.
- Accuracy benchmark: `Analytics accuracy benchmark: 48/48 checks passed (100.0%).`

The 48-check benchmark is deterministic and covers the real import, profiling, plan, SQL, store, pivot, funnel, cohort, join, append, forecast and chart-validation paths. It is a regression suite, **not** a claim of 98% or 100% accuracy on arbitrary real-world data.

Shell build:

```text
npm run build -w @plotdocs/shell
```

Succeeded.

Analytics + Soopus E2E:

```text
npx playwright test --config e2e/playwright.config.ts \
  e2e/analytics-workspace.spec.ts e2e/settings-soopus-integration.spec.ts
```

Result: 15/15 passed in about 2.9 minutes.

Packaged smoke tests:

- `release-portable/win-unpacked/Plot Docs.exe` launched, opened the Analytics workspace, imported `sales.csv`, ran a grouped SQL query and rendered the chart: PASS.
- `release-portable/Plot-Docs-1.0.0.exe` launched, exposed its renderer, opened the Analytics workspace, imported `sales.csv` through `window.plotdocsAnalytics.importPath`, and returned the expected regional revenue rows including `716.5`: PASS.

## Release artifact

```text
apps/shell/release-portable/Plot-Docs-1.0.0.exe
Size:    133,602,342 bytes
SHA-256: B4702F8998A50BC808BC5C5E8861E349A01EA2BE6E0B5B54E425DD1C51E4AA0B
```

The artifact is unsigned (`NotSigned`). Smart App Control on this machine is in enforcement mode, so a downloaded unsigned exe can still be blocked even though the locally built portable exe runs. Code signing or a user-side SAC decision is required for trust; the app does not disable SAC.

The portable wrapper self-extracts on first launch; that took about 95–110 seconds on this machine. Subsequent app startup is normal. The unpacked build launches immediately.

## Known limitations

- No Snowflake or dbt connector is implemented. Adding untested connectors only to increase feature count would violate the reliability and security requirements.
- Live Codex, Soopus/OpenAI, PostgreSQL, MySQL, Snowflake and dbt calls remain unverified. Mocked Codex app-server tests pass.
- The full shell suite baseline is not green (`958 passed, 80 failed, 3 skipped`); use the focused analytics suite and analytics/Soopus E2E for this increment.
- Node 24 `node:sqlite` `DatabaseSync` is synchronous, so a long query can block the main process. Worker-thread isolation or enforced query timeouts remain future work.
- Scheduled workflows run only while Plot Docs is open; OS-level background scheduling and external destinations are not enabled.
- Forecasts are transparent linear least-squares fits, not causal models.

## Next steps

1. Commit the verified changes and push when GitHub authentication is available.
2. Upload `Plot-Docs-1.0.0.exe` as a GitHub release asset with the SHA-256 above.
3. For Smart App Control machines, sign the exe and inner binaries, or document the user-side trust step.
4. Add worker-thread isolation and query timeouts for large SQLite queries.
5. Add and test real Snowflake/dbt connectors only when credentials and a reproducible test environment exist.

No agents/subagents were used.
