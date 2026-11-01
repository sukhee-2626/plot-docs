# Analytics test strategy

## Goals

1. Protect existing analytics, document, Soopus and settings behavior.
2. Prove that calculations run against real imported data.
3. Prove that cleaning is reversible and non-destructive.
4. Prove that workflows persist, execute, fail honestly, and do not call a model.
5. Prove that the renderer remains usable when no model is configured.

## Layers

### Unit tests

Pure or narrowly scoped modules:

- `apps/shell/tests/data-analytics-schedule.test.ts` — local-time schedule
  validation, hourly/daily/weekly next-run calculation, manual/disabled behavior,
  and due-workflow detection.
- Existing analytics unit suites cover validation, filtering, forecasting,
  assistant harness behavior, source redaction, and AI-observation redaction for
  sample rows, signed URLs, and page previews.

### IPC integration tests

`apps/shell/tests/data-analytics-ipc.test.ts` imports a real CSV through the
registered Electron IPC handlers and exercises:

- import, profile, read-only SQL, write rejection;
- inner/left joins, collision renaming, key warnings, source immutability, and
  invalid/same-dataset rejection;
- append/union by column name, duplicate removal, source immutability, and
  schema-mismatch/same-dataset rejection;
- clean + undo + trim;
- saved views and forecast;
- CSV export;
- full auto analysis and idempotent dashboard cards;
- workflow save, versioning, run-now, retries field, run history, pause/update,
  invalid schedule rejection and delete;
- audit events and dataset deletion.

The Electron module is mocked only at the process boundary. SQLite, parsing,
profiling and analysis are real.

### End-to-end tests

`e2e/analytics-workspace.spec.ts` launches the built Electron app and covers:

- CSV import, profile, SQL, chart, saved view;
- join form, derived dataset, evidence SQL and a query on the joined data;
- append form, derived dataset, union evidence SQL and a query on the appended data;
- exact CSV export;
- duplicate clean and undo;
- fixed Python aggregation;
- linear forecast;
- full auto and dashboard evidence;
- scheduled workflow create, run-now, pause, edit/version, run history and delete;
- Plot AI local fallback;
- honest no-provider analyst failure;
- audit view, JSON/XLSX import, and existing Home entry points.

`e2e/settings-soopus-integration.spec.ts` protects the Soopus settings card and
signed-in/signed-out states.

## Commands

```powershell
# Type safety
npm run typecheck -w @plotdocs/shell

# Production build used by Playwright
npm run build -w @plotdocs/shell

# Focused analytics unit + IPC tests
cd apps/shell
npx vitest run tests/data-analytics-schedule.test.ts tests/data-analytics-ipc.test.ts

# Analytics + Soopus E2E
cd ../..
npx playwright test --config e2e/playwright.config.ts `
  e2e/analytics-workspace.spec.ts `
  e2e/settings-soopus-integration.spec.ts
```

## What is not covered yet

- Live Soopus/OpenAI calls without credentials.
- Live PostgreSQL/MySQL servers.
- Multi-sheet XLSX selection (not implemented).
- OS-level scheduling while the app is closed (not implemented).
- Formal performance thresholds and load tests.
- The full repository test suite; a previous baseline was not fully green and
  must not be reported as green without a fresh run.

## Test data rules

- Use temporary directories and synthetic CSVs with known rows.
- Assert exact SQL results where possible.
- Do not assert on model prose; assert on local calculations, status, SQL, and
  evidence.
- Treat skipped credential/database tests as skipped, not passed.
- Keep screenshots under `e2e/artifacts/` or the configured artifacts directory.
