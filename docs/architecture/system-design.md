# Analytics system design

## Scope

AI Data Analytics is an additive workspace inside the Plot Docs Electron shell.
It does not share document storage, editor state, or document IPC. The design
keeps analytics data local and makes every calculation inspectable.

The current implementation is intentionally a modular monolith:

- Electron main process: ingestion, profiling, SQL execution, cleaning, Python,
  forecasting, AI orchestration, workflow scheduling, audit, and persistence.
- Preload bridge: a typed, narrow API exposed as `window.plotdocsAnalytics`.
- React renderer: the analytics workspace, dashboards, Plot AI side panel, and
  automation controls.
- Shared contracts: `apps/shell/src/shared/analytics-api.ts` defines IPC channel
  names, request/result types, and the renderer API surface.

No microservices, message broker, or additional database engine were added.
SQLite is sufficient for the local-first product and keeps installation simple.

## Module map

| Module | Responsibility |
| --- | --- |
| `main/analytics/import.ts` | Parse CSV, TSV, JSON, JSONL and XLSX into a bounded table. |
| `main/analytics/profile.ts` | Infer types, nulls, distinct counts, duplicates and quality score. |
| `main/analytics/sql.ts` | Validate read-only SQL, install an authorizer, serialize CSV. |
| `main/analytics/store.ts` | Metadata, dataset files, backups, saved views, workflows, audit. |
| `main/analytics/sources.ts` | URL and database-source import with SSRF and connection guards. |
| `main/analytics/auto.ts` | Deterministic analysis pipeline: ranking, trend, distribution, correlation, outliers, forecast. |
| `main/analytics/forecast.ts` | Ordinary least-squares fit and uncertainty calculations. |
| `main/analytics/python.ts` | Fixed, app-generated aggregation in an isolated Python process. |
| `main/analytics/ai.ts` | Question answering over a validated read-only query tool. |
| `main/analytics/plan.ts` | Optional model-assisted dataset understanding, validated against the schema. |
| `main/analytics/interpret.ts` | Optional plain-language reading of completed evidence. |
| `main/analytics/assistant.ts` | Tool-using Plot AI harness and local fallback. |
| `main/analytics/schedule.ts` | Pure local-time workflow schedule calculation and validation. |
| `main/analytics/service.ts` | IPC registration, orchestration, workflow execution and scheduler. |
| `renderer/analytics/*` | Workspace UI, charts, dashboards, assistant panel and automation UI. |

## Persistence

The metadata database is `userData/analytics/analytics.sqlite`. It contains:

- `datasets` and `dataset_profiles`
- `saved_views` (dashboard cards and their evidence)
- `audit_events`
- `workflows`, `workflow_runs`, and `workflow_versions`

Each imported dataset is a separate SQLite file at
`userData/analytics/datasets/<uuid>.sqlite` with one `data` table. The original
source file is never modified. Cleaning creates
`userData/analytics/datasets/<uuid>.backup.sqlite`, which supports one-step undo.

The metadata database uses WAL mode, a 5 second busy timeout, and foreign keys.
Dataset connections are opened per operation. Read-only queries use a read-only
connection, `PRAGMA query_only = ON`, and an authorizer that denies writes.

## Execution boundaries

- Long-running imports and analysis calls are IPC requests. The renderer shows
  progress states and can navigate without losing the current dataset.
- Scheduled workflows run in the main process while the app is open. They use
  the same deterministic auto-analysis function as the **Run full auto** button,
  with model planning and model interpretation disabled.
- The scheduler is sequential. A workflow is never started twice concurrently in
  the same process, and a slow run does not start a second copy on the next tick.
- Workflow failures are recorded with the error, attempt count, row counts, and
  elapsed time. A failed workflow does not delete or rewrite the dataset.

## Trust boundaries

The renderer is not trusted with SQL writes. The main process validates every
IPC payload, accepts only read-only SQL, validates cleaning operations against
the real schema, and validates workflow schedules and dataset ownership. The
model is not trusted with code execution: model output is either rejected,
validated against the schema, or used only for prose after calculations finish.

## Deliberate trade-offs

- **One local user, no organization tenancy.** The desktop app has no server-side
  identity layer, so RBAC, SSO, and cross-user isolation are not claimed.
- **No OS background service.** Scheduling works while Plot Docs is running.
  A closed app cannot execute a workflow.
- **First worksheet only for XLSX.** Multi-sheet selection is not implemented.
- **No arbitrary transformation pipelines.** Cleaning operations are a bounded
  set. Joins are limited to one key per side and inner/left semantics. Appends
  require identical column names and support `UNION ALL` or `UNION`. Both
  materialize a separate dataset and never mutate a source. Pivots, calculated
  fields and versioned transformation graphs remain future work.
