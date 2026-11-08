# Analytics Parity Roadmap (Zoho-inspired, local-first)

The user asked for the capabilities shown on the Zoho Analytics product page to exist in Plot Docs after the update/notification system is finished.

This is a **feature reference**, not a clone. Plot Docs stays local-first, keeps data on the user's machine by default, and never fabricates analytics results.

## What Plot Docs already has

- Local CSV, JSON, XLSX, and SQLite import
- SQL editor with read-only validation and an authorizer
- Datasets, saved views, workflows
- Charts and dashboards
- Pivot, funnel, and cohort analysis
- Cross-dataset joins and append/union as derived datasets
- AI analyst with tool calls and visible SQL/evidence
- Forecasting and anomaly-oriented analysis paths
- CSV export and open-in-SQL actions
- Privacy redaction at the tool boundary

## Capability map

| Zoho capability | Plot Docs target | Phase |
| --- | --- | --- |
| 500+ connectors | Connector framework: files, SQLite, Postgres, MySQL, REST/CSV URL, Google Sheets, S3, webhooks | 2 |
| Live database connection | Read-only Postgres/MySQL live queries with a local cache option | 2 |
| Data pipelines | Visual/step-based transforms, scheduled refresh, run history | 2 |
| 250+ transforms | Dedupe, cast, split, merge, fill/null, date parts, regex, lookup, aggregate | 2 |
| AI data preparation | Assistant tools that propose transforms, show preview, require confirmation | 2 |
| 50+ chart types | Expand chart catalog, drag-and-drop builder, recommendations | 3 |
| Drill-down / cross-filter | Dashboard interactions and linked filters | 3 |
| Historical / diagnostic analysis | Existing SQL + AI explanations with evidence | 1 |
| Predictive / what-if | Forecast intervals, scenario parameters, uncertainty display | 3 |
| Anomaly detection | Statistical baseline + explanations, no fake certainty | 3 |
| Sharing / permissions | Local project export, dashboard snapshots, optional team workspace | 4 |
| Row-level security | Policy rules on published/embedded dashboards | 4 |
| Data stories / portals | Story pages combining text + charts | 4 |
| APIs / SDK | Local control API, typed SDK, headless query/export | 4 |
| Embedded analytics | Embeddable read-only dashboard bundle | 4 |
| MCP server | Expose governed analytics tools to MCP clients | 4 |
| Semantic model / ontology | Reusable metrics, dimensions, business terms, governed definitions | 2 |
| AI agents across workflow | Connect, prepare, visualize, analyze, explain, recommend | 2-3 |
| Python code studio | Sandboxed Python analysis with explicit environment and output | 5 |
| AutoML | Optional local model training with validation metrics | 5 |
| Mobile apps | Deferred until explicitly prioritized | later |
| Cloud/on-prem deployment | Local-first desktop is the default; optional self-hosted later | later |
| Audit / AI observability | Local audit log of queries, tools, and AI actions | 1 |

## Phase 1 — correctness and scale

- Fix live Codex analytics structured output.
- Ensure exact questions return exact values with visible SQL.
- Add huge-data tests:
  - 100k rows
  - 1M rows
  - 10M rows
- Measure import time, query time, memory, UI responsiveness.
- Move long SQLite work off the Electron main process (worker/utility process).
- Add query cancellation and progress.
- Add import streaming/chunking.
- Add pagination/virtualization for large result sets.
- Keep the deterministic accuracy suite green.

## Phase 2 — data platform

- Connector registry and credentials vault.
- Read-only live database adapters.
- Transform pipeline with previews and undo.
- Semantic model editor: metrics, dimensions, synonyms, formats.
- Assistant tools for governed metric queries.
- Scheduled refresh with run history.
- Data quality checks: nulls, duplicates, type drift, outliers.

## Phase 3 — visualization and prediction

- Chart catalog expansion.
- Dashboard builder improvements.
- Cross-filtering and drill-down.
- Forecast with confidence intervals and assumptions.
- What-if parameters.
- Anomaly detection with baseline and explanation.
- Export/share snapshots.

## Phase 4 — collaboration and extensibility

- Dashboard sharing and roles.
- Row-level policies.
- Data stories.
- Local control API / SDK.
- Embeddable dashboard.
- MCP server.
- Audit log and AI observability UI.

## Phase 5 — advanced

- Sandboxed Python.
- AutoML with validation metrics.
- Optional self-hosted team deployment.
- Mobile companion if prioritized.

## Non-negotiables

- Never invent numbers.
- Always show dataset, SQL, filters, period, method, and uncertainty.
- Source datasets stay immutable; transformations create derived datasets.
- Long-running work must not freeze the UI.
- Huge-data tests must record real measurements, not claims.
- Privacy redaction stays at the tool boundary.
- Local-first by default.
