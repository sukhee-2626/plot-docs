# Analytics data flow

## Import

```
source file / URL / database table
        │
        ▼
parse + bound rows and bytes
        │
        ▼
create datasets/<uuid>.sqlite with a data table
        │
        ▼
profile: types, nulls, distinct values, duplicates, quality score
        │
        ▼
store metadata + profile in analytics.sqlite
```

Supported source paths in this build:

- Local CSV, TSV, JSON, JSONL, XLSX and XLSM (first worksheet for XLSX/XLSM).
- Public http/https URLs: direct data files and HTML tables, with SSRF guards.
- SQLite files, PostgreSQL and MySQL tables through the existing connector code.
  The latter two require a reachable server and were not verified in CI without
  running database instances.

Every import is copied into the private analytics store. The source is not
edited. Import limits are 100 MB and 250,000 rows; scraped HTML pages are capped
at 20 MB.

## Analysis

```
dataset detail + profile
        │
        ├── read-only SQL ──► validated SELECT/WITH ──► result rows + elapsed ms
        │
        ├── fixed Python aggregation ──► isolated subprocess ──► grouped result
        │
        ├── join two datasets ──► new datasets/<uuid>.sqlite
        │        ├── inner or left, one validated key per side
        │        ├── right-column collisions prefixed with right_
        │        ├── 250,000-row cap
        │        └── logical SQL + null/duplicate/unmatched-key warnings
        │
        ├── append two datasets ──► new datasets/<uuid>.sqlite
        │        ├── same column names aligned by name
        │        ├── UNION ALL (keep duplicates) or UNION (remove exact duplicates)
        │        ├── 250,000-row cap
        │        └── logical union SQL + type/duplicate warnings
        │
        ├── forecast ──► OLS fit ──► slope, R², residual error, intervals
        │
        └── deterministic auto pipeline
                ├── optional duplicate removal (reversible backup)
                ├── ranking with windowed group total
                ├── time trend
                ├── distribution histogram
                ├── Pearson and Spearman correlation
                ├── 1.5×IQR outliers
                └── saved dashboard cards with SQL + evidence
```

SQL is pushed to SQLite rather than pulled into JavaScript for aggregation.
The renderer receives bounded rows and displays the exact SQL, method, period or
dimension, evidence rows, confidence, and uncertainty caveat.

## Cleaning and undo

```
BEGIN IMMEDIATE
  apply one validated operation to data
COMMIT
        │
        ├── profile again
        └── keep one backup for undo
```

The backup is made with SQLite's online backup API before the transaction. If
the transaction fails, the backup is cleared and the dataset is unchanged.
Undo restores the backup and removes it; there is no multi-step undo stack.

## Dashboards

Saved views store SQL, chart specification, insight kind, filter column,
takeaway, meaning, method, detail and confidence. A dashboard card re-runs its
SQL locally. Slicers and cross-filter selections are applied before aggregation
for cards that read the base table. Cards that do not read the base table state
that the slicer is not applicable instead of pretending to filter.

## Automation

```
workflow configuration (metadata DB)
        │
        ▼
main-process scheduler tick every 60 s while the app is open
        │
        ├── due? ──► run deterministic auto pipeline
        │              ├── optional duplicate preparation
        │              ├── analysis + saved dashboard cards
        │              └── no model planning or interpretation
        │
        ├── success ──► workflow_runs row + next_run_at from finish time
        └── failure ──► error row + retry up to configured count
```

A missed schedule is collapsed into one run on the next launch. The next run is
computed from the finish time, not replayed from every missed interval. The
scheduler does not run arbitrary SQL, model-generated code, or user scripts.

## Audit

Audit events are appended for imports, queries, joins, appends, cleaning, undo, forecasts,
exports, auto analysis, workflow creation/update/run/failure/deletion, and
assistant actions. Audit detail is bounded before storage. The audit trail is
local and is not a tamper-evident ledger or a remote compliance export.
