# Known limitations

## Automation

- Workflows run only while Plot Docs is open. There is no OS service, tray
  scheduler, or cloud scheduler.
- A missed schedule is collapsed into one catch-up run on the next launch; the
  scheduler does not replay every missed interval.
- Schedules use local time only. There is no explicit timezone selection.
- The shortest interval is hourly. There is no cron expression or second-level
  schedule.
- A workflow runs the fixed deterministic auto pipeline. It cannot contain
  arbitrary SQL, scripts, joins, appends, pivots, or user-authored transformation
  steps. Joins and appends are available interactively and through the assistant,
  not inside a scheduled workflow.
- Runs are sequential and in-process. There is no distributed queue, worker
  pool, dead-letter queue, or cross-device coordination.
- Retries are bounded (0–3) and immediate with a short pause; there is no
  exponential backoff or alert escalation.
- No email, webhook, folder, Slack/Teams, or cloud delivery destinations.
- No approval queue or role-based release gate.
- A workflow can be deleted while a long run is in progress; the history row is
  best-effort in that race.

## Data and preparation

- XLSX/XLSM import reads the first worksheet only.
- XML, Google Sheets, cloud object storage, warehouses, authenticated REST APIs
  and webhook ingestion are not implemented.
- PostgreSQL/MySQL connector code exists, but live server tests were not run in
  this environment.
- There is no multi-sheet picker, schema-change detection, or connection refresh
  schedule.
- There is no persisted schema override/editor. The UI inspects inferred types.
- AI observations redact obvious contact, payment and identifier columns/values,
  signed URL query strings, and database secrets. This is not a full PII
  classifier: arbitrary sensitive prose, free-text names, or unusual identifier
  formats may still reach a configured model. There is no persisted masking
  policy, retention policy, or field-level access control.
- Cleaning is a bounded operation set: duplicate removal, drop nulls, trim, fill
  mean, fill value. Joins are separate from cleaning and support only one key per
  side, inner/left semantics, and a 250,000-row materialized result. Appends
  require identical column names and support `UNION ALL` or `UNION`, also capped
  at 250,000 rows. Pivot, funnel and cohort analysis are available as read-only
  explore modes with exact SQL; there are no unpivots, calculated fields, or
  reusable user-authored transformation pipelines.
- One-step undo only. A second clean replaces the previous backup.
- Re-profiling after cleaning is synchronous and can be slow on large datasets.

## Analysis and reporting

- CSV is the only analytics export. No PDF/DOCX/PPTX report builder, scheduled
  email report, or publishing destination.
- No semantic layer, metrics catalog, lineage graph UI, collaboration, comments,
  or approval workflow.
- Forecasting is ordinary least squares. It is not seasonal, causal, or a
  general time-series model; prediction intervals are approximate.
- Anomaly detection is limited to 1.5×IQR outliers.
- Dashboard refresh re-runs every card; there is no shared query cache or
  incremental materialization.
- SQL results are capped at 5,000 rows interactively and 250,000 for export.
- SQLite `DatabaseSync` is synchronous. A long query can block the Electron main
  process; worker-thread isolation and hard query timeouts are not implemented.
- The 48-check analytics accuracy benchmark is deterministic regression coverage.
  It is not a general real-world accuracy rate.

## AI

- Live Soopus/OpenAI calls were not verified without credentials or API keys.
- No model is required; local fallback is intentional and labeled.
- Model-assisted plans are validated, but the quality of prose and plan choices
  depends on the configured model.
- Natural-language creation of scheduled workflows is not implemented.
- No model-generated code, arbitrary SQL writes, or autonomous destructive
  actions.
- No vector store, agent memory, semantic search over rows, or multi-agent
  orchestration.

## Security and operations

- Single local user. No organizations, RBAC, SSO, SCIM, row-level security, or
  multi-tenant isolation.
- No encryption-at-rest beyond OS/userData permissions.
- Audit is local and not tamper-evident; no SIEM export or signed ledger.
- No formal penetration test or connector security certification.
- No formal performance benchmark or load test.
- The full repository test suite was not fully green in the last recorded
  baseline. Focused analytics tests and the analytics/Soopus E2E suites were run
  for this increment.
- `npm run dist:win` may be blocked by Device Guard on this machine because
  `cargo.exe` is denied; this is an environment issue, not an analytics feature.
- The portable Windows exe is unsigned. Smart App Control in enforcement mode
  can block a downloaded copy. Signing or a user-side trust decision is required;
  the app does not disable Smart App Control.
- The portable wrapper self-extracts on launch. On the release machine this took
  about 95–110 seconds the first time; the unpacked build starts immediately.
- Crash diagnostics are local JSON lines in `userData/diagnostics.log`. They are
  not uploaded, signed, or aggregated, and rotate to one `.1` backup at 2 MB.

## Product scope

The current increment is a local-first analytics workspace inside Plot Docs. It
does not claim parity with cloud BI suites, enterprise data catalogs, or managed
orchestration platforms. Missing capabilities are listed above rather than
presented as complete.
