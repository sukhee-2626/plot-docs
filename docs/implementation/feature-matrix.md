# Feature matrix

Status vocabulary: **Shipped** = implemented and exercised by tests or a real
local run; **Partial** = useful implementation with a named gap; **Not
implemented** = no working capability; **Blocked** = depends on credentials or a
service that was not available.

## Data sources

| Capability | Status | Notes |
| --- | --- | --- |
| CSV / TSV import | Shipped | Bounded at 100 MB / 250,000 rows. |
| JSON / JSONL import | Shipped | Nested objects are flattened by the existing importer. |
| XLSX / XLSM import | Partial | First worksheet only; multi-sheet selection is missing. |
| XML import | Not implemented | No XML parser path. |
| SQLite import | Shipped | Local file picker and table listing. |
| PostgreSQL / MySQL import | Partial | Connector code exists; live server tests were not run here. |
| Public URL import | Shipped | Direct files and HTML tables; SSRF guards. |
| Authenticated REST APIs / webhooks | Not implemented | No credential flow, refresh, or webhook receiver. |
| Google Sheets | Not implemented | No OAuth or Sheets connector. |
| Cloud object storage / warehouses | Not implemented | No S3/GCS/BigQuery/Snowflake connector. |
| Connection health / refresh | Partial | One-time import and database table listing; no scheduled source refresh. |

## Profiling and preparation

| Capability | Status | Notes |
| --- | --- | --- |
| Row/column counts, nulls, distincts, min/max/mean | Shipped | Per-column profile. |
| Duplicate detection | Shipped | Exact duplicate rows. |
| Explainable quality score | Shipped | `100 − missingShare×60 − duplicateShare×40`, rounded and bounded 0–100. |
| Type inference | Shipped | Declared SQLite types mapped to boolean/date/integer/real/text. |
| Schema editing | Not implemented | The UI inspects the inferred schema; it does not persist type overrides. |
| Sensitive-field detection | Partial | Obvious contact, payment and identifier values are redacted from AI observations; there is no full PII classifier, persisted masking policy, or field-level access control. |
| Outlier detection | Shipped | 1.5×IQR. |
| Schema-change detection | Not implemented | Re-import creates a new dataset. |
| Deduplicate / drop nulls / trim / fill mean / fill value | Shipped | One-step reversible backup. |
| Pivot tables | Shipped | One- or two-axis cross-tab with validated sum/avg/min/max/count, exact SQL, CSV export and SQL hand-off. |
| Calculated fields | Not implemented | There is no general transformation graph. |
| Saved transformation pipelines with previews | Not implemented | The automation workflow runs the fixed auto pipeline, not a user-authored step graph. |
| Incremental processing | Not implemented | Each clean/profile pass reads the current table. |

## Analysis, dashboards and reporting

| Capability | Status | Notes |
| --- | --- | --- |
| Read-only SQL | Shipped | `SELECT`/`WITH`, authorizer, row caps, exact SQL retained. |
| Cross-dataset joins | Shipped | Inner/left, one key per side, new derived dataset, sources untouched, 250,000-row cap. |
| Cross-dataset append / union | Shipped | Same column names, `UNION ALL` or `UNION`, new derived dataset, sources untouched, 250,000-row cap. |
| Ordered event funnel | Shipped | First occurrence per user; later step must be at/after the previous step; 2–8 unique steps. |
| Monthly cohort retention | Shipped | Cohorts by first activity month; period 0 plus up to 36 monthly periods; ISO-like dates required. |
| Fixed Python aggregation | Shipped | App-generated code, isolated process, timeout. |
| Ranking with full-group share | Shipped | Windowed total in SQL. |
| Time trend | Shipped | When a date axis exists. |
| Distribution histogram | Shipped | Equal-width bins. |
| Pearson + Spearman correlation | Shipped | Chooses the stronger monotonic signal. |
| 1.5×IQR outliers | Shipped | Exact bounds shown. |
| Linear forecast + uncertainty | Shipped | OLS, R², residual standard error, slope and prediction intervals. |
| Charts | Shipped | Bar, line, area, pie, donut, scatter. |
| Saved dashboard cards | Shipped | SQL and evidence stored with each card. |
| KPIs, slicers, cross-filtering | Shipped | Filtering before aggregation where applicable. |
| Dashboard layouts | Shipped | Auto, one column, two columns. |
| CSV export | Shipped | Exact query result; bounded at 250,000 rows. |
| Scheduled dashboard refresh | Shipped | Local-time workflows while the app is open. |
| PDF / DOCX / PPTX report publishing | Not implemented | CSV is the only analytics export. |
| Email / webhook / folder delivery | Not implemented | No destination connector. |
| Approval queues / team review | Not implemented | Single local user. |

## AI

| Capability | Status | Notes |
| --- | --- | --- |
| Soopus AI / OpenAI-compatible providers | Partial | Uses existing settings; live calls were not verified without credentials. |
| Local fallback without a model | Shipped | Deterministic auto pipeline and honest no-result answers. |
| Dataset understanding / plan | Shipped | Model output validated against schema; local plan fallback. |
| Tool-using Plot AI assistant | Shipped | `analytics-agent-v5`, 25 tools, 9 training examples, including local joins, appends, pivots, funnels and cohorts. |
| AI interpretation of completed evidence | Shipped | Prose only; local reading fallback. |
| Natural-language workflow creation | Not implemented | The assistant can run auto analysis but does not author scheduled workflows. |
| Model-generated transformation pipelines | Not implemented | Deliberately blocked. |
| Anomaly detection beyond IQR | Not implemented | No seasonal or multivariate anomaly model. |
| Semantic layer / metrics catalog | Not implemented | Saved views are the closest reusable calculation. |
| Lineage graph | Partial | Audit and stored SQL provide evidence, not a graph UI. |

## Security, governance and operations

| Capability | Status | Notes |
| --- | --- | --- |
| Local-first data isolation | Shipped | Private userData SQLite store; source untouched. |
| Read-only query boundary | Shipped | Validation + authorizer + read-only connection. |
| AI observation redaction | Shipped | Obvious contact, payment and identifier values, signed URL query strings, and database secrets are removed or masked before model sharing; page text previews are pattern-redacted. |
| Audit trail | Shipped | Local append-only events; not signed. |
| Workflow run/version history | Shipped | Retries, status, row counts, configuration versions. |
| Recovery after interrupted run | Shipped | Startup marks stale `running` states as interrupted. |
| Renderer recovery boundary | Shipped | Render errors show a local recovery screen with reload and copyable diagnostics instead of a blank window. |
| Crash diagnostics | Shipped | Renderer errors, renderer/child-process exits and main-process exceptions append to `userData/diagnostics.log`; the log rotates at 2 MB. |
| RBAC / SSO / organizations | Not implemented | Single local user. |
| Encryption at rest | Not implemented | Relies on OS/userData permissions. |
| Tamper-evident audit / SIEM export | Not implemented | No remote audit sink. |
| OS background scheduling | Not implemented | Scheduler runs only while the app is open. |
| Distributed job queue | Not implemented | Sequential in-process runs. |

## Differentiation snapshot

The product combines a local evidence-first auto-analysis engine, an inspectable
SQL-backed dashboard, a tool-using assistant with a no-model fallback, and
scheduled deterministic refreshes in one desktop workspace. The differentiator is
not a claim of parity with cloud BI suites; it is the combination of local data
ownership, visible calculations, and AI that cannot fabricate the result.
