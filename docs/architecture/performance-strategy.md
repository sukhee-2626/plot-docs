# Performance strategy

## Current choices

- **SQLite per dataset.** Analysis runs close to the data; no network round trip
  or row serialization for every aggregation.
- **Pushdown.** Rankings, group totals, histograms, correlation inputs and
  forecasts are computed with SQL where practical, not by loading full tables
  into the renderer.
- **Bounded results.** Interactive queries default to 500 rows and cap at 5,000;
  exports cap at 250,000 rows; imports cap at 100 MB and 250,000 rows.
- **Read-only connections.** Query paths use a read-only connection and
  `query_only`; WAL and a 5 second busy timeout reduce contention with cleaning
  and scheduled runs.
- **Single-pass deterministic analysis.** The auto pipeline profiles once, then
  runs its calculations against the same dataset. Dashboard cards reuse stored
  SQL instead of storing copied result sets.
- **Sequential automation.** The scheduler runs one workflow at a time and skips
  a workflow already in flight. This protects interactive latency.
- **Renderer memoization.** Expensive column lists, slicer options, and derived
  dashboard state are memoized; cards re-run only when their inputs or refresh
  key change.
- **No model in scheduled runs.** Model planning and interpretation are disabled
  for schedules, avoiding network latency and provider variability.

## Known bottlenecks

- Re-profiling a large dataset after every clean operation is linear in rows.
- Dashboard refresh re-runs every saved card; there is no shared query cache.
- Correlation and outlier calculations may scan bounded data repeatedly.
- The auto pipeline saves cards one by one.
- The main process performs imports and analysis; a very large import can make
  other IPC calls wait even though the renderer remains responsive.
- Workflow runs are in-process and sequential; there is no worker pool.

## Improvement order

1. Add a query-result cache keyed by dataset version + SQL + filter.
2. Profile incrementally or asynchronously after cleaning.
3. Batch dashboard card refresh and cancel stale requests.
4. Add progress/cancellation for long imports and auto runs.
5. Add a worker thread for parsing/profiling if measurements show main-process
   contention.
6. Add benchmark fixtures and regression thresholds before optimizing further.

## Measurement

Formal benchmarks are not yet automated. See
`docs/testing/performance-benchmarks.md` for the reproducible commands, the
current smoke measurements, and the thresholds that should be added before
claiming a performance improvement.
