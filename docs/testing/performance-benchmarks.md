# Performance benchmarks

## Status

There is no formal benchmark harness or regression threshold yet. The numbers
below are smoke observations from a single Windows workstation on 2026-10-27 and
must not be presented as product benchmarks.

## Reproducible commands

```powershell
npm run typecheck -w @plotdocs/shell
npm run build -w @plotdocs/shell
cd apps/shell
npx vitest run tests/data-analytics-schedule.test.ts tests/data-analytics-ipc.test.ts
cd ../..
npx playwright test --config e2e/playwright.config.ts e2e/analytics-workspace.spec.ts
```

## Observed smoke timings

| Scenario | Observed | Context |
| --- | --- | --- |
| Shell production build | ~2.5 min | Includes main, preload and renderer bundles; not analytics-only. |
| Focused schedule + IPC tests | 15.7 s total | 15 tests; includes Electron mock setup and real SQLite work. |
| Analytics E2E suite | 2.9 min | 12 serial tests, single worker, includes app launch and UI waits. |
| Full auto E2E test | 56.7 s | Includes analysis, dashboard save, chart rendering and screenshots. |
| Workflow E2E test | 21.3 s | Create, run-now, pause, edit, version history, delete. |

These timings are dominated by Playwright waits and screenshots in several cases.
They are useful for detecting gross regressions, not for comparing algorithms.

## Metrics to add

1. Import throughput for 1k / 10k / 100k rows, CSV and XLSX.
2. Profile time by row and column count.
3. Duplicate-clean and undo time.
4. Read-only SQL latency for representative aggregations.
5. Auto-analysis time and dashboard-card count.
6. Scheduled workflow overhead excluding the auto pipeline.
7. Memory high-water mark for a 100 MB import.
8. Main-process event-loop delay during a large import.

## Proposed gates

Before claiming a performance improvement, record a baseline on fixed fixtures
and add thresholds with tolerance. Suggested initial gates:

- No more than 20% regression in import/profile/query p95 on the benchmark
  fixture.
- No unbounded growth in memory across repeated dashboard refreshes.
- A scheduled workflow must not overlap itself or starve interactive queries for
  more than the configured SQLite busy timeout.
- A 100 MB import must fail cleanly if it exceeds the configured row cap rather
  than exhausting memory.

## Honest limitations

- The current E2E timings include UI animation, screenshot capture and serial
  test execution.
- No load generator, flamegraph, or memory profiler is checked in.
- The full repository suite is not a reliable benchmark and was not fully green
  in the last recorded baseline.
