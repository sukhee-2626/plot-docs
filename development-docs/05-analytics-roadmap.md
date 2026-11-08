# Analytics Roadmap

Detailed version: `../docs/analytics-parity-roadmap.md`

## Current strengths

- Local CSV/JSON/XLSX/SQLite import
- SQL editor with read-only validation
- Datasets, saved views, workflows
- Charts and dashboards
- Pivot, funnel, cohort
- Joins and append/union as derived datasets
- AI analyst with visible evidence
- Forecasting/anomaly-oriented paths
- CSV export
- Privacy redaction

## User priority

1. Finish updates/notifications.
2. Fully enhance analytics.
3. Test with huge data.
4. Learn from errors and correct.

## Zoho-inspired phases

### Phase 1 — correctness and scale

- Fix live Codex structured output
- Exact-answer tests
- 100k / 1M / 10M row tests
- Query cancellation/progress
- Move long SQLite work off main process
- Streaming import
- Large-result virtualization
- Keep deterministic accuracy suite green

### Phase 2 — data platform

- Connector framework
- Read-only Postgres/MySQL
- REST/CSV URL, Google Sheets, S3, webhooks
- Transform pipeline
- Semantic model: metrics, dimensions, terms
- Scheduled refresh
- Data quality checks

### Phase 3 — visualization and prediction

- 50+ chart types
- Drag-and-drop builder
- Recommendations
- Drill-down/cross-filter
- Forecast intervals
- What-if
- Anomaly detection
- Dashboard snapshots

### Phase 4 — collaboration/extensibility

- Sharing/permissions
- Row-level policies
- Data stories
- Local control API/SDK
- Embedded dashboards
- MCP server
- Audit/AI observability

### Phase 5 — advanced

- Sandboxed Python
- AutoML with validation metrics
- Optional self-hosted team deployment
- Mobile companion if prioritized

## Non-negotiables

- Never fabricate results
- Show SQL/dataset/filters/period/method/uncertainty
- Source datasets immutable
- Huge-data claims must have measurements
- Local-first by default
- Long work must not freeze UI
- Privacy redaction at tool boundary
